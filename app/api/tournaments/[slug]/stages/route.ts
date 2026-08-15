import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

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

    const tournament = await prisma.tournament.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      include: { stages: true },
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: "Tournament not found" }, { status: 404 });
    }

    const {
      name,
      type = "GROUP_STAGE",
      format = "BO1",
      advancingCount = 2,
      groupCount = 4,
      teamsPerGroup = 4,
      settings,
    } = body;

    const nextOrder = tournament.stages.length + 1;
    const stageName = name?.trim() || `Stage ${nextOrder}: ${type.replace("_", " ")}`;

    const finalSettings = settings
      ? typeof settings === "string"
        ? settings
        : JSON.stringify(settings)
      : JSON.stringify({ groupCount: Number(groupCount) || 4, teamsPerGroup: Number(teamsPerGroup) || 4 });

    const stage = await prisma.stage.create({
      data: {
        tournamentId: tournament.id,
        name: stageName,
        order: nextOrder,
        type,
        format,
        advancingCount: Number(advancingCount) || 2,
        settings: finalSettings,
      },
    });

    // If type is Group Stage, auto-create Group A..Group N
    if (type === "GROUP_STAGE") {
      const count = Number(groupCount) || 4;
      for (let i = 0; i < count; i++) {
        const letter = String.fromCharCode(65 + i);
        await prisma.group.create({
          data: {
            stageId: stage.id,
            name: `Group ${letter}`,
            order: i + 1,
          },
        });
      }
    }

    await prisma.activityLog.create({
      data: {
        description: `Добавлена стадия '${stage.name}' в турнир '${tournament.name}'`,
      },
    });

    return NextResponse.json({ success: true, stage });
  } catch (error) {
    console.error("POST /api/tournaments/[slug]/stages error:", error);
    return NextResponse.json({ success: false, error: "Failed to add stage" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { stageId, name, format, advancingCount, order, settings } = body;

    if (!stageId) {
      return NextResponse.json({ success: false, error: "Stage ID is required" }, { status: 400 });
    }

    const updated = await prisma.stage.update({
      where: { id: stageId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        format: format !== undefined ? format : undefined,
        advancingCount: advancingCount !== undefined ? Number(advancingCount) : undefined,
        order: order !== undefined ? Number(order) : undefined,
        settings: settings !== undefined ? (typeof settings === "string" ? settings : JSON.stringify(settings)) : undefined,
      },
    });

    return NextResponse.json({ success: true, stage: updated });
  } catch (error) {
    console.error("PUT /api/tournaments/[slug]/stages error:", error);
    return NextResponse.json({ success: false, error: "Failed to update stage" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const stageId = searchParams.get("stageId");

    if (!stageId) {
      return NextResponse.json({ success: false, error: "Stage ID is required" }, { status: 400 });
    }

    await prisma.stage.delete({ where: { id: stageId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tournaments/[slug]/stages error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete stage" }, { status: 500 });
  }
}
