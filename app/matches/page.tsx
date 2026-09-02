"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, Trophy, RefreshCw, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";

interface MatchTeam {
  id: string;
  name: string;
  tag: string;
  slug: string;
  logoUrl: string;
  tier: string;
}

interface MatchItem {
  id: string;
  teamAId: string;
  teamBId: string;
  teamCustomNameA?: string;
  teamCustomNameB?: string;
  scoreA: number;
  scoreB: number;
  status: string; // SCHEDULED, LIVE, FINISHED, CANCELLED
  scheduledAt: string;
  finishedAt?: string;
  bestOf: number;
  tier: string;
  winnerId?: string;
  isForfeit?: boolean;
  forfeitReason?: string;
  teamA: MatchTeam;
  teamB: MatchTeam;
}

export default function MatchesPage() {
  const [upcomingMatches, setUpcomingMatches] = useState<MatchItem[]>([]);
  const [finishedMatches, setFinishedMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "UPCOMING" | "FINISHED">("ALL");
  const [tierFilter, setTierFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/matches", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUpcomingMatches(data.upcoming || []);
          setFinishedMatches(data.finished || []);
        }
      })
      .catch((err) => console.error("Failed to fetch matches:", err))
      .finally(() => setLoading(false));
  }, []);

  const filterMatchesByTier = (list: MatchItem[]) => {
    if (tierFilter === "ALL") return list;
    return list.filter((m) => {
      const matchTier = (m.tier || "TIER 1").toUpperCase().replace(/\s+/g, "");
      const filter = tierFilter.toUpperCase().replace(/\s+/g, "");
      return matchTier.includes(filter);
    });
  };

  const filteredUpcoming = filterMatchesByTier(upcomingMatches);
  const filteredFinished = filterMatchesByTier(finishedMatches);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222222] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#141414] border border-[#222222] text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>ASCENT LEAGUE MATCHES</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            РАСПИСАНИЕ И ИСТОРИЯ МАТЧЕЙ
          </h1>
          <p className="text-xs text-[#858585] mt-1 max-w-xl">
            Расписание предстоящих турнирных встреч лиги EFL, прямые трансляции и полная история прошедших матчей.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 bg-[#151515] p-1.5 rounded-xl border border-[#222222]">
          {[
            { id: "ALL", label: "ВСЕ МАТЧИ" },
            { id: "UPCOMING", label: `БЛИЖАЙШИЕ (${upcomingMatches.length})` },
            { id: "FINISHED", label: `ЗАВЕРШЕННЫЕ (${finishedMatches.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? "bg-white text-black shadow-md"
                  : "text-[#858585] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tier Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-[#1A1A1A]">
        {[
          { id: "ALL", label: "ВСЕ ТИРЫ" },
          { id: "TIER1", label: "🥇 TIER 1" },
          { id: "TIER2", label: "🥈 TIER 2" },
          { id: "TIER3", label: "🥉 TIER 3" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTierFilter(t.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              tierFilter === t.id
                ? "bg-[#222222] text-white border border-[#444444]"
                : "bg-[#151515] border border-[#1F1F1F] text-[#858585] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-[#858585]">
          <RefreshCw className="w-6 h-6 animate-spin text-white" />
          <span className="text-xs font-semibold uppercase tracking-widest">Загрузка матчей...</span>
        </div>
      ) : (
        <div className="space-y-12">
          {/* UPCOMING MATCHES SECTION */}
          {(activeTab === "ALL" || activeTab === "UPCOMING") && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-400" />
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  БЛИЖАЙШИЕ МАТЧИ
                </h2>
                <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/80 text-[10px] font-mono font-bold text-amber-400">
                  {filteredUpcoming.length}
                </span>
              </div>

              {filteredUpcoming.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredUpcoming.map((match) => {
                    const dateObj = new Date(match.scheduledAt);
                    const formattedDate = dateObj.toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "short",
                    });
                    const formattedTime = dateObj.toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={match.id}
                        className="bg-[#151515] border border-[#222222] hover:border-[#444444] rounded-2xl p-5 transition-all flex flex-col justify-between gap-4 group"
                      >
                        {/* Header info */}
                        <div className="flex items-center justify-between border-b border-[#181818] pb-3 text-xs font-mono">
                          <span className="px-2.5 py-0.5 rounded bg-[#141414] border border-[#222222] text-[#858585] font-bold">
                            BO{match.bestOf}
                          </span>
                          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formattedDate}, {formattedTime}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/50 text-amber-300 text-[10px] font-black uppercase">
                            {match.tier}
                          </span>
                        </div>

                        {/* Teams matchup */}
                        <div className="grid grid-cols-5 items-center gap-2 py-2">
                          {/* Team A */}
                          <Link
                            href={`/teams/${match.teamA.slug}`}
                            className="col-span-2 flex flex-col items-center text-center gap-2 group/team"
                          >
                            <div className="w-14 h-14 rounded-xl bg-[#151515] border border-[#222222] group-hover/team:border-white transition-colors overflow-hidden flex items-center justify-center p-1">
                              <TeamLogo logoUrl={match.teamA.logoUrl} name={match.teamA.name} tag={match.teamA.tag} className="w-full h-full object-cover" />
                            </div>
                            <span className="font-extrabold text-white text-xs uppercase tracking-tight group-hover/team:text-amber-400 transition-colors line-clamp-1">
                              {match.teamA.name}
                            </span>
                          </Link>

                          {/* VS Badge */}
                          <div className="col-span-1 flex flex-col items-center justify-center">
                            <span className="w-9 h-9 rounded-full bg-[#141414] border border-[#222222] flex items-center justify-center font-black text-xs text-[#858585] shadow-inner">
                              VS
                            </span>
                          </div>

                          {/* Team B */}
                          <Link
                            href={`/teams/${match.teamB.slug}`}
                            className="col-span-2 flex flex-col items-center text-center gap-2 group/team"
                          >
                            <div className="w-14 h-14 rounded-xl bg-[#151515] border border-[#222222] group-hover/team:border-white transition-colors overflow-hidden flex items-center justify-center p-1">
                              <TeamLogo logoUrl={match.teamB.logoUrl} name={match.teamB.name} tag={match.teamB.tag} className="w-full h-full object-cover" />
                            </div>
                            <span className="font-extrabold text-white text-xs uppercase tracking-tight group-hover/team:text-amber-400 transition-colors line-clamp-1">
                              {match.teamB.name}
                            </span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 bg-[#151515] border border-[#222222] rounded-xl text-center text-xs text-[#858585]">
                  Предстоящих матчей пока нет.
                </div>
              )}
            </div>
          )}

          {/* FINISHED MATCHES SECTION */}
          {(activeTab === "ALL" || activeTab === "FINISHED") && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  ИСТОРИЯ МАТЧЕЙ
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/80 text-[10px] font-mono font-bold text-emerald-400">
                  {filteredFinished.length}
                </span>
              </div>

              {filteredFinished.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredFinished.map((match) => {
                    const dateObj = new Date(match.finishedAt || match.scheduledAt);
                    const formattedDate = dateObj.toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "short",
                    });

                    const isAWin = match.winnerId === match.teamA.id || match.scoreA > match.scoreB;
                    const isBWin = match.winnerId === match.teamB.id || match.scoreB > match.scoreA;

                    return (
                      <div
                        key={match.id}
                        className="bg-[#151515] border border-[#222222] rounded-2xl p-5 flex flex-col justify-between gap-4"
                      >
                        {/* Header info */}
                        <div className="flex items-center justify-between border-b border-[#181818] pb-3 text-xs font-mono">
                          {match.isForfeit ? (
                            <span className="px-2 py-0.5 rounded bg-red-950/60 border border-red-800/80 text-red-400 font-black text-[10px] uppercase">
                              ТЕХ. ПОРАЖЕНИЕ (ТП)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 font-extrabold text-[10px]">
                              ЗАВЕРШЕН (BO{match.bestOf})
                            </span>
                          )}
                          <span className="text-[#858585] text-[11px] font-bold">{formattedDate}</span>
                        </div>

                        {/* Match Result */}
                        <div className="grid grid-cols-5 items-center gap-2 py-1">
                          {/* Team A */}
                          {match.teamAId === "unknown-team-placeholder" ? (
                            <div
                              className={`col-span-2 flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                                isAWin
                                  ? "bg-emerald-950/20 border-emerald-600/50 text-white"
                                  : match.isForfeit && isBWin
                                  ? "bg-red-950/20 border-red-800/60 text-red-200"
                                  : "bg-[#151515] border-[#1F1F1F] text-[#858585]"
                              }`}
                            >
                              <div className="w-10 h-10 rounded-lg bg-[#151515] border border-[#222222] overflow-hidden flex items-center justify-center p-0.5 flex-shrink-0">
                                <TeamLogo logoUrl={match.teamA.logoUrl} name={match.teamCustomNameA || match.teamA.name} tag="GUEST" className="w-full h-full object-cover" />
                              </div>
                              <div className="overflow-hidden">
                                <span className="font-extrabold text-xs uppercase block truncate">
                                  {match.teamCustomNameA || match.teamA.name}
                                </span>
                                {match.isForfeit ? (
                                  isAWin ? (
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">ПОБЕДА (ТП)</span>
                                  ) : (
                                    <span className="text-[9px] font-black text-red-400 uppercase tracking-wider block">ТЕХ. ПОРАЖЕНИЕ (ТП)</span>
                                  )
                                ) : isAWin ? (
                                  <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest block">WINNER</span>
                                ) : (
                                  <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-widest block">ВНЕШНЯЯ</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <Link
                              href={`/teams/${match.teamA.slug}`}
                              className={`col-span-2 flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                                isAWin
                                  ? "bg-emerald-950/20 border-emerald-600/50 text-white"
                                  : match.isForfeit && isBWin
                                  ? "bg-red-950/20 border-red-800/60 text-red-200"
                                  : "bg-[#151515] border-[#1F1F1F] text-[#858585]"
                              }`}
                            >
                              <div className="w-10 h-10 rounded-lg bg-[#151515] border border-[#222222] overflow-hidden flex items-center justify-center p-0.5 flex-shrink-0">
                                <TeamLogo logoUrl={match.teamA.logoUrl} name={match.teamA.name} tag={match.teamA.tag} className="w-full h-full object-cover" />
                              </div>
                              <div className="overflow-hidden">
                                <span className="font-extrabold text-xs uppercase block truncate">
                                  {match.teamA.name}
                                </span>
                                {match.isForfeit ? (
                                  isAWin ? (
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">ПОБЕДА (ТП)</span>
                                  ) : (
                                    <span className="text-[9px] font-black text-red-400 uppercase tracking-wider block">ТЕХ. ПОРАЖЕНИЕ (ТП)</span>
                                  )
                                ) : isAWin ? (
                                  <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest block">WINNER</span>
                                ) : null}
                              </div>
                            </Link>
                          )}

                          {/* Score Display */}
                          <div className="col-span-1 flex flex-col items-center justify-center font-mono gap-1">
                            <span className={`px-3 py-1.5 rounded-lg border text-sm font-black tracking-widest shadow-md ${
                              match.isForfeit ? "bg-red-950/60 border-red-800 text-red-200" : "bg-[#141414] border-[#222222] text-white"
                            }`}>
                              {match.scoreA} : {match.scoreB}
                            </span>
                            {match.isForfeit && (
                              <span className="text-[9px] font-mono font-bold text-red-400 uppercase">
                                [ ТП ]
                              </span>
                            )}
                          </div>

                          {/* Team B */}
                          {match.teamBId === "unknown-team-placeholder" ? (
                            <div
                              className={`col-span-2 flex items-center justify-end text-right gap-3 p-2.5 rounded-xl border transition-all ${
                                isBWin
                                  ? "bg-emerald-950/20 border-emerald-600/50 text-white"
                                  : match.isForfeit && isAWin
                                  ? "bg-red-950/20 border-red-800/60 text-red-200"
                                  : "bg-[#151515] border-[#1F1F1F] text-[#858585]"
                              }`}
                            >
                              <div className="overflow-hidden">
                                <span className="font-extrabold text-xs uppercase block truncate">
                                  {match.teamCustomNameB || match.teamB.name}
                                </span>
                                {match.isForfeit ? (
                                  isBWin ? (
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">ПОБЕДА (ТП)</span>
                                  ) : (
                                    <span className="text-[9px] font-black text-red-400 uppercase tracking-wider block">ТЕХ. ПОРАЖЕНИЕ (ТП)</span>
                                  )
                                ) : isBWin ? (
                                  <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest block">WINNER</span>
                                ) : (
                                  <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-widest block">ВНЕШНЯЯ</span>
                                )}
                              </div>
                              <div className="w-10 h-10 rounded-lg bg-[#151515] border border-[#222222] overflow-hidden flex items-center justify-center p-0.5 flex-shrink-0">
                                <TeamLogo logoUrl={match.teamB.logoUrl} name={match.teamCustomNameB || match.teamB.name} tag="GUEST" className="w-full h-full object-cover" />
                              </div>
                            </div>
                          ) : (
                            <Link
                              href={`/teams/${match.teamB.slug}`}
                              className={`col-span-2 flex items-center justify-end text-right gap-3 p-2.5 rounded-xl border transition-all ${
                                isBWin
                                  ? "bg-emerald-950/20 border-emerald-600/50 text-white"
                                  : match.isForfeit && isAWin
                                  ? "bg-red-950/20 border-red-800/60 text-red-200"
                                  : "bg-[#151515] border-[#1F1F1F] text-[#858585]"
                              }`}
                            >
                              <div className="overflow-hidden">
                                <span className="font-extrabold text-xs uppercase block truncate">
                                  {match.teamB.name}
                                </span>
                                {match.isForfeit ? (
                                  isBWin ? (
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">ПОБЕДА (ТП)</span>
                                  ) : (
                                    <span className="text-[9px] font-black text-red-400 uppercase tracking-wider block">ТЕХ. ПОРАЖЕНИЕ (ТП)</span>
                                  )
                                ) : isBWin ? (
                                  <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest block">WINNER</span>
                                ) : null}
                              </div>
                              <div className="w-10 h-10 rounded-lg bg-[#151515] border border-[#222222] overflow-hidden flex items-center justify-center p-0.5 flex-shrink-0">
                                <TeamLogo logoUrl={match.teamB.logoUrl} name={match.teamB.name} tag={match.teamB.tag} className="w-full h-full object-cover" />
                              </div>
                            </Link>
                          )}
                        </div>

                        {/* Forfeit Reason Footer */}
                        {match.isForfeit && (
                          <div className="mt-2 pt-2 border-t border-[#181818] flex items-center justify-between text-[10px] font-mono">
                            <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-800/60 text-red-300 font-bold uppercase truncate max-w-full">
                              ⚠️ ТЕХ. ПОРАЖЕНИЕ: {match.forfeitReason || "Нарушение регламента лиги"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 bg-[#151515] border border-[#222222] rounded-xl text-center text-xs text-[#858585]">
                  История сыгранных матчей пока пуста.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
