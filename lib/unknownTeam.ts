import { prisma } from "@/lib/prisma";

export const UNKNOWN_TEAM_ID = "unknown-team-placeholder";

export async function ensureUnknownTeam() {
  try {
    const existing = await prisma.team.findUnique({
      where: { id: UNKNOWN_TEAM_ID },
    });

    if (!existing) {
      await prisma.team.create({
        data: {
          id: UNKNOWN_TEAM_ID,
          name: "Неизвестная команда",
          tag: "GUEST",
          slug: "unknown-team",
          tier: "TIER 3",
          logoUrl: "",
          description: "Внешний соперник / Команда не с сайта",
        },
      });
    }
  } catch (error) {
    console.error("ensureUnknownTeam error:", error);
  }
}
