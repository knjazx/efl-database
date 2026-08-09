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

    let team = await prisma.team.findFirst({
      where: {
        OR: [
          { slug: { equals: decodedSlug, mode: "insensitive" } },
          { tag: { equals: decodedSlug, mode: "insensitive" } },
          { name: { equals: decodedSlug, mode: "insensitive" } },
          { id: decodedSlug },
        ],
      },
      include: {
        memberships: {
          include: {
            player: true,
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!team) {
      const allTeams = await prisma.team.findMany({
        include: {
          memberships: {
            include: {
              player: true,
            },
            orderBy: { joinedAt: "asc" },
          },
        },
      });

      team =
        allTeams.find((t) => {
          const cSlug = t.slug.toLowerCase().replace(/[^a-z0-9]/g, "");
          const cTag = t.tag.toLowerCase().replace(/[^a-z0-9]/g, "");
          const cName = t.name.toLowerCase().replace(/[^a-z0-9]/g, "");
          return cSlug === cleanQuery || cTag === cleanQuery || cName === cleanQuery || t.id === decodedSlug;
        }) || null;
    }

    if (!team) {
      return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });
    }

    const activeRoster = team.memberships
      .filter((m) => m.status === "ACTIVE" && m.player)
      .map((m) => ({
        membershipId: m.id,
        id: m.player.id,
        nickname: m.player.nickname,
        slug: m.player.slug,
        role: m.role || m.player.defaultRole || "PLAYER",
        steamUrl: m.player.steamUrl,
        faceitUrl: m.player.faceitUrl,
        discordUrl: m.player.discordUrl,
        isDisqualified: m.player.isDisqualified,
        disqualifiedUntil: m.player.disqualifiedUntil,
        disqualifyReason: m.player.disqualifyReason,
        joinedAt: m.joinedAt,
      }));

    const formerPlayers = team.memberships
      .filter((m) => m.status === "FORMER" && m.player)
      .map((m) => ({
        membershipId: m.id,
        id: m.player.id,
        nickname: m.player.nickname,
        slug: m.player.slug,
        role: m.role || m.player.defaultRole || "PLAYER",
        steamUrl: m.player.steamUrl,
        faceitUrl: m.player.faceitUrl,
        discordUrl: m.player.discordUrl,
        isDisqualified: m.player.isDisqualified,
        disqualifiedUntil: m.player.disqualifiedUntil,
        disqualifyReason: m.player.disqualifyReason,
        joinedAt: m.joinedAt,
        leftAt: m.leftAt,
      }));

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        tag: team.tag,
        slug: team.slug,
        tier: team.tier,
        logoUrl: team.logoUrl,
        description: team.description,
        frameStyle: team.frameStyle || "NONE",
        isDisqualified: team.isDisqualified,
        disqualifiedUntil: team.disqualifiedUntil,
        disqualifyReason: team.disqualifyReason,
        createdAt: team.createdAt,
        activeRoster,
        formerPlayers,
      },
    });
  } catch (error) {
    console.error("GET /api/teams/[slug] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch team profile" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = params;
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const tag = formData.get("tag") as string;
    const tier = (formData.get("tier") as string) || "T1";
    const description = formData.get("description") as string;
    const frameStyle = formData.get("frameStyle") as string;
    const logoFile = formData.get("logo") as File | null;

    const existingTeam = await prisma.team.findFirst({
      where: { OR: [{ slug: slug }, { id: slug }] },
    });

    if (!existingTeam) {
      return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });
    }

    let logoUrl = existingTeam.logoUrl;
    if (logoFile && logoFile.size > 0) {
      logoUrl = await saveUploadedFile(logoFile, "logos");
    }

    const updatedSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

    const updatedTeam = await prisma.team.update({
      where: { id: existingTeam.id },
      data: {
        name,
        tag: tag.toUpperCase(),
        slug: updatedSlug,
        tier,
        logoUrl,
        description,
        ...(frameStyle ? { frameStyle } : {}),
      },
    });

    await prisma.activityLog.create({
      data: {
        teamId: updatedTeam.id,
        teamName: updatedTeam.name,
        description: `Team details updated (${updatedTeam.tag})`,
      },
    });

    return NextResponse.json({ success: true, team: updatedTeam });
  } catch (error: any) {
    console.error("PUT /api/teams/[slug] error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update team" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = params;
    const existingTeam = await prisma.team.findFirst({
      where: { OR: [{ slug: slug }, { id: slug }] },
    });

    if (!existingTeam) {
      return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });
    }

    await prisma.team.delete({
      where: { id: existingTeam.id },
    });

    await prisma.activityLog.create({
      data: {
        description: `Team "${existingTeam.name}" deleted from EFL database`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/teams/[slug] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete team" }, { status: 500 });
  }
}
