"use client";

import { useState, useMemo } from "react";
import { TeamCard } from "@/components/TeamCard";
import { Search, SlidersHorizontal, Shield, Users } from "lucide-react";
import { getRegionInfo, REGIONS } from "@/lib/countries";
import { RegionBadge } from "@/components/RegionBadge";
import { getBanStatus } from "@/lib/disqualification";

interface TeamItem {
  id: string;
  name: string;
  tag: string;
  slug: string;
  region?: string;
  logoUrl: string;
  description: string;
  playerCount: number;
  activePlayers?: string[];
  activeRosterPreview?: Array<{
    nickname: string;
    avatarUrl?: string;
    country?: string;
    isCaptain?: boolean;
  }>;
  isDisqualified?: boolean;
  disqualifiedUntil?: Date | string | null;
  disqualifyReason?: string | null;
}

export default function TeamsClient({ initialTeams }: { initialTeams: TeamItem[] }) {
  const [teams, setTeams] = useState<TeamItem[]>(initialTeams);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("ALL");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);



  const filteredTeams = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const list = teams.filter((team) => {
      // Region filter
      if (selectedRegion === "BANNED") {
        if (!getBanStatus(team).isBanned) return false;
      } else if (selectedRegion !== "ALL") {
        const teamReg = getRegionInfo(team.region).code;
        if (teamReg !== selectedRegion) return false;
      }

      // Search filter
      if (!query) return true;
      const rInfo = getRegionInfo(team.region);
      return (
        team.name.toLowerCase().includes(query) ||
        team.tag.toLowerCase().includes(query) ||
        rInfo.tag.toLowerCase().includes(query) ||
        rInfo.name.toLowerCase().includes(query) ||
        rInfo.englishName.toLowerCase().includes(query) ||
        (team.description && team.description.toLowerCase().includes(query))
      );
    });

    // Move disqualified teams to the bottom
    return list.sort((a, b) => {
      const banA = getBanStatus(a).isBanned;
      const banB = getBanStatus(b).isBanned;
      if (banA !== banB) {
        return banA ? 1 : -1;
      }
      return 0;
    });
  }, [teams, searchQuery, selectedRegion]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Minimalist Top Header */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/[0.05] pb-8">
        <div>
          <div className="flex items-center gap-2 mb-3 text-[10px] font-mono tracking-widest uppercase">
            <span className="text-white">OFFICIAL REGISTRY</span>
            <span className="text-[#333333]">&bull;</span>
            <span className="text-[#666666]">EFL DATABASE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
            КОМАНДЫ
          </h1>
          <p className="text-[#888888] text-sm mt-3 max-w-xl font-normal leading-relaxed">
            Официальный публичный реестр киберспортивных организаций и составов Electronic Future League.
          </p>

          {/* Quick Stat Badges - simplified */}
          <div className="flex items-center gap-6 mt-5 text-[11px] font-mono text-[#666666] uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              <span>{teams.length} Команд</span>
            </div>
          </div>
        </div>

        {/* Search & View Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555]" />
            <input
              type="text"
              placeholder="Поиск команды или региона..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-4 py-2 bg-transparent border-b border-white/10 text-sm text-white placeholder-[#555555] focus:outline-none focus:border-white/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-[#555555] hover:text-white transition-colors"
              >
                &times;
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Esports Region Filter Bar (Custom Dropdown) */}
      <div className="flex flex-col gap-3 mb-8">
        <span className="text-[10px] font-mono text-[#555555] uppercase tracking-widest flex-shrink-0">
          ФИЛЬТРЫ:
        </span>
        <div className="flex flex-wrap items-center gap-4">
          {/* BANNED TOGGLE */}
          <button
          onClick={() => setSelectedRegion(selectedRegion === "BANNED" ? "ALL" : "BANNED")}
          className={`text-xs font-bold uppercase tracking-widest px-4 py-2.5 transition-colors border ${
            selectedRegion === "BANNED"
              ? "bg-red-500/10 text-red-500 border-red-500/20"
              : "bg-transparent text-[#555555] border-white/5 hover:text-white hover:border-white/20"
          }`}
        >
          Нарушители
        </button>

        <div className="h-6 w-px bg-white/10" />

        <span className="text-[10px] font-mono text-[#555555] uppercase tracking-widest flex-shrink-0">
          РЕГИОН:
        </span>
        <div 
          className="relative"
          onMouseLeave={() => setIsDropdownOpen(false)}
        >
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="bg-[#0a0a0a] border border-white/[0.1] text-xs font-bold text-white uppercase tracking-widest pl-4 pr-10 py-2.5 focus:outline-none hover:bg-white/[0.02] transition-colors flex items-center justify-between min-w-[200px]"
          >
            <span>
              {selectedRegion === "ALL" || selectedRegion === "BANNED" 
                ? `ВСЕ РЕГИОНЫ (${teams.length})` 
                : `${REGIONS.find(r => r.code === selectedRegion)?.name || selectedRegion} (${teams.filter(t => getRegionInfo(t.region).code === selectedRegion).length})`}
            </span>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] text-[10px]">▼</span>
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 w-full bg-[#0a0a0a] border border-white/[0.1] shadow-xl z-50 flex flex-col max-h-[300px] overflow-y-auto scrollbar-none">
              <button
                onClick={() => { setSelectedRegion("ALL"); setIsDropdownOpen(false); }}
                className="text-left px-4 py-2.5 text-xs font-bold text-white uppercase tracking-widest hover:bg-white/[0.05] transition-colors"
              >
                ВСЕ РЕГИОНЫ ({teams.length})
              </button>
              {REGIONS.map((r) => {
                const count = teams.filter((t) => getRegionInfo(t.region).code === r.code).length;
                return (
                  <button
                    key={r.code}
                    onClick={() => { setSelectedRegion(r.code); setIsDropdownOpen(false); }}
                    className="flex items-center gap-2 text-left px-4 py-2.5 text-xs font-bold text-[#888888] hover:text-white uppercase tracking-widest hover:bg-white/[0.05] transition-colors"
                  >
                    <RegionBadge region={r.code} size="xs" />
                    <span>{r.name}</span>
                    <span className="opacity-50">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {filteredTeams.length > 0 ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
              {filteredTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  name={team.name}
                  tag={team.tag}
                  slug={team.slug}
                  region={team.region || "EU"}
                  logoUrl={team.logoUrl}
                  playerCount={team.playerCount}
                  activePlayers={team.activePlayers}
                  activeRosterPreview={team.activeRosterPreview}
                  isDisqualified={team.isDisqualified}
                  disqualifiedUntil={team.disqualifiedUntil}
                  disqualifyReason={team.disqualifyReason}
                />
              ))}
            </div>
        ) : (
          /* EMPTY SEARCH STATE */
          <div className="bg-[#050505] p-16 text-center border border-white/[0.08] max-w-lg mx-auto my-10">
            <div className="w-14 h-14 bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4 text-[#8E95A5]">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              {searchQuery || selectedRegion !== "ALL" ? "НИЧЕГО НЕ НАЙДЕНО" : "БАЗА ДАННЫХ ПУСТА"}
            </h3>
            <p className="text-xs text-[#8E95A5] mt-1.5 leading-relaxed">
              {searchQuery || selectedRegion !== "ALL"
                ? "По выбранным критериям команд не обнаружено. Попробуйте изменить фильтры."
                : "В базе данных лиги пока нет зарегистрированных команд."}
            </p>
            {(searchQuery || selectedRegion !== "ALL") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedRegion("ALL");
                }}
                className="mt-6 px-5 py-2.5 bg-white text-black text-xs font-extrabold hover:bg-neutral-200 transition-colors uppercase tracking-wider shadow-lg"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
