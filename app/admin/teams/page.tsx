"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Plus, Edit, Trash2, Upload, X, RefreshCw, Users, Check, AlertTriangle, ShieldCheck, ShieldAlert, FileText, Zap, Trophy, Search } from "lucide-react";
import Link from "next/link";
import { getBanStatus } from "@/lib/disqualification";
import { compressImage } from "@/lib/compressImage";
import { REGIONS, getRegionInfo } from "@/lib/countries";
import { RegionBadge } from "@/components/RegionBadge";

interface TeamItem {
  id: string;
  name: string;
  tag: string;
  slug: string;
  region?: string;
  tier?: string;
  logoUrl: string;
  description: string;
  frameStyle?: string;
  playerCount: number;
  isDisqualified?: boolean;
  disqualifiedUntil?: Date | string | null;
  disqualifyReason?: string | null;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTierFilter, setSelectedTierFilter] = useState("ALL");

  const filteredTeams = teams.filter((t) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      t.name.toLowerCase().includes(query) ||
      t.tag.toLowerCase().includes(query) ||
      (t.region && t.region.toLowerCase().includes(query)) ||
      (t.description && t.description.toLowerCase().includes(query));

    const matchesTier =
      selectedTierFilter === "ALL" ||
      (t.tier || "TIER 3").toUpperCase() === selectedTierFilter.toUpperCase();

    return matchesSearch && matchesTier;
  });

  // Bulk Import Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkRawText, setBulkRawText] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState("");

  // Edit/Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamItem | null>(null);

  // Ban Modal State
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [banTargetTeam, setBanTargetTeam] = useState<TeamItem | null>(null);
  const [banDurationDays, setBanDurationDays] = useState<number | "permanent">(7);
  const [banReason, setBanReason] = useState("");
  const [banSubmitting, setBanSubmitting] = useState(false);

  // Rankings & Stats Modal State
  const [isRankingsModalOpen, setIsRankingsModalOpen] = useState(false);
  const [rankingTeam, setRankingTeam] = useState<any | null>(null);
  const [rankingTier, setRankingTier] = useState("TIER 1");
  const [rankingPoints, setRankingPoints] = useState(0);
  const [rankingWins, setRankingWins] = useState(0);
  const [rankingLosses, setRankingLosses] = useState(0);
  const [rankingSubmitting, setRankingSubmitting] = useState(false);

  // Form Inputs
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [region, setRegion] = useState("EUROPE");
  const [tier, setTier] = useState("TIER 3");
  const [description, setDescription] = useState("");
  const [frameStyle, setFrameStyle] = useState("NONE");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      if (data.success) {
        setTeams(data.teams);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError("");
    setBulkSubmitting(true);

    try {
      const res = await fetch("/api/teams/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: bulkRawText }),
      });
      const data = await res.json();
      if (data.success) {
        setIsBulkModalOpen(false);
        setBulkRawText("");
        fetchTeams();
      } else {
        setBulkError(data.error || "Bulk import failed");
      }
    } catch (err) {
      setBulkError("Network request failed");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const openAddModal = () => {
    setEditingTeam(null);
    setName("");
    setTag("");
    setRegion("EUROPE");
    setTier("TIER 3");
    setDescription("");
    setFrameStyle("NONE");
    setLogoFile(null);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (team: TeamItem) => {
    setEditingTeam(team);
    setName(team.name);
    setTag(team.tag);
    setRegion(team.region || "EUROPE");
    setTier(team.tier || "TIER 3");
    setDescription(team.description || "");
    setFrameStyle(team.frameStyle || "NONE");
    setLogoFile(null);
    setFormError("");
    setIsModalOpen(true);
  };

  const openBanModal = (team: TeamItem) => {
    setBanTargetTeam(team);
    setBanDurationDays(7);
    setBanReason(team.disqualifyReason || "Нарушение регламента лиги");
    setIsBanModalOpen(true);
  };

  const handleBanSubmit = async (action: "DISQUALIFY" | "UNBAN") => {
    if (!banTargetTeam) return;
    setBanSubmitting(true);

    try {
      const res = await fetch("/api/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: banTargetTeam.id,
          action,
          durationDays: action === "DISQUALIFY" ? (banDurationDays === "permanent" ? null : banDurationDays) : null,
          reason: banReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsBanModalOpen(false);
        fetchTeams();
      } else {
        alert(data.error || "Failed to update ban status");
      }
    } catch (err) {
      alert("Failed to update ban status");
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
      formData.append("name", name);
      formData.append("tag", tag);
      formData.append("region", region);
      formData.append("tier", tier || "TIER 3");
      formData.append("description", description);
      formData.append("frameStyle", frameStyle);

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const url = editingTeam ? `/api/teams/${editingTeam.slug}` : "/api/teams";
      const method = editingTeam ? "PUT" : "POST";

      // Optimistically close modal instantly
      setIsModalOpen(false);

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setIsModalOpen(false);
        fetchTeams();
      } else {
        setFormError(data.error || "Operation failed");
      }
    } catch (err) {
      setFormError("Network request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async (slug: string, name: string) => {
    if (!confirm(`Are you sure you want to delete team "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teams/${slug}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchTeams();
      } else {
        alert(data.error || "Failed to delete team");
      }
    } catch (err) {
      alert("Failed to delete team");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222222] pb-4">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
              TEAM MANAGEMENT
            </h2>
            <p className="text-xs text-[#858585] mt-1">
              Add, edit details, replace logos, manage team rosters, and set disqualifications.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setBulkError("");
                setIsBulkModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#141414] border border-[#333333] hover:border-white text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition-colors"
            >
              <Zap className="w-4 h-4 text-yellow-400" />
              <span>МАССОВЫЙ ИМПОРТ</span>
            </button>

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-black font-extrabold text-xs tracking-wider uppercase rounded-xl hover:bg-neutral-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>ADD TEAM</span>
            </button>
          </div>
        </div>

        {/* Search & Tier Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0A0A0A] border border-[#222222] p-4 rounded-xl">
          {/* Search Input */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск команды по названию или тегу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-[#141414] border border-[#222222] rounded-xl text-xs text-white placeholder-[#666666] focus:outline-none focus:border-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#858585] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tier Filter Buttons & Count */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs font-mono text-[#858585]">
              Найдено: <strong className="text-white">{filteredTeams.length}</strong> из {teams.length}
            </span>

            <div className="flex items-center gap-1 bg-[#141414] border border-[#222222] p-1 rounded-xl">
              {["ALL", "TIER 1", "TIER 2", "TIER 3"].map((tFilter) => (
                <button
                  key={tFilter}
                  onClick={() => setSelectedTierFilter(tFilter)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono tracking-wider transition-colors ${
                    selectedTierFilter === tFilter
                      ? "bg-white text-black shadow-sm"
                      : "text-[#858585] hover:text-white"
                  }`}
                >
                  {tFilter === "ALL" ? "ВСЕ" : tFilter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Teams Table */}
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[#858585] flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xs font-semibold uppercase">Loading teams database...</span>
            </div>
          ) : filteredTeams.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050505] border-b border-[#222222] text-[#858585] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">TEAM</th>
                    <th className="px-6 py-4">TAG</th>
                    <th className="px-6 py-4">REGION</th>
                    <th className="px-6 py-4">STATUS</th>
                    <th className="px-6 py-4">PLAYERS</th>
                    <th className="px-6 py-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {filteredTeams.map((t) => {
                    const ban = getBanStatus(t);
                    const reg = getRegionInfo(t.region);

                    return (
                      <tr key={t.id} className="hover:bg-[#0E0E0E] transition-colors">
                        {/* TEAM NAME & LOGO */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#050505] border border-[#222222] overflow-hidden flex items-center justify-center flex-shrink-0">
                              <img src={t.logoUrl} alt={t.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <Link href={`/teams/${t.slug}`} className="font-bold text-white hover:underline text-sm block">
                                {t.name}
                              </Link>
                            </div>
                          </div>
                        </td>

                        {/* TAG */}
                        <td className="px-6 py-4 font-mono font-bold text-[#858585]">
                          {t.tag}
                        </td>

                        {/* REGION */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <RegionBadge region={t.region} size="sm" />
                            <span className="text-xs text-[#858585]">{reg.name}</span>
                          </div>
                        </td>

                        {/* STATUS */}
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

                        {/* PLAYERS */}
                        <td className="px-6 py-4">
                          <Link
                            href={`/admin/teams/${t.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#050505] border border-[#222222] hover:border-white font-bold text-white transition-colors"
                          >
                            <Users className="w-3 h-3 text-[#858585]" />
                            <span>{t.playerCount}</span>
                          </Link>
                        </td>

                        {/* ACTIONS */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openBanModal(t)}
                              className={`px-2.5 py-1.5 rounded border text-[11px] font-bold transition-colors flex items-center gap-1 ${
                                ban.isBanned
                                  ? "bg-red-950/40 border-red-800 text-red-300 hover:bg-red-900/60"
                                  : "bg-[#141414] border-[#222222] text-[#858585] hover:text-white hover:border-white"
                              }`}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>{ban.isBanned ? "Ban Active" : "Ban Status"}</span>
                            </button>
                            <Link
                              href={`/admin/teams/${t.id}`}
                              className="px-2.5 py-1.5 rounded bg-[#141414] border border-[#222222] hover:border-white text-white text-[11px] font-semibold transition-colors"
                            >
                              Roster
                            </Link>
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-1.5 rounded bg-[#141414] border border-[#222222] hover:border-white text-white transition-colors"
                              title="Edit Team"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTeam(t.slug, t.name)}
                              className="p-1.5 rounded bg-red-950/30 border border-red-900/50 hover:bg-red-900/50 text-red-400 transition-colors"
                              title="Delete Team"
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
              <p className="text-sm">No teams found matching search criteria.</p>
            </div>
          )}
        </div>

        {/* Modal: Create or Edit Team */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0A0A0A] border border-[#222222] rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-[#858585] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-black text-white uppercase tracking-wider mb-6 pb-3 border-b border-[#222222]">
                {editingTeam ? `EDIT TEAM: ${editingTeam.name}` : "CREATE NEW TEAM"}
              </h3>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Predators"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-sm text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                      Tag *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. APEX"
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-sm text-white focus:outline-none focus:border-white uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                      Регион команды *
                    </label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-sm text-white focus:outline-none focus:border-white font-medium"
                    >
                      {REGIONS.map((r) => (
                        <option key={r.code} value={r.code}>
                          [{r.tag}] {r.name} ({r.englishName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                    Team Logo (PNG / JPG / SVG / WEBP)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-[#141414] border border-[#222222] hover:border-white rounded-lg text-xs font-semibold text-white transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>Choose File</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            const compressed = await compressImage(e.target.files[0]);
                            setLogoFile(compressed);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-[#858585] truncate">
                      {logoFile ? logoFile.name : editingTeam ? "Keep current logo" : "No file chosen"}
                    </span>
                  </div>
                </div>

                {/* Frame Style Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                    Frame Style (Рамка команды)
                  </label>
                  <select
                    value={frameStyle}
                    onChange={(e) => setFrameStyle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-sm text-white focus:outline-none focus:border-white font-medium"
                  >
                    <option value="NONE">Стандартная рамка (Обычный темный border)</option>
                    <option value="GOLD">🥇 Золотая рамка (Glowing Gold Frame)</option>
                    <option value="SILVER">🥈 Серебряная рамка (Glowing Silver Frame)</option>
                    <option value="COPPER">🥉 Медная рамка (Glowing Copper Frame)</option>
                    <option value="NEON">⚡ Неоновая рамка (Cyan Neon Frame)</option>
                    <option value="CRIMSON">🔴 Багровая рамка (Crimson Glow Frame)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description about the team..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-sm text-white focus:outline-none focus:border-white resize-none"
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

        {/* Modal: Manage Disqualification / Ban */}
        {isBanModalOpen && banTargetTeam && (
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
                  DISQUALIFICATION FOR {banTargetTeam.name.toUpperCase()}
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
                    placeholder="e.g. Rule 3.1 Violation / Cheating"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-sm text-white focus:outline-none focus:border-white"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-[#222222] gap-3">
                  {banTargetTeam.isDisqualified ? (
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
        {/* Modal: Bulk Import Teams */}
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0A0A0A] border border-[#222222] rounded-2xl p-6 shadow-2xl relative">
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="absolute top-4 right-4 text-[#858585] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-[#222222] pb-3 mb-4">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  МАССОВЫЙ ИМПОРТ КОМАНД (БЫСТРАЯ ВСТАВКА)
                </h3>
              </div>

              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <p className="text-xs text-[#858585]">
                  Вставьте список команд (по одной на строчку). Можно указывать: <br />
                  <code className="text-white">Название команды | TAG | T1 | GOLD</code>
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                    Список команд (по строке на команду)
                  </label>
                  <textarea
                    rows={10}
                    required
                    placeholder="Например:&#10;NaVi | NAVI | T1 | GOLD&#10;Cloud9 | C9 | T1 | SILVER&#10;Virtus.pro | VP | T1 | COPPER&#10;Team Spirit | TS | T1 | NEON&#10;FaZe Clan | FAZE | T1 | CRIMSON"
                    value={bulkRawText}
                    onChange={(e) => setBulkRawText(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050505] border border-[#222222] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-white resize-none"
                  />
                </div>

                {bulkError && (
                  <p className="text-xs font-semibold text-red-400 bg-red-950/40 p-2 rounded text-center">
                    {bulkError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222222]">
                  <button
                    type="button"
                    onClick={() => setIsBulkModalOpen(false)}
                    className="px-4 py-2 bg-[#141414] border border-[#222222] rounded-lg text-xs font-semibold text-[#858585] hover:text-white transition-colors"
                  >
                    ОТМЕНА
                  </button>
                  <button
                    type="submit"
                    disabled={bulkSubmitting}
                    className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-black rounded-lg text-xs font-extrabold tracking-wider uppercase transition-colors flex items-center gap-2"
                  >
                    {bulkSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    <span>ИМПОРТИРОВАТЬ ВСЕ</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT RANKINGS & STATS MODAL */}
        {isRankingsModalOpen && rankingTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0A0A0A] border border-[#222222] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-4">
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Редактирование рейтинга</h2>
                  <p className="text-xs text-amber-400 font-bold uppercase">{rankingTeam.name}</p>
                </div>
                <button onClick={() => setIsRankingsModalOpen(false)} className="text-[#858585] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setRankingSubmitting(true);
                  try {
                    const res = await fetch("/api/admin/rankings", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        teamId: rankingTeam.id,
                        tier: rankingTier,
                        points: rankingPoints,
                        wins: rankingWins,
                        losses: rankingLosses,
                        matchesPlayed: rankingWins + rankingLosses,
                      }),
                    });

                    const data = await res.json();
                    if (data.success) {
                      setIsRankingsModalOpen(false);
                      setRankingTeam(null);
                      fetchTeams();
                    } else {
                      alert(data.error || "Ошибка сохранения");
                    }
                  } catch (err) {
                    alert("Ошибка подключения к серверу");
                  } finally {
                    setRankingSubmitting(false);
                  }
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block text-[#858585] font-bold uppercase mb-1.5">Дивизион (Tier)</label>
                  <select
                    value={rankingTier}
                    onChange={(e) => setRankingTier(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#222222] rounded-xl text-white focus:outline-none focus:border-white"
                  >
                    <option value="TIER 1">TIER 1 (Высший дивизион)</option>
                    <option value="TIER 2">TIER 2 (Претенденты)</option>
                    <option value="TIER 3">TIER 3 (Контендеры)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#858585] font-bold uppercase mb-1.5">Очки рейтинга (PTS)</label>
                  <input
                    type="number"
                    min={0}
                    value={rankingPoints}
                    onChange={(e) => setRankingPoints(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#222222] rounded-xl text-white font-mono font-bold focus:outline-none focus:border-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#858585] font-bold uppercase mb-1.5">Победы (W)</label>
                    <input
                      type="number"
                      min={0}
                      value={rankingWins}
                      onChange={(e) => setRankingWins(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#222222] rounded-xl text-white font-mono font-bold focus:outline-none focus:border-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[#858585] font-bold uppercase mb-1.5">Поражения (L)</label>
                    <input
                      type="number"
                      min={0}
                      value={rankingLosses}
                      onChange={(e) => setRankingLosses(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#141414] border border-[#222222] rounded-xl text-white font-mono font-bold focus:outline-none focus:border-white"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#1F1F1F]">
                  <button
                    type="button"
                    onClick={() => setIsRankingsModalOpen(false)}
                    className="px-4 py-2 bg-[#141414] border border-[#222222] rounded-xl text-[#858585] hover:text-white font-bold uppercase"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={rankingSubmitting}
                    className="px-5 py-2 bg-amber-400 text-black font-extrabold uppercase rounded-xl hover:bg-amber-300 transition-colors shadow-lg"
                  >
                    {rankingSubmitting ? "Сохранение..." : "Сохранить"}
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
