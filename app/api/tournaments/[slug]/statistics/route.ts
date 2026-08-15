import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;
    const url = new URL(req.url);
    const stageId = url.searchParams.get("stageId");
    const teamId = url.searchParams.get("teamId");

    const tournament = await prisma.tournament.findFirst({
      where: { OR: [{ slug }, { id: slug }] }
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: "Tournament not found" }, { status: 404 });
    }

    const whereClause: any = {
      match: {
        tournamentId: tournament.id,
      }
    };

    if (stageId) whereClause.match.stageId = stageId;
    if (teamId) whereClause.teamId = teamId;

    const stats = await prisma.playerMatchStats.findMany({
      where: whereClause,
      include: {
        player: true,
        match: {
          include: {
            teamA: true,
            teamB: true
          }
        }
      }
    });

    // Aggregate by player
    const playerMap = new Map();

    stats.forEach(stat => {
      const pId = stat.playerId || stat.playerName;
      if (!playerMap.has(pId)) {
        let tName = "Unknown";
        let tTag = "UNK";
        
        if (stat.teamId) {
           if (stat.match.teamAId === stat.teamId) {
             tName = stat.match.teamA.name;
             tTag = stat.match.teamA.tag;
           } else if (stat.match.teamBId === stat.teamId) {
             tName = stat.match.teamB.name;
             tTag = stat.match.teamB.tag;
           }
        }

        playerMap.set(pId, {
          playerId: stat.playerId,
          playerName: stat.playerName || (stat.player ? stat.player.nickname : "Unknown"),
          playerSlug: stat.player?.slug,
          teamId: stat.teamId,
          teamName: tName,
          teamTag: tTag,
          matchesPlayed: 0,
          totalKills: 0,
          totalDeaths: 0,
          totalAssists: 0,
          totalHeadshots: 0,
          totalDamage: 0,
          sumAdr: 0,
          sumRating: 0,
        });
      }

      const p = playerMap.get(pId);
      p.matchesPlayed += 1;
      p.totalKills += stat.kills;
      p.totalDeaths += stat.deaths;
      p.totalAssists += stat.assists;
      p.totalHeadshots += stat.headshots;
      p.totalDamage += stat.damage;
      p.sumAdr += stat.adr;
      p.sumRating += stat.rating;
    });

    const players = Array.from(playerMap.values()).map(p => {
      const avgAdr = p.matchesPlayed > 0 ? p.sumAdr / p.matchesPlayed : 0;
      const avgRating = p.matchesPlayed > 0 ? p.sumRating / p.matchesPlayed : 0;
      const kdRatio = p.totalDeaths > 0 ? p.totalKills / p.totalDeaths : p.totalKills;
      const hsPercent = p.totalKills > 0 ? (p.totalHeadshots / p.totalKills) * 100 : 0;

      return {
        playerId: p.playerId,
        playerName: p.playerName,
        playerSlug: p.playerSlug,
        teamId: p.teamId,
        teamName: p.teamName,
        teamTag: p.teamTag,
        matchesPlayed: p.matchesPlayed,
        totalKills: p.totalKills,
        totalDeaths: p.totalDeaths,
        totalAssists: p.totalAssists,
        totalHeadshots: p.totalHeadshots,
        totalDamage: p.totalDamage,
        avgAdr: Number(avgAdr.toFixed(1)),
        avgRating: Number(avgRating.toFixed(2)),
        kdRatio: Number(kdRatio.toFixed(2)),
        hsPercent: Number(hsPercent.toFixed(1)),
      };
    });

    players.sort((a, b) => b.avgRating - a.avgRating);

    return NextResponse.json({ success: true, players });

  } catch (error) {
    console.error("GET tournament statistics error:", error);
    return NextResponse.json({ success: false, error: "Failed to load statistics" }, { status: 500 });
  }
}
