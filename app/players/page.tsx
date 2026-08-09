"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ExternalLink, RefreshCw, Crown, AlertTriangle, ShieldCheck, UserCheck, X } from "lucide-react";
import { formatRosterRole } from "@/lib/roles";
import { getBanStatus } from "@/lib/disqualification";

interface PlayerItem {
  id: string;
  nickname: string;
  slug: string;
  avatarUrl?: string;
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

export default function PlayersDirectoryPage() {
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/players", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.players)) {
          setPlayers(data.players);
        }
      })
      .catch((err) => console.error("Failed to load players:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredPlayers = players.filter((player) => {
    // Role filter
    if (selectedRoleFilter !== "ALL") {
      const activeRole = player.currentTeam?.role || player.defaultRole || "";
      const parsedRole = formatRosterRole(activeRole);

      if (selectedRoleFilter === "CAPTAINS") {
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
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222222] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#141414] border border-[#222222] text-[10px] font-mono font-bold text-[#858585] uppercase tracking-wider mb-2">
            <span>OFFICIAL PLAYERS DATABASE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            ИГРОКИ EFL ({players.length})
          </h1>
          <p className="text-xs text-[#858585] mt-1 max-w-xl">
            Публичный реестр всех зарегистрированных киберспортсменов Electronic Future League, их роли в составах и прямые ссылки на Steam и FACEIT.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Поиск по никнейму или команде..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-[#0A0A0A] border border-[#222222] focus:border-white rounded-xl text-xs text-white placeholder-[#666666] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#858585] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2 overflow-x-auto border-b border-[#1A1A1A]">
        {[
          { id: "ALL", label: "Все Игроки" },
          { id: "CAPTAINS", label: "👑 Капитаны" },
          { id: "CORE", label: "Основной состав" },
          { id: "SUBSTITUTE", label: "Замена" },
          { id: "COACH", label: "Тренеры" },
          { id: "FREE_AGENTS", label: "Free Agents" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedRoleFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              selectedRoleFilter === tab.id
                ? "bg-white text-black"
                : "bg-[#0A0A0A] border border-[#222222] text-[#858585] hover:text-white hover:border-[#444444]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Players List Grid */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-[#858585]">
          <RefreshCw className="w-6 h-6 animate-spin text-white" />
          <span className="text-xs font-semibold uppercase tracking-widest">Загрузка базы игроков...</span>
        </div>
      ) : filteredPlayers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPlayers.map((player) => {
            const activeRole = player.currentTeam?.role || player.defaultRole || "";
            const parsedRole = formatRosterRole(activeRole);
            const ban = getBanStatus(player);

            return (
              <div
                key={player.id}
                className={`bg-[#0A0A0A] border rounded-xl p-5 flex flex-col justify-between transition-all hover:border-[#444444] relative group ${
                  ban.isBanned ? "border-red-900/60 bg-red-950/10" : "border-[#222222]"
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {/* Team Badge */}
                    {player.currentTeam ? (
                      <Link
                        href={`/teams/${player.currentTeam.slug}`}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#141414] border border-[#222222] hover:border-white text-[10px] font-bold text-white transition-colors"
                      >
                        <span className="text-amber-400 font-mono">[{player.currentTeam.tag}]</span>
                        <span className="truncate max-w-[110px]">{player.currentTeam.name}</span>
                      </Link>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#222222] text-[10px] font-bold text-[#858585]">
                        Free Agent
                      </span>
                    )}

                    {/* Role Badge */}
                    <div className="flex items-center gap-1">
                      {parsedRole.isCaptain && (
                        <span className="p-1 rounded bg-amber-950/40 border border-amber-500/50 text-amber-400" title="Капитан команды">
                          <Crown className="w-3 h-3" />
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                          parsedRole.baseRole === "CORE"
                            ? "bg-blue-950/40 border border-blue-500/50 text-blue-400"
                            : parsedRole.baseRole === "SUBSTITUTE"
                            ? "bg-purple-950/40 border border-purple-500/50 text-purple-400"
                            : "bg-emerald-950/40 border border-emerald-500/50 text-emerald-400"
                        }`}
                      >
                        {parsedRole.label}
                      </span>
                    </div>
                  </div>

                  {/* Nickname & Avatar Link */}
                  <Link href={`/players/${player.slug}`} className="flex items-center gap-3 my-2 group/nick">
                    <div className="w-10 h-10 rounded-lg bg-[#050505] border border-[#222222] overflow-hidden flex items-center justify-center flex-shrink-0 group-hover/nick:border-amber-400/60 transition-colors">
                      {player.avatarUrl ? (
                        <img src={player.avatarUrl} alt={player.nickname} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-white">{player.nickname.substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-white group-hover/nick:text-amber-400 transition-colors tracking-tight truncate">
                      {player.nickname}
                    </h3>
                  </Link>

                  {/* Disqualification Status */}
                  {ban.isBanned && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/60 border border-red-800 text-[10px] font-bold text-red-300 uppercase">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{ban.remainingText}</span>
                    </div>
                  )}
                </div>

                {/* External Action Links: Steam & FACEIT */}
                <div className="mt-5 pt-3 border-t border-[#1A1A1A] flex items-center gap-2">
                  {player.steamUrl ? (
                    <a
                      href={player.steamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#050505] border border-[#222222] hover:border-white rounded text-[10px] font-bold text-[#858585] hover:text-white transition-colors"
                    >
                      <span>Steam</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="flex-1 py-1.5 text-center text-[10px] text-[#444444] border border-[#141414] rounded">
                      Steam —
                    </span>
                  )}

                  {player.faceitUrl ? (
                    <a
                      href={player.faceitUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#050505] border border-[#222222] hover:border-white rounded text-[10px] font-bold text-[#858585] hover:text-white transition-colors"
                    >
                      <span>FACEIT</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="flex-1 py-1.5 text-center text-[10px] text-[#444444] border border-[#141414] rounded">
                      FACEIT —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-16 border border-[#222222] bg-[#0A0A0A] rounded-2xl text-center">
          <p className="text-sm font-semibold text-white">Игроки не найдены</p>
          <p className="text-xs text-[#858585] mt-1">Попробуйте изменить поисковый запрос или сбросить фильтры.</p>
        </div>
      )}
    </div>
  );
}
