import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { UNKNOWN_TEAM_ID } from "@/lib/unknownTeam";
import { syncAllTeamStats } from "@/lib/syncTeamStats";

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

    let winnerId: string | null = existingMatch.winnerId;
    if (nextStatus === "FINISHED") {
      if (nextScoreA > nextScoreB) {
        winnerId = existingMatch.teamAId;
      } else if (nextScoreB > nextScoreA) {
        winnerId = existingMatch.teamBId;
      }
    } else {
      winnerId = null;
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

    // Synchronize team stats automatically across all teams
    await syncAllTeamStats();

    const nameA = updatedMatch.teamCustomNameA || updatedMatch.teamA.name;
    const nameB = updatedMatch.teamCustomNameB || updatedMatch.teamB.name;

    if (nextStatus === "FINISHED") {
      await prisma.activityLog.create({
        data: {
          description: `Матч обновлен/завершен: ${nameA} [${nextScoreA}:${nextScoreB}] ${nameB}`,
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

    const existingMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: { teamA: true, teamB: true },
    });

    if (!existingMatch) {
      return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 });
    }

    await prisma.match.delete({
      where: { id: matchId },
    });

    // Synchronize team stats automatically across all teams after deletion
    await syncAllTeamStats();

    await prisma.activityLog.create({
      data: {
        description: `Матч удалён: ${existingMatch.teamA.name} vs ${existingMatch.teamB.name}`,
      },
    });

    return NextResponse.json({ success: true, message: "Match deleted" });
  } catch (error) {
    console.error("DELETE /api/matches/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete match" }, { status: 500 });
  }
}
