"use client";

import { useEffect, useState } from "react";
import { TeamCard } from "@/components/TeamCard";
import { Search, SlidersHorizontal, RefreshCw } from "lucide-react";

interface TeamItem {
  id: string;
  name: string;
  tag: string;
  slug: string;
  tier?: string;
  logoUrl: string;
  description: string;
  playerCount: number;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>("ALL");

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teams", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setTeams(data.teams);
      }
    } catch (err) {
      console.error("Failed to load teams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const filteredTeams = teams.filter((team) => {
    // Tier Filter
    if (selectedTierFilter !== "ALL") {
      const teamTier = (team.tier || "TIER 1").toUpperCase().replace(/\s+/g, "");
      const filterTier = selectedTierFilter.toUpperCase().replace(/\s+/g, "");
      if (teamTier !== filterTier && !teamTier.includes(filterTier)) {
        return false;
      }
    }

    return (
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.tag.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase">
              TEAMS
            </h1>
            {!loading && (
              <span className="px-3 py-1 bg-[#141414] border border-[#222222] rounded-full text-xs font-bold font-mono text-[#858585] tracking-wider">
                {teams.length} {teams.length === 1 ? "TEAM" : "TEAMS"}
              </span>
            )}
          </div>
          <p className="text-[#858585] text-sm mt-2 font-normal max-w-lg">
            All registered teams competing in Electronic Future League.
          </p>
        </div>

        {/* Search Control */}
        <div className="flex items-center gap-4">
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#858585]" />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-[#222222] rounded-lg text-sm text-white placeholder-[#858585] focus:outline-none focus:border-[#444444] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#858585] hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tier Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mt-6 pb-2 border-b border-[#1A1A1A]">
        {[
          { id: "ALL", label: "ВСЕ ТИРЫ" },
          { id: "TIER1", label: "🥇 TIER 1" },
          { id: "TIER2", label: "🥈 TIER 2" },
          { id: "TIER3", label: "🥉 TIER 3" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTierFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              selectedTierFilter === tab.id
                ? "bg-white text-black"
                : "bg-[#0A0A0A] border border-[#222222] text-[#858585] hover:text-white hover:border-[#444444]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid Content */}
      <div className="mt-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#858585]">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="text-xs font-medium tracking-widest uppercase">Loading database...</span>
          </div>
        ) : filteredTeams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
            {filteredTeams.map((team: any) => (
              <TeamCard
                key={team.id}
                name={team.name}
                tag={team.tag}
                slug={team.slug}
                tier={team.tier || "TIER 1"}
                logoUrl={team.logoUrl}
                playerCount={team.playerCount}
                frameStyle={team.frameStyle}
                isDisqualified={team.isDisqualified}
                disqualifiedUntil={team.disqualifiedUntil}
                disqualifyReason={team.disqualifyReason}
              />
            ))}
          </div>
        ) : (
          /* Empty States */
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-[#222222] rounded-xl bg-[#0A0A0A]/40">
            <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#222222] flex items-center justify-center mb-4 text-[#858585]">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              {searchQuery ? "NO RESULTS" : "NO TEAMS FOUND"}
            </h3>
            <p className="text-xs text-[#858585] mt-1 max-w-sm">
              {searchQuery
                ? `No teams matching "${searchQuery}" were found in the EFL database.`
                : "There are currently no registered teams in the league database."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-6 px-4 py-2 bg-[#1A1A1A] border border-[#333333] hover:border-white text-xs font-semibold text-white rounded-md transition-colors"
              >
                Reset Search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
