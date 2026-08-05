import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/upload";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function isAuthorized() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("efl_admin_session");
  return sessionToken?.value === "authenticated_efl_admin";
}

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      include: {
        memberships: {
          include: {
            team: true,
          },
          orderBy: { joinedAt: "desc" },
        },
      },
      orderBy: { nickname: "asc" },
    });

    const formattedPlayers = players.map((player) => {
      const activeMembership = player.memberships.find((m) => m.status === "ACTIVE");
      return {
        id: player.id,
        nickname: player.nickname,
        slug: player.slug,
        avatarUrl: player.avatarUrl,
        defaultRole: player.defaultRole || "PLAYER",
        steamUrl: player.steamUrl,
        faceitUrl: player.faceitUrl,
        discordUrl: player.discordUrl,
        currentTeam: activeMembership
          ? {
              id: activeMembership.team.id,
              name: activeMembership.team.name,
              tag: activeMembership.team.tag,
              slug: activeMembership.team.slug,
              logoUrl: activeMembership.team.logoUrl,
              role: activeMembership.role,
            }
          : null,
      };
    });

    return NextResponse.json({ success: true, players: formattedPlayers });
  } catch (error) {
    console.error("GET /api/players error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch players" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const nickname = formData.get("nickname") as string;
    const defaultRole = formData.get("role") as string || "PLAYER";
    const steamUrl = formData.get("steamUrl") as string || "";
    const faceitUrl = formData.get("faceitUrl") as string || "";
    const discordUrl = (formData.get("discordUrl") as string || "").trim();
    const avatarFile = formData.get("avatar") as File | null;
    let avatarUrl = formData.get("avatarUrl") as string || "";
    const teamId = formData.get("teamId") as string || "";

    if (!nickname) {
      return NextResponse.json({ success: false, error: "Nickname is required" }, { status: 400 });
    }

    if (avatarFile && avatarFile.size > 0) {
      avatarUrl = await saveUploadedFile(avatarFile, "avatars");
    }

    const slug = nickname.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

    const newPlayer = await prisma.player.create({
      data: {
        nickname,
        slug,
        avatarUrl,
        defaultRole,
        steamUrl,
        faceitUrl,
        discordUrl,
      },
    });

    // If assigned to a team immediately
    if (teamId) {
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (team) {
        await prisma.teamMembership.create({
          data: {
            teamId: team.id,
            playerId: newPlayer.id,
            role: defaultRole,
            status: "ACTIVE",
          },
        });

        await prisma.activityLog.create({
          data: {
            teamId: team.id,
            teamName: team.name,
            description: `Player "${newPlayer.nickname}" added to ${team.name} roster (${defaultRole})`,
          },
        });
      }
    }

    return NextResponse.json({ success: true, player: newPlayer });
  } catch (error: any) {
    console.error("POST /api/players error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create player" }, { status: 500 });
  }
}
