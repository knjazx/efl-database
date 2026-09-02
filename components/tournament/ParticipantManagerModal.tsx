"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Shuffle,
  Award,
  ArrowDownUp,
  Trash2,
  CheckSquare,
  Square,
  Search,
  Users,
  CheckCircle2,
  Zap,
} from "lucide-react";

interface Props {
  tournamentSlug: string;
  participants: any[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ParticipantManagerModal({ tournamentSlug, participants, isOpen, onClose, onSuccess }: Props) {
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/teams")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.teams)) {
            setAllTeams(data.teams);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const existingTeamIds = new Set(participants.map((p) => p.teamId));
  const availableTeams = allTeams.filter((t) => !existingTeamIds.has(t.id));

  const filteredAvailableTeams = availableTeams.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function toggleTeamSelect(id: string) {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleSelectAll() {
    setSelectedTeamIds(filteredAvailableTeams.map((t) => t.id));
  }

  function handleDeselectAll() {
    setSelectedTeamIds([]);
  }

  async function handleAddSelectedTeams(teamIdsToAdd?: string[]) {
    const ids = teamIdsToAdd || selectedTeamIds;
    if (ids.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/tournaments/${tournamentSlug}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_TEAMS", teamIds: ids }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTeamIds([]);
        onSuccess();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTopTeams(count: number) {
    const topTeams = [...availableTeams]
      .sort((a, b) => b.points - a.points)
      .slice(0, count)
      .map((t) => t.id);

    if (topTeams.length > 0) {
      await handleAddSelectedTeams(topTeams);
    }
  }

  async function handleSeed(action: "SEED_RANDOM" | "SEED_BY_RATING") {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentSlug}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveParticipant(id: string) {
    if (!confirm("Удалить участника из турнира?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentSlug}/participants?participantId=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#151515] border border-[#222222] rounded-xl w-full max-w-3xl p-6 shadow-2xl flex flex-col gap-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#888] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col gap-1 border-b border-[#1A1A1A] pb-4">
          <h3 className="text-sm font-bold uppercase text-white tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Управление Участниками & Массовое Добавление Команд</span>
          </h3>
          <p className="text-xs text-[#888888]">
            Массовый выбор команд, быстрый автопосев по EFL Rating и случайный посев.
          </p>
        </div>

        {/* Quick Batch Presets */}
        <div className="flex flex-wrap items-center gap-2 bg-[#111111] p-3 rounded-xl border border-[#222]">
          <span className="text-xs font-mono font-bold text-[#888] mr-2 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Быстрый набор:
          </span>
          <button
            onClick={() => handleAddTopTeams(8)}
            disabled={loading || availableTeams.length === 0}
            className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] text-xs font-mono font-bold text-white rounded-lg transition-all"
          >
            + Top 8 по Rating
          </button>
          <button
            onClick={() => handleAddTopTeams(16)}
            disabled={loading || availableTeams.length === 0}
            className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] text-xs font-mono font-bold text-white rounded-lg transition-all"
          >
            + Top 16 по Rating
          </button>
          <button
            onClick={() => handleAddSelectedTeams(availableTeams.map((t) => t.id))}
            disabled={loading || availableTeams.length === 0}
            className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-xs font-mono font-bold text-emerald-400 rounded-lg transition-all"
          >
            + Добавить Все ({availableTeams.length})
          </button>
        </div>

        {/* Bulk Add Section */}
        <div className="bg-[#0E0E0E] border border-[#222] rounded-xl p-4 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1C1C1C] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white uppercase">
                ДОСТУПНЫЕ КОМАНДЫ ({availableTeams.length})
              </span>
              {selectedTeamIds.length > 0 && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                  Выбрано: {selectedTeamIds.length}
                </span>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#666] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Поиск команды по названию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#141414] border border-[#333] rounded-lg py-1.5 pl-8 pr-3 text-xs font-mono text-white placeholder-[#555] focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          {/* Select All / Deselect All Bar */}
          {filteredAvailableTeams.length > 0 && (
            <div className="flex items-center justify-between text-[11px] font-mono text-[#888] px-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> Выбрать все
                </button>
                <span>•</span>
                <button
                  onClick={handleDeselectAll}
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5 text-[#555]" /> Снять выбор
                </button>
              </div>

              <button
                onClick={() => handleAddSelectedTeams()}
                disabled={selectedTeamIds.length === 0 || loading}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> Добавить Выбранные ({selectedTeamIds.length})
              </button>
            </div>
          )}

          {/* Multi-Select Teams Grid */}
          <div className="max-h-48 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 p-1 border border-[#1A1A1A] rounded-lg bg-[#151515]">
            {filteredAvailableTeams.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-xs font-mono text-[#666]">
                {availableTeams.length === 0
                  ? "Все команды уже добавлены в турнир."
                  : "Команды по запросу не найдены."}
              </div>
            ) : (
              filteredAvailableTeams.map((t) => {
                const isSelected = selectedTeamIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleTeamSelect(t.id)}
                    className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-mono transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-950/30 border-emerald-500/60 text-white"
                        : "bg-[#111111] border-[#222222] hover:border-[#444444] text-[#AAA]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-[#444] flex-shrink-0" />
                      )}
                      {t.logoUrl ? (
                        <img src={t.logoUrl} alt={t.name} className="w-4 h-4 object-contain" />
                      ) : (
                        <div className="w-4 h-4 rounded bg-[#222] text-[8px] flex items-center justify-center font-mono">
                          {t.tag}
                        </div>
                      )}
                      <span className="font-semibold truncate text-white">{t.name}</span>
                    </div>

                    <span className="text-amber-400 text-[10px] font-bold flex-shrink-0">
                      {t.points} PTS
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Seeding Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSeed("SEED_RANDOM")}
            disabled={loading || participants.length === 0}
            className="flex-1 py-2.5 px-3 bg-[#141414] border border-[#222] hover:border-white/40 text-xs font-mono text-white rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-400" /> Random Seed (Случайный посев)
          </button>
          <button
            onClick={() => handleSeed("SEED_BY_RATING")}
            disabled={loading || participants.length === 0}
            className="flex-1 py-2.5 px-3 bg-[#141414] border border-[#222] hover:border-white/40 text-xs font-mono text-white rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          >
            <Award className="w-3.5 h-3.5 text-cyan-400" /> Seed by EFL Rating (Посев по EFL Рейтингу)
          </button>
        </div>

        {/* Current Registered Participants List */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-[#1C1C1C] pb-2">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              ЗАРЕГИСТРИРОВАННЫЕ УЧАСТНИКИ ({participants.length})
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-[#1A1A1A] bg-[#111111] border border-[#222] rounded-xl">
            {participants.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-[#666]">
                В турнире пока нет участников. Выберите команды выше для добавления.
              </div>
            ) : (
              participants.map((p, idx) => {
                const name = p.customName || p.team?.name || p.player?.nickname || "Team";
                const tag = p.team?.tag || "TAG";
                const pts = p.team?.points ?? 0;

                return (
                  <div key={p.id} className="flex items-center justify-between p-3 text-xs font-mono hover:bg-[#161616] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded bg-[#151515] border border-[#333] flex items-center justify-center text-[10px] text-emerald-400 font-bold">
                        #{p.seed || idx + 1}
                      </span>
                      {p.team?.logoUrl && (
                        <img src={p.team.logoUrl} alt={name} className="w-5 h-5 object-contain" />
                      )}
                      <span className="text-white font-semibold">{name}</span>
                      <span className="text-[#666]">[{tag}]</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-amber-400 text-[11px] font-bold">{pts} PTS</span>
                      <button
                        onClick={() => handleRemoveParticipant(p.id)}
                        className="text-[#666] hover:text-rose-400 transition-colors"
                        title="Удалить из турнира"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {participants.length >= 2 && (
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const resStage = await fetch(`/api/tournaments/${tournamentSlug}`);
                const dataStage = await resStage.json();
                if (dataStage.success && dataStage.tournament?.stages?.[0]) {
                  const stageId = dataStage.tournament.stages[0].id;
                  const resGen = await fetch(`/api/tournaments/${tournamentSlug}/generate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ stageId }),
                  });
                  const genData = await resGen.json();
                  if (genData.success) {
                    onSuccess();
                    onClose();
                  } else {
                    alert(genData.error || "Ошибка генерации сетки");
                  }
                }
              } catch (e) {
                console.error(e);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-xs font-mono font-bold text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 uppercase tracking-wider disabled:opacity-50"
          >
            <Zap className="w-4 h-4 text-white fill-white" /> Сгенерировать Сетку ({participants.length} Участников)
          </button>
        )}
      </div>
    </div>
  );
}
