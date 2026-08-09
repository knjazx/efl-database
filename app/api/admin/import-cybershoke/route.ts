import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { execFile } from "child_process";
import path from "path";
import util from "util";
import fs from "fs";
import os from "os";

const execFilePromise = util.promisify(execFile);

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

function cleanString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9а-яё]/gi, "").trim();
}

function matchesPlayer(demoPlayerName: string, dbPlayerNick: string, dbSteamUrl?: string | null): boolean {
  const rawDemo = demoPlayerName.toLowerCase().trim();
  const rawDb = dbPlayerNick.toLowerCase().trim();

  if (rawDemo === rawDb) return true;

  const cDemo = cleanString(demoPlayerName);
  const cDb = cleanString(dbPlayerNick);

  if (cDemo.length >= 3 && cDb.length >= 3) {
    if (cDemo === cDb) return true;
    if (cDemo.includes(cDb) || cDb.includes(cDemo)) return true;
  }

  if (dbSteamUrl) {
    const cSteam = cleanString(dbSteamUrl);
    if (cSteam.length >= 3 && (rawDemo.includes(cSteam) || cSteam.includes(rawDemo))) return true;
  }

  return false;
}

export async function POST(req: Request) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let body: any = {};
    let uploadedFilePath: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("demoFile") as File | null;
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const tempDir = os.tmpdir();
        uploadedFilePath = path.join(tempDir, `upload_${Date.now()}_${file.name}`);
        fs.writeFileSync(uploadedFilePath, buffer);
      }
      body = {
        action: formData.get("action")?.toString(),
        matchUrl: formData.get("matchUrl")?.toString(),
        teamAId: formData.get("teamAId")?.toString(),
        teamBId: formData.get("teamBId")?.toString(),
        scoreA: formData.get("scoreA")?.toString(),
        scoreB: formData.get("scoreB")?.toString(),
        bestOf: formData.get("bestOf")?.toString(),
        tier: formData.get("tier")?.toString(),
        rawText: formData.get("rawText")?.toString(),
      };
    } else {
      body = await req.json();
    }

    const {
      matchUrl,
      action,
      teamAId,
      teamBId,
      scoreA,
      scoreB,
      bestOf,
      tier,
      clientTeam1Players,
      clientTeam2Players,
      clientScoreA,
      clientScoreB,
      rawText,
    } = body;

    // Handle Confirmation & Publishing Phase
    if (action === "CONFIRM") {
      if (!teamAId || !teamBId) {
        return NextResponse.json({ success: false, error: "Выберите обе команды" }, { status: 400 });
      }

      if (teamAId === teamBId) {
        return NextResponse.json({ success: false, error: "Команды не могут совпадать" }, { status: 400 });
      }

      const sA = Number(scoreA) ?? 0;
      const sB = Number(scoreB) ?? 0;
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
            description: `Импортирован матч Cybershoke/Demo: ${newMatch.teamA.name} [${sA}:${sB}] ${newMatch.teamB.name}`,
          },
        });
      }

      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        try { fs.unlinkSync(uploadedFilePath); } catch (e) {}
      }

      return NextResponse.json({ success: true, match: newMatch });
    }

    // Handle Fetch & Parse Phase
    let rawScoreA = clientScoreA !== undefined ? Number(clientScoreA) : 13;
    let rawScoreB = clientScoreB !== undefined ? Number(clientScoreB) : 9;
    let team1Players: string[] = Array.isArray(clientTeam1Players) ? clientTeam1Players : [];
    let team2Players: string[] = Array.isArray(clientTeam2Players) ? clientTeam2Players : [];
    const matchId = matchUrl ? extractCybershokeMatchId(matchUrl) : "DEMO_PARSED";

    // 1. Try demoparser2 execution on uploaded file or match URL
    const targetInput = uploadedFilePath || matchUrl;
    if (targetInput) {
      const pythonCommands = process.env.PYTHON_PATH
        ? [process.env.PYTHON_PATH]
        : process.platform === "win32"
        ? ["python", "python3", "C:\\Users\\knjazx\\AppData\\Local\\Programs\\Python\\Python312\\python.exe"]
        : ["python3", "python", "/usr/bin/python3", "/usr/local/bin/python3"];

      const pythonScript = path.join(process.cwd(), "parse_cybershoke_demo.py");
      let parsedSuccessfully = false;

      for (const pyCmd of pythonCommands) {
        if (parsedSuccessfully) break;
        try {
          const { stdout } = await execFilePromise(pyCmd, [pythonScript, targetInput], {
            timeout: 120000,
            env: {
              ...process.env,
              PATH: `${process.env.PATH || ""};C:\\Users\\knjazx\\AppData\\Local\\Programs\\Python\\Python312;/usr/bin;/usr/local/bin`,
            },
          });

          if (stdout) {
            const pyRes = JSON.parse(stdout.trim());
            if (pyRes.success) {
              rawScoreA = pyRes.scoreA ?? rawScoreA;
              rawScoreB = pyRes.scoreB ?? rawScoreB;
              if (Array.isArray(pyRes.team1Players) && pyRes.team1Players.length > 0) {
                team1Players = pyRes.team1Players;
              }
              if (Array.isArray(pyRes.team2Players) && pyRes.team2Players.length > 0) {
                team2Players = pyRes.team2Players;
              }
              parsedSuccessfully = true;
            }
          }
        } catch (pyErr) {
          console.warn(`Python execution attempt '${pyCmd}' failed:`, pyErr);
        }
      }

      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        try { fs.unlinkSync(uploadedFilePath); } catch (e) {}
      }
    }

    // 2. If raw text or demo parse text was provided, parse scores & nicknames from it
    if (rawText && typeof rawText === "string") {
      const scoreMatch = rawText.match(/(\d{1,2})\s*[:\-]\s*(\d{1,2})/);
      if (scoreMatch) {
        rawScoreA = parseInt(scoreMatch[1], 10);
        rawScoreB = parseInt(scoreMatch[2], 10);
      }

      const tokens = rawText
        .split(/[\s,;:|\n\r]+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2 && !/^\d+$/.test(t));

      if (team1Players.length === 0) team1Players = tokens;
    }

    // Query DB Teams & Players to match compositions accurately
    const allTeams = await prisma.team.findMany({
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: { player: true },
        },
      },
    });

    let detectedTeamA: any = null;
    let detectedTeamB: any = null;
    let matchedCountA = 0;
    let matchedCountB = 0;
    let matchedNamesA: string[] = [];
    let matchedNamesB: string[] = [];

    // Roster Overlap Matcher for Team 1
    let maxVotesA = 0;
    for (const t of allTeams) {
      let votes = 0;
      const names: string[] = [];
      for (const m of t.memberships) {
        const isMatched =
          team1Players.some((p) => matchesPlayer(p, m.player.nickname, m.player.steamUrl)) ||
          (rawText && matchesPlayer(rawText, m.player.nickname, m.player.steamUrl));

        if (isMatched) {
          votes++;
          names.push(m.player.nickname);
        }
      }
      if (votes > maxVotesA) {
        maxVotesA = votes;
        detectedTeamA = t;
        matchedCountA = votes;
        matchedNamesA = names;
      }
    }

    // Roster Overlap Matcher for Team 2
    let maxVotesB = 0;
    for (const t of allTeams) {
      if (detectedTeamA && t.id === detectedTeamA.id) continue;
      let votes = 0;
      const names: string[] = [];
      for (const m of t.memberships) {
        const isMatched =
          team2Players.some((p) => matchesPlayer(p, m.player.nickname, m.player.steamUrl)) ||
          (rawText && matchesPlayer(rawText, m.player.nickname, m.player.steamUrl));

        if (isMatched) {
          votes++;
          names.push(m.player.nickname);
        }
      }
      if (votes > maxVotesB) {
        maxVotesB = votes;
        detectedTeamB = t;
        matchedCountB = votes;
        matchedNamesB = names;
      }
    }

    if (matchedCountA === 0) detectedTeamA = null;
    if (matchedCountB === 0) detectedTeamB = null;

    return NextResponse.json({
      success: true,
      matchId,
      scoreA: rawScoreA,
      scoreB: rawScoreB,
      team1Players,
      team2Players,
      teamA: detectedTeamA
        ? { id: detectedTeamA.id, name: detectedTeamA.name, tag: detectedTeamA.tag, logoUrl: detectedTeamA.logoUrl, matchedPlayers: matchedCountA, matchedNames: matchedNamesA }
        : null,
      teamB: detectedTeamB
        ? { id: detectedTeamB.id, name: detectedTeamB.name, tag: detectedTeamB.tag, logoUrl: detectedTeamB.logoUrl, matchedPlayers: matchedCountB, matchedNames: matchedNamesB }
        : null,
      availableTeams: allTeams.map((t) => ({ id: t.id, name: t.name, tag: t.tag, logoUrl: t.logoUrl })),
    });
  } catch (error) {
    console.error("POST /api/admin/import-cybershoke error:", error);
    return NextResponse.json({ success: false, error: "Ошибка при обработке файла демо или ссылки" }, { status: 500 });
  }
}
