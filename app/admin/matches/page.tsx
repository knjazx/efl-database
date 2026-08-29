"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trophy, Calendar, CheckCircle2, Clock, Trash2, Edit3, X, RefreshCw, Sparkles, Shield } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";
import { AdminLayout } from "@/components/AdminLayout";

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
  teamCustomNameA?: string;
  teamCustomNameB?: string;
  scoreA: number;
  scoreB: number;
  status: string;
  scheduledAt: string;
  finishedAt?: string;
  bestOf: number;
  tier: string;
  winnerId?: string;
  isForfeit?: boolean;
  forfeitReason?: string;
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
  const [createTeamCustomNameA, setCreateTeamCustomNameA] = useState("");
  const [createTeamCustomNameB, setCreateTeamCustomNameB] = useState("");
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
  const [scoreTeamCustomNameA, setScoreTeamCustomNameA] = useState("");
  const [scoreTeamCustomNameB, setScoreTeamCustomNameB] = useState("");
  const [matchStatus, setMatchStatus] = useState<string>("FINISHED");
  const [scoreIsForfeit, setScoreIsForfeit] = useState(false);
  const [scoreForfeitReason, setScoreForfeitReason] = useState("");
  const [scoreSubmitting, setScoreSubmitting] = useState(false);

  // Cybershoke Importer State
  const [cybershokeUrl, setCybershokeUrl] = useState("");
  const [cybershokeParsing, setCybershokeParsing] = useState(false);
  const [isCybershokeModalOpen, setIsCybershokeModalOpen] = useState(false);
  const [cybershokePreview, setCybershokePreview] = useState<any | null>(null);
  const [cybershokeTeamAId, setCybershokeTeamAId] = useState("");
  const [cybershokeTeamBId, setCybershokeTeamBId] = useState("");
  const [cybershokeCustomNameA, setCybershokeCustomNameA] = useState("");
  const [cybershokeCustomNameB, setCybershokeCustomNameB] = useState("");
  const [cybershokeScoreA, setCybershokeScoreA] = useState(13);
  const [cybershokeScoreB, setCybershokeScoreB] = useState(9);
  const [cybershokeTier, setCybershokeTier] = useState("TIER 3");
  const [cybershokeIsForfeit, setCybershokeIsForfeit] = useState(false);
  const [cybershokeForfeitReason, setCybershokeForfeitReason] = useState("");
  const [cybershokeSubmitting, setCybershokeSubmitting] = useState(false);

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

    if (createTeamAId === createTeamBId && createTeamAId !== "unknown-team-placeholder") {
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
          teamCustomNameA: createTeamAId === "unknown-team-placeholder" ? createTeamCustomNameA : null,
          teamCustomNameB: createTeamBId === "unknown-team-placeholder" ? createTeamCustomNameB : null,
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
        setCreateTeamCustomNameA("");
        setCreateTeamCustomNameB("");
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
          isForfeit: scoreIsForfeit,
          forfeitReason: scoreForfeitReason,
          teamCustomNameA: selectedMatch.teamAId === "unknown-team-placeholder" ? scoreTeamCustomNameA : selectedMatch.teamCustomNameA,
          teamCustomNameB: selectedMatch.teamBId === "unknown-team-placeholder" ? scoreTeamCustomNameB : selectedMatch.teamCustomNameB,
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

  const handleFileUploadDemo = async (file: File) => {
    if (!file) return;

    setCybershokeParsing(true);
    try {
      const formData = new FormData();
      formData.append("demoFile", file);

      const res = await fetch("/api/admin/import-cybershoke", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setCybershokePreview(data);
        setCybershokeScoreA(data.scoreA ?? 13);
        setCybershokeScoreB(data.scoreB ?? 9);
        setCybershokeTeamAId(data.teamA ? data.teamA.id : (teams[0]?.id || ""));
        setCybershokeTeamBId(data.teamB ? data.teamB.id : (teams[1]?.id || ""));
        setCybershokeIsForfeit(false);
        setCybershokeForfeitReason("");
        setIsCybershokeModalOpen(true);
      } else {
        alert(data.error || "Не удалось распарсить файл демо");
      }
    } catch (err) {
      alert("Ошибка загрузки файла демо");
    } finally {
      setCybershokeParsing(false);
    }
  };

  const handleParseCybershoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cybershokeUrl.trim()) return;

    setCybershokeParsing(true);
    try {
      let clientTeam1Players: string[] = [];
      let clientTeam2Players: string[] = [];
      let clientScoreA: number | undefined = undefined;
      let clientScoreB: number | undefined = undefined;

      const matchIdMatch = cybershokeUrl.match(/match(?:es)?\/(\d+)/i) || cybershokeUrl.match(/(\d+)/);
      const matchId = matchIdMatch ? matchIdMatch[1] : null;

      // 1. Try client-side fetch to Cybershoke API (Browser context bypasses Cloudflare rate limits)
      if (matchId) {
        try {
          const cyRes = await fetch(`https://cybershoke.net/api/matches/${matchId}`, {
            headers: { "Accept": "application/json" },
          });

          if (cyRes.ok) {
            const cyData = await cyRes.json();
            if (cyData && cyData.match) {
              clientScoreA = cyData.match.team1_score ?? cyData.match.score_team1;
              clientScoreB = cyData.match.team2_score ?? cyData.match.score_team2;

              if (Array.isArray(cyData.match.team1_players)) {
                clientTeam1Players = cyData.match.team1_players.map((p: any) => p.name || p.nickname || p.steam_id || String(p));
              }
              if (Array.isArray(cyData.match.team2_players)) {
                clientTeam2Players = cyData.match.team2_players.map((p: any) => p.name || p.nickname || p.steam_id || String(p));
              }
            }
          }
        } catch (clientErr) {
          console.warn("Browser client fetch bypass skipped:", clientErr);
        }
      }

      // 2. Send parsed data to backend API for database roster matching
      const isUrl = /^https?:\/\//i.test(cybershokeUrl.trim());
      const res = await fetch("/api/admin/import-cybershoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchUrl: cybershokeUrl,
          rawText: isUrl ? "" : cybershokeUrl,
          clientTeam1Players,
          clientTeam2Players,
          clientScoreA,
          clientScoreB,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCybershokePreview(data);
        setCybershokeScoreA(data.scoreA ?? 13);
        setCybershokeScoreB(data.scoreB ?? 9);
        setCybershokeTeamAId(data.teamA ? data.teamA.id : (teams[0]?.id || ""));
        setCybershokeTeamBId(data.teamB ? data.teamB.id : (teams[1]?.id || ""));
        setCybershokeIsForfeit(false);
        setCybershokeForfeitReason("");
        setIsCybershokeModalOpen(true);
      } else {
        alert(data.error || "Не удалось распознать ссылку на матч");
      }
    } catch (err) {
      alert("Ошибка подключения к серверу");
    } finally {
      setCybershokeParsing(false);
    }
  };

  const handleConfirmCybershoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cybershokeTeamAId || !cybershokeTeamBId) {
      alert("Выберите обе команды");
      return;
    }

    setCybershokeSubmitting(true);
    try {
      const res = await fetch("/api/admin/import-cybershoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONFIRM",
          teamAId: cybershokeTeamAId,
          teamBId: cybershokeTeamBId,
          teamCustomNameA: cybershokeTeamAId === "unknown-team-placeholder" ? cybershokeCustomNameA : null,
          teamCustomNameB: cybershokeTeamBId === "unknown-team-placeholder" ? cybershokeCustomNameB : null,
          scoreA: cybershokeScoreA,
          scoreB: cybershokeScoreB,
          tier: cybershokeTier,
          isForfeit: cybershokeIsForfeit,
          forfeitReason: cybershokeForfeitReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsCybershokeModalOpen(false);
        setCybershokeUrl("");
        setCybershokeIsForfeit(false);
        setCybershokeForfeitReason("");
        fetchData();
      } else {
        alert(data.error || "Ошибка публикации матча");
      }
    } catch (err) {
      alert("Ошибка подключения к серверу");
    } finally {
      setCybershokeSubmitting(false);
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
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#222222] pb-6">
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">
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

      {/* CYBERSHOKE AUTO-IMPORTER BAR */}
      <div className="bg-gradient-to-r from-[#0F172A] to-[#0A0A0A] border border-blue-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-blue-950/60 border border-blue-800/60 text-[10px] font-mono font-bold text-blue-400 uppercase mb-2">
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span>АВТО-ИМПОРТ МАТЧЕЙ CYBERSHOKE</span>
            </div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">
              Импорт матча Cybershoke / Демо-парсер
            </h2>
            <p className="text-xs text-[#858585] mt-1 max-w-xl">
              Вставьте ссылку на матч <code className="text-blue-400">cybershoke.net/match/123456</code> или скопируйте текст со списком игроков и счётом. Система 100% точно определит команды по ростерам и установит результат!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <form onSubmit={handleParseCybershoke} className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Ссылка на матч или текст демо..."
                value={cybershokeUrl}
                onChange={(e) => setCybershokeUrl(e.target.value)}
                className="w-full sm:w-72 px-4 py-2.5 bg-[#050505] border border-[#222222] focus:border-blue-400 rounded-xl text-xs text-white placeholder-[#555555] focus:outline-none transition-colors"
                required
              />
              <button
                type="submit"
                disabled={cybershokeParsing}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 flex-shrink-0 shadow-lg"
              >
                {cybershokeParsing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Распознать</span>
              </button>
            </form>

            <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-[#141414] border border-[#333333] hover:bg-[#202020] text-amber-300 font-extrabold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 flex-shrink-0 shadow-lg">
              <input
                type="file"
                accept=".dem,.bz2,.zip"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUploadDemo(file);
                }}
              />
              <span>Загрузить .dem</span>
            </label>
          </div>
        </div>
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
                              <TeamLogo logoUrl={m.teamA.logoUrl} name={m.teamCustomNameA || m.teamA.name} tag={m.teamA.tag} className="w-full h-full object-cover" />
                            </div>
                            <span className="font-extrabold text-white text-xs uppercase">
                              {m.teamCustomNameA || m.teamA.name}
                            </span>
                          </div>

                          <span className="font-black text-[10px] text-[#666666]">VS</span>

                          {/* Team B */}
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#050505] border border-[#222222] overflow-hidden p-0.5 flex-shrink-0">
                              <TeamLogo logoUrl={m.teamB.logoUrl} name={m.teamCustomNameB || m.teamB.name} tag={m.teamB.tag} className="w-full h-full object-cover" />
                            </div>
                            <span className="font-extrabold text-white text-xs uppercase">
                              {m.teamCustomNameB || m.teamB.name}
                            </span>
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
                          m.isForfeit ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="px-3 py-1 bg-red-950/80 border border-red-800 text-red-300 font-mono font-black rounded-lg text-xs">
                                {m.scoreA} : {m.scoreB} (ТП)
                              </span>
                              {m.forfeitReason && (
                                <span className="text-[10px] text-red-400 font-medium truncate max-w-[140px]" title={m.forfeitReason}>
                                  {m.forfeitReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-3 py-1 bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 font-mono font-black rounded-lg text-xs">
                              {m.scoreA} : {m.scoreB} (Завершен)
                            </span>
                          )
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
                              setScoreTeamCustomNameA(m.teamCustomNameA || "");
                              setScoreTeamCustomNameB(m.teamCustomNameB || "");
                              setMatchStatus(m.status === "SCHEDULED" ? "FINISHED" : m.status);
                              setScoreIsForfeit(m.isForfeit || false);
                              setScoreForfeitReason(m.forfeitReason || "");
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
                  <option value="unknown-team-placeholder">❓ Неизвестная команда (Внешний соперник)</option>
                  {teams.filter((t) => t.id !== "unknown-team-placeholder").map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} [{t.tag}] ({t.tier})
                    </option>
                  ))}
                </select>
                {createTeamAId === "unknown-team-placeholder" && (
                  <input
                    type="text"
                    placeholder="Название внешней Команды A (например: Mix #1, VP)..."
                    value={createTeamCustomNameA}
                    onChange={(e) => setCreateTeamCustomNameA(e.target.value)}
                    className="w-full mt-2 px-3 py-2 bg-[#050505] border border-amber-500/50 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                )}
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
                  <option value="unknown-team-placeholder">❓ Неизвестная команда (Внешний соперник)</option>
                  {teams.filter((t) => t.id !== "unknown-team-placeholder").map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} [{t.tag}] ({t.tier})
                    </option>
                  ))}
                </select>
                {createTeamBId === "unknown-team-placeholder" && (
                  <input
                    type="text"
                    placeholder="Название внешней Команды B (например: Mix #2, NaVi)..."
                    value={createTeamCustomNameB}
                    onChange={(e) => setCreateTeamCustomNameB(e.target.value)}
                    className="w-full mt-2 px-3 py-2 bg-[#050505] border border-amber-500/50 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                )}
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
                  <span className="font-extrabold text-white text-xs uppercase">
                    {selectedMatch.teamAId === "unknown-team-placeholder" ? (scoreTeamCustomNameA || "Неизвестная команда") : selectedMatch.teamA.name}
                  </span>
                  {selectedMatch.teamAId === "unknown-team-placeholder" && (
                    <input
                      type="text"
                      placeholder="Кастомное имя A..."
                      value={scoreTeamCustomNameA}
                      onChange={(e) => setScoreTeamCustomNameA(e.target.value)}
                      className="w-full text-[10px] px-2 py-1 bg-[#141414] border border-amber-500/40 rounded text-center text-white focus:outline-none"
                    />
                  )}
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
                  <span className="font-extrabold text-white text-xs uppercase">
                    {selectedMatch.teamBId === "unknown-team-placeholder" ? (scoreTeamCustomNameB || "Неизвестная команда") : selectedMatch.teamB.name}
                  </span>
                  {selectedMatch.teamBId === "unknown-team-placeholder" && (
                    <input
                      type="text"
                      placeholder="Кастомное имя B..."
                      value={scoreTeamCustomNameB}
                      onChange={(e) => setScoreTeamCustomNameB(e.target.value)}
                      className="w-full text-[10px] px-2 py-1 bg-[#141414] border border-amber-500/40 rounded text-center text-white focus:outline-none"
                    />
                  )}
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

              {/* Quick Technical Forfeit (ТП) Controls */}
              <div className="bg-[#050505] p-3 rounded-xl border border-red-900/30 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-red-400 uppercase">
                  <span>Техническое поражение (ТП)</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[#C0C0C0] hover:text-white">
                    <input
                      type="checkbox"
                      checked={scoreIsForfeit}
                      onChange={(e) => setScoreIsForfeit(e.target.checked)}
                      className="rounded border-[#333333] bg-[#141414] text-red-500 focus:ring-0"
                    />
                    <span>Пометить как ТП</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setScoreA(0);
                      setScoreB(13);
                      setMatchStatus("FINISHED");
                      setScoreIsForfeit(true);
                      setScoreForfeitReason(`Техническое поражение команде ${selectedMatch.teamA.name}`);
                    }}
                    className="px-2.5 py-2 rounded-lg bg-red-950/50 border border-red-800/80 hover:bg-red-900/80 text-red-300 text-[10px] font-extrabold uppercase transition-colors text-center"
                  >
                    🔴 ТП Команде A (0:13)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScoreA(13);
                      setScoreB(0);
                      setMatchStatus("FINISHED");
                      setScoreIsForfeit(true);
                      setScoreForfeitReason(`Техническое поражение команде ${selectedMatch.teamB.name}`);
                    }}
                    className="px-2.5 py-2 rounded-lg bg-red-950/50 border border-red-800/80 hover:bg-red-900/80 text-red-300 text-[10px] font-extrabold uppercase transition-colors text-center"
                  >
                    🔴 ТП Команде B (13:0)
                  </button>
                </div>
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

      {/* CYBERSHOKE MATCH PREVIEW MODAL */}
      {isCybershokeModalOpen && cybershokePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-[#222222] w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest block">
                  CYBERSHOKE DEMO PARSER
                </span>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  Результат матча #{cybershokePreview.matchId}
                </h2>
              </div>
              <button onClick={() => setIsCybershokeModalOpen(false)} className="text-[#858585] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCybershoke} className="space-y-4 text-xs">
              {/* Detection Status Banner */}
              {cybershokePreview.teamA || cybershokePreview.teamB ? (
                <div className="bg-emerald-950/30 border border-emerald-500/40 p-3 rounded-xl text-[11px] text-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-emerald-300">
                      Матч и команды успешно распознаны! Нажмите «Опубликовать и обновить винрейт».
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-950/30 border border-amber-500/40 p-3 rounded-xl text-[11px] text-amber-200 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-amber-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Быстрый ввод матча</span>
                  </p>
                  <p className="text-[10px] text-[#C0C0C0]">
                    Скопируйте никнеймы игроков или текст с сайта в поле ниже для автоматического подбора команд или выберите команды из списка вручную.
                  </p>
                </div>
              )}

              {/* Score Display */}
              <div className="bg-[#050505] p-4 rounded-xl border border-[#1A1A1A] flex flex-col gap-3">
                <div className="flex items-center justify-center gap-6">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-[#858585] font-mono uppercase">Счёт A</span>
                    <input
                      type="number"
                      min={0}
                      value={cybershokeScoreA}
                      onChange={(e) => setCybershokeScoreA(Number(e.target.value))}
                      className="w-16 py-1.5 bg-[#141414] border border-[#333333] rounded-lg text-center font-mono font-black text-xl text-white focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  <span className="text-2xl font-black text-[#444444] font-mono mt-4">:</span>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-[#858585] font-mono uppercase">Счёт B</span>
                    <input
                      type="number"
                      min={0}
                      value={cybershokeScoreB}
                      onChange={(e) => setCybershokeScoreB(Number(e.target.value))}
                      className="w-16 py-1.5 bg-[#141414] border border-[#333333] rounded-lg text-center font-mono font-black text-xl text-white focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quick Forfeit (ТП) Buttons inside Preview Modal */}
                <div className="pt-2 border-t border-[#181818] flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold text-red-400 uppercase">Тех. поражение:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCybershokeScoreA(0);
                        setCybershokeScoreB(13);
                        setCybershokeIsForfeit(true);
                        setCybershokeForfeitReason("Техническое поражение Команде A");
                      }}
                      className="px-2 py-1 rounded bg-red-950/60 border border-red-800/80 hover:bg-red-900 text-red-300 text-[10px] font-extrabold uppercase transition-colors"
                    >
                      🔴 ТП Команде A (0:13)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCybershokeScoreA(13);
                        setCybershokeScoreB(0);
                        setCybershokeIsForfeit(true);
                        setCybershokeForfeitReason("Техническое поражение Команде B");
                      }}
                      className="px-2 py-1 rounded bg-red-950/60 border border-red-800/80 hover:bg-red-900 text-red-300 text-[10px] font-extrabold uppercase transition-colors"
                    >
                      🔴 ТП Команде B (13:0)
                    </button>
                  </div>
                </div>
              </div>

              {/* Raw Text / Roster Paste Box for Manual / Serverless Fallback */}
              <div className="bg-[#050505] p-3 rounded-xl border border-[#1A1A1A] space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-amber-400 uppercase">
                  <span>Текст демки / Список никнеймов игроков</span>
                  <span className="text-[#666666]">Для быстрых совпадений</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Вставьте никнеймы или вывод бота для моментального подбора..."
                    value={cybershokeUrl}
                    onChange={(e) => setCybershokeUrl(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#141414] border border-[#222222] rounded-lg text-white text-[11px] focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleParseCybershoke}
                    disabled={cybershokeParsing}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-lg text-[10px] uppercase flex-shrink-0 flex items-center gap-1"
                  >
                    {cybershokeParsing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    <span>Подписать</span>
                  </button>
                </div>
              </div>

              {/* Demo Players Display */}
              {(cybershokePreview.team1Players?.length > 0 || cybershokePreview.team2Players?.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {/* Team 1 Players from Demo */}
                  <div className="bg-[#050505] border border-[#1A1A1A] rounded-xl p-3">
                    <div className="text-[10px] font-mono font-bold text-blue-400 uppercase mb-2">
                      Игроки из демки (Сторона A)
                    </div>
                    <ul className="space-y-1">
                      {(cybershokePreview.team1Players || []).map((p: string, i: number) => (
                        <li key={i} className="text-[11px] text-[#C0C0C0] font-mono truncate">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Team 2 Players from Demo */}
                  <div className="bg-[#050505] border border-[#1A1A1A] rounded-xl p-3">
                    <div className="text-[10px] font-mono font-bold text-blue-400 uppercase mb-2">
                      Игроки из демки (Сторона B)
                    </div>
                    <ul className="space-y-1">
                      {(cybershokePreview.team2Players || []).map((p: string, i: number) => (
                        <li key={i} className="text-[11px] text-[#C0C0C0] font-mono truncate">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Team A selection */}
              <div>
                <label className="block text-[#858585] font-bold uppercase mb-1.5 flex items-center justify-between">
                  <span>Команда A</span>
                  {cybershokePreview.teamA && cybershokePreview.teamA.matchedPlayers > 0 ? (
                    <span className="text-emerald-400 text-[10px] font-bold">
                      ✓ Совпало: {cybershokePreview.teamA.matchedPlayers}
                    </span>
                  ) : (
                    <span className="text-[#858585] text-[10px]">Выберите вручную</span>
                  )}
                </label>
                <select
                  value={cybershokeTeamAId}
                  onChange={(e) => setCybershokeTeamAId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#222222] rounded-xl text-white focus:outline-none focus:border-blue-400"
                  required
                >
                  <option value="">-- Выберите Команду A --</option>
                  <option value="unknown-team-placeholder">❓ Неизвестная команда (Внешний соперник)</option>
                  {(cybershokePreview.availableTeams || teams).filter((t: any) => t.id !== "unknown-team-placeholder").map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} [{t.tag}]
                    </option>
                  ))}
                </select>
                {cybershokeTeamAId === "unknown-team-placeholder" && (
                  <input
                    type="text"
                    placeholder="Название внешней Команды A (например: Mix Team A)..."
                    value={cybershokeCustomNameA}
                    onChange={(e) => setCybershokeCustomNameA(e.target.value)}
                    className="w-full mt-2 px-3 py-2 bg-[#050505] border border-amber-500/50 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                )}
                {/* Show matched player names */}
                {cybershokePreview.teamA?.matchedNames?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {cybershokePreview.teamA.matchedNames.map((name: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-emerald-950/50 border border-emerald-700/50 rounded text-[10px] font-mono text-emerald-300">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Team B selection */}
              <div>
                <label className="block text-[#858585] font-bold uppercase mb-1.5 flex items-center justify-between">
                  <span>Команда B</span>
                  {cybershokePreview.teamB && cybershokePreview.teamB.matchedPlayers > 0 ? (
                    <span className="text-emerald-400 text-[10px] font-bold">
                      ✓ Совпало: {cybershokePreview.teamB.matchedPlayers}
                    </span>
                  ) : (
                    <span className="text-[#858585] text-[10px]">Выберите вручную</span>
                  )}
                </label>
                <select
                  value={cybershokeTeamBId}
                  onChange={(e) => setCybershokeTeamBId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#222222] rounded-xl text-white focus:outline-none focus:border-blue-400"
                  required
                >
                  <option value="">-- Выберите Команду B --</option>
                  <option value="unknown-team-placeholder">❓ Неизвестная команда (Внешний соперник)</option>
                  {(cybershokePreview.availableTeams || teams).filter((t: any) => t.id !== "unknown-team-placeholder").map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} [{t.tag}]
                    </option>
                  ))}
                </select>
                {cybershokeTeamBId === "unknown-team-placeholder" && (
                  <input
                    type="text"
                    placeholder="Название внешней Команды B (например: Mix Team B)..."
                    value={cybershokeCustomNameB}
                    onChange={(e) => setCybershokeCustomNameB(e.target.value)}
                    className="w-full mt-2 px-3 py-2 bg-[#050505] border border-amber-500/50 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                )}
                {/* Show matched player names */}
                {cybershokePreview.teamB?.matchedNames?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {cybershokePreview.teamB.matchedNames.map((name: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-emerald-950/50 border border-emerald-700/50 rounded text-[10px] font-mono text-emerald-300">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tier Selection */}
              <div>
                <label className="block text-[#858585] font-bold uppercase mb-1.5">Дивизион (Tier)</label>
                <select
                  value={cybershokeTier}
                  onChange={(e) => setCybershokeTier(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#222222] rounded-xl text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="TIER 3">TIER 3 (По умолчанию)</option>
                  <option value="TIER 2">TIER 2</option>
                  <option value="TIER 1">TIER 1</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#1F1F1F]">
                <button
                  type="button"
                  onClick={() => setIsCybershokeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#141414] border border-[#222222] text-[#858585] hover:text-white font-bold uppercase"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={cybershokeSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase transition-colors shadow-lg flex items-center gap-2"
                >
                  {cybershokeSubmitting ? "Публикация..." : "Опубликовать и обновить винрейт"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
