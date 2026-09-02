"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ExternalLink, RefreshCw, Crown, AlertTriangle, ShieldCheck, UserCheck, X, Users } from "lucide-react";
import { formatRosterRole } from "@/lib/roles";
import { getBanStatus } from "@/lib/disqualification";
import { PlayerThumbnailSilhouette } from "@/components/PlayerSilhouette";
import { CountryFlag } from "@/components/CountryFlag";
import { SteamIcon, FaceitIcon } from "@/components/SocialIcons";

interface PlayerItem {
  id: string;
  nickname: string;
  slug: string;
  avatarUrl?: string;
  country?: string;
  defaultRole: string;
  steamUrl?: string;
  faceitUrl?: string;
  discordUrl?: string;
  isDisqualified?: boolean;
  disqualifiedUntil?: Date | string | null;
  disqualifyReason?: string | null;
  currentTeam: {
    id: string;
    name: string;
    tag: string;
    slug: string;
    logoUrl: string;
    role: string;
  } | null;
}

export default function PlayersClient({ initialPlayers }: { initialPlayers: PlayerItem[] }) {
  const [players, setPlayers] = useState<PlayerItem[]>(initialPlayers);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");

  // Silently trigger the free-agent purge cron job as a fallback
  useEffect(() => {
    fetch("/api/cron/purge-players").catch(() => {});
  }, []);

  const filteredPlayers = players.filter((player) => {
    // Role filter
    if (selectedRoleFilter !== "ALL") {
      const activeRole = player.currentTeam?.role || player.defaultRole || "";
      const parsedRole = formatRosterRole(activeRole);

      if (selectedRoleFilter === "BANNED") {
        if (!getBanStatus(player).isBanned) return false;
      } else if (selectedRoleFilter === "OWNERS") {
        if (!parsedRole.isCaptain) return false;
      } else if (selectedRoleFilter === "FREE_AGENTS") {
        if (player.currentTeam !== null) return false;
      } else {
        if (parsedRole.baseRole !== selectedRoleFilter && activeRole.toUpperCase() !== selectedRoleFilter) {
          return false;
        }
      }
    }

    // Search query filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchNick = player.nickname.toLowerCase().includes(q);
      const matchTeam = player.currentTeam
        ? player.currentTeam.name.toLowerCase().includes(q) || player.currentTeam.tag.toLowerCase().includes(q)
        : false;
      return matchNick || matchTeam;
    }

    return true;
  }).sort((a, b) => {
    // Push disqualified to bottom
    const banA = getBanStatus(a).isBanned;
    const banB = getBanStatus(b).isBanned;
    if (banA !== banB) return banA ? 1 : -1;
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.15] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-3 text-[10px] font-mono tracking-widest uppercase">
            <span className="text-white">OFFICIAL REGISTRY</span>
            <span className="text-[#333333]">&bull;</span>
            <span className="text-[#666666]">PLAYERS DATABASE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
            ИГРОКИ
          </h1>
          <p className="text-[#888888] text-sm mt-3 max-w-xl font-normal leading-relaxed">
            Публичный реестр всех зарегистрированных киберспортсменов Ascent League, их роли в составах и прямые ссылки на Steam и FACEIT.
          </p>

          {/* Quick Stat Badges */}
          <div className="flex items-center gap-6 mt-5 text-[11px] font-mono text-[#666666] uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              <span>{players.length} ИГРОКОВ</span>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#8E95A5] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Поиск по никнейму или команде..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-[#151515] border border-white/[0.15] focus:border-white text-xs text-white placeholder-[#666666] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E95A5] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2 overflow-x-auto border-b border-white/[0.15]">
        {[
          { id: "ALL", label: "ВСЕ ИГРОКИ" },
          { id: "FREE_AGENTS", label: "Free Agents" },
          { id: "BANNED", label: "Заблокированные" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedRoleFilter(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              selectedRoleFilter === tab.id
                ? "bg-white text-black"
                : "bg-white/[0.04] border border-white/[0.15] text-[#8E95A5] hover:text-white hover:border-white/30"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Players List Grid */}
      {filteredPlayers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPlayers.map((player) => {
            const activeRole = player.currentTeam?.role || player.defaultRole || "";
            const parsedRole = formatRosterRole(activeRole);
            const ban = getBanStatus(player);

            return (
              <div
                key={player.id}
                className={`bg-[#151515] border p-5 flex flex-col justify-between transition-all hover:border-white/30 relative group ${
                  ban.isBanned ? "border-red-900/60 bg-red-950/10" : "border-white/[0.15]"
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {/* Team Badge */}
                    {player.currentTeam ? (
                      <Link
                        href={`/teams/${player.currentTeam.slug}`}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#111111] border border-white/[0.15] hover:border-white/50 text-[10px] font-bold text-white transition-colors"
                      >
                        <span className="text-amber-400 font-mono">[{player.currentTeam.tag}]</span>
                        <span className="truncate max-w-[110px]">{player.currentTeam.name}</span>
                      </Link>
                    ) : (
                      <span className="px-2 py-0.5 bg-[#111111] border border-white/[0.15] text-[10px] font-bold text-[#8E95A5]">
                        Free Agent
                      </span>
                    )}

                    {/* Role Badge - Only show if player is in a team */}
                    {player.currentTeam && (
                      <div className="flex items-center gap-1">
                        {parsedRole.isCaptain && (
                          <span className="p-1 bg-amber-500/10 border border-amber-500/30 text-amber-400" title="Владелец команды">
                            <Crown className="w-3 h-3" />
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                            parsedRole.baseRole === "CORE"
                              ? "bg-blue-600/15 border border-blue-500/30 text-blue-300"
                              : parsedRole.baseRole === "SUBSTITUTE"
                              ? "bg-purple-600/15 border border-purple-500/30 text-purple-300"
                              : "bg-emerald-600/15 border border-emerald-500/30 text-emerald-300"
                          }`}
                        >
                          {parsedRole.label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Nickname & Avatar Link */}
                  <Link
                    href={`/players/${player.slug}`}
                    className="flex items-center gap-4 mt-4"
                  >
                    <div className="w-14 h-14 bg-[#151515] border border-white/10 flex items-end justify-center flex-shrink-0 group-hover:border-white/30 transition-colors">
                      {player.avatarUrl ? (
                        <img
                          src={player.avatarUrl}
                          alt={player.nickname}
                          className={`w-full h-full object-cover ${ban.isBanned ? "grayscale opacity-80" : ""}`}
                        />
                      ) : (
                        <PlayerThumbnailSilhouette className={`w-full h-full ${ban.isBanned ? "grayscale opacity-80" : ""}`} />
                      )}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="flex items-center gap-2">
                        <CountryFlag code={player.country} size="xs" />
                        <h3 className="font-black text-lg text-white group-hover:text-[#dddddd] transition-colors truncate uppercase">
                          {player.nickname}
                        </h3>
                      </div>
                      {ban.isBanned && (
                        <span className="text-[9px] text-red-500 font-bold uppercase tracking-widest block mt-0.5">
                          БАН ({ban.remainingText})
                        </span>
                      )}
                    </div>
                  </Link>
                </div>

                {/* External Action Links: Steam & FACEIT */}
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center gap-2">
                  {player.steamUrl ? (
                    <a
                      href={player.steamUrl.startsWith('http') ? player.steamUrl : `https://steamcommunity.com/id/${player.steamUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-1.5 px-2 bg-white/[0.04] border border-white/[0.15] hover:border-white/30 hover:bg-white/[0.06] hover:text-white text-[10px] font-bold text-[#8E95A5] transition-colors uppercase tracking-widest"
                    >
                      <SteamIcon className="w-3.5 h-3.5" /> <span>STEAM</span>
                    </a>
                  ) : (
                    <span className="flex-1 py-1.5 text-center text-[10px] text-[#444444] border border-white/10 bg-white/[0.02]">
                      STEAM —
                    </span>
                  )}

                  {player.faceitUrl ? (
                    <a
                      href={player.faceitUrl.startsWith('http') ? player.faceitUrl : `https://faceit.com/en/players/${player.faceitUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-1.5 px-2 bg-white/[0.04] border border-white/[0.15] hover:border-white/30 hover:bg-white/[0.06] hover:text-[#ff5500] text-[10px] font-bold text-[#8E95A5] transition-colors uppercase tracking-widest"
                    >
                      <FaceitIcon className="w-3.5 h-3.5" /> <span>FACEIT</span>
                    </a>
                  ) : (
                    <span className="flex-1 py-1.5 text-center text-[10px] text-[#444444] border border-white/10 bg-white/[0.02]">
                      FACEIT —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-16 border border-white/[0.15] bg-[#151515] text-center">
          <p className="text-sm font-semibold text-white">Игроки не найдены</p>
          <p className="text-xs text-[#8E95A5] mt-1">Попробуйте изменить параметры поиска или фильтр по ролям.</p>
        </div>
      )}
    </div>
  );
}
