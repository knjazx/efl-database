import sys
import os
import json
import re
import urllib.request
import bz2
import zipfile
import tempfile
import shutil
import time

# Enforce UTF-8 encoding for standard output and error in Python on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def safe_print_json(data: dict):
    try:
        json_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
        sys.stdout.buffer.write(json_bytes + b"\n")
        sys.stdout.buffer.flush()
    except Exception:
        print(json.dumps(data))

CYBERSHOKE_DOMAINS = [
    "cybershoke.net",
    "cybershoke.ru",
    "cshoke.ru",
    "cybershoke.club",
    "cybershoke.com",
    "cybershoke.gg",
]

def extract_match_id(url_or_id: str) -> str:
    url_or_id = url_or_id.strip()
    if url_or_id.isdigit():
        return url_or_id
    m = re.search(r'(?:match|lobbys)/(\d+)', url_or_id, re.I) or re.search(r'(\d+)', url_or_id)
    return m.group(1) if m else url_or_id

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

    # 2. Calculate MR12 Half-based Scores
    score_A = 0
    score_B = 0
    round_counter = 0

    match_start_tick = 0
    try:
        df_ms = parser.parse_event("round_announce_match_start")
        if df_ms is not None and len(df_ms) > 0 and "tick" in df_ms.columns:
            match_start_tick = int(df_ms["tick"].max())
    except Exception:
        pass

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

                    if match_start_tick > 0 and r_tick <= match_start_tick:
                        prev_tick = r_tick
                        continue

                    if df_kills is not None and hasattr(df_kills, "columns") and "weapon" in df_kills.columns:
                        kills_in_round = df_kills[(df_kills["tick"] >= prev_tick) & (df_kills["tick"] <= r_tick)]
                        weapons = [str(w).lower() for w in kills_in_round["weapon"]]
                        if len(weapons) > 0 and all("knife" in w or "bayonet" in w or w == "world" for w in weapons):
                            prev_tick = r_tick
                            continue

                    round_counter += 1
                    is_ct_win = w_str in ("3", "CT")
                    is_t_win = w_str in ("2", "T")

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

def fetch_cybershoke_via_drission(match_id: str, original_url: str) -> dict | None:
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
        ]:
            if os.path.exists(binary):
                options.set_browser_path(binary)
                break

        page = ChromiumPage(options)
        try:
            page.listen.start("custom-matches/lobbys/info")
            target_url = original_url if original_url.startswith("http") else f"https://cybershoke.net/ru/match/{match_id}"
            page.get(target_url)
            packet = page.listen.wait(timeout=10)
            
            if packet and packet.response and packet.response.body:
                body = packet.response.body
                if isinstance(body, dict) and body.get("result") == "success":
                    data = body.get("data", {})
                    m_stats = data.get("match_stats", {}).get("base", {})
                    m_settings = data.get("match_settings", {})
                    players_dict = data.get("players", {})
                    
                    score_3 = m_stats.get("team_3", {}).get("score", 0)
                    score_2 = m_stats.get("team_2", {}).get("score", 0)
                    
                    team1_players = []
                    team2_players = []
                    all_players = []
                    
                    if isinstance(players_dict, dict):
                        for p_info in players_dict.values():
                            p_name = p_info.get("name")
                            p_slot = p_info.get("id_slot")
                            if p_name:
                                all_players.append(p_name)
                                if p_slot == 3:
                                    team1_players.append(p_name)
                                elif p_slot == 2:
                                    team2_players.append(p_name)
                    
                    map_name = m_settings.get("map_name", "de_mirage")
                    
                    return {
                        "success": True,
                        "matchId": match_id,
                        "mapName": map_name,
                        "scoreA": score_3,
                        "scoreB": score_2,
                        "team1Players": team1_players,
                        "team2Players": team2_players,
                        "allPlayers": all_players,
                    }
        finally:
            try:
                page.quit()
            except Exception:
                pass
    except Exception as e:
        sys.stderr.write(f"DrissionPage error: {e}\n")
    return None

def main():
    if len(sys.argv) < 2:
        safe_print_json({"error": "No match URL or file path provided"})
        sys.exit(1)

    input_val = sys.argv[1].strip()
    match_id = extract_match_id(input_val)

    # 1. Local file path upload parsing via demoparser2
    if os.path.exists(input_val):
        try:
            from demoparser2 import DemoParser
        except ImportError:
            safe_print_json({"error": "demoparser2 Python package not installed"})
            sys.exit(1)
        res = process_and_parse(input_val, match_id)
        safe_print_json(res)
        sys.exit(0)

    # 2. Automated Cybershoke Match/Lobby parsing via DrissionPage interception
    res = fetch_cybershoke_via_drission(match_id, input_val)
    if res and res.get("success"):
        safe_print_json(res)
        sys.exit(0)

    safe_print_json({"error": f"Не удалось распарсить данные Cybershoke для матча #{match_id}"})
    sys.exit(0)

if __name__ == "__main__":
    main()
