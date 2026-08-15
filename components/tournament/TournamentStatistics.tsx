"use client";

import React, { useState, useEffect } from "react";
import { BarChart3, Search, Filter, ArrowUpDown, Award, ChevronDown } from "lucide-react";
import Link from "next/link";

interface TournamentStatisticsProps {
  tournamentSlug: string;
  stages: any[];
  teams: any[];
}

export function TournamentStatistics({ tournamentSlug, stages, teams }: TournamentStatisticsProps) {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageId, setStageId] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [search, setSearch] = useState("");
  
  const [sortCol, setSortCol] = useState<string>("avgRating");
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    fetchData();
  }, [tournamentSlug, stageId, teamId]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (stageId) params.append("stageId", stageId);
      if (teamId) params.append("teamId", teamId);
      
      const res = await fetch(`/api/tournaments/${tournamentSlug}/statistics?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPlayers(data.players);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDesc(!sortDesc);
    } else {
      setSortCol(col);
      setSortDesc(true);
    }
  }

  const filteredPlayers = players.filter(p => p.playerName.toLowerCase().includes(search.toLowerCase()));

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const valA = a[sortCol];
    const valB = b[sortCol];
    
    if (typeof valA === "number" && typeof valB === "number") {
      return sortDesc ? valB - valA : valA - valB;
    }
    if (typeof valA === "string" && typeof valB === "string") {
      return sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
    }
    return 0;
  });

  const getRatingColor = (rating: number) => {
    if (rating >= 1.20) return "text-emerald-400";
    if (rating <= 0.80) return "text-rose-400";
    return "text-white";
  };

  const getKdColor = (kd: number) => {
    if (kd >= 1.5) return "text-emerald-400";
    if (kd <= 0.8) return "text-rose-400";
    return "text-[#AAA]";
  };

  const SortHeader = ({ col, label, align = "left" }: { col: string, label: string, align?: "left"|"right"|"center" }) => (
    <th 
      className={`px-3 py-2 text-xs font-mono font-bold text-[#888] uppercase tracking-wider cursor-pointer hover:text-white transition-colors text-${align}`}
      onClick={() => handleSort(col)}
    >
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}>
        {label}
        {sortCol === col && (
          <ArrowUpDown className={`w-3 h-3 ${sortDesc ? "text-emerald-400" : "text-amber-400"}`} />
        )}
      </div>
    </th>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0A0A0A] p-4 rounded-xl border border-[#222222]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#141414] border border-[#222]">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Player Statistics</h3>
            <p className="text-xs text-[#888] font-mono">Aggregated tournament stats</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#666] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search player..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#141414] border border-[#333] rounded-lg py-2 pl-9 pr-3 text-xs font-mono text-white placeholder-[#555] focus:outline-none focus:border-emerald-500/50 w-48"
            />
          </div>

          <select
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            className="bg-[#141414] border border-[#333] rounded-lg py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">All Stages</option>
            {stages?.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="bg-[#141414] border border-[#333] rounded-lg py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">All Teams</option>
            {teams?.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-[#111] border-b border-[#222]">
              <tr>
                <th className="px-4 py-3 text-xs font-mono font-bold text-[#888] text-center w-12">#</th>
                <SortHeader col="playerName" label="Player" />
                <SortHeader col="teamName" label="Team" />
                <SortHeader col="matchesPlayed" label="MP" align="center" />
                <SortHeader col="totalKills" label="K" align="center" />
                <SortHeader col="totalDeaths" label="D" align="center" />
                <SortHeader col="totalAssists" label="A" align="center" />
                <SortHeader col="kdRatio" label="K/D" align="center" />
                <SortHeader col="hsPercent" label="HS%" align="center" />
                <SortHeader col="avgAdr" label="ADR" align="center" />
                <SortHeader col="avgRating" label="Rating" align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <div className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </td>
                </tr>
              ) : sortedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#666] font-mono text-xs">
                    Статистика игроков появится после обработки демо-файлов матчей.
                  </td>
                </tr>
              ) : (
                sortedPlayers.map((player, idx) => (
                  <tr key={player.playerId || player.playerName} className="hover:bg-[#111] transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-[#666] text-center">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {player.playerSlug ? (
                          <Link href={`/players/${player.playerSlug}`} className="text-white font-bold hover:text-emerald-400 transition-colors">
                            {player.playerName}
                          </Link>
                        ) : (
                          <span className="text-white font-bold">{player.playerName}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs font-mono text-[#888]">
                      {player.teamName} <span className="text-[#555]">[{player.teamTag}]</span>
                    </td>
                    <td className="px-3 py-3 text-xs font-mono text-center text-white">{player.matchesPlayed}</td>
                    <td className="px-3 py-3 text-xs font-mono text-center text-[#AAA]">{player.totalKills}</td>
                    <td className="px-3 py-3 text-xs font-mono text-center text-[#AAA]">{player.totalDeaths}</td>
                    <td className="px-3 py-3 text-xs font-mono text-center text-[#AAA]">{player.totalAssists}</td>
                    <td className={`px-3 py-3 text-xs font-mono text-center font-bold ${getKdColor(player.kdRatio)}`}>
                      {player.kdRatio.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-xs font-mono text-center text-[#AAA]">{player.hsPercent.toFixed(1)}%</td>
                    <td className="px-3 py-3 text-xs font-mono text-center text-white">{player.avgAdr.toFixed(1)}</td>
                    <td className={`px-3 py-3 text-sm font-mono font-bold text-right ${getRatingColor(player.avgRating)}`}>
                      {player.avgRating.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
