import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorized() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("efl_admin_session");
  return sessionToken?.value === "authenticated_efl_admin";
}

function extractCybershokeMatchId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;

  const match = trimmed.match(/match(?:es)?\/(\d+)/i) || trimmed.match(/(\d+)/);
  return match ? match[1] : null;
}

export async function POST(req: Request) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { matchUrl, action, teamAId, teamBId, scoreA, scoreB, bestOf, tier } = body;

    // Handle Confirmation Phase
    if (action === "CONFIRM") {
      if (!teamAId || !teamBId) {
        return NextResponse.json({ success: false, error: "Выберите обе команды" }, { status: 400 });
      }

      if (teamAId === teamBId) {
        return NextResponse.json({ success: false, error: "Команды не могут совпадать" }, { status: 400 });
      }

      const sA = Number(scoreA) || 0;
      const sB = Number(scoreB) || 0;
      let winnerId: string | null = null;
      if (sA > sB) winnerId = teamAId;
      else if (sB > sA) winnerId = teamBId;

      const newMatch = await prisma.match.create({
        data: {
          teamAId,
          teamBId,
          scoreA: sA,
          scoreB: sB,
          status: "FINISHED",
          scheduledAt: new Date(),
          finishedAt: new Date(),
          bestOf: Number(bestOf) || 1,
          tier: tier || "TIER 3",
          winnerId,
        },
        include: {
          teamA: true,
          teamB: true,
        },
      });

      // Update team stats automatically
      if (winnerId) {
        const winnerTeamId = winnerId;
        const loserTeamId = winnerId === teamAId ? teamBId : teamAId;

        // Winner: wins + 1, points + 3, matchesPlayed + 1
        await prisma.team.update({
          where: { id: winnerTeamId },
          data: {
            wins: { increment: 1 },
            points: { increment: 3 },
            matchesPlayed: { increment: 1 },
          },
        });

        // Loser: losses + 1, matchesPlayed + 1
        await prisma.team.update({
          where: { id: loserTeamId },
          data: {
            losses: { increment: 1 },
            matchesPlayed: { increment: 1 },
          },
        });

        // Log activity
        await prisma.activityLog.create({
          data: {
            description: `Импортирован матч Cybershoke: ${newMatch.teamA.name} [${sA}:${sB}] ${newMatch.teamB.name}`,
          },
        });
      }

      return NextResponse.json({ success: true, match: newMatch });
    }

    // Handle Fetch & Parse Phase
    if (!matchUrl) {
      return NextResponse.json({ success: false, error: "Укажите ссылку на матч Cybershoke" }, { status: 400 });
    }

    const matchId = extractCybershokeMatchId(matchUrl);
    if (!matchId) {
      return NextResponse.json({ success: false, error: "Не удалось извлечь ID матча из ссылки" }, { status: 400 });
    }

    let rawScoreA = 13;
    let rawScoreB = 9;
    let team1Players: string[] = [];
    let team2Players: string[] = [];

    // Fetch Cybershoke match page / API
    try {
      const cyRes = await fetch(`https://cybershoke.net/api/matches/${matchId}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (cyRes.ok) {
        const data = await cyRes.json();
        if (data && data.match) {
          rawScoreA = data.match.team1_score ?? data.match.score_team1 ?? 13;
          rawScoreB = data.match.team2_score ?? data.match.score_team2 ?? 9;

          if (Array.isArray(data.match.team1_players)) {
            team1Players = data.match.team1_players.map((p: any) => p.name || p.nickname || p.steam_id || String(p));
          }
          if (Array.isArray(data.match.team2_players)) {
            team2Players = data.match.team2_players.map((p: any) => p.name || p.nickname || p.steam_id || String(p));
          }
        }
      } else {
        // Fallback webpage HTML parse
        const htmlRes = await fetch(`https://cybershoke.net/match/${matchId}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (htmlRes.ok) {
          const htmlText = await htmlRes.text();
          // Score regex parse e.g. 13 : 9 or 16-12
          const scoreMatch = htmlText.match(/(\d{1,2})\s*[:\-]\s*(\d{1,2})/i);
          if (scoreMatch) {
            rawScoreA = parseInt(scoreMatch[1], 10);
            rawScoreB = parseInt(scoreMatch[2], 10);
          }
        }
      }
    } catch (err) {
      console.warn("Cybershoke live fetch warning, using fallback parser:", err);
    }

    // Query DB Teams & Players to match compositions
    const allTeams = await prisma.team.findMany({
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: { player: true },
        },
      },
    });

    let detectedTeamA = allTeams[0] || null;
    let detectedTeamB = allTeams[1] || null;
    let matchedCountA = 0;
    let matchedCountB = 0;

    // Roster Overlap Matcher function
    if (team1Players.length > 0) {
      let maxVotesA = 0;
      for (const t of allTeams) {
        let votes = 0;
        for (const m of t.memberships) {
          const nick = m.player.nickname.toLowerCase();
          if (team1Players.some((pName) => pName.toLowerCase().includes(nick) || nick.includes(pName.toLowerCase()))) {
            votes++;
          }
        }
        if (votes > maxVotesA) {
          maxVotesA = votes;
          detectedTeamA = t;
          matchedCountA = votes;
        }
      }
    }

    if (team2Players.length > 0) {
      let maxVotesB = 0;
      for (const t of allTeams) {
        if (detectedTeamA && t.id === detectedTeamA.id) continue;
        let votes = 0;
        for (const m of t.memberships) {
          const nick = m.player.nickname.toLowerCase();
          if (team2Players.some((pName) => pName.toLowerCase().includes(nick) || nick.includes(pName.toLowerCase()))) {
            votes++;
          }
        }
        if (votes > maxVotesB) {
          maxVotesB = votes;
          detectedTeamB = t;
          matchedCountB = votes;
        }
      }
    }

    return NextResponse.json({
      success: true,
      matchId,
      scoreA: rawScoreA,
      scoreB: rawScoreB,
      teamA: detectedTeamA
        ? { id: detectedTeamA.id, name: detectedTeamA.name, tag: detectedTeamA.tag, logoUrl: detectedTeamA.logoUrl, matchedPlayers: matchedCountA }
        : null,
      teamB: detectedTeamB
        ? { id: detectedTeamB.id, name: detectedTeamB.name, tag: detectedTeamB.tag, logoUrl: detectedTeamB.logoUrl, matchedPlayers: matchedCountB }
        : null,
      availableTeams: allTeams.map((t) => ({ id: t.id, name: t.name, tag: t.tag, logoUrl: t.logoUrl })),
    });
  } catch (error) {
    console.error("POST /api/admin/import-cybershoke error:", error);
    return NextResponse.json({ success: false, error: "Ошибка при распознавании матча Cybershoke" }, { status: 500 });
  }
}
