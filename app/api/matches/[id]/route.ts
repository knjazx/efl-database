import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { UNKNOWN_TEAM_ID } from "@/lib/unknownTeam";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorized() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("efl_admin_session");
  return sessionToken?.value === "authenticated_efl_admin";
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const matchId = params.id;
    const body = await req.json();
    const { scoreA, scoreB, status, bestOf, scheduledAt, isForfeit, forfeitReason, teamCustomNameA, teamCustomNameB } = body;

    const existingMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true },
    });

    if (!existingMatch) {
      return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 });
    }

    const nextScoreA = typeof scoreA === "number" ? scoreA : existingMatch.scoreA;
    const nextScoreB = typeof scoreB === "number" ? scoreB : existingMatch.scoreB;
    const nextStatus = status || existingMatch.status;
    const isNowFinished = nextStatus === "FINISHED" && existingMatch.status !== "FINISHED";

    let winnerId: string | null = existingMatch.winnerId;
    if (nextStatus === "FINISHED") {
      if (nextScoreA > nextScoreB) {
        winnerId = existingMatch.teamAId;
      } else if (nextScoreB > nextScoreA) {
        winnerId = existingMatch.teamBId;
      }
    }

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        scoreA: nextScoreA,
        scoreB: nextScoreB,
        status: nextStatus,
        bestOf: typeof bestOf === "number" ? bestOf : existingMatch.bestOf,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : existingMatch.scheduledAt,
        finishedAt: nextStatus === "FINISHED" ? new Date() : existingMatch.finishedAt,
        winnerId,
        isForfeit: typeof isForfeit === "boolean" ? isForfeit : existingMatch.isForfeit,
        forfeitReason: forfeitReason !== undefined ? forfeitReason : existingMatch.forfeitReason,
        teamCustomNameA: teamCustomNameA !== undefined ? (teamCustomNameA?.trim() || null) : existingMatch.teamCustomNameA,
        teamCustomNameB: teamCustomNameB !== undefined ? (teamCustomNameB?.trim() || null) : existingMatch.teamCustomNameB,
      },
      include: {
        teamA: true,
        teamB: true,
      },
    });

    // Auto update team stats if match was finished just now
    if (isNowFinished && winnerId) {
      const winnerTeamId = winnerId;
      const loserTeamId = winnerId === existingMatch.teamAId ? existingMatch.teamBId : existingMatch.teamAId;

      // Winner stats (if not unknown team): wins + 1, points + 3, matchesPlayed + 1
      if (winnerTeamId !== UNKNOWN_TEAM_ID) {
        await prisma.team.update({
          where: { id: winnerTeamId },
          data: {
            wins: { increment: 1 },
            points: { increment: 3 },
            matchesPlayed: { increment: 1 },
          },
        });
      }

      // Loser stats (if not unknown team): losses + 1, matchesPlayed + 1
      if (loserTeamId !== UNKNOWN_TEAM_ID) {
        await prisma.team.update({
          where: { id: loserTeamId },
          data: {
            losses: { increment: 1 },
            matchesPlayed: { increment: 1 },
          },
        });
      }

      const nameA = updatedMatch.teamCustomNameA || updatedMatch.teamA.name;
      const nameB = updatedMatch.teamCustomNameB || updatedMatch.teamB.name;

      // Log Activity
      await prisma.activityLog.create({
        data: {
          description: `Матч завершен: ${nameA} [${nextScoreA}:${nextScoreB}] ${nameB}`,
        },
      });
    }

    return NextResponse.json({ success: true, match: updatedMatch });
  } catch (error) {
    console.error("PUT /api/matches/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update match" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const matchId = params.id;

    // Fetch match before deletion to check if stats need rollback
    const existingMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true },
    });

    if (!existingMatch) {
      return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 });
    }

    // Rollback team stats if this was a finished match with a winner
    if (existingMatch.status === "FINISHED" && existingMatch.winnerId) {
      const winnerTeamId = existingMatch.winnerId;
      const loserTeamId = winnerTeamId === existingMatch.teamAId ? existingMatch.teamBId : existingMatch.teamAId;

      // Rollback winner stats (if not unknown team): wins - 1, points - 3, matchesPlayed - 1
      if (winnerTeamId !== UNKNOWN_TEAM_ID) {
        await prisma.team.update({
          where: { id: winnerTeamId },
          data: {
            wins: { decrement: 1 },
            points: { decrement: 3 },
            matchesPlayed: { decrement: 1 },
          },
        });
      }

      // Rollback loser stats (if not unknown team): losses - 1, matchesPlayed - 1
      if (loserTeamId !== UNKNOWN_TEAM_ID) {
        await prisma.team.update({
          where: { id: loserTeamId },
          data: {
            losses: { decrement: 1 },
            matchesPlayed: { decrement: 1 },
          },
        });
      }

      // Log the rollback
      await prisma.activityLog.create({
        data: {
          description: `Матч удалён (статистика откачена): ${existingMatch.teamA.name} [${existingMatch.scoreA}:${existingMatch.scoreB}] ${existingMatch.teamB.name}`,
        },
      });
    }

    await prisma.match.delete({
      where: { id: matchId },
    });

    return NextResponse.json({ success: true, message: "Match deleted" });
  } catch (error) {
    console.error("DELETE /api/matches/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete match" }, { status: 500 });
  }
}
