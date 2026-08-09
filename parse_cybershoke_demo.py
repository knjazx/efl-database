import sys
import json
import re
import urllib.request
import bz2
import tempfile
import os

def extract_match_id(url_or_id: str) -> str:
    url_or_id = url_or_id.strip()
    if url_or_id.isdigit():
        return url_or_id
    m = re.search(r'match(?:es)?/(\d+)', url_or_id, re.I) or re.search(r'(\d+)', url_or_id)
    return m.group(1) if m else url_or_id

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No match URL or path provided"}))
        sys.exit(1)

    input_val = sys.argv[1].strip()
    match_id = extract_match_id(input_val)

    try:
        from demoparser2 import DemoParser
    except ImportError:
        print(json.dumps({"error": "demoparser2 Python package not installed"}))
        sys.exit(1)

    demo_file_path = None
    temp_dir = tempfile.mkdtemp()

    try:
        # Check if input is a local file
        if os.path.exists(input_val) and input_val.endswith(".dem"):
            demo_file_path = input_val
        else:
            # Download demo from Cybershoke CDN / demo servers
            demo_urls = [
                f"https://demos.cybershoke.net/{match_id}.dem.bz2",
                f"https://demos.cybershoke.net/matches/{match_id}.dem.bz2",
                f"https://cybershoke.net/demos/{match_id}.dem.bz2",
            ]

            bz2_path = os.path.join(temp_dir, f"{match_id}.dem.bz2")
            dem_path = os.path.join(temp_dir, f"{match_id}.dem")

            download_success = False
            req_headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
            }

            for d_url in demo_urls:
                try:
                    req = urllib.request.Request(d_url, headers=req_headers)
                    with urllib.request.urlopen(req, timeout=10) as response, open(bz2_path, "wb") as out_file:
                        out_file.write(response.read())

                    # Decompress bz2
                    with bz2.open(bz2_path, "rb") as bz_in, open(dem_path, "wb") as dem_out:
                        dem_out.write(bz_in.read())

                    if os.path.exists(dem_path) and os.path.getsize(dem_path) > 1000:
                        demo_file_path = dem_path
                        download_success = True
                        break
                except Exception:
                    continue

        if not demo_file_path or not os.path.exists(demo_file_path):
            print(json.dumps({"error": f"Demo file for match {match_id} could not be downloaded"}))
            sys.exit(0)

        # Parse demo with demoparser2
        parser = DemoParser(demo_file_path)
        header = parser.parse_header()
        raw_map = header.get("map_name", "") or "de_mirage"
        clean_map = raw_map.split("/")[-1].replace(".bsp", "").strip()

        group_A = []
        group_B = []
        all_players = []

        try:
            p_df = parser.parse_player_info()
            if p_df is not None:
                for idx, row in p_df.iterrows():
                    name = row.get("name")
                    t_num = row.get("team_num")
                    if name and isinstance(name, str) and name.strip() and "GOTV" not in name:
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

        # Round end scores
        score_A = 0
        score_B = 0
        try:
            avail = parser.list_game_events()
            r_event = "round_end" if "round_end" in avail else ("round_officially_ended" if "round_officially_ended" in avail else None)
            if r_event:
                df = parser.parse_event(r_event)
                if df is not None:
                    for idx, row in df.iterrows():
                        winner = row.get("winner")
                        if winner == 2:
                            score_A += 1
                        elif winner == 3:
                            score_B += 1
        except Exception:
            pass

        result = {
            "success": True,
            "matchId": match_id,
            "mapName": clean_map,
            "scoreA": score_A,
            "scoreB": score_B,
            "team1Players": group_A,
            "team2Players": group_B,
            "allPlayers": all_players,
        }

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": f"Failed to parse demo: {str(e)}"}))
    finally:
        try:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass

if __name__ == "__main__":
    main()
