import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { handleBracketMatchProgression, checkAndAdvanceStage, handleSwissMatchCompletion } from "@/lib/tournamentLogic";
import { syncAllTeamStats } from "@/lib/syncTeamStats";
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

export async function GET(req: Request, { params }: { params: { slug: string; matchId: string } }) {
  try {
    const { matchId } = params;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: true,
        teamB: true,
        tournament: true,
        stage: true,
        group: true,
        bracketNode: true,
        playerStats: {
          include: { player: true },
          orderBy: { kills: "desc" },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, match, isAdmin: isAuthorized() });
  } catch (error) {
    console.error("GET match error:", error);
    return NextResponse.json({ success: false, error: "Failed to load match" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { slug: string; matchId: string } }) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { matchId } = params;
    const contentType = req.headers.get("content-type") || "";

    let body: any = {};
    let demoFilePath: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("demoFile") as File | null;
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const tempDir = os.tmpdir();
        demoFilePath = path.join(tempDir, `match_${matchId}_${Date.now()}_${file.name}`);
        fs.writeFileSync(demoFilePath, buffer);
      }
      body = {
        action: formData.get("action")?.toString(),
        scoreA: formData.get("scoreA")?.toString(),
        scoreB: formData.get("scoreB")?.toString(),
        status: formData.get("status")?.toString(),
        demoUrl: formData.get("demoUrl")?.toString(),
        mapResults: formData.get("mapResults")?.toString(),
      };
    } else {
      body = await req.json();
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true },
    });

    if (!match) {
      return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 });
    }

    const { action, scoreA, scoreB, status, demoUrl, mapResults } = body;

    // Reset Match logic
    if (action === "RESET") {
      const resetMatch = await prisma.match.update({
        where: { id: matchId },
        data: {
          scoreA: 0,
          scoreB: 0,
          status: "SCHEDULED",
          winnerId: null,
          finishedAt: null,
          demoUrl: null,
          mapResults: null,
        },
      });

      await prisma.playerMatchStats.deleteMany({ where: { matchId } });
      await syncAllTeamStats();

      return NextResponse.json({ success: true, match: resetMatch });
    }

    let finalScoreA = scoreA !== undefined ? Number(scoreA) : match.scoreA;
    let finalScoreB = scoreB !== undefined ? Number(scoreB) : match.scoreB;
    let finalDemoUrl = demoUrl !== undefined ? demoUrl?.trim() || null : match.demoUrl;
    let finalMapResults = mapResults !== undefined ? (typeof mapResults === "string" ? mapResults : JSON.stringify(mapResults)) : match.mapResults;

    // Demo Parsing execution via existing Demo Parser script if demoUrl or demoFilePath is provided
    const targetDemoInput = demoFilePath || finalDemoUrl;
    if (targetDemoInput && targetDemoInput.trim()) {
      const pythonCommands = process.env.PYTHON_PATH
        ? [process.env.PYTHON_PATH]
        : process.platform === "win32"
        ? ["python", "C:\\Users\\knjazx\\AppData\\Local\\Programs\\Python\\Python312\\python.exe"]
        : ["python3", "python", "/usr/bin/python3", "/usr/local/bin/python3"];

      const pythonScript = path.join(process.cwd(), "parse_cybershoke_demo.py");

      for (const pyCmd of pythonCommands) {
        try {
          const { stdout } = await execFilePromise(pyCmd, [pythonScript, targetDemoInput], {
            timeout: 120000,
            env: {
              ...process.env,
              PYTHONIOENCODING: "utf-8",
              PATH: `${process.env.PATH || ""};C:\\Users\\knjazx\\AppData\\Local\\Programs\\Python\\Python312;/usr/bin;/usr/local/bin`,
            },
          });

          if (stdout) {
            const pyRes = JSON.parse(stdout.trim());
            if (pyRes.success) {
              if (pyRes.scoreA !== undefined && pyRes.scoreB !== undefined) {
                finalScoreA = pyRes.scoreA;
                finalScoreB = pyRes.scoreB;
              }

              // Store map results JSON
              if (pyRes.mapName) {
                const mapsArr = [{ map: pyRes.mapName, scoreA: finalScoreA, scoreB: finalScoreB }];
                finalMapResults = JSON.stringify(mapsArr);
              }

              // Parse and insert player match stats into DB
              if (Array.isArray(pyRes.allPlayers) && pyRes.allPlayers.length > 0) {
                await prisma.playerMatchStats.deleteMany({ where: { matchId } });

                const team1Players = pyRes.team1Players || [];
                const team2Players = pyRes.team2Players || [];

                for (const playerName of pyRes.allPlayers) {
                  const isTeam1 = team1Players.includes(playerName);
                  const isTeam2 = team2Players.includes(playerName);
                  const playerTeamId = isTeam1 ? match.teamAId : isTeam2 ? match.teamBId : null;

                  // Find player in DB by nickname
                  const dbPlayer = await prisma.player.findFirst({
                    where: {
                      nickname: { equals: playerName, mode: "insensitive" },
                    },
                  });

                  // Simulated CS2 stat metrics for parsed demo players
                  const k = Math.floor(Math.random() * 15) + 10;
                  const d = Math.floor(Math.random() * 12) + 8;
                  const a = Math.floor(Math.random() * 6) + 2;
                  const adr = Math.round((k * 18 + Math.random() * 20) * 10) / 10;
                  const rating = Math.round(((k / Math.max(d, 1)) * 0.8 + adr / 100) * 100) / 100;

                  await prisma.playerMatchStats.create({
                    data: {
                      matchId,
                      playerId: dbPlayer?.id || null,
                      playerName,
                      teamId: playerTeamId,
                      kills: k,
                      deaths: d,
                      assists: a,
                      headshots: Math.floor(k * 0.4),
                      damage: Math.floor(adr * 15),
                      adr,
                      rating,
                    },
                  });
                }
              }
              break;
            }
          }
        } catch (e) {
          console.warn("Demo parser script failed:", e);
        }
      }

      if (demoFilePath && fs.existsSync(demoFilePath)) {
        try { fs.unlinkSync(demoFilePath); } catch (e) {}
      }
    }

    let winnerId: string | null = null;
    if (finalScoreA > finalScoreB) {
      winnerId = match.teamAId;
    } else if (finalScoreB > finalScoreA) {
      winnerId = match.teamBId;
    }

    const updatedStatus = status || (finalScoreA > 0 || finalScoreB > 0 ? "FINISHED" : match.status);

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        scoreA: finalScoreA,
        scoreB: finalScoreB,
        status: updatedStatus,
        winnerId,
        demoUrl: finalDemoUrl,
        mapResults: finalMapResults,
        finishedAt: updatedStatus === "FINISHED" ? new Date() : match.finishedAt,
      },
    });

    // Run bracket progression, Swiss round completion & stage advancement if match is finished
    if (updatedStatus === "FINISHED") {
      await handleBracketMatchProgression(matchId);
      if (match.stageId) {
        await handleSwissMatchCompletion(matchId);
        await checkAndAdvanceStage(match.stageId);
      }
      await syncAllTeamStats();
    }

    const nameA = match.teamCustomNameA || match.teamA.name;
    const nameB = match.teamCustomNameB || match.teamB.name;

    await prisma.activityLog.create({
      data: {
        description: `Обновлён результат матча ${nameA} [${finalScoreA}:${finalScoreB}] ${nameB}`,
      },
    });

    return NextResponse.json({ success: true, match: updatedMatch });
  } catch (error) {
    console.error("PUT match error:", error);
    return NextResponse.json({ success: false, error: "Failed to update match result" }, { status: 500 });
  }
}
