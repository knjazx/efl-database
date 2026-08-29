import { prisma } from "@/lib/prisma";
import PlayersClient from "./PlayersClient";

export const dynamic = "force-dynamic";

export default async function PlayersDirectoryPage() {
  const players = await prisma.player.findMany({
    include: {
      memberships: {
        include: {
          team: true,
        },
        orderBy: { joinedAt: "desc" },
      },
    },
    orderBy: { nickname: "asc" },
  });

  const seenPlayerNicks = new Set<string>();
  const formattedPlayers = players
    .filter((player) => {
      const key = player.nickname.toLowerCase().trim();
      if (seenPlayerNicks.has(key)) return false;
      seenPlayerNicks.add(key);
      return true;
    })
    .map((player) => {
      const activeMembership = player.memberships.find((m) => m.status === "ACTIVE");
      return {
        id: player.id,
        nickname: player.nickname,
        slug: player.slug,
        avatarUrl: player.avatarUrl || undefined,
        country: player.country || "RU",
        defaultRole: player.defaultRole || "PLAYER",
        steamUrl: player.steamUrl || undefined,
        faceitUrl: player.faceitUrl || undefined,
        discordUrl: player.discordUrl || undefined,
        isDisqualified: player.isDisqualified,
        disqualifiedUntil: player.disqualifiedUntil?.toISOString() || null,
        disqualifyReason: player.disqualifyReason,
        currentTeam: activeMembership
          ? {
              id: activeMembership.team.id,
              name: activeMembership.team.name,
              tag: activeMembership.team.tag,
              slug: activeMembership.team.slug,
              logoUrl: activeMembership.team.logoUrl,
              role: activeMembership.role,
            }
          : null,
      };
    });

  return <PlayersClient initialPlayers={formattedPlayers as any} />;
}
