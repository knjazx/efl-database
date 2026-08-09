"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trophy, Calendar, CheckCircle2, Clock, Trash2, Edit3, X, RefreshCw, Sparkles, Shield } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";

interface TeamOption {
  id: string;
  name: string;
  tag: string;
  logoUrl: string;
  tier: string;
}

interface MatchItem {
  id: string;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  status: string;
  scheduledAt: string;
  finishedAt?: string;
  bestOf: number;
  tier: string;
  winnerId?: string;
  teamA: TeamOption;
  teamB: TeamOption;
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);

  // New Match Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTeamAId, setCreateTeamAId] = useState("");
  const [createTeamBId, setCreateTeamBId] = useState("");
  const [createScheduledAt, setCreateScheduledAt] = useState("");
  const [createBestOf, setCreateBestOf] = useState<number>(1);
  const [createTier, setCreateTier] = useState<string>("TIER 1");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit Result Modal
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [matchStatus, setMatchStatus] = useState<string>("FINISHED");
  const [scoreSubmitting, setScoreSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matchesRes, teamsRes] = await Promise.all([
        fetch("/api/matches", { cache: "no-store" }),
        fetch("/api/teams", { cache: "no-store" }),
      ]);
      const matchesData = await matchesRes.json();
      const teamsData = await teamsRes.json();

      if (matchesData.success) setMatches(matchesData.matches || []);
      if (teamsData.success) setTeams(teamsData.teams || []);
    } catch (err) {
      console.error("Failed to load admin matches data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!createTeamAId || !createTeamBId) {
      setCreateError("Выберите обе команды");
      return;
    }

    if (createTeamAId === createTeamBId) {
      setCreateError("Команды не могут совпадать");
      return;
    }

    if (!createScheduledAt) {
      setCreateError("Укажите дату и время матча");
      return;
    }

    setCreateSubmitting(true);
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamAId: createTeamAId,
          teamBId: createTeamBId,
          scheduledAt: createScheduledAt,
          bestOf: createBestOf,
          tier: createTier,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsCreateModalOpen(false);
        setCreateTeamAId("");
        setCreateTeamBId("");
        setCreateScheduledAt("");
        fetchData();
      } else {
        setCreateError(data.error || "Ошибка при создании матча");
      }
    } catch (err) {
      setCreateError("Ошибка подключения к серверу");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleUpdateScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;

    setScoreSubmitting(true);
    try {
      const res = await fetch(`/api/matches/${selectedMatch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoreA,
          scoreB,
          status: matchStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsScoreModalOpen(false);
        setSelectedMatch(null);
        fetchData();
      } else {
        alert(data.error || "Ошибка обновления счёта");
      }
    } catch (err) {
      alert("Ошибка подключения к серверу");
    } finally {
      setScoreSubmitting(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот матч?")) return;

    try {
      const res = await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || "Ошибка при удалении матча");
      }
    } catch (err) {
      alert("Ошибка сервера при удалении");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#222222] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-xs text-[#858585] hover:text-white uppercase font-bold">
              Админ-панель
            </Link>
            <span className="text-[#444444] text-xs">/</span>
            <span className="text-xs text-amber-400 font-bold uppercase">Управление матчами</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">
            УПРАВЛЕНИЕ МАТЧАМИ И РАСПИСАНИЕМ
          </h1>
          <p className="text-xs text-[#858585] mt-1">
            Создавайте матчи, вносите результаты и завершайте встречи. Винрейт и очки команд пересчитываются автоматически!
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-white text-black font-extrabold text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Запланировать матч</span>
        </button>
      </div>

      {/* Matches List */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-[#858585]">
          <RefreshCw className="w-6 h-6 animate-spin text-white" />
          <span className="text-xs font-semibold uppercase">Загрузка списка матчей...</span>
        </div>
      ) : matches.length > 0 ? (
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#050505] border-b border-[#222222] text-[#858585] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">МАТЧ (TEAM A vs TEAM B)</th>
                  <th className="px-[#181818] py-4 text-center">ДАТА И ВРЕМЯ</th>
                  <th className="px-6 py-4 text-center">ФОРМАТ</th>
                  <th className="px-6 py-4 text-center">СЧЁТ / СТАТУС</th>
                  <th className="px-6 py-4 text-right">ДЕЙСТВИЯ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {matches.map((m) => {
                  const dateObj = new Date(m.scheduledAt);
                  const dateStr = dateObj.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
                  const timeStr = dateObj.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

                  return (
                    <tr key={m.id} className="hover:bg-[#121212] transition-colors">
                      {/* Match teams */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {/* Team A */}
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#050505] border border-[#222222] overflow-hidden p-0.5 flex-shrink-0">
                              <TeamLogo logoUrl={m.teamA.logoUrl} name={m.teamA.name} tag={m.teamA.tag} className="w-full h-full object-cover" />
                            </div>
                            <span className="font-extrabold text-white text-xs uppercase">{m.teamA.name}</span>
                          </div>

                          <span className="font-black text-[10px] text-[#666666]">VS</span>

                          {/* Team B */}
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#050505] border border-[#222222] overflow-hidden p-0.5 flex-shrink-0">
                              <TeamLogo logoUrl={m.teamB.logoUrl} name={m.teamB.name} tag={m.teamB.tag} className="w-full h-full object-cover" />
                            </div>
                            <span className="font-extrabold text-white text-xs uppercase">{m.teamB.name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Scheduled Date */}
                      <td className="px-6 py-4 text-center font-mono font-bold text-[#858585]">
                        {dateStr}, {timeStr}
                      </td>

                      {/* Best of format */}
                      <td className="px-6 py-4 text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#222222] text-[10px] text-white font-bold">
                          BO{m.bestOf}
                        </span>
                      </td>

                      {/* Score & Status */}
                      <td className="px-6 py-4 text-center">
                        {m.status === "FINISHED" ? (
                          <span className="px-3 py-1 bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 font-mono font-black rounded-lg text-xs">
                            {m.scoreA} : {m.scoreB} (Завершен)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-950/40 border border-amber-500/50 text-amber-300 font-mono font-bold rounded-lg text-[11px]">
                            Запланирован
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedMatch(m);
                              setScoreA(m.scoreA);
                              setScoreB(m.scoreB);
                              setMatchStatus(m.status === "SCHEDULED" ? "FINISHED" : m.status);
                              setIsScoreModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#181818] hover:bg-[#252525] border border-[#333333] text-white font-bold text-[11px] transition-colors flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{m.status === "FINISHED" ? "Изменить счёт" : "Внести счёт"}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteMatch(m.id)}
                            className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 border border-red-800/50 text-red-400 transition-colors"
                            title="Удалить матч"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 border border-[#222222] bg-[#0A0A0A] rounded-2xl text-center">
          <p className="text-sm font-semibold text-white">Список матчей пуст</p>
          <p className="text-xs text-[#858585] mt-1">Нажмите кнопку «Запланировать матч», чтобы добавить первую встречу.</p>
        </div>
      )}

      {/* CREATE MATCH MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-[#222222] w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-4">
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Запланировать матч</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-[#858585] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 text-xs font-semibold rounded-xl">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateMatch} className="space-y-4 text-xs">
              {/* Team A */}
              <div>
                <label className="block text-[#858585] font-bold uppercase mb-1.5">Команда A</label>
                <select
                  value={createTeamAId}
                  onChange={(e) => setCreateTeamAId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#222222] rounded-xl text-white focus:outline-none focus:border-white"
                  required
                >
                  <option value="">-- Выберите Команду A --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} [{t.tag}] ({t.tier})
                    </option>
                  ))}
                </select>
              </div>

              {/* Team B */}
              <div>
                <label className="block text-[#858585] font-bold uppercase mb-1.5">Команда B</label>
                <select
                  value={createTeamBId}
                  onChange={(e) => setCreateTeamBId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#222222] rounded-xl text-white focus:outline-none focus:border-white"
                  required
                >
                  <option value="">-- Выберите Команду B --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} [{t.tag}] ({t.tier})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-[#858585] font-bold uppercase mb-1.5">Дата и время начала</label>
                <input
                  type="datetime-local"
                  value={createScheduledAt}
                  onChange={(e) => setCreateScheduledAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#222222] rounded-xl text-white focus:outline-none focus:border-white"
                  required
                />
              </div>

              {/* Best of & Tier */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#858585] font-bold uppercase mb-1.5">Формат (Best Of)</label>
                  <select
                    value={createBestOf}
                    onChange={(e) => setCreateBestOf(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#222222] rounded-xl text-white focus:outline-none focus:border-white"
                  >
                    <option value={1}>BO1 (1 Карта)</option>
                    <option value={3}>BO3 (3 Карты)</option>
                    <option value={5}>BO5 (5 Карт)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#858585] font-bold uppercase mb-1.5">Тир матча</label>
                  <select
                    value={createTier}
                    onChange={(e) => setCreateTier(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#222222] rounded-xl text-white focus:outline-none focus:border-white"
                  >
                    <option value="TIER 1">TIER 1</option>
                    <option value="TIER 2">TIER 2</option>
                    <option value="TIER 3">TIER 3</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#141414] border border-[#222222] text-[#858585] hover:text-white font-bold uppercase"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 rounded-xl bg-white text-black font-extrabold uppercase hover:bg-slate-200 transition-colors"
                >
                  {createSubmitting ? "Создание..." : "Создать матч"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SCORE & FINISH MATCH MODAL */}
      {isScoreModalOpen && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-[#222222] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-4">
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Внести результат матча</h2>
              <button onClick={() => setIsScoreModalOpen(false)} className="text-[#858585] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateScore} className="space-y-5 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-[#050505] p-4 rounded-xl border border-[#1A1A1A]">
                {/* Team A */}
                <div className="flex flex-col items-center text-center gap-2">
                  <span className="font-extrabold text-white text-xs uppercase">{selectedMatch.teamA.name}</span>
                  <input
                    type="number"
                    min={0}
                    value={scoreA}
                    onChange={(e) => setScoreA(Number(e.target.value))}
                    className="w-20 px-3 py-2 bg-[#141414] border border-[#333333] rounded-xl text-center text-lg font-mono font-black text-white focus:border-amber-400 focus:outline-none"
                    required
                  />
                </div>

                {/* Team B */}
                <div className="flex flex-col items-center text-center gap-2">
                  <span className="font-extrabold text-white text-xs uppercase">{selectedMatch.teamB.name}</span>
                  <input
                    type="number"
                    min={0}
                    value={scoreB}
                    onChange={(e) => setScoreB(Number(e.target.value))}
                    className="w-20 px-3 py-2 bg-[#141414] border border-[#333333] rounded-xl text-center text-lg font-mono font-black text-white focus:border-amber-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#858585] font-bold uppercase mb-1.5">Статус встречи</label>
                <select
                  value={matchStatus}
                  onChange={(e) => setMatchStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#222222] rounded-xl text-white focus:outline-none focus:border-white"
                >
                  <option value="FINISHED">FINISHED (Завершен — победителю +3 очка, +1 победа)</option>
                  <option value="LIVE">LIVE (В эфире)</option>
                  <option value="SCHEDULED">SCHEDULED (Запланирован)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsScoreModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#141414] border border-[#222222] text-[#858585] hover:text-white font-bold uppercase"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={scoreSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-black font-black uppercase hover:bg-emerald-400 transition-colors shadow-lg"
                >
                  {scoreSubmitting ? "Сохранение..." : "Сохранить и подвести итоги"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
