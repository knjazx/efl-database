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
    demo_url = None

    # 1. Try DrissionPage Headless Chromium WAF Bypass
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
        demo_url = f"https://cdn-de-1.cybershoke.net/demos/{match_id}"

    return demo_url, cookies_dict

def parse_cs2_demo_file(demo_path: str, match_id: str) -> dict:
    from demoparser2 import DemoParser

    parser = DemoParser(demo_path)
    header = parser.parse_header()
    raw_map = header.get("map_name", "") or "de_mirage"
    clean_map = raw_map.split("/")[-1].replace(".bsp", "").strip()

    # 1. Detect Live Match Start tick (to filter out warmup/knife rounds)
    match_start_tick = 0
    available_events = []
    try:
        available_events = parser.list_game_events()
    except Exception:
        available_events = [
            "round_end", "round_officially_ended", "cs_win_panel_round",
            "round_announce_match_start", "begin_new_match"
        ]

    start_events = []
    for ev_name in ("round_announce_match_start", "begin_new_match"):
        if ev_name in available_events:
            try:
                df = parser.parse_event(ev_name)
                if df is not None and len(df) > 0:
                    start_events.extend(df.to_dict("records"))
            except Exception:
                pass

    if start_events:
        match_start_tick = max(int(e.get("tick", 0)) for e in start_events)

    # 2. Extract Player Info & Teams
    group_A = []
    group_B = []
    all_players = []

    try:
        p_df = parser.parse_player_info()
        if p_df is not None and len(p_df) > 0:
            for idx, row in p_df.iterrows():
                name = row.get("name")
                t_num = row.get("team_num")
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

    # 3. Calculate Scores from Round End Events (Filtered by live match start tick)
    score_A = 0
    score_B = 0

    round_end_name = None
    for r_name in ("round_end", "round_officially_ended", "cs_win_panel_round"):
        if r_name in available_events:
            round_end_name = r_name
            break

    if round_end_name:
        try:
            df = parser.parse_event(round_end_name)
            if df is not None and len(df) > 0:
                events = df.to_dict("records")
                live_events = [e for e in events if int(e.get("tick", 0)) >= match_start_tick] if match_start_tick > 0 else events
                for e in live_events:
                    winner = e.get("winner")
                    if winner == 2:
                        score_A += 1
                    elif winner == 3:
                        score_B += 1
        except Exception:
            pass

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
            # Zip archive
            zf = zipfile.ZipFile(file_path)
            dem_names = [name for name in zf.namelist() if name.endswith(".dem")]
            if not dem_names:
                return {"error": "Файл zip не содержит файла демо .dem"}
            dem_path = zf.extract(dem_names[0], temp_dir)
            return parse_cs2_demo_file(dem_path, match_id)
        elif header_bytes.startswith(b"BZ"):
            # BZ2 archive
            dem_path = os.path.join(temp_dir, f"{match_id}.dem")
            with bz2.open(file_path, "rb") as bz_in, open(dem_path, "wb") as dem_out:
                dem_out.write(bz_in.read())
            return parse_cs2_demo_file(dem_path, match_id)
        else:
            # Raw .dem file
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

    # 1. If input is a local file
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

    try:
        from curl_cffi import requests as cc_requests
        cc_resp = cc_requests.get(
            demo_url,
            cookies=cookies,
            headers={
                "User-Agent": DEFAULT_HEADERS["User-Agent"],
                "Referer": f"https://cybershoke.net/ru/match/{match_id}"
            },
            impersonate="chrome",
            timeout=120
        )
        if cc_resp.status_code == 200 and len(cc_resp.content) > 10000:
            with open(temp_download, "wb") as out_file:
                out_file.write(cc_resp.content)
        else:
            print(json.dumps({"error": f"Не удалось скачать демку Cybershoke (HTTP {cc_resp.status_code})"}))
            sys.exit(0)

        res = process_and_parse(temp_download, match_id)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"error": f"Ошибка скачивания и анализа демки: {str(e)}"}))
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    main()
