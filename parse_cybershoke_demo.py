import sys
import json
import re
import urllib.request
import bz2
import zipfile
import tempfile
import os
import shutil
import time

CYBERSHOKE_DOMAINS = [
    "cybershoke.net",
    "cybershoke.ru",
    "cshoke.ru",
    "cybershoke.club",
    "cybershoke.com",
    "cybershoke.gg",
]

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "Content-Type": "application/json;charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
}

def extract_match_id(url_or_id: str) -> str:
    url_or_id = url_or_id.strip()
    if url_or_id.isdigit():
        return url_or_id
    m = re.search(r'(?:match|lobbys)/(\d+)', url_or_id, re.I) or re.search(r'(\d+)', url_or_id)
    return m.group(1) if m else url_or_id

def find_url_in_json(data) -> str | None:
    if isinstance(data, dict):
        for k in ["url_download", "demo_url", "demo"]:
            if k in data and isinstance(data[k], str) and data[k].startswith("http"):
                return data[k]
        for val in data.values():
            res = find_url_in_json(val)
            if res:
                return res
    elif isinstance(data, list):
        for item in data:
            res = find_url_in_json(item)
            if res:
                return res
    elif isinstance(data, str) and data.startswith("http") and (".dem" in data or "demo" in data):
        return data
    return None

def resolve_cybershoke_demo_and_cookies(match_id: str, original_url: str):
    cookies_dict = {}
    cdn_url = f"https://cdn-de-1.cybershoke.net/demos/{match_id}"

    # 1. Fast Direct CDN Check
    try:
        req = urllib.request.Request(
            cdn_url,
            headers={
                "User-Agent": DEFAULT_HEADERS["User-Agent"],
                "Referer": f"https://cybershoke.net/ru/match/{match_id}"
            }
        )
        resp = urllib.request.urlopen(req, timeout=5)
        if resp.status == 200:
            return cdn_url, cookies_dict
    except Exception:
        pass

    # 2. Try DrissionPage Headless Chromium WAF Bypass fallback
    demo_url = None
    try:
        from DrissionPage import ChromiumPage, ChromiumOptions
        options = ChromiumOptions()
        options.headless(True)
        options.set_argument('--no-sandbox')
        options.set_argument('--disable-gpu')
        for binary in [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
            "/snap/bin/chromium",
        ]:
            if os.path.exists(binary):
                options.set_browser_path(binary)
                break
        page = ChromiumPage(options)
        try:
            page.listen.start("lobbys/info")
            page.get(f"https://cybershoke.net/ru/match/{match_id}")
            packet = page.listen.wait(timeout=10)
            if packet and packet.response and packet.response.body:
                demo_url = find_url_in_json(packet.response.body)
            cookies_dict = {c['name']: c['value'] for c in page.cookies()}
        finally:
            page.quit()
    except Exception as e:
        sys.stderr.write(f"DrissionPage warning: {e}\n")

    if not demo_url:
        demo_url = cdn_url

    return demo_url, cookies_dict

def parse_cs2_demo_file(demo_path: str, match_id: str) -> dict:
    from demoparser2 import DemoParser

    parser = DemoParser(demo_path)
    header = parser.parse_header()
    raw_map = header.get("map_name", "") or "de_mirage"
    clean_map = raw_map.split("/")[-1].replace(".bsp", "").strip()

    # 1. Extract Player Info & Teams
    group_A = []
    group_B = []
    all_players = []

    try:
        p_df = parser.parse_player_info()
        if p_df is not None and len(p_df) > 0:
            for idx, row in p_df.iterrows():
                name = row.get("name")
                # demoparser2 uses 'team_number' (not 'team_num')
                t_num = row.get("team_number", row.get("team_num"))
                if name and isinstance(name, str) and name.strip() and "GOTV" not in name.upper():
                    clean_name = name.strip()
                    if clean_name not in all_players:
                        all_players.append(clean_name)
                    if t_num == 2 and clean_name not in group_A:
                        group_A.append(clean_name)
                    elif t_num == 3 and clean_name not in group_B:
                        group_B.append(clean_name)
    except Exception:
        pass

    if not group_A and not group_B and all_players:
        group_A = all_players[:5]
        group_B = all_players[5:]

    # 2. Calculate Exact MR12 Half-based Scores from Round End Events (excluding knife/warmup rounds)
    score_A = 0
    score_B = 0
    round_counter = 0

    # Determine official match start tick (after knife round & warmup)
    match_start_tick = 0
    try:
        df_ms = parser.parse_event("round_announce_match_start")
        if df_ms is not None and len(df_ms) > 0 and "tick" in df_ms.columns:
            match_start_tick = int(df_ms["tick"].max())
    except Exception:
        pass

    # Fetch player deaths to detect pure knife rounds if needed
    df_kills = None
    try:
        df_kills = parser.parse_event("player_death")
    except Exception:
        pass

    round_end_names = ["round_end", "round_officially_ended", "cs_win_panel_round"]

    for round_end_name in round_end_names:
        try:
            df = parser.parse_event(round_end_name)
            if df is not None and len(df) > 0 and "winner" in df.columns:
                prev_tick = 0
                for idx, row in df.iterrows():
                    r_tick = row.get("tick", 0)
                    w_raw = row.get("winner")

                    # Skip NaN / None values (e.g. warmup round 0)
                    try:
                        import math
                        if w_raw is None or (isinstance(w_raw, float) and math.isnan(w_raw)):
                            prev_tick = r_tick
                            continue
                    except (TypeError, ValueError):
                        pass

                    w_str = str(w_raw).strip().upper()
                    if w_str not in ("2", "3", "CT", "T"):
                        prev_tick = r_tick
                        continue

                    # Exclude warmup / knife rounds occurring before official match_start_tick
                    if match_start_tick > 0 and r_tick <= match_start_tick:
                        prev_tick = r_tick
                        continue

                    # Exclude rounds where all kills are knife/world kills
                    if df_kills is not None and hasattr(df_kills, "columns") and "weapon" in df_kills.columns:
                        kills_in_round = df_kills[(df_kills["tick"] >= prev_tick) & (df_kills["tick"] <= r_tick)]
                        weapons = [str(w).lower() for w in kills_in_round["weapon"]]
                        if len(weapons) > 0 and all("knife" in w or "bayonet" in w or w == "world" for w in weapons):
                            prev_tick = r_tick
                            continue

                    round_counter += 1
                    is_ct_win = w_str in ("3", "CT")
                    is_t_win = w_str in ("2", "T")

                    # MR12 format: rounds 1-12 Team A is CT, Team B is T.
                    # Rounds 13+ sides swap: Team A becomes T, Team B becomes CT.
                    if round_counter <= 12:
                        if is_ct_win:
                            score_A += 1
                        elif is_t_win:
                            score_B += 1
                    else:
                        if is_t_win:
                            score_A += 1
                        elif is_ct_win:
                            score_B += 1

                    prev_tick = r_tick

                # If we successfully parsed rounds, stop trying other event names
                if round_counter > 0:
                    break
        except Exception:
            continue

    return {
        "success": True,
        "matchId": match_id,
        "mapName": clean_map,
        "scoreA": score_A,
        "scoreB": score_B,
        "team1Players": group_A,
        "team2Players": group_B,
        "allPlayers": all_players,
    }

