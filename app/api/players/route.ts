import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/upload";
import { cookies } from "next/headers";
import { generateUniquePlayerSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    const seenPlayerNicks = new Set<string>();
    const formattedPlayers = players
      .filter((player) => {
        const key = player.nickname.toLowerCase().trim();
        if (seenPlayerNicks.has(key)) return false;
        seenPlayerNicks.add(key);
        return true;
      })
      .map((player) => {
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
          isDisqualified: player.isDisqualified,
          disqualifiedUntil: player.disqualifiedUntil,
          disqualifyReason: player.disqualifyReason,
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

    return NextResponse.json(
      { success: true, players: formattedPlayers },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
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
    const defaultRole = (formData.get("role") as string) || "PLAYER";
    const steamUrl = (formData.get("steamUrl") as string) || "";
    const faceitUrl = (formData.get("faceitUrl") as string) || "";
    const discordUrl = ((formData.get("discordUrl") as string) || "").trim();
    const teamId = (formData.get("teamId") as string) || "";
    const avatarFile = formData.get("avatar") as File | null;

    if (!nickname) {
      return NextResponse.json({ success: false, error: "Nickname is required" }, { status: 400 });
    }

    const slug = await generateUniquePlayerSlug(nickname);

    let avatarUrl: string | undefined = undefined;
    if (avatarFile && avatarFile.size > 0) {
      avatarUrl = await saveUploadedFile(avatarFile, "avatars");
    }

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
            description: `Player "${newPlayer.nickname}" added to ${team.name} roster`,
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

export async function PATCH(req: Request) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { playerId, action, durationDays, reason } = body;

    if (!playerId) {
      return NextResponse.json({ success: false, error: "Player ID is required" }, { status: 400 });
    }

    let isDisqualified = false;
    let disqualifiedUntil: Date | null = null;
    let disqualifyReason: string | null = null;
    let logDescription = "";

    if (action === "DISQUALIFY") {
      isDisqualified = true;
      disqualifyReason = reason || "Нарушение регламента лиги";

      if (durationDays && typeof durationDays === "number" && durationDays > 0) {
        disqualifiedUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
        logDescription = `Player disqualified for ${durationDays} days. Reason: ${disqualifyReason}`;
      } else {
        disqualifiedUntil = null; // Permanent
        logDescription = `Player permanently disqualified. Reason: ${disqualifyReason}`;
      }
    } else if (action === "UNBAN") {
      isDisqualified = false;
      disqualifiedUntil = null;
      disqualifyReason = null;
      logDescription = `Player disqualification lifted`;
    }

    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        isDisqualified,
        disqualifiedUntil,
        disqualifyReason,
      },
    });

    await prisma.activityLog.create({
      data: {
        description: `Player "${updatedPlayer.nickname}": ${logDescription}`,
      },
    });

    return NextResponse.json({ success: true, player: updatedPlayer });
  } catch (error: any) {
    console.error("PATCH /api/players error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update player ban status" }, { status: 500 });
  }
}
