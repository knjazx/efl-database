"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Trophy, Medal, RefreshCw, X, Shield, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";
import { getBanStatus } from "@/lib/disqualification";

interface RankedTeam {
  id: string;
  name: string;
  tag: string;
  slug: string;
  tier: string; // TIER 1, TIER 2, TIER 3
  logoUrl: string;
  frameStyle?: string;
  points: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  roundsWon?: number;
  roundsLost?: number;
  roundDiff?: number;
  playerCount: number;
  activePlayers?: string[];
  isDisqualified?: boolean;
  disqualifiedUntil?: Date | string | null;
  disqualifyReason?: string | null;
}

export default function RankingsPage() {
  const [teams, setTeams] = useState<RankedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/teams", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.teams)) {
          setTeams(data.teams);
        }
      })
      .catch((err) => console.error("Failed to load rankings:", err))
      .finally(() => setLoading(false));
  }, []);

  // Filter and sort teams using official tournament tiebreaker hierarchy:
  // 1. Points (PTS)
  // 2. Winrate (W/L %)
  // 3. Round Difference (RD = roundsWon - roundsLost)
  // 4. Total Rounds Won
  // 5. Total Wins
  // 6. Alphabetical order (deterministic fallback)
  const processedTeams = teams
    .filter((team) => {
      // Tier Filter
      if (selectedTierFilter !== "ALL") {
        const teamTier = (team.tier || "TIER 1").toUpperCase().replace(/\s+/g, "");
        const filterTier = selectedTierFilter.toUpperCase().replace(/\s+/g, "");
        if (teamTier !== filterTier && !teamTier.includes(filterTier)) {
          return false;
        }
      }

      // Search Query Filter
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        return (
          team.name.toLowerCase().includes(q) ||
          team.tag.toLowerCase().includes(q) ||
          (team.activePlayers && team.activePlayers.some((p) => p.toLowerCase().includes(q)))
        );
      }

      return true;
    })
    .sort((a, b) => {
      // 1. Points
      if (b.points !== a.points) return b.points - a.points;

      // 2. Winrate
      const winrateB = b.matchesPlayed > 0 ? b.wins / b.matchesPlayed : 0;
      const winrateA = a.matchesPlayed > 0 ? a.wins / a.matchesPlayed : 0;
      if (winrateB !== winrateA) return winrateB - winrateA;

      // 3. Round Difference (Разница раундов)
      const diffB = b.roundDiff ?? 0;
      const diffA = a.roundDiff ?? 0;
      if (diffB !== diffA) return diffB - diffA;

      // 4. Total Rounds Won (Выигранные раунды)
      const rWonB = b.roundsWon ?? 0;
      const rWonA = a.roundsWon ?? 0;
      if (rWonB !== rWonA) return rWonB - rWonA;

      // 5. Total Wins
      if (b.wins !== a.wins) return b.wins - a.wins;

      // 6. Strict Deterministic Alphabetical Fallback
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222222] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#141414] border border-[#222222] text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>ELECTRONIC FUTURE LEAGUE STANDINGS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            ТАБЛИЦА РЕЙТИНГА КОМАНД
          </h1>
          <p className="text-xs text-[#858585] mt-1 max-w-xl">
            Официальный турнирный рейтинг команд EFL по дивизионам (Tier-1, Tier-2, Tier-3), количеству набранных очков и проценту побед.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Поиск команды в рейтинге..."
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

      {/* Tier Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2.5 pb-2 border-b border-[#1A1A1A]">
        {[
          { id: "ALL", label: "ВСЕ ТИРЫ", badge: "ALL TEAMS" },
          { id: "TIER1", label: "🥇 TIER 1", badge: "PRO DIVISION" },
          { id: "TIER2", label: "🥈 TIER 2", badge: "CHALLENGER" },
          { id: "TIER3", label: "🥉 TIER 3", badge: "CONTENDERS" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTierFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              selectedTierFilter === tab.id
                ? "bg-white text-black shadow-lg shadow-white/10 scale-105"
                : "bg-[#0A0A0A] border border-[#222222] text-[#858585] hover:text-white hover:border-[#444444]"
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Standings Table */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-[#858585]">
          <RefreshCw className="w-6 h-6 animate-spin text-white" />
          <span className="text-xs font-semibold uppercase tracking-widest">Загрузка турнирной таблицы...</span>
        </div>
      ) : processedTeams.length > 0 ? (
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#050505] border-b border-[#222222] text-[#858585] font-black uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3.5 w-14 text-center">POS</th>
                  <th className="px-5 py-3.5">КОМАНДА</th>
                  <th className="px-4 py-3.5 text-center">ДИВИЗИОН / TIER</th>
                  <th className="px-3 py-3.5 text-center">ИГРЫ (MP)</th>
                  <th className="px-3 py-3.5 text-center">В / П (W/L)</th>
                  <th className="px-3 py-3.5 text-center whitespace-nowrap">РАЗНИЦА РАУНДОВ (RD)</th>
                  <th className="px-4 py-3.5 text-center">WIN RATE</th>
                  <th className="px-5 py-3.5 text-center whitespace-nowrap">ОЧКИ (PTS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {processedTeams.map((team, idx) => {
                  const rank = idx + 1;
                  const winrate = team.matchesPlayed > 0 ? Math.round((team.wins / team.matchesPlayed) * 100) : 0;
                  const ban = getBanStatus(team);
                  const normalizedTier = (team.tier || "TIER 1").toUpperCase();

                  return (
                    <tr
                      key={team.id}
                      className={`hover:bg-[#121212] transition-colors group ${
                        rank === 1
                          ? "bg-amber-950/10 border-l-4 border-l-amber-400"
                          : rank === 2
                          ? "bg-slate-900/10 border-l-4 border-l-slate-300"
                          : rank === 3
                          ? "bg-amber-900/10 border-l-4 border-l-amber-700"
                          : ""
                      }`}
                    >
                      {/* Rank Position */}
                      <td className="px-4 py-3.5 font-mono text-center">
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-400 font-extrabold text-xs shadow-md">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-300/20 border border-slate-300 text-slate-200 font-extrabold text-xs">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-800/20 border border-amber-600 text-amber-500 font-extrabold text-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-[#666666] font-bold">#{rank}</span>
                        )}
                      </td>

                      {/* Team Logo & Name */}
                      <td className="px-5 py-3.5">
                        <Link href={`/teams/${team.slug}`} className="flex items-center gap-3 group/team">
                          <div className="w-10 h-10 rounded-xl bg-[#050505] border border-[#222222] overflow-hidden flex items-center justify-center flex-shrink-0 group-hover/team:border-white transition-colors">
                            <TeamLogo logoUrl={team.logoUrl} name={team.name} tag={team.tag} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-white text-sm group-hover/team:text-amber-400 transition-colors uppercase tracking-tight">
                                {team.name}
                              </h3>
                              {ban.isBanned && (
                                <span className="p-0.5 rounded bg-red-950 text-red-400" title="Дисквалифицирован">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                            {team.activePlayers && team.activePlayers.length > 0 ? (
                              <span className="text-[11px] font-medium text-[#858585] tracking-wide block truncate max-w-sm">
                                {team.activePlayers.join(" • ")}
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-[#666666] tracking-widest uppercase">
                                [{team.tag}]
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Tier Badge */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${
                            normalizedTier.includes("1")
                              ? "bg-amber-950/50 border-amber-400/60 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                              : normalizedTier.includes("2")
                              ? "bg-purple-950/50 border-purple-400/60 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                              : "bg-emerald-950/50 border-emerald-400/60 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.2)]"
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{normalizedTier.includes("1") ? "TIER 1" : normalizedTier.includes("2") ? "TIER 2" : "TIER 3"}</span>
                        </span>
                      </td>

                      {/* Matches Played */}
                      <td className="px-3 py-3.5 text-center font-mono font-bold text-white">
                        {team.matchesPlayed}
                      </td>

                      {/* Wins / Losses */}
                      <td className="px-3 py-3.5 text-center font-mono whitespace-nowrap">
                        <span className="text-emerald-400 font-bold">{team.wins}W</span>
                        <span className="text-[#666666] mx-1">/</span>
                        <span className="text-red-400 font-bold">{team.losses}L</span>
                      </td>

                      {/* Round Difference (RD) */}
                      <td className="px-3 py-3.5 text-center font-mono font-bold whitespace-nowrap">
                        {team.roundDiff !== undefined ? (
                          <span
                            className={`px-2.5 py-1 rounded text-xs border inline-block ${
                              team.roundDiff > 0
                                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400"
                                : team.roundDiff < 0
                                ? "bg-red-950/40 border-red-500/40 text-red-400"
                                : "bg-[#141414] border-[#222222] text-[#858585]"
                            }`}
                            title={`Выиграно раундов: ${team.roundsWon || 0}, Проиграно: ${team.roundsLost || 0}`}
                          >
                            {team.roundDiff > 0 ? `+${team.roundDiff}` : team.roundDiff}
                          </span>
                        ) : (
                          <span className="text-[#666666]">0</span>
                        )}
                      </td>

                      {/* Win Rate Bar */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 bg-[#141414] h-2 rounded-full overflow-hidden border border-[#222222]">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-amber-400 rounded-full"
                              style={{ width: `${winrate}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-bold text-white">{winrate}%</span>
                        </div>
                      </td>

                      {/* Points */}
                      <td className="px-5 py-3.5 text-center font-mono whitespace-nowrap">
                        <span className="px-3 py-1 bg-[#141414] border border-[#222222] rounded-lg text-xs font-black text-amber-400 shadow-md inline-flex items-center gap-1.5 whitespace-nowrap">
                          <span>{team.points}</span>
                          <span className="text-[10px] text-amber-500/80 font-bold">PTS</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-16 border border-[#222222] bg-[#0A0A0A] rounded-2xl text-center">
          <p className="text-sm font-semibold text-white">Команды не найдены</p>
          <p className="text-xs text-[#858585] mt-1">Попробуйте изменить поисковый запрос или сбросить фильтры тиров.</p>
        </div>
      )}
    </div>
  );
}
