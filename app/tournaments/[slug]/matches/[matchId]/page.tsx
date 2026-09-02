"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Link as LinkIcon, ArrowLeft, Award } from "lucide-react";

export default function StandaloneMatchPage({ params }: { params: { slug: string; matchId: string } }) {
  const { slug, matchId } = params;
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Demo parsing state
  const [demoUrl, setDemoUrl] = useState("");
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  function fetchMatch() {
    setLoading(true);
    fetch(`/api/tournaments/${slug}/matches/${matchId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.match) {
          setMatch(data.match);
          setIsAdmin(data.isAdmin);
          if (data.match.demoUrl) setDemoUrl(data.match.demoUrl);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  async function handleParseDemo(e: React.FormEvent) {
    e.preventDefault();
    if (!demoUrl.trim()) return;
    setParsing(true);

    try {
      const res = await fetch(`/api/tournaments/${slug}/matches/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoUrl, status: "FINISHED" }),
      });
      const data = await res.json();
      if (data.success) {
        fetchMatch();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setParsing(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center font-mono text-xs text-[#666] animate-pulse">
        ЗАГРУЗКА МАТЧА...
      </div>
    );
  }

  if (!match) {
    return (
      <div className="py-20 text-center font-mono text-xs text-rose-400">
        Матч не найден.
      </div>
    );
  }

  const nameA = match.teamCustomNameA || match.teamA?.name || "Team A";
  const nameB = match.teamCustomNameB || match.teamB?.name || "Team B";

  const tagA = match.teamA?.tag || "A";
  const tagB = match.teamB?.tag || "B";

  const isFinished = match.status === "FINISHED";
  const isAWin = isFinished && (match.winnerId ? match.winnerId === match.teamAId : match.scoreA > match.scoreB);
  const isBWin = isFinished && (match.winnerId ? match.winnerId === match.teamBId : match.scoreB > match.scoreA);

  let mapResults: any[] = [];
  if (match.mapResults) {
    try {
      mapResults = JSON.parse(match.mapResults);
    } catch (e) {}
  }

  return (
    <div className="max-w-6xl mx-auto w-full px-6 py-10 flex-1 flex flex-col gap-8">
      {/* Back Link */}
      <Link
        href={`/tournaments/${slug}`}
        className="inline-flex items-center gap-2 text-xs font-mono text-[#888] hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-emerald-400" /> Назад к турниру
      </Link>

      {/* Match Header Scoreboard */}
      <div className="bg-[#151515] border border-[#222222] rounded-2xl p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between text-xs font-mono border-b border-[#1A1A1A] pb-4">
          <span className="text-[#888] uppercase">
            {match.stage?.type === "SWISS" ? `SWISS — ROUND ${match.bracketNode?.round || 1}` : match.stage?.name} {match.group ? `• ${match.group.name}` : ""}
          </span>
          <span
            className={`font-bold uppercase ${
              isFinished ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {match.status} (BO{match.bestOf || 1})
          </span>
        </div>

        <div className="grid grid-cols-3 items-center py-6">
          {/* Team A */}
          <div className="flex flex-col items-center gap-3 text-center">
            {match.teamA?.logoUrl ? (
              <img
                src={match.teamA.logoUrl}
                alt={nameA}
                className="w-16 h-16 object-contain rounded-xl bg-[#141414] p-2 border border-[#333]"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-[#141414] border border-[#222] flex items-center justify-center text-lg font-mono text-[#888]">
                {tagA}
              </div>
            )}
            <span className={`text-lg font-bold font-mono ${isAWin ? "text-emerald-400" : "text-white"}`}>
              {nameA}
            </span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-4 bg-[#141414] border border-[#222] px-6 py-3 rounded-2xl">
              <span className={`text-3xl font-black font-mono ${isAWin ? "text-emerald-400" : "text-white"}`}>
                {match.scoreA}
              </span>
              <span className="text-xl text-[#555] font-mono">:</span>
              <span className={`text-3xl font-black font-mono ${isBWin ? "text-emerald-400" : "text-white"}`}>
                {match.scoreB}
              </span>
            </div>
          </div>

          {/* Team B */}
          <div className="flex flex-col items-center gap-3 text-center">
            {match.teamB?.logoUrl ? (
              <img
                src={match.teamB.logoUrl}
                alt={nameB}
                className="w-16 h-16 object-contain rounded-xl bg-[#141414] p-2 border border-[#333]"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-[#141414] border border-[#222] flex items-center justify-center text-lg font-mono text-[#888]">
                {tagB}
              </div>
            )}
            <span className={`text-lg font-bold font-mono ${isBWin ? "text-emerald-400" : "text-white"}`}>
              {nameB}
            </span>
          </div>
        </div>
      </div>

      {/* Map Breakdown (e.g. Mirage 13:8) */}
      {mapResults.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
            РЕЗУЛЬТАТЫ КАРТ (MAPS)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mapResults.map((m: any, idx: number) => (
              <div
                key={idx}
                className="bg-[#151515] border border-[#222] rounded-xl p-4 flex items-center justify-between font-mono"
              >
                <span className="text-xs font-bold text-white uppercase">{m.map || `Map ${idx + 1}`}</span>
                <span className="text-xs font-bold text-emerald-400">
                  {m.scoreA} : {m.scoreB}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Demo Parser Attachment Box */}
      <div className="bg-[#151515] border border-[#222] rounded-xl p-6 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-[#1A1A1A] pb-3">
          <LinkIcon className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
            DEMO PARSER INTEGRATION
          </h3>
        </div>

        <form onSubmit={handleParseDemo} className="flex flex-col md:flex-row items-center gap-3">
          <input
            type="text"
            placeholder="Вставьте ссылку Cybershoke match URL для автоматического парсинга..."
            value={demoUrl}
            onChange={(e) => setDemoUrl(e.target.value)}
            className="flex-1 bg-[#111] border border-[#222] rounded-lg py-2.5 px-3 text-xs font-mono text-white placeholder-[#555] focus:outline-none focus:border-white/40"
          />
          <button
            type="submit"
            disabled={parsing}
            className="w-full md:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-mono font-bold text-white rounded-lg transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {parsing ? "Парсинг Демки..." : "Привязать и Парсить"}
          </button>
        </form>
      </div>

      {/* Player Statistics Table */}
      <div className="bg-[#151515] border border-[#222] rounded-xl p-6 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              СТАТИСТИКА ИГРОКОВ (PLAYER PERFORMANCE)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#666]">
            * Влияет на EFL Rating в профиле игрока
          </span>
        </div>

        {match.playerStats.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-[#666]">
            Статистика игроков появится после загрузки и обработки файла демо / ссылки Cybershoke.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-[#666] border-b border-[#1A1A1A] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Игрок</th>
                  <th className="py-2.5 px-2 text-center text-emerald-400">K</th>
                  <th className="py-2.5 px-2 text-center text-rose-400">D</th>
                  <th className="py-2.5 px-2 text-center">A</th>
                  <th className="py-2.5 px-2 text-center">HS%</th>
                  <th className="py-2.5 px-2 text-center">ADR</th>
                  <th className="py-2.5 px-3 text-right text-white font-bold">RATING</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {match.playerStats.map((st: any) => (
                  <tr key={st.id} className="hover:bg-[#111] transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">
                      {st.player?.slug ? (
                        <Link href={`/players/${st.player.slug}`} className="hover:text-emerald-400">
                          {st.playerName}
                        </Link>
                      ) : (
                        st.playerName
                      )}
                    </td>
                    <td className="py-3 px-2 text-center text-emerald-400 font-bold">{st.kills}</td>
                    <td className="py-3 px-2 text-center text-rose-400">{st.deaths}</td>
                    <td className="py-3 px-2 text-center text-[#888]">{st.assists}</td>
                    <td className="py-3 px-2 text-center text-[#888]">
                      {st.kills > 0 ? Math.round((st.headshots / st.kills) * 100) : 0}%
                    </td>
                    <td className="py-3 px-2 text-center text-[#A0A0A0]">{st.adr}</td>
                    <td className="py-3 px-3 text-right text-white font-black text-sm">
                      <span
                        className={
                          st.rating >= 1.2
                            ? "text-emerald-400"
                            : st.rating <= 0.8
                            ? "text-rose-400"
                            : "text-white"
                        }
                      >
                        {st.rating.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
