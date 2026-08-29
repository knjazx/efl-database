import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all players who do not have an active membership
    const players = await prisma.player.findMany({
      where: {
        memberships: {
          none: {
            status: "ACTIVE",
          },
        },
      },
      include: {
        memberships: {
          orderBy: { leftAt: "desc" },
        },
      },
    });

    const idsToDelete: string[] = [];

    for (const player of players) {
      let lastActiveDate = player.createdAt;
      
      const formerMemberships = player.memberships.filter((m) => m.status === "FORMER" && m.leftAt);
      if (formerMemberships.length > 0) {
        lastActiveDate = formerMemberships[0].leftAt as Date;
      }

      if (lastActiveDate < thirtyDaysAgo) {
        idsToDelete.push(player.id);
      }
    }

    if (idsToDelete.length > 0) {
      await prisma.player.deleteMany({
        where: {
          id: { in: idsToDelete },
        },
      });
    }

    return NextResponse.json({ success: true, deletedCount: idsToDelete.length, deletedIds: idsToDelete });
  } catch (error) {
    console.error("Failed to purge free agents:", error);
    return NextResponse.json({ success: false, error: "Failed to purge players" }, { status: 500 });
  }
}
