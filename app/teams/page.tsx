import { prisma } from "@/lib/prisma";
import TeamsClient from "./TeamsClient";

export const dynamic = "force-dynamic";

export default async function TeamsDirectoryPage() {
  const teams = await prisma.team.findMany({
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: { player: true },
        orderBy: { joinedAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formattedTeams = teams.map((team) => {
    const activePlayers = team.memberships.map((m) => m.player.nickname);
    const activeRosterPreview = team.memberships.slice(0, 5).map((m) => ({
      nickname: m.player.nickname,
      avatarUrl: m.player.avatarUrl || undefined,
      country: m.player.country || "RU",
      isCaptain: m.role.toUpperCase() === "OWNER",
    }));

    return {
      id: team.id,
      name: team.name,
      tag: team.tag,
      slug: team.slug,
      region: team.region,
      logoUrl: team.logoUrl,
      description: team.description || "",
      playerCount: team.memberships.length,
      activePlayers,
      activeRosterPreview,
      isDisqualified: team.isDisqualified,
      disqualifiedUntil: team.disqualifiedUntil?.toISOString() || null,
      disqualifyReason: team.disqualifyReason,
    };
  });

  return <TeamsClient initialTeams={formattedTeams as any} />;
}
