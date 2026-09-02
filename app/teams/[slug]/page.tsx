import { prisma } from "@/lib/prisma";
import TeamProfileClient from "./TeamProfileClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function TeamProfilePage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("efl_admin_session");
  const isAdmin = sessionToken?.value === "authenticated_efl_admin";

  const team = await prisma.team.findUnique({
    where: { slug: params.slug },
    include: {
      memberships: {
        include: {
          player: true,
        },
        orderBy: { joinedAt: "asc" },
      },
      activityLogs: {
        orderBy: {
          timestamp: "desc",
        },
        take: 20,
      },
    },
  });

  if (!team) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-20 text-center">
        <Link
          href="/teams"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#8E95A5] hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Все команды
        </Link>
        <div className="p-12 bg-[#151515] border border-white/[0.15] max-w-md mx-auto shadow-2xl">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-2">
            КОМАНДА НЕ НАЙДЕНА
          </h2>
          <p className="text-xs text-[#8E95A5] mb-6">
            Запрошенный профиль команды не найден в базе данных.
          </p>
          <Link
            href="/teams"
            className="px-5 py-2.5 bg-white text-black text-xs font-extrabold hover:bg-neutral-200 transition-colors uppercase tracking-wider"
          >
            СПИСОК КОМАНД
          </Link>
        </div>
      </div>
    );
  }

  const activeRoster = team.memberships
    .filter((m) => m.status === "ACTIVE")
    .map((m) => ({
      membershipId: m.id,
      id: m.player.id,
      nickname: m.player.nickname,
      slug: m.player.slug,
      avatarUrl: m.player.avatarUrl || undefined,
      country: m.player.country,
      role: m.role,
      steamUrl: m.player.steamUrl || undefined,
      faceitUrl: m.player.faceitUrl || undefined,
      discordUrl: m.player.discordUrl || undefined,
      isDisqualified: m.player.isDisqualified,
      disqualifiedUntil: m.player.disqualifiedUntil?.toISOString() || null,
      disqualifyReason: m.player.disqualifyReason,
      joinedAt: m.joinedAt.toISOString(),
      leftAt: m.leftAt?.toISOString() || undefined,
    }));

  const formerPlayers = team.memberships
    .filter((m) => m.status === "FORMER")
    .map((m) => ({
      membershipId: m.id,
      id: m.player.id,
      nickname: m.player.nickname,
      slug: m.player.slug,
      avatarUrl: m.player.avatarUrl || undefined,
      country: m.player.country,
      role: m.role,
      steamUrl: m.player.steamUrl || undefined,
      faceitUrl: m.player.faceitUrl || undefined,
      discordUrl: m.player.discordUrl || undefined,
      isDisqualified: m.player.isDisqualified,
      disqualifiedUntil: m.player.disqualifiedUntil?.toISOString() || null,
      disqualifyReason: m.player.disqualifyReason,
      joinedAt: m.joinedAt.toISOString(),
      leftAt: m.leftAt?.toISOString() || undefined,
    }));

  const formattedTeam = {
    id: team.id,
    name: team.name,
    tag: team.tag,
    slug: team.slug,
    region: team.region,
    logoUrl: team.logoUrl,
    description: team.description,
    createdAt: team.createdAt.toISOString(),
    isDisqualified: team.isDisqualified,
    disqualifiedUntil: team.disqualifiedUntil?.toISOString() || null,
    disqualifyReason: team.disqualifyReason,
    activeRoster,
    formerPlayers,
    activityLogs: team.activityLogs.map((log) => ({
      id: log.id,
      description: log.description,
      createdAt: log.timestamp.toISOString(),
    })),
  };

  return <TeamProfileClient team={formattedTeam as any} isAdmin={isAdmin} />;
}
