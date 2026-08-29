"use client";

import React, { useState } from "react";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Users,
  History,
  Swords,
  RefreshCw,
  Grid,
  List,
  Shield,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
} from "lucide-react";
import { SwissStandingItem, SwissSettings } from "@/lib/tournamentLogic";

interface SwissBoardProps {
  stageName: string;
  stageId: string;
  tournamentSlug: string;
  bracketNodes: any[];
  standings: SwissStandingItem[];
  settings?: SwissSettings;
  isAdmin?: boolean;
  onMatchClick?: (matchId: string) => void;
  onGenerateRound?: () => void;
  onRegenerateRound?: () => void;
}

export function SwissBoard({
  stageName,
  stageId,
  tournamentSlug,
  bracketNodes,
  standings,
  settings,
  isAdmin,
  onMatchClick,
  onGenerateRound,
  onRegenerateRound,
}: SwissBoardProps) {
  const [viewMode, setViewMode] = useState<"MATRIX" | "ROUNDS">("MATRIX");
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  // Group bracketNodes by round
  const roundsMap: Record<number, any[]> = {};
  bracketNodes.forEach((node) => {
    if (!roundsMap[node.round]) roundsMap[node.round] = [];
    roundsMap[node.round].push(node);
  });

  const availableRounds = Object.keys(roundsMap)
    .map(Number)
    .sort((a, b) => a - b);

  const activeRound = selectedRound || (availableRounds.length > 0 ? availableRounds[availableRounds.length - 1] : 1);
  const maxRounds = settings?.maxRounds || 5;

  const activeCount = standings.filter((s) => s.status === "ACTIVE").length;
  const advancedCount = standings.filter((s) => s.status === "ADVANCED").length;
  const eliminatedCount = standings.filter((s) => s.status === "ELIMINATED").length;

  // Total participants count to dynamically determine matches per pool
  const totalTeams = standings.length || 16;
  const r1MatchesCount = Math.floor(totalTeams / 2);

  // Map matches by record pools
  const poolMatches: Record<string, any[]> = {
    "0-0": [],
    "1-0": [],
    "0-1": [],
    "2-0": [],
    "1-1": [],
    "0-2": [],
    "2-1": [],
    "1-2": [],
    "2-2": [],
  };

  // Calculate team record before a given round based on finished matches in earlier rounds
  function getTeamPreMatchRecord(teamId?: string, targetRound: number = 1) {
    if (!teamId || targetRound <= 1) return "0-0";
    let w = 0;
    let l = 0;
    bracketNodes.forEach((n) => {
      if (n.round >= targetRound) return;
      const m = n.match;
      if (!m || m.status !== "FINISHED") return;
      const isA = m.teamAId === teamId;
      const isB = m.teamBId === teamId;
      if (!isA && !isB) return;

      const isAWin = m.winnerId ? m.winnerId === m.teamAId : m.scoreA > m.scoreB;
      const isWin = isA ? isAWin : !isAWin;
      if (isWin) w++;
      else l++;
    });
    return `${w}-${l}`;
  }

  bracketNodes.forEach((node) => {
    const m = node.match;
    if (!m) return;

    const stA = standings.find((s) => s.teamId === m.teamAId || s.participantId === m.teamAId);
    const stB = standings.find((s) => s.teamId === m.teamBId || s.participantId === m.teamBId);

    let poolKey = "0-0";
    if (node.round === 1) {
      poolKey = "0-0";
    } else {
      const recA = getTeamPreMatchRecord(m.teamAId, node.round);
      const recB = getTeamPreMatchRecord(m.teamBId, node.round);
      poolKey = recA !== "0-0" ? recA : recB;
    }

    if (!poolMatches[poolKey]) poolMatches[poolKey] = [];
    poolMatches[poolKey].push({ match: m, node, stA, stB });
  });

  // Teams categorized by final qualification / elimination records
  const qualified30 = standings.filter((s) => s.status === "ADVANCED" && s.record === "3-0");
  const qualified31 = standings.filter((s) => s.status === "ADVANCED" && s.record === "3-1");
  const qualified32 = standings.filter((s) => s.status === "ADVANCED" && s.record === "3-2");

  const eliminated03 = standings.filter((s) => s.status === "ELIMINATED" && s.record === "0-3");
  const eliminated13 = standings.filter((s) => s.status === "ELIMINATED" && s.record === "1-3");
  const eliminated23 = standings.filter((s) => s.status === "ELIMINATED" && s.record === "2-3");

  // EFL Compact Match Card Component matching reference
  const renderMatchCard = (m: any, stA: any, stB: any) => {
    const isFinished = m.status === "FINISHED";
    const isBye = m.teamBId === m.teamAId || m.teamCustomNameB?.includes("BYE");

    const nameA = m.teamCustomNameA || stA?.name || "Team A";
    const nameB = m.teamCustomNameB || stB?.name || "Team B";

    const logoA = stA?.logoUrl;
    const logoB = stB?.logoUrl;

    const isAWin = isFinished && (m.winnerId ? m.winnerId === m.teamAId : m.scoreA > m.scoreB);
    const isBWin = isFinished && (m.winnerId ? m.winnerId === m.teamBId : m.scoreB > m.scoreA);

    return (
      <div
        key={m.id}
        onClick={() => onMatchClick && onMatchClick(m.id)}
        className="bg-[#111111] hover:bg-[#181818] border border-[#222222] hover:border-[#444444] rounded-lg px-3 py-2 flex items-center justify-between gap-3 transition-all cursor-pointer shadow-sm group"
      >
        {/* Team A */}
        <div className={`flex items-center gap-2 flex-1 min-w-0 ${isAWin ? "text-emerald-400 font-bold" : "text-[#E0E0E0]"}`}>
          {logoA ? (
            <img src={logoA} alt={nameA} className="w-5 h-5 object-contain rounded-full bg-[#050505] p-0.5 border border-[#333]" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[#222222] border border-[#333] flex items-center justify-center text-[8px] font-mono font-bold text-[#AAA]">
              {nameA.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-mono font-semibold truncate">{nameA}</span>
        </div>

        {/* VS / Score */}
        <div className="px-2 py-0.5 rounded bg-[#080808] border border-[#222222] text-[10px] font-mono font-bold text-center flex-shrink-0">
          {isFinished ? (
            <span className="text-emerald-400">{m.scoreA} : {m.scoreB}</span>
          ) : (
            <span className="text-[#666666] uppercase">{isBye ? "BYE" : "VS"}</span>
          )}
        </div>

        {/* Team B */}
        <div className={`flex items-center justify-end gap-2 flex-1 min-w-0 ${isBWin ? "text-emerald-400 font-bold" : "text-[#E0E0E0]"}`}>
          <span className="text-xs font-mono font-semibold truncate">{nameB}</span>
          {logoB ? (
            <img src={logoB} alt={nameB} className="w-5 h-5 object-contain rounded-full bg-[#050505] p-0.5 border border-[#333]" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[#222222] border border-[#333] flex items-center justify-center text-[8px] font-mono font-bold text-[#AAA]">
              {nameB.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper render for Pool Container Box
  const renderPoolBox = (title: string, poolKey: string, maxMatchesCount: number) => {
    const items = poolMatches[poolKey] || [];

    // Find active teams currently holding this pool's record
    const poolTeams = standings
      .filter((s) => {
        if (s.status !== "ACTIVE") return false;
        if (poolKey === "0-0") return s.record === "0-0" || !s.record;
        return s.record === poolKey;
      })
      .sort((a, b) => (a.seed || 0) - (b.seed || 0));

    return (
      <div className="flex flex-col gap-2 bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl p-3 shadow-md">
        <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-2 px-1">
          <span className="text-xs font-black font-mono text-white uppercase tracking-widest">
            {title}
          </span>
          <span className="text-[10px] font-mono text-[#666666]">
            {items.length > 0
              ? `${items.length}/${maxMatchesCount}`
              : poolTeams.length > 0
              ? `${poolTeams.length} teams`
              : `0/${maxMatchesCount}`}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {items.length > 0 ? (
            // If matches for this round are generated, render match cards
            items.map(({ match: m, stA, stB }) => renderMatchCard(m, stA, stB))
          ) : poolTeams.length > 0 ? (
            // If matches not yet generated, but teams have reached this pool: render team slots
            Array.from({ length: Math.max(maxMatchesCount, Math.ceil(poolTeams.length / 2)) }).map((_, idx) => {
              const teamA = poolTeams[idx * 2];
              const teamB = poolTeams[idx * 2 + 1];

              if (!teamA && !teamB) {
                return (
                  <div
                    key={idx}
                    className="bg-[#0F0F0F] border border-dashed border-[#222222] rounded-lg px-3 py-2 flex items-center justify-between text-xs font-mono text-[#444444]"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[9px]">?</div>
                      <span>●</span>
                    </div>
                    <span className="text-[10px] text-[#333333]">VS</span>
                    <div className="flex items-center gap-2">
                      <span>●</span>
                      <div className="w-5 h-5 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[9px]">?</div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className="bg-[#111111] border border-[#222222] rounded-lg px-3 py-2 flex items-center justify-between gap-3 text-xs font-mono text-[#E0E0E0]"
                >
                  {/* Team A */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {teamA ? (
                      <>
                        {teamA.logoUrl ? (
                          <img src={teamA.logoUrl} alt={teamA.name} className="w-5 h-5 object-contain rounded-full bg-[#050505] p-0.5 border border-[#333]" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#222222] border border-[#333] flex items-center justify-center text-[8px] font-mono font-bold text-[#AAA]">
                            {teamA.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-mono font-semibold truncate text-white">{teamA.name}</span>
                      </>
                    ) : (
                      <span className="text-[#444] font-mono text-xs">TBD</span>
                    )}
                  </div>

                  {/* VS badge */}
                  <div className="px-2 py-0.5 rounded bg-[#080808] border border-[#222222] text-[10px] font-mono font-bold text-[#666] text-center flex-shrink-0">
                    VS
                  </div>

                  {/* Team B */}
                  <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
                    {teamB ? (
                      <>
                        <span className="text-xs font-mono font-semibold truncate text-white">{teamB.name}</span>
                        {teamB.logoUrl ? (
                          <img src={teamB.logoUrl} alt={teamB.name} className="w-5 h-5 object-contain rounded-full bg-[#050505] p-0.5 border border-[#333]" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#222222] border border-[#333] flex items-center justify-center text-[8px] font-mono font-bold text-[#AAA]">
                            {teamB.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-[#444] font-mono text-xs">TBD</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            // If no items and no teams in this pool yet
            Array.from({ length: maxMatchesCount }).map((_, idx) => (
              <div
                key={idx}
                className="bg-[#0F0F0F] border border-dashed border-[#222222] rounded-lg px-3 py-2 flex items-center justify-between text-xs font-mono text-[#444444]"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[9px]">?</div>
                  <span>●</span>
                </div>
                <span className="text-[10px] text-[#333333]">VS</span>
                <div className="flex items-center gap-2">
                  <span>●</span>
                  <div className="w-5 h-5 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[9px]">?</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Helper slot renderer for Team Indicators inside ADVANCED & ELIMINATED zones
  const renderTeamSlot = (team?: SwissStandingItem) => {
    return (
      <div
        key={team?.participantId || Math.random()}
        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
          team
            ? "bg-[#111111] border-[#2B3B2F] text-white shadow-sm"
            : "bg-[#0B0B0B] border-white/5 text-[#444444]"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {team?.logoUrl ? (
            <img src={team.logoUrl} alt={team.name} className="w-4 h-4 object-contain rounded-full bg-[#050505] p-0.5 border border-[#333]" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-[#1F1F1F] border border-[#333] flex items-center justify-center text-[8px] font-mono text-[#777]">
              {team ? team.name.slice(0, 2).toUpperCase() : "?"}
            </div>
          )}
          <span className="truncate font-semibold text-xs">{team ? team.name : "?"}</span>
        </div>

        {team && (
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[9px]">
            {team.record}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 bg-[#070707] border border-[#1A1A1A] rounded-2xl p-8 shadow-2xl">
      {/* 1. HEADER SECTION (Exact EFL Subtitle Branding) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#1F1F1F] pb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black uppercase tracking-widest text-white">
            SWISS FORMAT
          </h1>
          <p className="text-xs font-mono font-bold text-[#777777] uppercase tracking-widest">
            ELECTRONIC FUTURE LEAGUE • {stageName}
          </p>
        </div>

        {/* Status Metrics */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="bg-[#111111] border border-[#222222] px-3.5 py-2 rounded-xl flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-[#888888]">ACTIVE:</span>
            <span className="font-bold text-white">{activeCount}</span>
          </div>

          <div className="bg-[#0b2413] border border-emerald-500/40 px-3.5 py-2 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400/90 font-bold">ADVANCED:</span>
            <span className="font-bold text-emerald-400">{advancedCount} / 8</span>
          </div>

          <div className="bg-[#2b0b0b] border border-rose-900/50 px-3.5 py-2 rounded-xl flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-400" />
            <span className="text-rose-400/90 font-bold">ELIMINATED:</span>
            <span className="font-bold text-rose-400">{eliminatedCount} / 8</span>
          </div>
        </div>
      </div>

      {/* Control Switcher & Admin Actions */}
      <div className="bg-[#0D0D0D] border border-[#1F1F1F] rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("MATRIX")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all ${
              viewMode === "MATRIX"
                ? "bg-[#1A1A1A] text-white border border-[#333333] shadow-sm"
                : "bg-transparent text-[#777777] hover:text-white"
            }`}
          >
            <Grid className="w-4 h-4 text-emerald-400" />
            <span>VISUAL MATRIX CANVAS</span>
          </button>

          <button
            onClick={() => setViewMode("ROUNDS")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all ${
              viewMode === "ROUNDS"
                ? "bg-[#1A1A1A] text-white border border-[#333333] shadow-sm"
                : "bg-transparent text-[#777777] hover:text-white"
            }`}
          >
            <List className="w-4 h-4 text-cyan-400" />
            <span>ROUND TABS VIEW</span>
          </button>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3">
            {onRegenerateRound && (
              <button
                onClick={onRegenerateRound}
                className="px-3.5 py-2 rounded-lg bg-[#141414] border border-[#2B2B2B] hover:border-amber-400 text-xs font-mono text-white flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Regenerate Round {activeRound}
              </button>
            )}

            {onGenerateRound && (
              <button
                onClick={onGenerateRound}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-mono font-bold text-white flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20"
              >
                <Swords className="w-3.5 h-3.5" /> Next Round &rarr;
              </button>
            )}
          </div>
        )}
      </div>

      {/* MODE 1: EXACT REPLICATED SWISS MATRIX CANVAS */}
      {viewMode === "MATRIX" && (
        <div className="overflow-x-auto pb-6">
          <div className="min-w-[1400px] grid grid-cols-5 gap-8 items-start relative p-2">

            {/* 2. LEFTMOST BLOCK — ROUND 1 / 0:0 */}
            <div className="flex flex-col gap-4">
              <div className="text-center font-mono font-black text-sm text-white border-b border-[#222222] pb-2 uppercase tracking-widest">
                0:0
              </div>
              {renderPoolBox("0:0", "0-0", r1MatchesCount)}
            </div>

            {/* 3. AFTER RESULTS — 1:0 AND 0:1 */}
            <div className="flex flex-col gap-8">
              {/* Top Column: 1:0 */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono font-black text-emerald-400 border-b border-[#222222] pb-2 uppercase tracking-widest">
                  <span>1:0</span>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-500">
                    <span>WIN</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
                {renderPoolBox("1:0", "1-0", Math.floor(r1MatchesCount / 2))}
              </div>

              {/* Bottom Column: 0:1 */}
              <div className="flex flex-col gap-2 pt-6">
                <div className="flex items-center justify-between text-xs font-mono font-black text-rose-400 border-b border-[#222222] pb-2 uppercase tracking-widest">
                  <span>0:1</span>
                  <div className="flex items-center gap-1 text-[10px] text-rose-500">
                    <span>LOSS</span>
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  </div>
                </div>
                {renderPoolBox("0:1", "0-1", Math.floor(r1MatchesCount / 2))}
              </div>
            </div>

            {/* 4. NEXT LEVEL — 2:0 / 1:1 / 0:2 */}
            <div className="flex flex-col gap-6">
              {/* Pool 2:0 */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono font-black text-emerald-400 border-b border-[#222222] pb-2 uppercase tracking-widest">
                  <span>2:0</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                {renderPoolBox("2:0", "2-0", Math.floor(r1MatchesCount / 4))}
              </div>

              {/* Pool 1:1 */}
              <div className="flex flex-col gap-2 pt-2">
                <div className="text-center font-mono font-black text-xs text-white border-b border-[#222222] pb-2 uppercase tracking-widest">
                  1:1
                </div>
                {renderPoolBox("1:1", "1-1", Math.floor(r1MatchesCount / 2))}
              </div>

              {/* Pool 0:2 */}
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center justify-between text-xs font-mono font-black text-rose-400 border-b border-[#222222] pb-2 uppercase tracking-widest">
                  <span>0:2</span>
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                </div>
                {renderPoolBox("0:2", "0-2", Math.floor(r1MatchesCount / 4))}
              </div>
            </div>

            {/* 5. NEXT LEVEL — 2:1 AND 1:2 */}
            <div className="flex flex-col gap-8">
              {/* Pool 2:1 */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono font-black text-emerald-400 border-b border-[#222222] pb-2 uppercase tracking-widest">
                  <span>2:1</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                {renderPoolBox("2:1", "2-1", 3)}
              </div>

              {/* Pool 1:2 */}
              <div className="flex flex-col gap-2 pt-6">
                <div className="flex items-center justify-between text-xs font-mono font-black text-rose-400 border-b border-[#222222] pb-2 uppercase tracking-widest">
                  <span>1:2</span>
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                </div>
                {renderPoolBox("1:2", "1-2", 3)}
              </div>
            </div>

            {/* 6. FINAL ZONES — ADVANCED (TOP RIGHT), 2:2 (MIDDLE), ELIMINATED (BOTTOM RIGHT) */}
            <div className="flex flex-col gap-6">

              {/* ADVANCED ZONE (Restrained EFL Green #0a2c16) */}
              <div className="bg-[#082412] border border-emerald-500/50 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black font-mono text-emerald-400 uppercase tracking-widest">
                      ADVANCED
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400/70 font-bold">
                    3 WINS
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono font-bold text-emerald-400/80 border-b border-emerald-500/20 pb-1">
                  <span>3:0</span>
                  <span>3:1</span>
                  <span>3:2</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* 3:0 Slots */}
                  <div className="flex flex-col gap-1.5">
                    {renderTeamSlot(qualified30[0])}
                    {renderTeamSlot(qualified30[1])}
                  </div>

                  {/* 3:1 Slots */}
                  <div className="flex flex-col gap-1.5">
                    {renderTeamSlot(qualified31[0])}
                    {renderTeamSlot(qualified31[1])}
                    {renderTeamSlot(qualified31[2])}
                  </div>

                  {/* 3:2 Slots */}
                  <div className="flex flex-col gap-1.5">
                    {renderTeamSlot(qualified32[0])}
                    {renderTeamSlot(qualified32[1])}
                    {renderTeamSlot(qualified32[2])}
                  </div>
                </div>
              </div>

              {/* MIDDLE POOL: 2:2 */}
              <div className="flex flex-col gap-2">
                <div className="text-center font-mono font-black text-xs text-[#E0E0E0] border-b border-[#222222] pb-2 uppercase tracking-widest">
                  2:2
                </div>
                {renderPoolBox("2:2", "2-2", 3)}
              </div>

              {/* ELIMINATED ZONE (Restrained EFL Red #2c0a0a) */}
              <div className="bg-[#240808] border border-rose-900/60 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-rose-900/40 pb-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-black font-mono text-rose-400 uppercase tracking-widest">
                      ELIMINATED
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-rose-400/70 font-bold">
                    3 LOSSES
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono font-bold text-rose-400/80 border-b border-rose-900/30 pb-1">
                  <span>0:3</span>
                  <span>1:3 & 2:3</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* 0:3 Slots */}
                  <div className="flex flex-col gap-1.5">
                    {renderTeamSlot(eliminated03[0])}
                    {renderTeamSlot(eliminated03[1])}
                  </div>

                  {/* 1:3 & 2:3 Slots */}
                  <div className="flex flex-col gap-1.5">
                    {renderTeamSlot(eliminated13[0] || eliminated23[0])}
                    {renderTeamSlot(eliminated13[1] || eliminated23[1])}
                    {renderTeamSlot(eliminated13[2] || eliminated23[2])}
                    {renderTeamSlot(eliminated23[3])}
                    {renderTeamSlot(eliminated23[4])}
                    {renderTeamSlot(eliminated23[5])}
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODE 2: ROUND TABS VIEW */}
      {viewMode === "ROUNDS" && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {Array.from({ length: maxRounds }).map((_, idx) => {
              const rNum = idx + 1;
              const rNodes = roundsMap[rNum] || [];
              const isCompleted = rNodes.length > 0 && rNodes.every((n) => n.match?.status === "FINISHED");
              const isCurrent = activeRound === rNum;
              const hasMatches = rNodes.length > 0;

              return (
                <button
                  key={rNum}
                  onClick={() => setSelectedRound(rNum)}
                  className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                    isCurrent
                      ? "bg-[#1F1F1F] text-white border border-[#333333] shadow-sm"
                      : isCompleted
                      ? "bg-[#111111] text-emerald-400 border border-emerald-500/30"
                      : hasMatches
                      ? "bg-[#111111] text-white border border-[#222222]"
                      : "bg-[#080808] text-[#555555] border border-[#181818]"
                  }`}
                >
                  <span>ROUND {rNum}</span>
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(roundsMap[activeRound] || []).map((node) => {
              const m = node.match;
              if (!m) return null;

              const stA = standings.find((s) => s.teamId === m.teamAId || s.participantId === m.teamAId);
              const stB = standings.find((s) => s.teamId === m.teamBId || s.participantId === m.teamBId);

              return renderMatchCard(m, stA, stB);
            })}
          </div>
        </div>
      )}

      {/* Opponents History */}
      <div className="bg-[#0B0B0B] border border-[#1F1F1F] rounded-xl p-6 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              ИСТОРИЯ СОПЕРНИКОВ КОМАНД (PREVIOUS OPPONENTS)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#666666]">
            * Гарантия отсутствия повторных встреч
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {standings.slice(0, 16).map((st) => (
            <div
              key={st.participantId}
              className="bg-[#111111] border border-[#222222] rounded-xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase">{st.name}</span>
                <span className="px-2 py-0.5 rounded bg-[#080808] text-emerald-400 font-mono font-bold text-[10px]">
                  {st.record}
                </span>
              </div>

              <div className="text-[10px] font-mono text-[#888888] flex flex-wrap gap-1">
                <span>Соперники:</span>
                {st.matches.length === 0 ? (
                  <span className="text-[#555555]">Нет сыгр. матчей</span>
                ) : (
                  st.matches.map((m, idx) => (
                    <span
                      key={idx}
                      className={`px-1.5 py-0.5 rounded ${
                        m.result === "WIN"
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-900/60"
                          : "bg-rose-950/60 text-rose-400 border border-rose-900/60"
                      }`}
                    >
                      R{m.round}: {m.opponent} ({m.score})
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
