import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorized() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("efl_admin_session");
  return sessionToken?.value === "authenticated_efl_admin";
}

export async function GET(req: Request) {
  try {
    const isAdmin = isAuthorized();
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const where: any = {};
    if (!isAdmin) {
      where.isPublished = true;
    }
    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    const tournaments = await prisma.tournament.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
        participants: {
          include: {
            team: true,
            player: true,
          },
        },
        _count: {
          select: { matches: true },
        },
      },
    });

    return NextResponse.json({ success: true, tournaments });
  } catch (error) {
    console.error("GET /api/tournaments error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch tournaments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name,
      description,
      logoUrl,
      startDate,
      endDate,
      participantType = "TEAMS",
      maxParticipants = 16,
      status = "ACTIVE",
      presetType = "CUSTOM",
      pointsWin = 3,
      pointsLoss = 0,
      tiebreakers = "POINTS,DIFF,H2H,WINS",
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Tournament name is required" }, { status: 400 });
    }

    let baseSlug = slugify(name);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await prisma.tournament.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const tournament = await prisma.tournament.create({
      data: {
        name: name.trim(),
        slug: uniqueSlug,
        description: description?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        participantType,
        maxParticipants: Number(maxParticipants) || 16,
        status,
        presetType,
        pointsWin: Number(pointsWin) || 3,
        pointsLoss: Number(pointsLoss) || 0,
        tiebreakers,
      },
    });

    // Auto-create Preset Stages if selected
    if (presetType === "EFL_GROUP_STAGE") {
      // Stage 1: Group Stage (8 groups x 4 teams)
      const stage1 = await prisma.stage.create({
        data: {
          tournamentId: tournament.id,
          name: "Stage 1: Group Stage (8 Groups x 4)",
          order: 1,
          type: "GROUP_STAGE",
          format: "BO1",
          advancingCount: 2,
          settings: JSON.stringify({ groupCount: 8, teamsPerGroup: 4 }),
        },
      });

      // Create 8 Groups (Group A .. Group H)
      for (let i = 0; i < 8; i++) {
        const letter = String.fromCharCode(65 + i);
        await prisma.group.create({
          data: {
            stageId: stage1.id,
            name: `Group ${letter}`,
            order: i + 1,
          },
        });
      }

      // Stage 2: Playoff Single Elimination 16 Teams
      await prisma.stage.create({
        data: {
          tournamentId: tournament.id,
          name: "Stage 2: Playoff Bracket (16 Teams)",
          order: 2,
          type: "SINGLE_ELIMINATION",
          format: "BO3",
          advancingCount: 1,
        },
      });
    } else if (presetType === "EFL_PLAYOFFS") {
      await prisma.stage.create({
        data: {
          tournamentId: tournament.id,
          name: "Playoffs Single Elimination",
          order: 1,
          type: "SINGLE_ELIMINATION",
          format: "BO3",
          advancingCount: 1,
        },
      });
    } else if (presetType === "EFL_QUALIFICATION") {
      await prisma.stage.create({
        data: {
          tournamentId: tournament.id,
          name: "Double Elimination Qualification",
          order: 1,
          type: "DOUBLE_ELIMINATION",
          format: "BO1",
          advancingCount: 2,
        },
      });
    } else if (presetType === "EFL_SWISS") {
      // Stage 1: Swiss System Stage
      const swissSettings = {
        winsRequired: 3,
        lossesRequired: 3,
        maxRounds: 5,
        fixedRounds: false,
        advancingCount: 8,
        eliminatedCount: 8,
        allowDraws: false,
        seedingMode: "INITIAL_SEED",
        playoffSeedingMode: "SWISS_STANDINGS",
      };

      await prisma.stage.create({
        data: {
          tournamentId: tournament.id,
          name: "Stage 1: Swiss Stage (16 Teams)",
          order: 1,
          type: "SWISS",
          format: "BO1",
          advancingCount: 8,
          settings: JSON.stringify({ swiss: swissSettings }),
        },
      });

      // Stage 2: Playoff Single Elimination 8 Teams
      await prisma.stage.create({
        data: {
          tournamentId: tournament.id,
          name: "Stage 2: Playoff Bracket (8 Teams)",
          order: 2,
          type: "SINGLE_ELIMINATION",
          format: "BO3",
          advancingCount: 1,
        },
      });
    } else {
      // Default Custom Stage 1
      const stage1 = await prisma.stage.create({
        data: {
          tournamentId: tournament.id,
          name: "Stage 1: Group Stage",
          order: 1,
          type: "GROUP_STAGE",
          format: "BO1",
          advancingCount: 2,
        },
      });

      await prisma.group.create({
        data: { stageId: stage1.id, name: "Group A", order: 1 },
      });
      await prisma.group.create({
        data: { stageId: stage1.id, name: "Group B", order: 2 },
      });
    }

    await prisma.activityLog.create({
      data: {
        description: `Создан турнир '${tournament.name}' (${presetType})`,
      },
    });

    return NextResponse.json({ success: true, tournament });
  } catch (error) {
    console.error("POST /api/tournaments error:", error);
    return NextResponse.json({ success: false, error: "Failed to create tournament" }, { status: 500 });
  }
}
