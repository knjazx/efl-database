import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/upload";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorized() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("efl_admin_session");
  return sessionToken?.value === "authenticated_efl_admin";
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    let rawSlug = params.slug || "";
    try {
      rawSlug = decodeURIComponent(rawSlug);
      if (rawSlug.includes("%")) {
        rawSlug = decodeURIComponent(rawSlug);
      }
    } catch (e) {}

    const decodedSlug = rawSlug.trim();
    const cleanQuery = decodedSlug.toLowerCase().replace(/[^a-z0-9]/g, "");

    let player = await prisma.player.findFirst({
      where: {
        OR: [
          { slug: { equals: decodedSlug, mode: "insensitive" } },
          { nickname: { equals: decodedSlug, mode: "insensitive" } },
          { id: decodedSlug },
        ],
      },
      include: {
        memberships: {
          include: {
            team: true,
          },
          orderBy: { joinedAt: "desc" },
        },
      },
    });

    if (!player) {
      const allPlayers = await prisma.player.findMany({
        include: {
          memberships: {
            include: {
              team: true,
            },
            orderBy: { joinedAt: "desc" },
          },
        },
      });

      player =
        allPlayers.find((p) => {
          const cSlug = p.slug.toLowerCase().replace(/[^a-z0-9]/g, "");
          const cNick = p.nickname.toLowerCase().replace(/[^a-z0-9]/g, "");
          return cSlug === cleanQuery || cNick === cleanQuery || p.id === decodedSlug;
        }) || null;
    }

    if (!player) {
      return NextResponse.json({ success: false, error: "Player not found" }, { status: 404 });
    }

    const activeMembership = player.memberships.find((m) => m.status === "ACTIVE");
    const formerMemberships = player.memberships
      .filter((m) => m.status === "FORMER")
      .map((m) => ({
        teamId: m.team.id,
        teamName: m.team.name,
        teamTag: m.team.tag,
        teamSlug: m.team.slug,
        teamLogoUrl: m.team.logoUrl,
        role: m.role,
        joinedAt: m.joinedAt,
        leftAt: m.leftAt,
      }));

    return NextResponse.json({
      success: true,
      player: {
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
        createdAt: player.createdAt,
        currentTeam: activeMembership
          ? {
              id: activeMembership.team.id,
              name: activeMembership.team.name,
              tag: activeMembership.team.tag,
              slug: activeMembership.team.slug,
              logoUrl: activeMembership.team.logoUrl,
              role: activeMembership.role,
              joinedAt: activeMembership.joinedAt,
            }
          : null,
        history: formerMemberships,
      },
    });
  } catch (error) {
    console.error("GET /api/players/[slug] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch player profile" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = params;
    const formData = await req.formData();
    const nickname = formData.get("nickname") as string;
    const defaultRole = (formData.get("role") as string) || "PLAYER";
    const steamUrl = (formData.get("steamUrl") as string) || "";
    const faceitUrl = (formData.get("faceitUrl") as string) || "";
    const discordUrl = ((formData.get("discordUrl") as string) || "").trim();
    const avatarFile = formData.get("avatar") as File | null;

    const existingPlayer = await prisma.player.findFirst({
      where: { OR: [{ slug: slug }, { id: slug }] },
    });

    if (!existingPlayer) {
      return NextResponse.json({ success: false, error: "Player not found" }, { status: 404 });
    }

    let avatarUrl = existingPlayer.avatarUrl;
    if (avatarFile && avatarFile.size > 0) {
      avatarUrl = await saveUploadedFile(avatarFile, "avatars");
    }

    const updatedSlug = nickname.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

    const updatedPlayer = await prisma.player.update({
      where: { id: existingPlayer.id },
      data: {
        nickname,
        slug: updatedSlug,
        defaultRole,
        avatarUrl,
        steamUrl,
        faceitUrl,
        discordUrl,
      },
    });

    return NextResponse.json({ success: true, player: updatedPlayer });
  } catch (error: any) {
    console.error("PUT /api/players/[slug] error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update player" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = params;
    const existingPlayer = await prisma.player.findFirst({
      where: { OR: [{ slug: slug }, { id: slug }] },
    });

    if (!existingPlayer) {
      return NextResponse.json({ success: false, error: "Player not found" }, { status: 404 });
    }

    await prisma.player.delete({
      where: { id: existingPlayer.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/players/[slug] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete player" }, { status: 500 });
  }
}
