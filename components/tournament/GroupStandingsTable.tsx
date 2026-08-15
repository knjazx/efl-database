"use client";

import React from "react";
import { Trophy, CheckCircle2 } from "lucide-react";

export interface StandingRow {
  participantId: string;
  name: string;
  tag: string;
  logoUrl?: string | null;
  mp: number;
  w: number;
  l: number;
  roundsWon: number;
  roundsLost: number;
  diff: number;
  points: number;
  rank: number;
}

interface Props {
  groupName: string;
  standings: StandingRow[];
  advancingCount?: number;
  onMatchClick?: (matchId: string) => void;
}

export function GroupStandingsTable({ groupName, standings, advancingCount = 2 }: Props) {
  return (
    <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-5 shadow-2xl flex flex-col gap-4">
      {/* Table Header / Group Name */}
      <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold tracking-wider text-white uppercase">{groupName}</h3>
        </div>
        <div className="text-[11px] font-mono text-[#858585] uppercase tracking-widest">
          TOP {advancingCount} ADVANCE
        </div>
      </div>

      {/* Standings Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse min-w-[500px]">
          <thead>
            <tr className="text-[#666666] border-b border-[#1A1A1A] uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3 w-12 text-center">#</th>
              <th className="py-2.5 px-3">Команда</th>
              <th className="py-2.5 px-2 text-center">MP</th>
              <th className="py-2.5 px-2 text-center text-emerald-400">W</th>
              <th className="py-2.5 px-2 text-center text-rose-400">L</th>
              <th className="py-2.5 px-3 text-center">Раунды</th>
              <th className="py-2.5 px-2 text-center">Diff</th>
              <th className="py-2.5 px-3 text-right text-white font-bold">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#141414]">
            {standings.map((row) => {
              const isQualified = row.rank <= advancingCount;
              return (
                <tr
                  key={row.participantId}
                  className={`transition-colors hover:bg-[#121212] ${
                    isQualified ? "bg-emerald-950/10" : ""
                  }`}
                >
                  <td className="py-3 px-3 text-center font-bold">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold ${
                        row.rank === 1
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : row.rank === 2
                          ? "bg-slate-300/20 text-slate-300 border border-slate-300/30"
                          : isQualified
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "text-[#666666]"
                      }`}
                    >
                      {row.rank}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      {row.logoUrl ? (
                        <img
                          src={row.logoUrl}
                          alt={row.name}
                          className="w-6 h-6 object-contain rounded bg-[#141414] border border-[#222]"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-[#1A1A1A] border border-[#333] flex items-center justify-center text-[9px] font-bold text-[#888]">
                          {row.tag?.substring(0, 2)}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-white font-semibold tracking-wide text-xs flex items-center gap-1.5">
                          {row.name}
                          {isQualified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                          )}
                        </span>
                        <span className="text-[10px] text-[#666666] font-mono">[{row.tag}]</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center text-[#A0A0A0]">{row.mp}</td>
                  <td className="py-3 px-2 text-center text-emerald-400 font-bold">{row.w}</td>
                  <td className="py-3 px-2 text-center text-rose-400 font-medium">{row.l}</td>
                  <td className="py-3 px-3 text-center text-[#888888] font-mono">
                    {row.roundsWon}:{row.roundsLost}
                  </td>
                  <td className="py-3 px-2 text-center font-mono">
                    <span
                      className={
                        row.diff > 0
                          ? "text-emerald-400"
                          : row.diff < 0
                          ? "text-rose-400"
                          : "text-[#666]"
                      }
                    >
                      {row.diff > 0 ? `+${row.diff}` : row.diff}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-white font-black text-sm">
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
