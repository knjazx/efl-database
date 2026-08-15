"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Swords,
  Layers,
  UserPlus,
  Play,
  Share2,
  Lock,
  Sparkles,
  BarChart3,
  ListOrdered,
  RefreshCw,
  Settings,
  Users,
  Calendar,
  ChevronRight,
  Search,
  Filter,
  ArrowRight,
  CheckCircle2,
  Clock,
  Circle,
  Award,
} from "lucide-react";
import { GroupStandingsTable } from "@/components/tournament/GroupStandingsTable";
import { BracketView } from "@/components/tournament/BracketView";
import { MatchEditModal } from "@/components/tournament/MatchEditModal";
import { ParticipantManagerModal } from "@/components/tournament/ParticipantManagerModal";
import { StageEditorModal } from "@/components/tournament/StageEditorModal";
import { SwissBoard } from "@/components/tournament/SwissBoard";
import { SwissStandingsTable } from "@/components/tournament/SwissStandingsTable";

import { TournamentStatistics } from "@/components/tournament/TournamentStatistics";
import { TournamentSettingsModal } from "@/components/tournament/TournamentSettingsModal";


type TabId = "OVERVIEW" | "MATCHES" | "BRACKETS";

export default function TournamentDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("OVERVIEW");
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  // Admin Modals
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Match Filters
  const [matchFilterStage, setMatchFilterStage] = useState("ALL");
  const [matchFilterGroup, setMatchFilterGroup] = useState("ALL");
  const [matchFilterStatus, setMatchFilterStatus] = useState("ALL");
  const [matchFilterTeam, setMatchFilterTeam] = useState("");

  useEffect(() => {
    fetchTournamentDetails();
  }, [slug]);

  function fetchTournamentDetails() {
    setLoading(true);
    fetch(`/api/tournaments/${slug}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setData(resData);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  async function handleGenerateStage(stageId: string, isRegenerate: boolean = false) {
    const msg = isRegenerate
      ? "Перегенерировать текущий раунд стадии?"
      : "Сгенерировать сетку/следующий раунд для этой стадии?";
    if (!confirm(msg)) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/tournaments/${slug}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId, isRegenerate }),
      });
      const resData = await res.json();
      if (resData.success) {
        fetchTournamentDetails();
      } else {
        alert(resData.error || "Ошибка генерации");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    alert("Ссылка на турнир скопирована!");
  }

  if (loading) {
    return (
      <div className="py-20 text-center font-mono text-xs text-[#666] animate-pulse">
        ЗАГРУЗКА ТУРНИРА...
      </div>
    );
  }

  if (!data || !data.tournament) {
    return (
      <div className="py-20 text-center font-mono text-xs text-rose-400">
        Турнир не найден.
      </div>
    );
  }

  const tournament = data.tournament;
  const isAdmin = data.isAdmin;
  const standingsByGroupId = data.standingsByGroupId || {};
  const swissStandingsByStageId = data.swissStandingsByStageId || {};

  const swissStages = tournament.stages.filter((s: any) => s.type === "SWISS");
  const groupStages = tournament.stages.filter((s: any) => s.type === "GROUP_STAGE");
  const bracketStages = tournament.stages.filter(
    (s: any) => s.type === "SINGLE_ELIMINATION" || s.type === "DOUBLE_ELIMINATION"
  );
  const hasGroups = groupStages.length > 0;
  const hasBrackets = bracketStages.length > 0 || swissStages.length > 0;

  // Extract all matches across stages
  const allMatches: any[] = [];
  tournament.stages.forEach((s: any) => {
    s.groups?.forEach((g: any) => {
      g.matches?.forEach((m: any) =>
        allMatches.push({ ...m, stageName: s.name, stageId: s.id, groupName: g.name, groupId: g.id })
      );
    });
    s.matches?.forEach((m: any) => allMatches.push({ ...m, stageName: s.name, stageId: s.id }));
    s.bracketNodes?.forEach((b: any) => {
      if (b.match) allMatches.push({ ...b.match, stageName: s.name, stageId: s.id });
    });
  });

  // Filtered matches
  const filteredMatches = allMatches.filter((m) => {
    if (matchFilterStage !== "ALL" && m.stageId !== matchFilterStage) return false;
    if (matchFilterGroup !== "ALL" && m.groupId !== matchFilterGroup) return false;
    if (matchFilterStatus !== "ALL" && m.status !== matchFilterStatus) return false;
    if (matchFilterTeam) {
      const nameA = (m.teamCustomNameA || m.teamA?.name || "").toLowerCase();
      const nameB = (m.teamCustomNameB || m.teamB?.name || "").toLowerCase();
      const query = matchFilterTeam.toLowerCase();
      if (!nameA.includes(query) && !nameB.includes(query)) return false;
    }
    return true;
  });

  // Count matches by status
  const matchStatusCounts = {
    ALL: allMatches.length,
    SCHEDULED: allMatches.filter((m) => m.status === "SCHEDULED").length,
    LIVE: allMatches.filter((m) => m.status === "LIVE").length,
    FINISHED: allMatches.filter((m) => m.status === "FINISHED").length,
    CANCELLED: allMatches.filter((m) => m.status === "CANCELLED").length,
  };

  // Get available groups for the selected stage filter
  const filteredStageGroups =
    matchFilterStage !== "ALL"
      ? tournament.stages.find((s: any) => s.id === matchFilterStage)?.groups || []
      : tournament.stages.flatMap((s: any) => s.groups || []);

  // Determine current active stage
  const currentStageIndex = tournament.stages.findIndex((s: any) => {
    const stageMatches = allMatches.filter((m) => m.stageId === s.id);
    return stageMatches.length > 0 && stageMatches.some((m: any) => m.status !== "FINISHED");
  });
  const currentStage = currentStageIndex >= 0 ? tournament.stages[currentStageIndex] : tournament.stages[tournament.stages.length - 1];

  // Format date for display
  function formatDate(dateStr?: string) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
  }

  // Determine stage status for pipeline
  function getStageStatus(stage: any, idx: number): "COMPLETED" | "ACTIVE" | "UPCOMING" {
    const stageMatches = allMatches.filter((m) => m.stageId === stage.id);
    if (stageMatches.length === 0) return "UPCOMING";
    if (stageMatches.every((m: any) => m.status === "FINISHED")) return "COMPLETED";
    return "ACTIVE";
  }

  // Tab definitions
  const tabs: Array<{ id: TabId; label: string; icon: any; hidden?: boolean }> = [
    { id: "OVERVIEW", label: "Overview", icon: Sparkles },
    { id: "MATCHES", label: `Matches (${allMatches.length})`, icon: Swords },
    { id: "BRACKETS", label: "Brackets", icon: Trophy, hidden: !hasBrackets },
  ];

  return (
    <div className="max-w-7xl mx-auto w-full px-6 py-10 flex-1 flex flex-col gap-8">
      {/* Tournament Hero Banner */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-2xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-6 z-10">
          {tournament.logoUrl ? (
            <img
              src={tournament.logoUrl}
              alt={tournament.name}
              className="w-20 h-20 object-contain rounded-xl bg-[#141414] border border-[#333]"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-[#141414] border border-[#222] flex items-center justify-center text-amber-400 shadow-inner">
              <Trophy className="w-10 h-10" />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  tournament.status === "ACTIVE"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : tournament.status === "FINISHED"
                    ? "bg-neutral-800 text-[#888] border border-[#333]"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}
              >
                {tournament.status}
              </span>
              <span className="text-xs font-mono text-[#666] uppercase">
                {tournament.participants?.length || 0} Teams
              </span>
              {tournament.startDate && (
                <span className="text-xs font-mono text-[#555]">
                  Started {formatDate(tournament.startDate)}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black uppercase tracking-wider text-white">
              {tournament.name}
            </h1>
            {tournament.description && (
              <p className="text-xs text-[#888888] max-w-2xl leading-relaxed">
                {tournament.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 z-10">
          <button
            onClick={handleShare}
            className="px-4 py-2.5 rounded-xl bg-[#141414] border border-[#333] hover:border-white/40 text-xs font-mono text-white flex items-center gap-2 transition-all shadow-md"
          >
            <Share2 className="w-4 h-4 text-emerald-400" /> Share
          </button>
        </div>
      </div>

      {/* Admin Toolbar */}
      {isAdmin && (
        <div className="bg-[#0E0E0E] border border-amber-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
              ADMINISTRATION PANEL
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowStageModal(true)}
              className="px-3.5 py-2 rounded-lg bg-[#141414] border border-[#333] hover:border-white/40 text-xs font-mono text-white flex items-center gap-2 transition-all"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" /> Stage Editor
            </button>

            <button
              onClick={() => setShowParticipantModal(true)}
              className="px-3.5 py-2 rounded-lg bg-[#141414] border border-[#333] hover:border-white/40 text-xs font-mono text-white flex items-center gap-2 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5 text-cyan-400" /> Manage Participants ({tournament.participants.length})
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-3.5 py-2 rounded-lg bg-[#141414] border border-[#333] hover:border-white/40 text-xs font-mono text-white flex items-center gap-2 transition-all"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" /> Tournament Settings
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1A1A1A] pb-3 text-xs font-mono overflow-x-auto">
        {tabs
          .filter((t) => !t.hidden)
          .map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-lg flex items-center gap-2 font-bold uppercase transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-[#141414] border border-[#333333] text-white"
                    : "text-[#666666] hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 text-emerald-400" />
                <span>{tab.label}</span>
              </button>
            );
          })}
      </div>

      {/* ======= TAB: OVERVIEW ======= */}
      {activeTab === "OVERVIEW" && (
        <div className="flex flex-col gap-8">
          {/* Info Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-4 flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-[#666] uppercase">Status</span>
              <span className={`text-sm font-bold font-mono ${tournament.status === "ACTIVE" ? "text-emerald-400" : "text-white"}`}>
                {tournament.status}
              </span>
            </div>
            <div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-4 flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-[#666] uppercase">Участники</span>
              <span className="text-sm font-bold font-mono text-white">
                {tournament.participants?.length || 0} / {tournament.maxParticipants}
              </span>
            </div>
            <div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-4 flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-[#666] uppercase">Матчи</span>
              <span className="text-sm font-bold font-mono text-white">
                {allMatches.filter((m) => m.status === "FINISHED").length} / {allMatches.length}
              </span>
            </div>
            <div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-4 flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-[#666] uppercase">Формат Очков</span>
              <span className="text-sm font-bold font-mono text-emerald-400">
                W:{tournament.pointsWin} / L:{tournament.pointsLoss}
              </span>
            </div>
          </div>

          {/* Dates & Format */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-5 flex flex-col gap-2">
              <span className="text-[10px] font-mono text-[#666] uppercase flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Даты
              </span>
              <span className="text-xs font-mono text-white">
                {formatDate(tournament.startDate)} — {formatDate(tournament.endDate)}
              </span>
            </div>
            <div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-5 flex flex-col gap-2">
              <span className="text-[10px] font-mono text-[#666] uppercase">Текущая Стадия</span>
              <span className="text-xs font-bold font-mono text-amber-400 uppercase">
                {currentStage?.name || "—"}
              </span>
            </div>
            <div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-5 flex flex-col gap-2">
              <span className="text-[10px] font-mono text-[#666] uppercase">Тайбрейки</span>
              <span className="text-xs font-mono text-white">{tournament.tiebreakers}</span>
            </div>
          </div>

          {/* Tournament Progress Pipeline */}
          {tournament.stages.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                TOURNAMENT PROGRESS
              </h3>
              <div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-6 overflow-x-auto">
                <div className="flex items-center gap-3 min-w-max">
                  {tournament.stages.map((st: any, idx: number) => {
                    const status = getStageStatus(st, idx);
                    return (
                      <React.Fragment key={st.id}>
                        {idx > 0 && (
                          <ArrowRight
                            className={`w-5 h-5 flex-shrink-0 ${
                              status === "COMPLETED" || getStageStatus(tournament.stages[idx - 1], idx - 1) === "COMPLETED"
                                ? "text-emerald-400"
                                : "text-[#333]"
                            }`}
                          />
                        )}
                        <div
                          className={`flex items-center gap-3 px-5 py-3 rounded-xl border transition-all ${
                            status === "ACTIVE"
                              ? "bg-emerald-950/30 border-emerald-500/50 shadow-md shadow-emerald-900/20"
                              : status === "COMPLETED"
                              ? "bg-[#111] border-emerald-500/30"
                              : "bg-[#0D0D0D] border-[#222]"
                          }`}
                        >
                          {status === "COMPLETED" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          ) : status === "ACTIVE" ? (
                            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
                          ) : (
                            <Circle className="w-4 h-4 text-[#444] flex-shrink-0" />
                          )}
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`text-xs font-bold font-mono uppercase whitespace-nowrap ${
                                status === "ACTIVE" ? "text-white" : status === "COMPLETED" ? "text-emerald-400" : "text-[#666]"
                              }`}
                            >
                              {st.name}
                            </span>
                          </div>
                          <span
                            className={`ml-2 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                              status === "ACTIVE"
                                ? "bg-amber-500/20 text-amber-400"
                                : status === "COMPLETED"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-[#1A1A1A] text-[#555]"
                            }`}
                          >
                            {status}
                          </span>

                          {isAdmin && status !== "COMPLETED" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateStage(st.id);
                              }}
                              disabled={actionLoading}
                              className="ml-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-mono font-bold text-white rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 whitespace-nowrap"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" /> Сгенерировать Сетку
                            </button>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======= TAB: MATCHES (with Filters) ======= */}
      {activeTab === "MATCHES" && (
        <div className="flex flex-col gap-6">
          {/* Filter Bar */}
          {allMatches.length > 0 && (
            <div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-4 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#888] uppercase">
                <Filter className="w-3.5 h-3.5 text-emerald-400" /> Фильтры
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Stage Filter */}
                <select
                  value={matchFilterStage}
                  onChange={(e) => {
                    setMatchFilterStage(e.target.value);
                    setMatchFilterGroup("ALL");
                  }}
                  className="bg-[#111] border border-[#333] rounded-lg py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                >
                  <option value="ALL">Все стадии</option>
                  {tournament.stages.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                {/* Group Filter */}
                <select
                  value={matchFilterGroup}
                  onChange={(e) => setMatchFilterGroup(e.target.value)}
                  className="bg-[#111] border border-[#333] rounded-lg py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                >
                  <option value="ALL">Все группы</option>
                  {filteredStageGroups.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={matchFilterStatus}
                  onChange={(e) => setMatchFilterStatus(e.target.value)}
                  className="bg-[#111] border border-[#333] rounded-lg py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                >
                  <option value="ALL">Все статусы ({matchStatusCounts.ALL})</option>
                  <option value="SCHEDULED">Upcoming ({matchStatusCounts.SCHEDULED})</option>
                  <option value="LIVE">Live ({matchStatusCounts.LIVE})</option>
                  <option value="FINISHED">Finished ({matchStatusCounts.FINISHED})</option>
                  <option value="CANCELLED">Cancelled ({matchStatusCounts.CANCELLED})</option>
                </select>

                {/* Team Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#666] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Поиск по команде..."
                    value={matchFilterTeam}
                    onChange={(e) => setMatchFilterTeam(e.target.value)}
                    className="w-full bg-[#111] border border-[#333] rounded-lg py-2 pl-8 pr-3 text-xs font-mono text-white placeholder-[#555] focus:outline-none focus:border-white/40"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Matches List */}
          <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
            МАТЧИ ({filteredMatches.length})
          </h3>

          {allMatches.length === 0 ? (
            <div className="bg-[#0A0A0A] border border-dashed border-[#222] rounded-2xl p-12 text-center flex flex-col items-center gap-4">
              <Swords className="w-12 h-12 text-[#333]" />
              <div className="flex flex-col gap-1">
                <h4 className="text-base font-bold font-mono text-white uppercase">
                  Матчи ещё не сгенерированы
                </h4>
                <p className="text-xs font-mono text-[#888]">
                  Зарегистрировано участников: {tournament.participants?.length || 0} / {tournament.maxParticipants}
                </p>
              </div>
              {isAdmin && tournament.stages[0] && (
                <button
                  onClick={() => handleGenerateStage(tournament.stages[0].id)}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-xs font-mono font-bold text-white rounded-xl flex items-center gap-2 transition-all shadow-xl shadow-emerald-600/20 uppercase tracking-wider disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" /> Сгенерировать Матчи Турнира
                </button>
              )}
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-[#222] rounded-xl text-xs font-mono text-[#666]">
              Нет матчей по выбранным фильтрам.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMatches.map((m) => {
                const nameA = m.teamCustomNameA || m.teamA?.name || "Team A";
                const nameB = m.teamCustomNameB || m.teamB?.name || "Team B";
                const isFinished = m.status === "FINISHED";

                return (
                  <Link
                    key={m.id}
                    href={`/tournaments/${slug}/matches/${m.id}`}
                    onClick={(e) => {
                      if (isAdmin) {
                        e.preventDefault();
                        setSelectedMatch(m);
                        setShowMatchModal(true);
                      }
                    }}
                    className="bg-[#0A0A0A] border border-[#222] hover:border-white/40 rounded-xl p-4 transition-all cursor-pointer flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono border-b border-[#1A1A1A] pb-2">
                      <span className="text-[#888]">
                        {m.stageName} {m.groupName ? `• ${m.groupName}` : ""}
                      </span>
                      <span className={`font-bold ${isFinished ? "text-emerald-400" : m.status === "LIVE" ? "text-rose-400" : "text-amber-400"}`}>
                        {m.status} (BO{m.bestOf || 1})
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 text-sm font-mono font-bold">
                      <span className={m.scoreA > m.scoreB && isFinished ? "text-emerald-400" : "text-white"}>
                        {nameA}
                      </span>
                      <span className="bg-[#141414] px-3 py-1 rounded border border-[#222]">
                        {m.scoreA} : {m.scoreB}
                      </span>
                      <span className={m.scoreB > m.scoreA && isFinished ? "text-emerald-400" : "text-white"}>
                        {nameB}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======= TAB: BRACKETS (Auto-detect Swiss / SE / DE) ======= */}
      {activeTab === "BRACKETS" && (
        <div className="flex flex-col gap-10">
          {/* Swiss Stages → SwissBoard */}
          {swissStages.map((st: any) => {
            let settings: any = {};
            if (st.settings) {
              try {
                const parsed = JSON.parse(st.settings);
                settings = parsed.swiss || parsed;
              } catch (e) {}
            }

            return (
              <div key={st.id} className="flex flex-col gap-6">
                <h3 className="text-sm font-bold font-mono text-emerald-400 uppercase tracking-wider border-b border-[#1F1F1F] pb-2">
                  {st.name} (Swiss System)
                </h3>
                <SwissBoard
                  stageName={st.name}
                  stageId={st.id}
                  tournamentSlug={tournament.slug}
                  bracketNodes={st.bracketNodes || []}
                  standings={swissStandingsByStageId[st.id] || []}
                  settings={settings}
                  isAdmin={isAdmin}
                  onMatchClick={(mId) => {
                    const matchObj = allMatches.find((m) => m.id === mId);
                    if (matchObj && isAdmin) {
                      setSelectedMatch(matchObj);
                      setShowMatchModal(true);
                    }
                  }}
                  onGenerateRound={() => handleGenerateStage(st.id, false)}
                  onRegenerateRound={() => handleGenerateStage(st.id, true)}
                />
              </div>
            );
          })}

          {/* SE / DE Stages → BracketView */}
          {bracketStages.map((st: any) => {
            const hasNodes = (st.bracketNodes || []).length > 0;
            return (
              <div key={st.id} className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-2">
                  <h3 className="text-sm font-bold font-mono text-emerald-400 uppercase tracking-wider">
                    {st.name} ({st.type.replace("_", " ")})
                  </h3>
                  {isAdmin && (
                    <button
                      onClick={() => handleGenerateStage(st.id)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-mono font-bold text-white rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> {hasNodes ? "Перегенерировать Сетку" : "Сгенерировать Сетку"}
                    </button>
                  )}
                </div>

                {!hasNodes ? (
                  <div className="bg-[#0A0A0A] border border-dashed border-[#222] rounded-2xl p-12 text-center flex flex-col items-center gap-4">
                    <Trophy className="w-12 h-12 text-[#333]" />
                    <div className="flex flex-col gap-1">
                      <h4 className="text-base font-bold font-mono text-white uppercase">
                        Турнирная сетка ещё не сгенерирована
                      </h4>
                      <p className="text-xs font-mono text-[#888]">
                        Зарегистрировано участников: {tournament.participants?.length || 0} / {tournament.maxParticipants}
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleGenerateStage(st.id)}
                        disabled={actionLoading}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-xs font-mono font-bold text-white rounded-xl flex items-center gap-2 transition-all shadow-xl shadow-emerald-600/20 uppercase tracking-wider disabled:opacity-50"
                      >
                        <Play className="w-4 h-4 fill-white" /> Сгенерировать Сетку ({tournament.participants?.length || 0} Участников)
                      </button>
                    )}
                  </div>
                ) : (
                  <BracketView
                    nodes={st.bracketNodes || []}
                    isAdmin={isAdmin}
                    onMatchClick={(mId) => {
                      const matchObj = allMatches.find((m) => m.id === mId);
                      if (matchObj && isAdmin) {
                        setSelectedMatch(matchObj);
                        setShowMatchModal(true);
                      }
                    }}
                  />
                )}
              </div>
            );
          })}

          {swissStages.length === 0 && bracketStages.length === 0 && (
            <div className="py-16 text-center border border-dashed border-[#222] rounded-xl text-xs font-mono text-[#666]">
              Нет стадий с сетками / Swiss.
            </div>
          )}
        </div>
      )}



      {/* Admin Modals */}
      {showMatchModal && selectedMatch && (
        <MatchEditModal
          tournamentSlug={tournament.slug}
          match={selectedMatch}
          isOpen={showMatchModal}
          onClose={() => setShowMatchModal(false)}
          onSuccess={fetchTournamentDetails}
        />
      )}

      {showParticipantModal && (
        <ParticipantManagerModal
          tournamentSlug={tournament.slug}
          participants={tournament.participants || []}
          isOpen={showParticipantModal}
          onClose={() => setShowParticipantModal(false)}
          onSuccess={fetchTournamentDetails}
        />
      )}

      {showStageModal && (
        <StageEditorModal
          tournamentSlug={tournament.slug}
          isOpen={showStageModal}
          onClose={() => setShowStageModal(false)}
          onSuccess={fetchTournamentDetails}
        />
      )}

      {showSettingsModal && (
        <TournamentSettingsModal
          tournament={tournament}
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onSuccess={fetchTournamentDetails}
        />
      )}
    </div>
  );
}
