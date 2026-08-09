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

export async function PUT(req: Request) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { teamId, tier, points, wins, losses, matchesPlayed } = body;

    if (!teamId) {
      return NextResponse.json({ success: false, error: "Team ID is required" }, { status: 400 });
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        tier: tier !== undefined ? tier : undefined,
        points: typeof points === "number" ? points : undefined,
        wins: typeof wins === "number" ? wins : undefined,
        losses: typeof losses === "number" ? losses : undefined,
        matchesPlayed: typeof matchesPlayed === "number" ? matchesPlayed : undefined,
      },
    });

    await prisma.activityLog.create({
      data: {
        teamId: updatedTeam.id,
        teamName: updatedTeam.name,
        description: `Администратор обновил рейтинг команды ${updatedTeam.name}: ${updatedTeam.tier}, ${updatedTeam.points} PTS (${updatedTeam.wins}W/${updatedTeam.losses}L)`,
      },
    });

    return NextResponse.json({ success: true, team: updatedTeam });
  } catch (error) {
    console.error("PUT /api/admin/rankings error:", error);
    return NextResponse.json({ success: false, error: "Failed to update team rankings" }, { status: 500 });
  }
}
