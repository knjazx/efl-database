import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/upload";
import { cookies } from "next/headers";

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

    const formattedTeams = teams.map((team) => ({
      id: team.id,
      name: team.name,
      tag: team.tag,
      slug: team.slug,
      tier: team.tier,
      logoUrl: team.logoUrl,
      description: team.description,
      playerCount: team.memberships.length,
      createdAt: team.createdAt,
    }));

    return NextResponse.json({ success: true, teams: formattedTeams });
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
    const tier = formData.get("tier") as string;
    const description = formData.get("description") as string;
    const logoFile = formData.get("logo") as File | null;
    let logoUrl = formData.get("logoUrl") as string || "";

    if (!name || !tag || !tier) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Handle logo file upload if provided
    if (logoFile && logoFile.size > 0) {
      logoUrl = await saveUploadedFile(logoFile, "logos");
    }

    if (!logoUrl) {
      // Default SVG logo if none uploaded
      logoUrl = `/logos/${tag.toLowerCase()}.svg`;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

    const newTeam = await prisma.team.create({
      data: {
        name,
        tag: tag.toUpperCase(),
        slug,
        tier,
        logoUrl,
        description,
      },
    });

    // Record activity log
    await prisma.activityLog.create({
      data: {
        teamId: newTeam.id,
        teamName: newTeam.name,
        description: `Team "${newTeam.name}" created (${newTeam.tier})`,
      },
    });

    return NextResponse.json({ success: true, team: newTeam });
  } catch (error: any) {
    console.error("POST /api/teams error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create team" }, { status: 500 });
  }
}
