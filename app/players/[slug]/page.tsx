import { prisma } from "@/lib/prisma";
import PlayerProfileClient from "./PlayerProfileClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function getFaceitStats(faceitUrl?: string | null) {
  if (!faceitUrl) return null;
  try {
    let nickname = faceitUrl;
    if (faceitUrl.includes("faceit.com")) {
      const parts = faceitUrl.split("/");
      const idx = parts.indexOf("players");
      if (idx !== -1 && parts.length > idx + 1) {
        nickname = parts[idx + 1];
      }
    }
    nickname = nickname.split("?")[0].trim();

    if (!nickname) return null;

    const res = await fetch(`https://api.faceit.com/users/v1/nicknames/${nickname}`, {
      next: { revalidate: 3600 },
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    const cs2 = data?.payload?.games?.cs2;
    if (cs2) {
      return { elo: cs2.faceit_elo as number, level: cs2.skill_level as number };
    }
    
    const csgo = data?.payload?.games?.csgo;
    if (csgo) {
      return { elo: csgo.faceit_elo as number, level: csgo.skill_level as number };
    }
    
    return null;
  } catch (err) {
    console.error("Faceit fetch error:", err);
    return null;
  }
}

export default async function PlayerProfilePage({ params }: { params: { slug: string } }) {
  const player = await prisma.player.findUnique({
    where: { slug: params.slug },
    include: {
      memberships: {
        include: {
          team: true,
        },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!player) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <Link href="/players" className="inline-flex items-center gap-2 text-xs font-semibold text-[#858585] hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Назад к игрокам
        </Link>
        <div className="p-12 border border-[#222222] bg-[#0A0A0A] max-w-md mx-auto">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-2">ИГРОК НЕ НАЙДЕН</h2>
          <p className="text-xs text-[#858585] mb-6">Запрошенный профиль игрока не существует.</p>
          <Link href="/players" className="px-4 py-2 bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors uppercase tracking-widest">
            СПИСОК ИГРОКОВ
          </Link>
        </div>
      </div>
    );
  }

  const activeMembership = player.memberships.find((m) => m.status === "ACTIVE");

  const faceitStats = await getFaceitStats(player.faceitUrl);

  const formattedPlayer = {
    id: player.id,
    nickname: player.nickname,
    slug: player.slug,
    avatarUrl: player.avatarUrl || undefined,
    country: player.country || "RU",
    defaultRole: player.defaultRole || "PLAYER",
    steamUrl: player.steamUrl || undefined,
    faceitUrl: player.faceitUrl || undefined,
    faceitStats,
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
    history: player.memberships.map((m) => ({
      teamId: m.team.id,
      teamName: m.team.name,
      teamTag: m.team.tag,
      teamSlug: m.team.slug,
      teamLogoUrl: m.team.logoUrl,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      leftAt: m.leftAt?.toISOString() || undefined,
    })),
  };

  return <PlayerProfileClient player={formattedPlayer as any} />;
}
