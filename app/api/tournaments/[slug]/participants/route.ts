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
    const { action, teamIds, participantOrders } = body;

    const tournament = await prisma.tournament.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      include: {
        participants: {
          include: { team: true },
          orderBy: { seed: "asc" },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: "Tournament not found" }, { status: 404 });
    }

    if (action === "ADD_TEAMS") {
      if (!Array.isArray(teamIds) || teamIds.length === 0) {
        return NextResponse.json({ success: false, error: "No teams selected" }, { status: 400 });
      }

      let currentSeed = tournament.participants.length + 1;

      for (const tId of teamIds) {
        // Check if already added
        const exists = tournament.participants.some((p) => p.teamId === tId);
        if (!exists) {
          await prisma.tournamentParticipant.create({
            data: {
              tournamentId: tournament.id,
              teamId: tId,
              seed: currentSeed,
            },
          });
          currentSeed++;
        }
      }

      await prisma.activityLog.create({
        data: {
          description: `Добавлено ${teamIds.length} команд в турнир '${tournament.name}'`,
        },
      });
    } else if (action === "SEED_RANDOM") {
      // Shuffle participants randomly
      const list = [...tournament.participants];
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }

      const updates = list.map((p, idx) =>
        prisma.tournamentParticipant.update({
          where: { id: p.id },
          data: { seed: idx + 1 },
        })
      );
      await prisma.$transaction(updates);
    } else if (action === "SEED_BY_RATING") {
      // Sort participants by team points (EFL Rating) descending
      const sorted = [...tournament.participants].sort((a, b) => (b.team?.points || 0) - (a.team?.points || 0));
      const updates = sorted.map((p, idx) =>
        prisma.tournamentParticipant.update({
          where: { id: p.id },
          data: { seed: idx + 1 },
        })
      );
      await prisma.$transaction(updates);
    } else if (action === "REORDER_SEEDS") {
      // Drag and drop custom seed order
      if (Array.isArray(participantOrders)) {
        const updates = participantOrders.map((item: { id: string; seed: number }) =>
          prisma.tournamentParticipant.update({
            where: { id: item.id },
            data: { seed: item.seed },
          })
        );
        await prisma.$transaction(updates);
      }
    }

    const updatedParticipants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId: tournament.id },
      include: { team: true, player: true },
      orderBy: { seed: "asc" },
    });

    return NextResponse.json({ success: true, participants: updatedParticipants });
  } catch (error) {
    console.error("POST /api/tournaments/[slug]/participants error:", error);
    return NextResponse.json({ success: false, error: "Failed to manage participants" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const participantId = searchParams.get("participantId");

    if (!participantId) {
      return NextResponse.json({ success: false, error: "Participant ID is required" }, { status: 400 });
    }

    await prisma.tournamentParticipant.delete({ where: { id: participantId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tournaments/[slug]/participants error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete participant" }, { status: 500 });
  }
}
