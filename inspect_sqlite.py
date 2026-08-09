import sqlite3

conn = sqlite3.connect("prisma/dev.db")
cursor = conn.cursor()

tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()
print("Tables in dev.db:", tables)

try:
    teams = cursor.execute("SELECT id, name, tag, tier FROM Team;").fetchall()
    print("--- TEAMS IN SQLITE dev.db ---")
    print(f"Total count: {len(teams)}")
    for t in teams:
        print(t)
except Exception as e:
    print("Error querying Team table:", e)

try:
    players = cursor.execute("SELECT id, nickname FROM Player;").fetchall()
    print("--- PLAYERS IN SQLITE dev.db ---")
    print(f"Total count: {len(players)}")
    for p in players:
        print(p)
except Exception as e:
    print("Error querying Player table:", e)
