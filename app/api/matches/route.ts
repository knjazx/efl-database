import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { ensureUnknownTeam } from "@/lib/unknownTeam";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorized() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("efl_admin_session");
  return sessionToken?.value === "authenticated_efl_admin";
}

export async function GET(req: Request) {
  try {
    await ensureUnknownTeam();
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");

    const whereClause: any = {};
    if (teamId) {
      whereClause.OR = [{ teamAId: teamId }, { teamBId: teamId }];
    }

    const matches = await prisma.match.findMany({
      where: whereClause,
      include: {
        teamA: {
          select: { id: true, name: true, tag: true, slug: true, logoUrl: true, tier: true },
        },
        teamB: {
          select: { id: true, name: true, tag: true, slug: true, logoUrl: true, tier: true },
        },
      },
      orderBy: { scheduledAt: "desc" },
    });

    const upcoming = matches.filter((m) => m.status === "SCHEDULED" || m.status === "LIVE");
    const finished = matches.filter((m) => m.status === "FINISHED");

    return NextResponse.json(
      {
        success: true,
        matches,
        upcoming,
        finished,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/matches error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch matches" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureUnknownTeam();
    const body = await req.json();
    const { teamAId, teamBId, teamCustomNameA, teamCustomNameB, scheduledAt, bestOf, tier } = body;

    if (!teamAId || !teamBId || !scheduledAt) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    if (teamAId === teamBId && teamAId !== "unknown-team-placeholder") {
      return NextResponse.json({ success: false, error: "Team A and Team B cannot be the same" }, { status: 400 });
    }

    const newMatch = await prisma.match.create({
      data: {
        teamAId,
        teamBId,
        teamCustomNameA: teamCustomNameA?.trim() || null,
        teamCustomNameB: teamCustomNameB?.trim() || null,
        scheduledAt: new Date(scheduledAt),
        bestOf: Number(bestOf) || 1,
        tier: tier || "TIER 1",
        status: "SCHEDULED",
      },
      include: {
        teamA: true,
        teamB: true,
      },
    });

    const nameA = newMatch.teamCustomNameA || newMatch.teamA.name;
    const nameB = newMatch.teamCustomNameB || newMatch.teamB.name;

    // Log Activity
    await prisma.activityLog.create({
      data: {
        description: `Запланирован матч: ${nameA} vs ${nameB} (BO${newMatch.bestOf})`,
      },
    });

    return NextResponse.json({ success: true, match: newMatch });
  } catch (error) {
    console.error("POST /api/matches error:", error);
    return NextResponse.json({ success: false, error: "Failed to create match" }, { status: 500 });
  }
}
