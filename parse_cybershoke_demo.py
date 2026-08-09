import sys
import json
import re
import urllib.request
import bz2
import tempfile
import os
from pathlib import Path

def extract_match_id(url_or_id: str) -> str:
    url_or_id = url_or_id.strip()
    if url_or_id.isdigit():
        return url_or_id
    m = re.search(r'match(?:es)?/(\d+)', url_or_id, re.I) or re.search(r'(\d+)', url_or_id)
    return m.group(1) if m else url_or_id

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
                steamid = row.get("steamid")
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
    if os.path.exists(input_val) and (input_val.endswith(".dem") or input_val.endswith(".bz2")):
        if input_val.endswith(".bz2"):
            temp_dir = tempfile.mkdtemp()
            dem_path = os.path.join(temp_dir, "decompressed.dem")
            try:
                with bz2.open(input_val, "rb") as bz_in, open(dem_path, "wb") as dem_out:
                    dem_out.write(bz_in.read())
                res = parse_cs2_demo_file(dem_path, match_id)
                print(json.dumps(res))
            finally:
                import shutil
                shutil.rmtree(temp_dir, ignore_errors=True)
        else:
            res = parse_cs2_demo_file(input_val, match_id)
            print(json.dumps(res))
        sys.exit(0)

    # 2. Download from Cybershoke demo URLs
    temp_dir = tempfile.mkdtemp()
    demo_urls = [
        f"https://demos.cybershoke.net/{match_id}.dem.bz2",
        f"https://demos.cybershoke.net/matches/{match_id}.dem.bz2",
        f"https://cybershoke.net/demos/{match_id}.dem.bz2",
    ]

    bz2_path = os.path.join(temp_dir, f"{match_id}.dem.bz2")
    dem_path = os.path.join(temp_dir, f"{match_id}.dem")
    demo_file_path = None

    req_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    }

    for d_url in demo_urls:
        try:
            req = urllib.request.Request(d_url, headers=req_headers)
            with urllib.request.urlopen(req, timeout=10) as response, open(bz2_path, "wb") as out_file:
                out_file.write(response.read())

            with bz2.open(bz2_path, "rb") as bz_in, open(dem_path, "wb") as dem_out:
                dem_out.write(bz_in.read())

            if os.path.exists(dem_path) and os.path.getsize(dem_path) > 1000:
                demo_file_path = dem_path
                break
        except Exception:
            continue

    try:
        if demo_file_path and os.path.exists(demo_file_path):
            res = parse_cs2_demo_file(demo_file_path, match_id)
            print(json.dumps(res))
        else:
            print(json.dumps({"error": f"Demo file for match {match_id} could not be downloaded"}))
    finally:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    main()
