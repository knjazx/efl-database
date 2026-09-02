"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Trophy, RefreshCw, Save, Sparkles, Check, Search, Shield, Zap } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";
import Link from "next/link";

interface TeamRankItem {
  id: string;
  name: string;
  tag: string;
  slug: string;
  tier: string;
  logoUrl: string;
  points: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
}

export default function AdminRankingsPage() {
  const [teams, setTeams] = useState<TeamRankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Local editable state per team
  const [editState, setEditState] = useState<{
    [id: string]: { tier: string; points: number; wins: number; losses: number };
  }>({});

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teams", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.teams)) {
        setTeams(data.teams);
        const state: any = {};
        data.teams.forEach((t: TeamRankItem) => {
          state[t.id] = {
            tier: t.tier || "TIER 3",
            points: t.points || 0,
            wins: t.wins || 0,
            losses: t.losses || 0,
          };
        });
        setEditState(state);
      }
    } catch (err) {
      console.error("Failed to fetch teams for rankings admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleSaveTeamRank = async (teamId: string) => {
    const item = editState[teamId];
    if (!item) return;

    setSavingId(teamId);
    setSuccessId(null);
    try {
      const res = await fetch("/api/admin/rankings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          tier: item.tier,
          points: item.points,
          wins: item.wins,
          losses: item.losses,
          matchesPlayed: item.wins + item.losses,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessId(teamId);
        setTimeout(() => setSuccessId(null), 2500);
      } else {
        alert(data.error || "Ошибка сохранения");
      }
    } catch (err) {
      alert("Ошибка подключения к серверу");
    } finally {
      setSavingId(null);
    }
  };

  const handleSetAllTier3 = async () => {
    if (!confirm("Вы действительно хотите сбросить ВСЕ команды до TIER 3 и обнулить очки?")) return;

    setLoading(true);
    try {
      const updatePromises = teams.map((t) =>
        fetch("/api/admin/rankings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamId: t.id,
            tier: "TIER 3",
            points: 0,
            wins: 0,
            losses: 0,
            matchesPlayed: 0,
          }),
        })
      );

      await Promise.all(updatePromises);
      fetchTeams();
    } catch (err) {
      alert("Ошибка при сбросе тиров");
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222222] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/admin" className="text-xs text-[#858585] hover:text-white uppercase font-bold">
                Админ-панель
              </Link>
              <span className="text-[#444444] text-xs">/</span>
              <span className="text-xs text-amber-400 font-bold uppercase">Управление рейтингом</span>
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">
              УПРАВЛЕНИЕ РЕЙТИНГОМ И ТИРАМИ (TIER 1-3)
            </h1>
            <p className="text-xs text-[#858585] mt-1">
              Отдельный раздел для настройки тиров команд (Tier-1, Tier-2, Tier-3), набранных очков (PTS), побед и поражений.
            </p>
          </div>

          <button
            onClick={handleSetAllTier3}
            className="px-4 py-2.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-300 hover:bg-amber-900/50 font-extrabold text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Сбросить все в TIER 3</span>
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск команды по названию или тегу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#151515] border border-[#222222] rounded-xl text-xs text-white placeholder-[#666666] focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <span className="text-xs font-mono font-bold text-[#858585]">
            Всего команд: {teams.length}
          </span>
        </div>

        {/* Rankings Table */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-[#858585]">
            <RefreshCw className="w-6 h-6 animate-spin text-white" />
            <span className="text-xs font-semibold uppercase">Загрузка рейтинга...</span>
          </div>
        ) : filteredTeams.length > 0 ? (
          <div className="bg-[#151515] border border-[#222222] rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#151515] border-b border-[#222222] text-[#858585] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">КОМАНДА</th>
                    <th className="px-6 py-4">ДИВИЗИОН (TIER)</th>
                    <th className="px-6 py-4 text-center">ОЧКИ (PTS)</th>
                    <th className="px-6 py-4 text-center">ПОБЕДЫ (W)</th>
                    <th className="px-6 py-4 text-center">ПОРАЖЕНИЯ (L)</th>
                    <th className="px-6 py-4 text-right">СОХРАНЕНИЕ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {filteredTeams.map((t) => {
                    const st = editState[t.id] || {
                      tier: t.tier || "TIER 3",
                      points: t.points || 0,
                      wins: t.wins || 0,
                      losses: t.losses || 0,
                    };

                    const isSaving = savingId === t.id;
                    const isSuccess = successId === t.id;

                    return (
                      <tr key={t.id} className="hover:bg-[#121212] transition-colors">
                        {/* Team Logo & Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#151515] border border-[#222222] overflow-hidden flex items-center justify-center p-0.5 flex-shrink-0">
                              <TeamLogo logoUrl={t.logoUrl} name={t.name} tag={t.tag} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <Link href={`/teams/${t.slug}`} className="font-extrabold text-white text-sm hover:underline block uppercase">
                                {t.name}
                              </Link>
                              <span className="text-[10px] font-mono text-[#858585] uppercase">[{t.tag}]</span>
                            </div>
                          </div>
                        </td>

                        {/* Tier Selector */}
                        <td className="px-6 py-4">
                          <select
                            value={st.tier}
                            onChange={(e) =>
                              setEditState({
                                ...editState,
                                [t.id]: { ...st, tier: e.target.value },
                              })
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border focus:outline-none transition-colors ${
                              st.tier.includes("1")
                                ? "bg-amber-950/60 border-amber-500/60 text-amber-300"
                                : st.tier.includes("2")
                                ? "bg-purple-950/60 border-purple-500/60 text-purple-300"
                                : "bg-emerald-950/60 border-emerald-500/60 text-emerald-300"
                            }`}
                          >
                            <option value="TIER 1">🥇 TIER 1 (Pro)</option>
                            <option value="TIER 2">🥈 TIER 2 (Challenger)</option>
                            <option value="TIER 3">🥉 TIER 3 (Contenders)</option>
                          </select>
                        </td>

                        {/* Points */}
                        <td className="px-6 py-4 text-center">
                          <input
                            type="number"
                            min={0}
                            value={st.points}
                            onChange={(e) =>
                              setEditState({
                                ...editState,
                                [t.id]: { ...st, points: Number(e.target.value) },
                              })
                            }
                            className="w-20 px-2.5 py-1.5 bg-[#141414] border border-[#222222] rounded-xl text-center text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-white"
                          />
                        </td>

                        {/* Wins */}
                        <td className="px-6 py-4 text-center">
                          <input
                            type="number"
                            min={0}
                            value={st.wins}
                            onChange={(e) =>
                              setEditState({
                                ...editState,
                                [t.id]: { ...st, wins: Number(e.target.value) },
                              })
                            }
                            className="w-16 px-2.5 py-1.5 bg-[#141414] border border-[#222222] rounded-xl text-center text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-white"
                          />
                        </td>

                        {/* Losses */}
                        <td className="px-6 py-4 text-center">
                          <input
                            type="number"
                            min={0}
                            value={st.losses}
                            onChange={(e) =>
                              setEditState({
                                ...editState,
                                [t.id]: { ...st, losses: Number(e.target.value) },
                              })
                            }
                            className="w-16 px-2.5 py-1.5 bg-[#141414] border border-[#222222] rounded-xl text-center text-xs font-mono font-bold text-red-400 focus:outline-none focus:border-white"
                          />
                        </td>

                        {/* Save Button */}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleSaveTeamRank(t.id)}
                            disabled={isSaving}
                            className={`px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all inline-flex items-center gap-1.5 ${
                              isSuccess
                                ? "bg-emerald-500 text-black shadow-lg"
                                : "bg-white text-black hover:bg-slate-200 shadow-md"
                            }`}
                          >
                            {isSaving ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : isSuccess ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Сохранено</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5" />
                                <span>Сохранить</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-12 border border-[#222222] bg-[#151515] rounded-2xl text-center text-xs text-[#858585]">
            Команды не найдены.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