def process_and_parse(file_path: str, match_id: str) -> dict:
    with open(file_path, "rb") as f:
        header_bytes = f.read(4)

    temp_dir = tempfile.mkdtemp()
    try:
        if header_bytes.startswith(b"PK\x03\x04"):
            zf = zipfile.ZipFile(file_path)
            dem_names = [name for name in zf.namelist() if name.endswith(".dem")]
            if not dem_names:
                return {"error": "Файл zip не содержит файла демо .dem"}
            dem_path = zf.extract(dem_names[0], temp_dir)
            return parse_cs2_demo_file(dem_path, match_id)
        elif header_bytes.startswith(b"BZ"):
            dem_path = os.path.join(temp_dir, f"{match_id}.dem")
            with bz2.open(file_path, "rb") as bz_in, open(dem_path, "wb") as dem_out:
                dem_out.write(bz_in.read())
            return parse_cs2_demo_file(dem_path, match_id)
        else:
            return parse_cs2_demo_file(file_path, match_id)
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No match URL or file path provided"}))
        sys.exit(1)

    input_val = sys.argv[1].strip()
    match_id = extract_match_id(input_val)

    try:
        from demoparser2 import DemoParser
    except ImportError:
        print(json.dumps({"error": "demoparser2 Python package not installed"}))
        sys.exit(1)

    # 1. Local file path
    if os.path.exists(input_val):
        res = process_and_parse(input_val, match_id)
        print(json.dumps(res))
        sys.exit(0)

    # 2. Automated Cybershoke Demo Resolution via WAF Headless Interception
    demo_url, cookies = resolve_cybershoke_demo_and_cookies(match_id, input_val)
    if not demo_url:
        print(json.dumps({"error": f"Не удалось автоматически найти ссылку на демку Cybershoke для матча #{match_id}"}))
        sys.exit(0)

    temp_dir = tempfile.mkdtemp()
    temp_download = os.path.join(temp_dir, f"{match_id}_download")

    downloaded = False
    possible_urls = [
        f"https://cdn-de-1.cybershoke.net/demos/{match_id}",
        f"https://cdn-de-2.cybershoke.net/demos/{match_id}",
        f"https://cdn-de-3.cybershoke.net/demos/{match_id}",
    ]
    if demo_url and demo_url not in possible_urls:
        possible_urls.insert(0, demo_url)

    for target_url in possible_urls:
        if downloaded:
            break
        # 1. Try urllib streaming download
        try:
            req = urllib.request.Request(
                target_url,
                headers={
                    "User-Agent": DEFAULT_HEADERS["User-Agent"],
                    "Referer": f"https://cybershoke.net/ru/match/{match_id}"
                }
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status == 200:
                    with open(temp_download, "wb") as out_file:
                        while chunk := resp.read(1024 * 1024):
                            out_file.write(chunk)
                    if os.path.exists(temp_download) and os.path.getsize(temp_download) > 10000:
                        downloaded = True
                        break
        except Exception as e_url:
            sys.stderr.write(f"urllib download failed for {target_url}: {e_url}\n")

        # 2. Try curl_cffi fallback if urllib failed
        if not downloaded:
            try:
                from curl_cffi import requests as cc_requests
                cc_resp = cc_requests.get(
                    target_url,
                    cookies=cookies,
                    headers={
                        "User-Agent": DEFAULT_HEADERS["User-Agent"],
                        "Referer": f"https://cybershoke.net/ru/match/{match_id}"
                    },
                    impersonate="chrome",
                    timeout=60
                )
                if cc_resp.status_code == 200 and len(cc_resp.content) > 10000:
                    with open(temp_download, "wb") as out_file:
                        out_file.write(cc_resp.content)
                    downloaded = True
                    break
            except Exception as e_cc:
                sys.stderr.write(f"curl_cffi download failed for {target_url}: {e_cc}\n")

    if not downloaded or not os.path.exists(temp_download) or os.path.getsize(temp_download) <= 10000:
        print(json.dumps({"error": f"Не удалось скачать демку Cybershoke для матча #{match_id}"}))
        sys.exit(0)

    try:
        res = process_and_parse(temp_download, match_id)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"error": f"Ошибка скачивания и анализа демки: {str(e)}"}))
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    main()
