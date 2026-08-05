"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Plus, Edit, Trash2, Shield, Upload, X, RefreshCw, Users, Check } from "lucide-react";
import Link from "next/link";

interface TeamItem {
  id: string;
  name: string;
  tag: string;
  slug: string;
  logoUrl: string;
  description: string;
  playerCount: number;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamItem | null>(null);

  // Form Inputs
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
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

  const openAddModal = () => {
    setEditingTeam(null);
    setName("");
    setTag("");
    setDescription("");
    setLogoFile(null);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (team: TeamItem) => {
    setEditingTeam(team);
    setName(team.name);
    setTag(team.tag);
    setDescription(team.description || "");
    setLogoFile(null);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("tag", tag);
      formData.append("tier", "T1"); // Default fallback if needed
      formData.append("description", description);

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const url = editingTeam ? `/api/teams/${editingTeam.slug}` : "/api/teams";
      const method = editingTeam ? "PUT" : "POST";

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
              Add, edit details, replace logos, and manage team rosters.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-black font-extrabold text-xs tracking-wider uppercase rounded-xl hover:bg-neutral-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>ADD TEAM</span>
          </button>
        </div>

        {/* Teams Table */}
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[#858585] flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xs font-semibold uppercase">Loading teams database...</span>
            </div>
          ) : teams.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050505] border-b border-[#222222] text-[#858585] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">TEAM</th>
                    <th className="px-6 py-4">TAG</th>
                    <th className="px-6 py-4">PLAYERS</th>
                    <th className="px-6 py-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {teams.map((t) => (
                    <tr key={t.id} className="hover:bg-[#0E0E0E] transition-colors">
                      {/* TEAM NAME & LOGO */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#050505] border border-[#222222] p-1 flex items-center justify-center flex-shrink-0">
                            <img src={t.logoUrl} alt={t.name} className="w-full h-full object-contain" />
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
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-[#858585]">
              No teams registered in the database.
            </div>
          )}
        </div>

        {/* Modal: Add / Edit Team */}
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
                {editingTeam ? "EDIT TEAM" : "ADD NEW TEAM"}
              </h3>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Team Name */}
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

                {/* Tag */}
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

                {/* Logo Upload */}
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
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setLogoFile(e.target.files[0]);
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

                {/* Description */}
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
      </div>
    </AdminLayout>
  );
}
