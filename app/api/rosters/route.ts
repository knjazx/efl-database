import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

function isAuthorized() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("efl_admin_session");
  return sessionToken?.value === "authenticated_efl_admin";
}

export async function POST(req: Request) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, teamId, playerId, membershipId, role } = body;

    // Action 1: Add existing player to team
    if (action === "ADD_PLAYER") {
      if (!teamId || !playerId) {
        return NextResponse.json({ success: false, error: "Missing teamId or playerId" }, { status: 400 });
      }

      // Check if player has any current active membership and mark as former
      await prisma.teamMembership.updateMany({
        where: { playerId, status: "ACTIVE" },
        data: { status: "FORMER", leftAt: new Date() },
      });

      const player = await prisma.player.findUnique({ where: { id: playerId } });
      const team = await prisma.team.findUnique({ where: { id: teamId } });

      const newMembership = await prisma.teamMembership.create({
        data: {
          teamId,
          playerId,
          role: role || player?.defaultRole || "PLAYER",
          status: "ACTIVE",
          joinedAt: new Date(),
        },
      });

      // Record activity log
      await prisma.activityLog.create({
        data: {
          teamId,
          teamName: team?.name || "Team",
          description: `Player "${player?.nickname}" joined roster as ${newMembership.role}`,
        },
      });

      return NextResponse.json({ success: true, membership: newMembership });
    }

    // Action 2: Change player's role in team
    if (action === "UPDATE_ROLE") {
      if (!membershipId || !role) {
        return NextResponse.json({ success: false, error: "Missing membershipId or role" }, { status: 400 });
      }

      const updated = await prisma.teamMembership.update({
        where: { id: membershipId },
        data: { role },
        include: { player: true, team: true },
      });

      await prisma.activityLog.create({
        data: {
          teamId: updated.teamId,
          teamName: updated.team.name,
          description: `${updated.player.nickname}'s role updated to ${role}`,
        },
      });

      return NextResponse.json({ success: true, membership: updated });
    }

    // Action 3: Remove player from team (move to FORMER players with leftAt)
    if (action === "REMOVE_PLAYER") {
      if (!membershipId) {
        return NextResponse.json({ success: false, error: "Missing membershipId" }, { status: 400 });
      }

      const membership = await prisma.teamMembership.findUnique({
        where: { id: membershipId },
        include: { player: true, team: true },
      });

      if (!membership) {
        return NextResponse.json({ success: false, error: "Membership not found" }, { status: 404 });
      }

      const updated = await prisma.teamMembership.update({
        where: { id: membershipId },
        data: {
          status: "FORMER",
          leftAt: new Date(),
        },
      });

      await prisma.activityLog.create({
        data: {
          teamId: membership.teamId,
          teamName: membership.team.name,
          description: `${membership.player.nickname} left the team roster (${membership.team.name})`,
        },
      });

      return NextResponse.json({ success: true, membership: updated });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/rosters error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update roster" }, { status: 500 });
  }
}
