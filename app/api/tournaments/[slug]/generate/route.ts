import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { generateGroupRoundRobinMatches, generateBracketStructure, generateSwissNextRound } from "@/lib/tournamentLogic";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorized() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("efl_admin_session");
  return sessionToken?.value === "authenticated_efl_admin";
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = params;
    const body = await req.json();
    const { stageId } = body;

    const tournament = await prisma.tournament.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      include: {
        participants: {
          orderBy: { seed: "asc" },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: "Tournament not found" }, { status: 404 });
    }

    const stage = await prisma.stage.findUnique({
      where: { id: stageId },
      include: {
        groups: { orderBy: { order: "asc" } },
      },
    });

    if (!stage) {
      return NextResponse.json({ success: false, error: "Stage not found" }, { status: 404 });
    }

    if (stage.type === "GROUP_STAGE") {
      const groups = stage.groups;
      if (groups.length === 0) {
        return NextResponse.json({ success: false, error: "No groups found in stage" }, { status: 400 });
      }

      const participants = tournament.participants;
      if (participants.length === 0) {
        return NextResponse.json({ success: false, error: "No registered participants in tournament" }, { status: 400 });
      }

      // Delete existing GroupParticipant links for groups in stage
      const groupIds = groups.map((g) => g.id);
      await prisma.groupParticipant.deleteMany({ where: { groupId: { in: groupIds } } });

      // Distribute teams snake-style or sequentially among groups
      for (let i = 0; i < participants.length; i++) {
        const groupIndex = i % groups.length;
        const targetGroup = groups[groupIndex];
        const p = participants[i];

        await prisma.groupParticipant.create({
          data: {
            groupId: targetGroup.id,
            participantId: p.id,
            seed: p.seed,
          },
        });
      }

      // Generate round robin matches for each group
      for (const group of groups) {
        await generateGroupRoundRobinMatches(
          tournament.id,
          stage.id,
          group.id,
          stage.format === "BO3" ? 3 : stage.format === "BO5" ? 5 : 1
        );
      }

      await prisma.activityLog.create({
        data: {
          description: `Сгенерированы группы и матчи для стадии '${stage.name}' в '${tournament.name}'`,
        },
      });
    } else if (stage.type === "SWISS") {
      const { isRegenerate } = body;
      const result = await generateSwissNextRound(stage.id, Boolean(isRegenerate));
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      await prisma.activityLog.create({
        data: {
          description: `Сгенерирован Раунд ${result.round} для Swiss стадии '${stage.name}' в '${tournament.name}'`,
        },
      });

      return NextResponse.json({ success: true, round: result.round });
    } else if (stage.type === "SINGLE_ELIMINATION" || stage.type === "DOUBLE_ELIMINATION") {
      const participantIds = tournament.participants.map((p) => p.id);
      if (participantIds.length < 2) {
        return NextResponse.json({ success: false, error: "Need at least 2 participants for bracket" }, { status: 400 });
      }

      await generateBracketStructure(
        tournament.id,
        stage.id,
        participantIds,
        stage.type,
        stage.format === "BO3" ? 3 : stage.format === "BO5" ? 5 : 1
      );

      await prisma.activityLog.create({
        data: {
          description: `Сгенерирована сетка Плей-офф (${stage.type}) для '${stage.name}'`,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/tournaments/[slug]/generate error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate stage schedule" }, { status: 500 });
  }
}
