import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { generateUniqueTeamSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    const { rawText } = await req.json();
    if (!rawText || typeof rawText !== "string") {
      return NextResponse.json({ success: false, error: "Raw text input is required" }, { status: 400 });
    }

    // Parse lines: Format can be "Team Name" OR "Team Name | TAG" OR "Team Name, TAG, Tier"
    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let createdCount = 0;

    for (const line of lines) {
      const parts = line.split(/[|,\t]/).map((p) => p.trim());
      const name = parts[0];
      if (!name) continue;

      let tag = parts[1] || name.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!tag) tag = "TEAM";

      let tier = parts[2] || "T1";
      if (!["T1", "T2", "T3"].includes(tier.toUpperCase())) tier = "T1";

      let frameStyle = parts[3] || "NONE";

      const slug = await generateUniqueTeamSlug(name);

      await prisma.team.upsert({
        where: { slug },
        update: {},
        create: {
          name,
          tag: tag.toUpperCase(),
          slug,
          tier: tier.toUpperCase(),
          logoUrl: `/logos/${tag.toLowerCase()}.svg`,
          frameStyle: frameStyle.toUpperCase(),
        },
      });

      createdCount++;
    }

    await prisma.activityLog.create({
      data: {
        description: `Bulk imported ${createdCount} teams into EFL database`,
      },
    });

    return NextResponse.json({ success: true, count: createdCount });
  } catch (error: any) {
    console.error("POST /api/teams/bulk error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to bulk import teams" }, { status: 500 });
  }
}
