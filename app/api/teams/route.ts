import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/upload";
import { cookies } from "next/headers";
import { generateUniqueTeamSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorized() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("efl_admin_session");
  return sessionToken?.value === "authenticated_efl_admin";
}

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        memberships: {
          where: { status: "ACTIVE" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const seenTeamNames = new Set<string>();
    const formattedTeams = teams
      .filter((team) => {
        const key = team.name.toLowerCase().replace(/[^a-z0-9]/g, "") || team.tag.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (seenTeamNames.has(key)) return false;
        seenTeamNames.add(key);
        return true;
      })
      .map((team) => ({
        id: team.id,
        name: team.name,
        tag: team.tag,
        slug: team.slug,
        tier: team.tier || "TIER 1",
        logoUrl: team.logoUrl,
        description: team.description,
        frameStyle: team.frameStyle || "NONE",
        points: team.points || 0,
        wins: team.wins || 0,
        losses: team.losses || 0,
        matchesPlayed: team.matchesPlayed || 0,
        isDisqualified: team.isDisqualified,
        disqualifiedUntil: team.disqualifiedUntil,
        disqualifyReason: team.disqualifyReason,
        playerCount: team.memberships.length,
        createdAt: team.createdAt,
      }));

    return NextResponse.json(
      { success: true, teams: formattedTeams },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/teams error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch teams" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const tag = formData.get("tag") as string;
    const tier = (formData.get("tier") as string) || "T1";
    const description = formData.get("description") as string;
    const frameStyle = (formData.get("frameStyle") as string) || "NONE";
    const logoFile = formData.get("logo") as File | null;
    let logoUrl = (formData.get("logoUrl") as string) || "";

    if (!name || !tag) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    if (logoFile && logoFile.size > 0) {
      logoUrl = await saveUploadedFile(logoFile, "logos");
    }

    const slug = await generateUniqueTeamSlug(name);

    const newTeam = await prisma.team.create({
      data: {
        name,
        tag: tag.toUpperCase(),
        slug,
        tier,
        logoUrl: logoUrl || "",
        description,
        frameStyle,
      },
    });

    await prisma.activityLog.create({
      data: {
        teamId: newTeam.id,
        teamName: newTeam.name,
        description: `Team "${newTeam.name}" created`,
      },
    });

    return NextResponse.json({ success: true, team: newTeam });
  } catch (error: any) {
    console.error("POST /api/teams error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create team" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { teamId, action, durationDays, reason } = body;

    if (!teamId) {
      return NextResponse.json({ success: false, error: "Team ID is required" }, { status: 400 });
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
        logDescription = `Team disqualified for ${durationDays} days. Reason: ${disqualifyReason}`;
      } else {
        disqualifiedUntil = null; // Permanent
        logDescription = `Team permanently disqualified. Reason: ${disqualifyReason}`;
      }
    } else if (action === "UNBAN") {
      isDisqualified = false;
      disqualifiedUntil = null;
      disqualifyReason = null;
      logDescription = `Team disqualification lifted`;
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        isDisqualified,
        disqualifiedUntil,
        disqualifyReason,
      },
    });

    await prisma.activityLog.create({
      data: {
        teamId: updatedTeam.id,
        teamName: updatedTeam.name,
        description: logDescription,
      },
    });

    return NextResponse.json({ success: true, team: updatedTeam });
  } catch (error: any) {
    console.error("PATCH /api/teams error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update team ban status" }, { status: 500 });
  }
}
