import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

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
    const { action, teamId, playerId, playerIds, membershipId, role } = body;

    // Action 1: Add existing player(s) to team
    if (action === "ADD_PLAYER") {
      if (!teamId) {
        return NextResponse.json({ success: false, error: "Missing teamId" }, { status: 400 });
      }

      const idsToAdd: string[] = playerIds && Array.isArray(playerIds) ? playerIds : playerId ? [playerId] : [];

      if (idsToAdd.length === 0) {
        return NextResponse.json({ success: false, error: "No players selected to add" }, { status: 400 });
      }

      const team = await prisma.team.findUnique({ where: { id: teamId } });

      for (const pId of idsToAdd) {
        // Mark any current active membership elsewhere as FORMER
        await prisma.teamMembership.updateMany({
          where: { playerId: pId, status: "ACTIVE" },
          data: { status: "FORMER", leftAt: new Date() },
        });

        const player = await prisma.player.findUnique({ where: { id: pId } });

        const newMembership = await prisma.teamMembership.create({
          data: {
            teamId,
            playerId: pId,
            role: role || player?.defaultRole || "CORE",
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
      }

      return NextResponse.json({ success: true, count: idsToAdd.length });
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
