"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Plus, Edit, Trash2, User, Upload, X, RefreshCw, ExternalLink, Check, Crown } from "lucide-react";
import Link from "next/link";

interface PlayerItem {
  id: string;
  nickname: string;
  slug: string;
  avatarUrl?: string;
  defaultRole: string;
  steamUrl?: string;
  faceitUrl?: string;
  discordUrl?: string;
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerItem | null>(null);

  // Form Inputs
  const [nickname, setNickname] = useState("");
  const [isCaptain, setIsCaptain] = useState(false);
  const [steamUrl, setSteamUrl] = useState("");
  const [faceitUrl, setFaceitUrl] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchPlayers = async () => {
    setLoading(true);
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
    setAvatarFile(null);
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
    setAvatarFile(null);
    setFormError("");
    setIsModalOpen(true);
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

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const url = editingPlayer ? `/api/players/${editingPlayer.slug}` : "/api/players";
      const method = editingPlayer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setIsModalOpen(false);
        fetchPlayers();
      } else {
        setFormError(data.error || "Operation failed");
      }
    } catch (err) {
      setFormError("Network request failed");
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
              Create players, manage avatars, Captain status, Steam & FACEIT URLs.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-black font-extrabold text-xs tracking-wider uppercase rounded-xl hover:bg-neutral-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>ADD PLAYER</span>
          </button>
        </div>

        {/* Players Table */}
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[#858585] flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xs font-semibold uppercase">Loading players database...</span>
            </div>
          ) : players.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050505] border-b border-[#222222] text-[#858585] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">PLAYER</th>
                    <th className="px-6 py-4">TEAM</th>
                    <th className="px-6 py-4">STATUS</th>
                    <th className="px-6 py-4">LINKS</th>
                    <th className="px-6 py-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {players.map((p) => {
                    const activeRole = p.currentTeam?.role || p.defaultRole || "";
                    const playerIsCaptain = activeRole.toUpperCase() === "CAPTAIN";

                    return (
                      <tr key={p.id} className="hover:bg-[#0E0E0E] transition-colors">
                        {/* PLAYER NICKNAME & AVATAR */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#050505] border border-[#222222] overflow-hidden flex items-center justify-center flex-shrink-0">
                              {p.avatarUrl ? (
                                <img src={p.avatarUrl} alt={p.nickname} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-[#858585]" />
                              )}
                            </div>
                            <Link href={`/players/${p.slug}`} className="font-bold text-white hover:underline text-sm">
                              {p.nickname}
                            </Link>
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

                        {/* STATUS */}
                        <td className="px-6 py-4">
                          {playerIsCaptain ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/50 text-amber-400 font-bold uppercase text-[10px]">
                              <Crown className="w-3 h-3" />
                              <span>CAPTAIN</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded bg-[#141414] border border-[#222222] text-[#858585] text-[10px]">
                              Player
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
              No players registered in the database.
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
                {/* Nickname */}
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

                {/* Captain Checkbox */}
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

                {/* Conditional Discord Field for Captain */}
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
                    <p className="text-[10px] text-[#858585]">
                      Discord details visible to organizers and match lobbies.
                    </p>
                  </div>
                )}

                {/* Avatar Upload */}
                <div>
                  <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                    Avatar Image
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-[#141414] border border-[#222222] hover:border-white rounded-lg text-xs font-semibold text-white transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>Choose File</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setAvatarFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-[#858585] truncate">
                      {avatarFile ? avatarFile.name : editingPlayer ? "Keep current avatar" : "No file chosen"}
                    </span>
                  </div>
                </div>

                {/* Steam URL */}
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

                {/* FACEIT URL */}
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
      </div>
    </AdminLayout>
  );
}
