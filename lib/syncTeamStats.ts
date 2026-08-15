import { prisma } from "./prisma";

export async function syncAllTeamStats() {
  const [teams, finishedMatches] = await Promise.all([
    prisma.team.findMany({
      select: { id: true, wins: true, losses: true, points: true, matchesPlayed: true },
    }),
    prisma.match.findMany({
      where: { status: "FINISHED" },
      select: { teamAId: true, teamBId: true, scoreA: true, scoreB: true, winnerId: true },
    }),
  ]);

  const statsMap: Record<string, { wins: number; losses: number; points: number; matchesPlayed: number }> = {};

  for (const t of teams) {
    statsMap[t.id] = { wins: 0, losses: 0, points: 0, matchesPlayed: 0 };
  }

  for (const m of finishedMatches) {
    const isAWin = m.winnerId === m.teamAId || m.scoreA > m.scoreB;
    const isBWin = m.winnerId === m.teamBId || m.scoreB > m.scoreA;

    if (statsMap[m.teamAId]) {
      statsMap[m.teamAId].matchesPlayed += 1;
      if (isAWin) {
        statsMap[m.teamAId].wins += 1;
        statsMap[m.teamAId].points += 3;
      } else if (isBWin) {
        statsMap[m.teamAId].losses += 1;
      }
    }

    if (statsMap[m.teamBId]) {
      statsMap[m.teamBId].matchesPlayed += 1;
      if (isBWin) {
        statsMap[m.teamBId].wins += 1;
        statsMap[m.teamBId].points += 3;
      } else if (isAWin) {
        statsMap[m.teamBId].losses += 1;
      }
    }
  }

  const updates: any[] = [];
  for (const t of teams) {
    if (t.id === "unknown-team-placeholder") continue;
    const s = statsMap[t.id] || { wins: 0, losses: 0, points: 0, matchesPlayed: 0 };
    if (t.wins !== s.wins || t.losses !== s.losses || t.points !== s.points || t.matchesPlayed !== s.matchesPlayed) {
      updates.push(
        prisma.team.update({
          where: { id: t.id },
          data: {
            wins: s.wins,
            losses: s.losses,
            points: s.points,
            matchesPlayed: s.matchesPlayed,
          },
        })
      );
    }
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  return statsMap;
}
