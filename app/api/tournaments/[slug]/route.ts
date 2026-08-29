import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { calculateGroupStandings, calculateSwissStandings, repairAndProgressStageBracket } from "@/lib/tournamentLogic";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorized() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("efl_admin_session");
  return sessionToken?.value === "authenticated_efl_admin";
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;

    const tournament = await prisma.tournament.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
      },
      include: {
        participants: {
          include: {
            team: true,
            player: true,
          },
          orderBy: { seed: "asc" },
        },
        stages: {
          orderBy: { order: "asc" },
          include: {
            groups: {
              orderBy: { order: "asc" },
              include: {
                participants: {
                  include: {
                    participant: {
                      include: {
                        team: true,
                        player: true,
                      },
                    },
                  },
                },
                matches: {
                  orderBy: { scheduledAt: "asc" },
                  include: {
                    teamA: true,
                    teamB: true,
                    playerStats: {
                      include: { player: true },
                    },
                  },
                },
              },
            },
            bracketNodes: {
              orderBy: [{ round: "asc" }, { position: "asc" }],
              include: {
                match: {
                  include: {
                    teamA: true,
                    teamB: true,
                    playerStats: {
                      include: { player: true },
                    },
                  },
                },
              },
            },
            matches: {
              orderBy: { scheduledAt: "asc" },
              include: {
                teamA: true,
                teamB: true,
                playerStats: {
                  include: { player: true },
                },
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: "Tournament not found" }, { status: 404 });
    }

    // Calculate dynamic standings for each group in Group Stages and each Swiss Stage
    const standingsByGroupId: Record<string, any[]> = {};
    const swissStandingsByStageId: Record<string, any[]> = {};

    for (const stage of tournament.stages) {
      if (stage.type === "GROUP_STAGE") {
        for (const group of stage.groups) {
          const standings = await calculateGroupStandings(
            group.id,
            tournament.tiebreakers,
            tournament.pointsWin,
            tournament.pointsLoss
          );
          standingsByGroupId[group.id] = standings;
        }
      } else if (stage.type === "SWISS") {
        const swissStandings = await calculateSwissStandings(stage.id);
        swissStandingsByStageId[stage.id] = swissStandings;
      } else if (stage.type === "SINGLE_ELIMINATION" || stage.type === "DOUBLE_ELIMINATION") {
        await repairAndProgressStageBracket(stage.id);
      }
    }

    return NextResponse.json({
      success: true,
      tournament,
      standingsByGroupId,
      swissStandingsByStageId,
      isAdmin: isAuthorized(),
    });
  } catch (error) {
    console.error("GET /api/tournaments/[slug] error:", error);
    return NextResponse.json({ success: false, error: "Failed to load tournament" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = params;
    const body = await req.json();

    const tournament = await prisma.tournament.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: "Tournament not found" }, { status: 404 });
    }

    const {
      name,
      description,
      logoUrl,
      startDate,
      endDate,
      status,
      isPublished,
      pointsWin,
      pointsLoss,
      tiebreakers,
    } = body;

    const updated = await prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        description: description !== undefined ? description?.trim() || null : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl?.trim() || null : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        status: status !== undefined ? status : undefined,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : undefined,
        pointsWin: pointsWin !== undefined ? Number(pointsWin) : undefined,
        pointsLoss: pointsLoss !== undefined ? Number(pointsLoss) : undefined,
        tiebreakers: tiebreakers !== undefined ? tiebreakers : undefined,
      },
    });

    await prisma.activityLog.create({
      data: {
        description: `Обновлены настройки турнира '${updated.name}'`,
      },
    });

    return NextResponse.json({ success: true, tournament: updated });
  } catch (error) {
    console.error("PUT /api/tournaments/[slug] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update tournament" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = params;
    const tournament = await prisma.tournament.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: "Tournament not found" }, { status: 404 });
    }

    await prisma.tournament.delete({ where: { id: tournament.id } });

    await prisma.activityLog.create({
      data: {
        description: `Удалён турнир '${tournament.name}'`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tournaments/[slug] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete tournament" }, { status: 500 });
  }
}
