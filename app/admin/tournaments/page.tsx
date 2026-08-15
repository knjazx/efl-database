"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/AdminLayout";
import { Trophy, Plus, Settings, Trash2, Eye, EyeOff, Layers, Users, ChevronRight, RefreshCw, AlertCircle } from "lucide-react";

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [presetType, setPresetType] = useState("EFL_SWISS");
  const [maxParticipants, setMaxParticipants] = useState(16);
  const [pointsWin, setPointsWin] = useState(3);
  const [pointsLoss, setPointsLoss] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTournaments();
  }, []);

  function fetchTournaments() {
    setLoading(true);
    fetch("/api/tournaments")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.tournaments)) {
          setTournaments(data.tournaments);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  async function handleCreateTournament(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          presetType,
          maxParticipants: Number(maxParticipants),
          pointsWin: Number(pointsWin),
          pointsLoss: Number(pointsLoss),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setName("");
        setDescription("");
        fetchTournaments();
      } else {
        setError(data.error || "Failed to create tournament");
      }
    } catch (e: any) {
      setError(e.message || "Request error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTogglePublish(tournament: any) {
    try {
      const res = await fetch(`/api/tournaments/${tournament.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !tournament.isPublished }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTournaments();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteTournament(slug: string, tournamentName: string) {
    if (!confirm(`Вы уверены, что хотите удалить турнир '${tournamentName}'?`)) return;
    try {
      const res = await fetch(`/api/tournaments/${slug}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchTournaments();
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222222] pb-6">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <Trophy className="w-6 h-6 text-amber-400" />
              <span>Управление Турнирами (Tournaments)</span>
            </h2>
            <p className="text-xs text-[#858585] mt-1 font-mono">
              Создание турниров, редактирование стадий, генерация сеток и посев участников.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-mono font-bold text-white transition-all shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>СОЗДАТЬ ТУРНИР (CREATE TOURNAMENT)</span>
          </button>
        </div>

        {/* Tournaments List */}
        {loading ? (
          <div className="py-20 text-center text-xs font-mono text-[#666] animate-pulse">
            ЗАГРУЗКА ТУРНИРОВ...
          </div>
        ) : tournaments.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-[#222] rounded-xl p-8 flex flex-col items-center gap-3">
            <Trophy className="w-10 h-10 text-[#333]" />
            <span className="text-xs font-mono text-[#888]">Турниры ещё не созданы.</span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-2 px-4 py-2 bg-emerald-600 text-white font-mono text-xs font-bold rounded-lg"
            >
              + Создать первый турнир
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className="bg-[#0A0A0A] border border-[#222222] hover:border-[#333333] rounded-xl p-6 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-xl bg-[#141414] border border-[#222] flex items-center justify-center text-amber-400 flex-shrink-0">
                    {t.logoUrl ? (
                      <img src={t.logoUrl} alt={t.name} className="w-10 h-10 object-contain" />
                    ) : (
                      <Trophy className="w-7 h-7" />
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          t.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : t.status === "FINISHED"
                            ? "bg-neutral-800 text-[#888]"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {t.status}
                      </span>
                      <span className="text-[10px] font-mono text-[#666] uppercase">
                        {t.presetType?.replace("_", " ")}
                      </span>
                      <span className="text-[10px] font-mono text-[#666]">
                        {t.isPublished ? "• Published" : "• Hidden (Draft)"}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                      {t.name}
                    </h3>
                    <p className="text-xs font-mono text-[#888888]">
                      {t.stages?.length || 0} Стадий • {t.participants?.length || 0}/{t.maxParticipants} Участников • {t._count?.matches || 0} Матчей
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleTogglePublish(t)}
                    title={t.isPublished ? "Скрыть турнир" : "Опубликовать турнир"}
                    className="p-2.5 rounded-lg bg-[#141414] border border-[#222] hover:border-white/40 text-[#888] hover:text-white transition-all"
                  >
                    {t.isPublished ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-rose-400" />}
                  </button>

                  <Link
                    href={`/tournaments/${t.slug}`}
                    className="px-4 py-2 rounded-lg bg-[#141414] border border-[#333] hover:border-emerald-500 text-xs font-mono font-bold text-white flex items-center gap-2 transition-all"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-400" /> Управление Стадиями &rarr;
                  </Link>

                  <button
                    onClick={() => handleDeleteTournament(t.slug, t.name)}
                    className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/50 hover:bg-rose-900/50 text-rose-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Tournament Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-6 relative">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-[#888] hover:text-white"
              >
                ×
              </button>

              <div className="flex flex-col gap-1 border-b border-[#1A1A1A] pb-3">
                <h3 className="text-sm font-bold uppercase text-white tracking-widest flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" /> СОЗДАНИЕ ТУРНИРА (ADMIN)
                </h3>
                <p className="text-xs text-[#888]">Создание нового турнира EFL и конфигурация стадий</p>
              </div>

              {error && (
                <div className="p-3 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCreateTournament} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-[#888]">Название Турнира *</label>
                  <input
                    type="text"
                    required
                    placeholder="EFL Season 1 Grand League"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-[#111] border border-[#222] rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-[#888]">Описание</label>
                  <textarea
                    rows={3}
                    placeholder="Главный сезонный турнир лиги Electronic Future League..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-[#111] border border-[#222] rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono text-emerald-400 font-bold uppercase">Формат Турнира *</label>
                    <select
                      value={presetType}
                      onChange={(e) => setPresetType(e.target.value)}
                      className="bg-[#111] border border-[#333] rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 font-bold"
                    >
                      <option value="EFL_SWISS">SWISS SYSTEM (Швейцарская система)</option>
                      <option value="EFL_GROUP_STAGE">GROUP STAGE (Групповой этап)</option>
                      <option value="EFL_PLAYOFFS">SINGLE ELIMINATION (Плей-офф)</option>
                      <option value="EFL_QUALIFICATION">DOUBLE ELIMINATION (Квалификация)</option>
                      <option value="CUSTOM">CUSTOM (Кастомная система)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono text-[#888]">Макс. Участников</label>
                    <input
                      type="number"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 16)}
                      className="bg-[#111] border border-[#222] rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-[#111] p-3 rounded-xl border border-[#222]">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-[#888]">Очки за победу (WIN)</label>
                    <input
                      type="number"
                      value={pointsWin}
                      onChange={(e) => setPointsWin(parseInt(e.target.value) || 3)}
                      className="bg-[#050505] border border-[#333] rounded p-1.5 text-xs font-mono text-emerald-400 font-bold text-center"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-[#888]">Очки за поражение (LOSS)</label>
                    <input
                      type="number"
                      value={pointsLoss}
                      onChange={(e) => setPointsLoss(parseInt(e.target.value) || 0)}
                      className="bg-[#050505] border border-[#333] rounded p-1.5 text-xs font-mono text-rose-400 font-bold text-center"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1A1A1A]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg bg-[#141414] text-xs font-mono text-[#888] hover:text-white"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-mono font-bold text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {actionLoading ? "Создание..." : "Создать Турнир"}
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
