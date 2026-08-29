"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { ArrowLeft, Plus, Edit, UserMinus, User, X, RefreshCw, Check, Crown, Search, CheckSquare, Square } from "lucide-react";
import Link from "next/link";
import { formatRosterRole } from "@/lib/roles";
import { PlayerThumbnailSilhouette } from "@/components/PlayerSilhouette";

interface RosterMember {
  membershipId: string;
  id: string;
  nickname: string;
  slug: string;
  avatarUrl?: string;
  role: string;
  steamUrl?: string;
  faceitUrl?: string;
  discordUrl?: string;
  joinedAt: string;
  leftAt?: string;
}

interface TeamData {
  id: string;
  name: string;
  tag: string;
  slug: string;
  logoUrl: string;
  contactDiscord?: string;
  contactTelegram?: string;
  description?: string;
  activeRoster: RosterMember[];
  formerPlayers: RosterMember[];
}

interface FreePlayer {
  id: string;
  nickname: string;
  defaultRole: string;
  currentTeam?: {
    id: string;
    name: string;
  } | null;
}

export default function AdminRosterManagementPage({ params }: { params: { id: string } }) {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [allPlayers, setAllPlayers] = useState<FreePlayer[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingMembership, setEditingMembership] = useState<RosterMember | null>(null);

  // Form states
  const [addMode, setAddMode] = useState<"existing" | "new">("existing");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [baseRole, setBaseRole] = useState<"CORE" | "SUBSTITUTE" | "COACH">("CORE");
  const [isCaptain, setIsCaptain] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchTeamAndPlayers = async () => {
    setLoading(true);
    try {
      const [teamRes, playersRes] = await Promise.all([
        fetch(`/api/teams/${params.id}`).then((r) => r.json()),
        fetch("/api/players").then((r) => r.json()),
      ]);

      if (teamRes.success) {
        setTeam(teamRes.team);
      }
      if (playersRes.success) {
        setAllPlayers(playersRes.players);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamAndPlayers();
  }, [params.id]);

  // Filter to show ONLY Free Agents (players with no current team)
  const availablePlayers = allPlayers.filter((p) => !p.currentTeam);

  // Filter available players by search query
  const filteredAvailablePlayers = availablePlayers.filter((p) =>
    p.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPlayerIds.length === filteredAvailablePlayers.length) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(filteredAvailablePlayers.map((p) => p.id));
    }
  };

  const constructRoleString = () => {
    if (isCaptain) {
      return `OWNER:${baseRole}`;
    }
    return baseRole;
  };

  const handleAddPlayerToRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    setSubmitting(true);

    try {
      const assignedRole = constructRoleString();

      // If creating a brand new single player
      if (addMode === "new") {
        if (!newNickname.trim()) {
          setModalError("Please enter player nickname");
          setSubmitting(false);
          return;
        }

        const formData = new FormData();
        formData.append("nickname", newNickname);
        formData.append("role", assignedRole);

        const pRes = await fetch("/api/players", {
          method: "POST",
          body: formData,
        });
        const pData = await pRes.json();

        if (!pData.success) {
          setModalError(pData.error || "Failed to create player");
          setSubmitting(false);
          return;
        }

        const res = await fetch("/api/rosters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ADD_PLAYER",
            teamId: team?.id,
            playerId: pData.player.id,
            role: assignedRole,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setIsAddModalOpen(false);
          fetchTeamAndPlayers();
        } else {
          setModalError(data.error || "Failed to add player to roster");
        }
      } else {
        // Multi-select existing players batch add
        if (selectedPlayerIds.length === 0) {
          setModalError("Select at least one player to add");
          setSubmitting(false);
          return;
        }

        const res = await fetch("/api/rosters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ADD_PLAYER",
            teamId: team?.id,
            playerIds: selectedPlayerIds,
            role: assignedRole,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setIsAddModalOpen(false);
          fetchTeamAndPlayers();
        } else {
          setModalError(data.error || "Failed to add players to roster");
        }
      }
    } catch (err) {
      setModalError("Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMembership) return;
    setSubmitting(true);

    try {
      const assignedRole = constructRoleString();

      const res = await fetch("/api/rosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_ROLE",
          membershipId: editingMembership.membershipId,
          role: assignedRole,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsRoleModalOpen(false);
        fetchTeamAndPlayers();
      } else {
        alert(data.error || "Failed to update role");
      }
    } catch (err) {
      alert("Failed to update role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveFromRoster = async (membershipId: string, nickname: string) => {
    if (!confirm(`Remove ${nickname} from ${team?.name} active roster? Player will be moved to Former Players.`)) {
      return;
    }

    try {
      const res = await fetch("/api/rosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REMOVE_PLAYER",
          membershipId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchTeamAndPlayers();
      } else {
        alert(data.error || "Failed to remove player");
      }
    } catch (err) {
      alert("Failed to remove player");
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-20 text-center text-[#858585] flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-xs uppercase font-semibold">Loading team roster...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!team) {
    return (
      <AdminLayout>
        <div className="py-12 text-center">
          <p className="text-white font-bold mb-4">Team not found.</p>
          <Link href="/admin/teams" className="px-4 py-2 bg-white text-black font-bold text-xs rounded">
            Back to Teams
          </Link>
        </div>
      </AdminLayout>
    );
  }

  // Categorize roster members
  const coreMembers = team.activeRoster.filter((m) => formatRosterRole(m.role).baseRole === "CORE");
  const subMembers = team.activeRoster.filter((m) => formatRosterRole(m.role).baseRole === "SUBSTITUTE");
  const coachMembers = team.activeRoster.filter((m) => formatRosterRole(m.role).baseRole === "COACH");

  const renderAdminSectionTable = (title: string, colorDotClass: string, members: RosterMember[]) => (
    <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#222222] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${colorDotClass}`}></span>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            {title} ({members.length})
          </h3>
        </div>
      </div>

      {members.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#050505] border-b border-[#222222] text-[#858585] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">PLAYER</th>
                <th className="px-6 py-4">ROSTER ROLE</th>
                <th className="px-6 py-4">JOINED</th>
                <th className="px-6 py-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {members.map((m) => {
                const parsedRole = formatRosterRole(m.role);

                return (
                  <tr key={m.membershipId} className="hover:bg-[#0E0E0E] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#050505] border border-[#222222] overflow-hidden flex items-center justify-center flex-shrink-0">
                          {m.avatarUrl ? (
                            <img src={m.avatarUrl} alt={m.nickname} className="w-full h-full object-cover" />
                          ) : (
                            <PlayerThumbnailSilhouette className="w-full h-full" />
                          )}
                        </div>
                        <Link href={`/players/${m.slug}`} className="font-bold text-white hover:underline text-sm">
                          {m.nickname}
                        </Link>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* Base Role Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            parsedRole.baseRole === "CORE"
                              ? "bg-blue-950/40 border border-blue-500/50 text-blue-400"
                              : parsedRole.baseRole === "SUBSTITUTE"
                              ? "bg-purple-950/40 border border-purple-500/50 text-purple-400"
                              : "bg-emerald-950/40 border border-emerald-500/50 text-emerald-400"
                          }`}
                        >
                          {parsedRole.label}
                        </span>

                        {/* Owner Badge */}
                        {parsedRole.isCaptain && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/50 text-amber-400 font-bold uppercase text-[10px]">
                            <Crown className="w-3 h-3" />
                            <span>Владелец</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-mono text-[#858585]">
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingMembership(m);
                            const parsed = formatRosterRole(m.role);
                            setBaseRole(parsed.baseRole as any);
                            setIsCaptain(parsed.isCaptain);
                            setIsRoleModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded bg-[#141414] border border-[#222222] hover:border-white text-white text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Role / Status</span>
                        </button>
                        <button
                          onClick={() => handleRemoveFromRoster(m.membershipId, m.nickname)}
                          className="px-2.5 py-1.5 rounded bg-red-950/30 border border-red-900/50 hover:bg-red-900/50 text-red-400 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <UserMinus className="w-3 h-3" />
                          <span>Remove</span>
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
        <div className="p-8 text-center text-xs text-[#858585]">
          No players in this section.
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back Link */}
        <Link href="/admin/teams" className="inline-flex items-center gap-2 text-xs font-semibold text-[#858585] hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Teams List
        </Link>

        {/* Team Banner */}
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-[#050505] border border-[#222222] p-2 flex items-center justify-center">
              <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                {team.name}
              </h2>
              <div className="flex items-center gap-3 text-xs text-[#858585] uppercase tracking-widest font-mono mt-0.5">
                <span>TAG: {team.tag}</span>
                <span>|</span>
                <span>Discord: <span className="text-emerald-400 font-bold">{team.contactDiscord || "-"}</span></span>
                <span>|</span>
                <span>Telegram: <span className="text-blue-400 font-bold">{team.contactTelegram || "-"}</span></span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setAddMode("existing");
              setSelectedPlayerIds([]);
              setSearchQuery("");
              setNewNickname("");
              setBaseRole("CORE");
              setIsCaptain(false);
              setModalError("");
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-black font-extrabold text-xs tracking-wider uppercase rounded-xl hover:bg-neutral-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>ADD PLAYERS TO ROSTER</span>
          </button>
        </div>

        {/* 3 Categorized Roster Sections */}
        <div className="space-y-6">
          {renderAdminSectionTable("ОСНОВНОЙ СОСТАВ (CORE)", "bg-blue-500", coreMembers)}
          {renderAdminSectionTable("ЗАМЕНА (SUBSTITUTE)", "bg-purple-500", subMembers)}
          {renderAdminSectionTable("ТРЕНЕРСКИЙ ШТАБ (COACH)", "bg-emerald-500", coachMembers)}
        </div>

        {/* Former Players List */}
        {team.formerPlayers.length > 0 && (
          <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-[#222222] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#858585] uppercase tracking-wider">
                FORMER PLAYERS ({team.formerPlayers.length})
              </h3>
            </div>
            <div className="divide-y divide-[#1A1A1A]">
              {team.formerPlayers.map((m) => (
                <div key={m.membershipId} className="px-6 py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white">{m.nickname}</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#858585]">
                    {m.leftAt ? `Left: ${new Date(m.leftAt).toLocaleDateString()}` : "Former"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Add Player(s) to Roster */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0A0A0A] border border-[#222222] rounded-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-4 right-4 text-[#858585] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4 border-b border-[#222222] pb-3">
                ADD PLAYERS TO {team.name.toUpperCase()}
              </h3>

              {/* Mode Toggle */}
              <div className="flex items-center bg-[#050505] border border-[#222222] rounded-lg p-1 mb-4">
                <button
                  type="button"
                  onClick={() => setAddMode("existing")}
                  className={`flex-1 py-1.5 text-xs font-bold uppercase rounded ${
                    addMode === "existing" ? "bg-[#222222] text-white" : "text-[#858585]"
                  }`}
                >
                  Select Registered Players ({availablePlayers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode("new")}
                  className={`flex-1 py-1.5 text-xs font-bold uppercase rounded ${
                    addMode === "new" ? "bg-[#222222] text-white" : "text-[#858585]"
                  }`}
                >
                  Create New Player
                </button>
              </div>

              <form onSubmit={handleAddPlayerToRoster} className="space-y-4 flex-1 overflow-hidden flex flex-col">
                {addMode === "existing" ? (
                  <div className="flex-1 flex flex-col min-h-0 space-y-3">
                    {/* Search & Select All Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#858585]" />
                        <input
                          type="text"
                          placeholder="Search player nickname..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-[#050505] border border-[#222222] rounded-lg text-xs text-white focus:outline-none focus:border-white"
                        />
                      </div>

                      {filteredAvailablePlayers.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className="px-2.5 py-1.5 bg-[#141414] border border-[#222222] hover:border-white rounded-lg text-[11px] font-bold text-[#858585] hover:text-white transition-colors"
                        >
                          {selectedPlayerIds.length === filteredAvailablePlayers.length ? "Deselect All" : "Select All"}
                        </button>
                      )}
                    </div>

                    {/* Multi-Select Player Checkbox List */}
                    <div className="flex-1 overflow-y-auto bg-[#050505] border border-[#222222] rounded-xl p-2 space-y-1 min-h-[160px] max-h-[220px]">
                      {filteredAvailablePlayers.length > 0 ? (
                        filteredAvailablePlayers.map((p) => {
                          const isSelected = selectedPlayerIds.includes(p.id);

                          return (
                            <div
                              key={p.id}
                              onClick={() => togglePlayerSelection(p.id)}
                              className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all border ${
                                isSelected
                                  ? "bg-white/10 border-white text-white font-bold"
                                  : "border-transparent text-[#858585] hover:bg-[#101010] hover:text-white"
                              }`}
                            >
                              <span className="text-xs">{p.nickname}</span>
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-white" />
                              ) : (
                                <Square className="w-4 h-4 text-[#444444]" />
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center text-xs text-[#858585]">
                          {availablePlayers.length === 0
                            ? "Нет свободных игроков без команды (все игроки уже привязаны к командам)."
                            : "Игроки по вашему запросу не найдены."}
                        </div>
                      )}
                    </div>

                    {selectedPlayerIds.length > 0 && (
                      <p className="text-[11px] font-bold text-emerald-400">
                        Selected: {selectedPlayerIds.length} player(s)
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                      Player Nickname *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Player6"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-sm text-white focus:outline-none focus:border-white"
                    />
                  </div>
                )}

                {/* Roster Role Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                    Роль в составе для выбранных *
                  </label>
                  <select
                    value={baseRole}
                    onChange={(e) => setBaseRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-sm text-white focus:outline-none focus:border-white"
                  >
                    <option value="CORE">Игрок основы (Starting Roster)</option>
                    <option value="SUBSTITUTE">Замена (Substitute)</option>
                    <option value="COACH">Тренер (Coach)</option>
                  </select>
                </div>

                {/* Owner Checkbox (only for single player / new) */}
                {addMode === "new" || selectedPlayerIds.length === 1 ? (
                  <div className="p-3 bg-[#050505] border border-[#222222] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className={`w-4 h-4 ${isCaptain ? "text-amber-400" : "text-[#858585]"}`} />
                      <label htmlFor="rosterOwnerCheck" className="text-xs font-bold text-white cursor-pointer select-none">
                        Назначить владелецом (Team Owner)
                      </label>
                    </div>
                    <input
                      id="rosterOwnerCheck"
                      type="checkbox"
                      checked={isCaptain}
                      onChange={(e) => setIsCaptain(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 cursor-pointer"
                    />
                  </div>
                ) : null}

                {modalError && (
                  <p className="text-xs font-semibold text-red-400 bg-red-950/40 p-2 rounded text-center">
                    {modalError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222222]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
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
                    <span>ADD TO ROSTER</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Change Role / Owner status */}
        {isRoleModalOpen && editingMembership && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0A0A0A] border border-[#222222] rounded-2xl p-6 shadow-2xl relative">
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="absolute top-4 right-4 text-[#858585] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-black text-white uppercase tracking-wider mb-4 border-b border-[#222222] pb-3">
                EDIT ROLE FOR {editingMembership.nickname.toUpperCase()}
              </h3>

              <form onSubmit={handleUpdateRoleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                    Роль в составе *
                  </label>
                  <select
                    value={baseRole}
                    onChange={(e) => setBaseRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-sm text-white focus:outline-none focus:border-white"
                  >
                    <option value="CORE">Игрок основы (Starting Roster)</option>
                    <option value="SUBSTITUTE">Замена (Substitute)</option>
                    <option value="COACH">Тренер (Coach)</option>
                  </select>
                </div>

                <div className="p-3 bg-[#050505] border border-[#222222] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className={`w-4 h-4 ${isCaptain ? "text-amber-400" : "text-[#858585]"}`} />
                    <label htmlFor="editOwnerCheck" className="text-xs font-bold text-white cursor-pointer select-none">
                      Владелец команды (Team Owner)
                    </label>
                  </div>
                  <input
                    id="editOwnerCheck"
                    type="checkbox"
                    checked={isCaptain}
                    onChange={(e) => setIsCaptain(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222222]">
                  <button
                    type="button"
                    onClick={() => setIsRoleModalOpen(false)}
                    className="px-4 py-2 bg-[#141414] border border-[#222222] rounded-lg text-xs font-semibold text-[#858585] hover:text-white transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-white text-black rounded-lg text-xs font-extrabold uppercase hover:bg-neutral-200 transition-colors"
                  >
                    SAVE ROLE
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
