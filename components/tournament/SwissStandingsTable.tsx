"use client";

import React from "react";
import Link from "next/link";
import { Award, CheckCircle2, XCircle, Shield } from "lucide-react";
import { SwissStandingItem } from "@/lib/tournamentLogic";

interface SwissStandingsTableProps {
  standings: SwissStandingItem[];
}

export function SwissStandingsTable({ standings }: SwissStandingsTableProps) {
  if (!standings || standings.length === 0) {
    return (
      <div className="py-12 text-center text-xs font-mono text-[#666] border border-dashed border-[#222] rounded-xl">
        Таблица Swiss пока пуста. Сгенерируйте первый раунд.
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-6 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
            SWISS STANDINGS
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#666]">
          * Top 8 квалифицируются в Плей-офф
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="text-[#666] border-b border-[#1A1A1A] uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-4">Команда (Team)</th>
              <th className="py-2.5 px-3 text-center text-amber-400 font-bold">Record</th>
              <th className="py-2.5 px-2 text-center text-[#888]">MP</th>
              <th className="py-2.5 px-2 text-center text-emerald-400">W</th>
              <th className="py-2.5 px-2 text-center text-rose-400">L</th>
              <th className="py-2.5 px-2 text-center">Diff</th>
              <th className="py-2.5 px-2 text-center text-cyan-400">Buchholz</th>
              <th className="py-2.5 px-3 text-right">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#141414]">
            {standings.map((item) => {
              const isAdvanced = item.status === "ADVANCED";
              const isEliminated = item.status === "ELIMINATED";

              return (
                <tr
                  key={item.participantId}
                  className={`hover:bg-[#111] transition-colors ${
                    isAdvanced
                      ? "bg-emerald-950/10 hover:bg-emerald-950/20"
                      : isEliminated
                      ? "bg-rose-950/10 hover:bg-rose-950/20 opacity-60"
                      : ""
                  }`}
                >
                  <td className="py-3 px-3 font-bold text-[#888]">{item.rank}</td>
                  <td className="py-3 px-4 font-bold text-white">
                    <div className="flex items-center gap-2.5">
                      {item.logoUrl ? (
                        <img
                          src={item.logoUrl}
                          alt={item.name}
                          className="w-5 h-5 object-contain rounded bg-[#141414] p-0.5"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-[#141414] border border-[#222] flex items-center justify-center text-[9px] text-[#888]">
                          <Shield className="w-3 h-3 text-[#666]" />
                        </div>
                      )}
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center font-black text-sm text-amber-400">
                    {item.record}
                  </td>
                  <td className="py-3 px-2 text-center text-[#888]">{item.mp}</td>
                  <td className="py-3 px-2 text-center text-emerald-400 font-bold">{item.w}</td>
                  <td className="py-3 px-2 text-center text-rose-400 font-bold">{item.l}</td>
                  <td className="py-3 px-2 text-center text-[#A0A0A0]">
                    {item.diff > 0 ? `+${item.diff}` : item.diff}
                  </td>
                  <td className="py-3 px-2 text-center text-cyan-400 font-bold">{item.buchholz}</td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isAdvanced
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20"
                          : isEliminated
                          ? "bg-rose-950/40 text-rose-400 border border-rose-900/50"
                          : "bg-[#141414] text-white border border-[#333]"
                      }`}
                    >
                      {isAdvanced && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      {isEliminated && <XCircle className="w-3 h-3 text-rose-400" />}
                      <span>{item.status}</span>
                    </span>
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
