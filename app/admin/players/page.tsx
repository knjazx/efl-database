"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Plus, Edit, Trash2, X, RefreshCw, ExternalLink, Check, Crown, AlertTriangle, ShieldCheck, ShieldAlert, Filter, Search } from "lucide-react";
import Link from "next/link";
import { getBanStatus } from "@/lib/disqualification";

interface PlayerItem {
  id: string;
  nickname: string;
  slug: string;
  avatarUrl?: string;
  defaultRole: string;
  steamUrl?: string;
  faceitUrl?: string;
  discordUrl?: string;
  isDisqualified?: boolean;
  disqualifiedUntil?: Date | string | null;
  disqualifyReason?: string | null;
  currentTeam: {
    id: string;
    name: string;
    tag: string;
    slug: string;
    role: string;
  } | null;
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidePlayersWithTeam, setHidePlayersWithTeam] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");

  // Edit/Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerItem | null>(null);

  // Ban Modal State
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [banTargetPlayer, setBanTargetPlayer] = useState<PlayerItem | null>(null);
  const [banDurationDays, setBanDurationDays] = useState<number | "permanent">(7);
  const [banReason, setBanReason] = useState("");
  const [banSubmitting, setBanSubmitting] = useState(false);

  // Form Inputs
  const [nickname, setNickname] = useState("");
  const [isCaptain, setIsCaptain] = useState(false);
  const [steamUrl, setSteamUrl] = useState("");
  const [faceitUrl, setFaceitUrl] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchPlayers = async () => {
    try {
      const res = await fetch("/api/players");
      const data = await res.json();
      if (data.success) {
        setPlayers(data.players);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const openAddModal = () => {
    setEditingPlayer(null);
    setNickname("");
    setIsCaptain(false);
    setSteamUrl("https://steamcommunity.com");
    setFaceitUrl("https://www.faceit.com");
    setDiscordUrl("");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (player: PlayerItem) => {
    setEditingPlayer(player);
    setNickname(player.nickname);
    const activeRole = player.currentTeam?.role || player.defaultRole || "";
    setIsCaptain(activeRole.toUpperCase() === "CAPTAIN");
    setSteamUrl(player.steamUrl || "");
    setFaceitUrl(player.faceitUrl || "");
    setDiscordUrl(player.discordUrl || "");
    setFormError("");
    setIsModalOpen(true);
  };

  const openBanModal = (player: PlayerItem) => {
    setBanTargetPlayer(player);
    setBanDurationDays(7);
    setBanReason(player.disqualifyReason || "Нарушение регламента лиги");
    setIsBanModalOpen(true);
  };

  const handleBanSubmit = async (action: "DISQUALIFY" | "UNBAN") => {
    if (!banTargetPlayer) return;
    setBanSubmitting(true);

    try {
      const res = await fetch("/api/players", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: banTargetPlayer.id,
          action,
          durationDays: action === "DISQUALIFY" ? (banDurationDays === "permanent" ? null : banDurationDays) : null,
          reason: banReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsBanModalOpen(false);
        fetchPlayers();
      } else {
        alert(data.error || "Failed to update player ban status");
      }
    } catch (err) {
      alert("Failed to update player ban status");
    } finally {
      setBanSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("nickname", nickname);
      formData.append("role", isCaptain ? "CAPTAIN" : "PLAYER");
      formData.append("steamUrl", steamUrl);
      formData.append("faceitUrl", faceitUrl);
      formData.append("discordUrl", isCaptain ? discordUrl : "");

      const url = editingPlayer ? `/api/players/${editingPlayer.slug}` : "/api/players";
      const method = editingPlayer ? "PUT" : "POST";

      // Optimistically close modal instantly
      setIsModalOpen(false);

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        fetchPlayers();
      } else {
        alert(data.error || "Operation failed");
      }
    } catch (err) {
      alert("Network request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlayer = async (slug: string, nickname: string) => {
    if (!confirm(`Are you sure you want to delete player "${nickname}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/players/${slug}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchPlayers();
      } else {
        alert(data.error || "Failed to delete player");
      }
    } catch (err) {
      alert("Failed to delete player");
    }
  };

  const displayedPlayers = players.filter((p) => {
    if (hidePlayersWithTeam && p.currentTeam !== null) {
      return false;
    }
    if (playerSearchQuery.trim() !== "") {
      const q = playerSearchQuery.toLowerCase();
      const matchNickname = p.nickname.toLowerCase().includes(q);
      const matchTeam = p.currentTeam
        ? p.currentTeam.name.toLowerCase().includes(q) || p.currentTeam.tag.toLowerCase().includes(q)
        : false;
      return matchNickname || matchTeam;
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222222] pb-4">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
              PLAYER MANAGEMENT
            </h2>
            <p className="text-xs text-[#858585] mt-1">
              Create players, manage Captain status, Steam & FACEIT URLs, and disqualifications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Real-time Search by Nickname */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск по нику..."
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                className="pl-9 pr-8 py-2 bg-[#050505] border border-[#222222] rounded-xl text-xs text-white placeholder-[#666666] focus:outline-none focus:border-white transition-colors w-48 sm:w-60"
              />
              {playerSearchQuery && (
                <button
                  onClick={() => setPlayerSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#858585] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Toggle: Hide Players in Team */}
            <button
              onClick={() => setHidePlayersWithTeam(!hidePlayersWithTeam)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                hidePlayersWithTeam
                  ? "bg-amber-950/40 border-amber-500/60 text-amber-300 shadow-md shadow-amber-950/30"
                  : "bg-[#050505] border-[#222222] text-[#858585] hover:text-white hover:border-white"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>
                {hidePlayersWithTeam
                  ? "Скрыты игроки в командах"
                  : "Скрыть игроков с командой"}
              </span>
            </button>

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black font-extrabold text-xs tracking-wider uppercase rounded-xl hover:bg-neutral-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>ADD PLAYER</span>
            </button>
          </div>
        </div>

        {/* Players Table */}
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[#858585] flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xs font-semibold uppercase">Loading players database...</span>
            </div>
          ) : displayedPlayers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050505] border-b border-[#222222] text-[#858585] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">PLAYER</th>
                    <th className="px-6 py-4">TEAM</th>
                    <th className="px-6 py-4">BAN STATUS</th>
                    <th className="px-6 py-4">LINKS</th>
                    <th className="px-6 py-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {displayedPlayers.map((p) => {
                    const activeRole = p.currentTeam?.role || p.defaultRole || "";
                    const playerIsCaptain = activeRole.toUpperCase() === "CAPTAIN";
                    const ban = getBanStatus(p);

                    return (
                      <tr key={p.id} className="hover:bg-[#0E0E0E] transition-colors">
                        {/* PLAYER NICKNAME & AVATAR */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#050505] border border-[#222222] overflow-hidden flex items-center justify-center flex-shrink-0">
                              {p.avatarUrl ? (
                                <img src={p.avatarUrl} alt={p.nickname} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold text-white">{p.nickname.substring(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Link href={`/players/${p.slug}`} className="font-bold text-white hover:underline text-sm">
                                {p.nickname}
                              </Link>
                              {playerIsCaptain && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/50 text-amber-400 font-bold uppercase text-[9px]">
                                  <Crown className="w-2.5 h-2.5" />
                                  <span>CAPTAIN</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* TEAM */}
                        <td className="px-6 py-4">
                          {p.currentTeam ? (
                            <Link
                              href={`/teams/${p.currentTeam.slug}`}
                              className="font-bold text-white hover:underline flex items-center gap-1.5"
                            >
                              <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#222222] text-[10px]">
                                {p.currentTeam.tag}
                              </span>
                              <span>{p.currentTeam.name}</span>
                            </Link>
                          ) : (
                            <span className="text-[#666666] font-semibold">Free Agent</span>
                          )}
                        </td>

                        {/* BAN STATUS */}
                        <td className="px-6 py-4">
                          {ban.isBanned ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/50 border border-red-800 text-red-300 font-bold uppercase text-[10px]">
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                              <span>{ban.remainingText}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 font-bold uppercase text-[10px]">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        {/* STEAM / FACEIT / DISCORD */}
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {p.steamUrl && (
                              <a
                                href={p.steamUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#858585] hover:text-white flex items-center gap-1 text-[11px]"
                              >
                                <span>Steam</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {p.faceitUrl && (
                              <a
                                href={p.faceitUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#858585] hover:text-white flex items-center gap-1 text-[11px]"
                              >
                                <span>FACEIT</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {playerIsCaptain && p.discordUrl && (
                              <span className="text-indigo-300 font-semibold text-[11px]">
                                Discord: {p.discordUrl}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ACTIONS */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openBanModal(p)}
                              className={`px-2.5 py-1.5 rounded border text-[11px] font-bold transition-colors flex items-center gap-1 ${
                                ban.isBanned
                                  ? "bg-red-950/40 border-red-800 text-red-300 hover:bg-red-900/60"
                                  : "bg-[#141414] border-[#222222] text-[#858585] hover:text-white hover:border-white"
                              }`}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>{ban.isBanned ? "Ban Active" : "Ban Status"}</span>
                            </button>
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1.5 rounded bg-[#141414] border border-[#222222] hover:border-white text-white transition-colors"
                              title="Edit Player"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePlayer(p.slug, p.nickname)}
                              className="p-1.5 rounded bg-red-950/30 border border-red-900/50 hover:bg-red-900/50 text-red-400 transition-colors"
                              title="Delete Player"
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
          ) : (
            <div className="p-12 text-center text-[#858585]">
              {hidePlayersWithTeam
                ? "Нет игроков без команды (все игроки уже состоят в командах)."
                : "No players registered in the database."}
            </div>
          )}
        </div>

        {/* Modal: Add / Edit Player */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0A0A0A] border border-[#222222] rounded-2xl p-6 shadow-2xl relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-[#858585] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4 border-b border-[#222222] pb-3">
                {editingPlayer ? "EDIT PLAYER" : "ADD NEW PLAYER"}
              </h3>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                    Nickname *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KnjazX"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-sm text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div className="p-3 bg-[#050505] border border-[#222222] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className={`w-4 h-4 ${isCaptain ? "text-amber-400" : "text-[#858585]"}`} />
                    <label htmlFor="isCaptainCheck" className="text-xs font-bold text-white cursor-pointer select-none">
                      Team Captain (Капитан команды)
                    </label>
                  </div>
                  <input
                    id="isCaptainCheck"
                    type="checkbox"
                    checked={isCaptain}
                    onChange={(e) => setIsCaptain(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>

                {isCaptain && (
                  <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1">
                    <label className="block text-[11px] font-bold text-amber-400 uppercase">
                      Discord Contact (Only for Captain)
                    </label>
                    <input
                      type="text"
                      placeholder="Discord Tag or Link (e.g. username#0000)"
                      value={discordUrl}
                      onChange={(e) => setDiscordUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                    Steam Profile URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://steamcommunity.com/id/..."
                    value={steamUrl}
                    onChange={(e) => setSteamUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-sm text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                    FACEIT Profile URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.faceit.com/en/players/..."
                    value={faceitUrl}
                    onChange={(e) => setFaceitUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-sm text-white focus:outline-none focus:border-white"
                  />
                </div>

                {formError && (
                  <p className="text-xs font-semibold text-red-400 bg-red-950/40 p-2 rounded text-center">
                    {formError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222222]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-[#141414] border border-[#222222] rounded-lg text-xs font-semibold text-[#858585] hover:text-white transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-white text-black rounded-lg text-xs font-extrabold tracking-wider uppercase hover:bg-neutral-200 transition-colors flex items-center gap-2"
                  >
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>SAVE</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Manage Player Disqualification / Ban */}
        {isBanModalOpen && banTargetPlayer && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0A0A0A] border border-[#222222] rounded-2xl p-6 shadow-2xl relative">
              <button
                onClick={() => setIsBanModalOpen(false)}
                className="absolute top-4 right-4 text-[#858585] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-[#222222] pb-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  DISQUALIFICATION FOR {banTargetPlayer.nickname.toUpperCase()}
                </h3>
              </div>

              <div className="space-y-4">
                {/* Presets */}
                <div>
                  <label className="block text-[11px] font-bold text-[#858585] uppercase mb-2">
                    Ban Duration Presets
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "3 Days", days: 3 },
                      { label: "7 Days", days: 7 },
                      { label: "14 Days", days: 14 },
                      { label: "30 Days", days: 30 },
                      { label: "60 Days", days: 60 },
                      { label: "Permanent", days: "permanent" },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setBanDurationDays(preset.days as any)}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                          banDurationDays === preset.days
                            ? "bg-red-900/60 border-red-500 text-white"
                            : "bg-[#050505] border-[#222222] text-[#858585] hover:text-white"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                    Reason for Disqualification *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rule 3.1 Violation / Toxic behavior"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-sm text-white focus:outline-none focus:border-white"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-[#222222] gap-3">
                  {banTargetPlayer.isDisqualified ? (
                    <button
                      type="button"
                      disabled={banSubmitting}
                      onClick={() => handleBanSubmit("UNBAN")}
                      className="px-4 py-2 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-lg text-xs font-bold uppercase hover:bg-emerald-900 transition-colors"
                    >
                      LIFT BAN (UNBAN)
                    </button>
                  ) : (
                    <div></div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBanModalOpen(false)}
                      className="px-4 py-2 bg-[#141414] border border-[#222222] rounded-lg text-xs font-semibold text-[#858585] hover:text-white transition-colors"
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      disabled={banSubmitting}
                      onClick={() => handleBanSubmit("DISQUALIFY")}
                      className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-extrabold uppercase transition-colors"
                    >
                      APPLY BAN
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
