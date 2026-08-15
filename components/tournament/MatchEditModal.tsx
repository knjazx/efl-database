"use client";

import React, { useState } from "react";
import { X, Upload, Link as LinkIcon, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  tournamentSlug: string;
  match: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MatchEditModal({ tournamentSlug, match, isOpen, onClose, onSuccess }: Props) {
  const [scoreA, setScoreA] = useState(match?.scoreA ?? 0);
  const [scoreB, setScoreB] = useState(match?.scoreB ?? 0);
  const [demoUrl, setDemoUrl] = useState(match?.demoUrl || "");
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !match) return null;

  const nameA = match.teamCustomNameA || match.teamA?.name || "Team A";
  const nameB = match.teamCustomNameB || match.teamB?.name || "Team B";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (demoFile) {
        const formData = new FormData();
        formData.append("scoreA", scoreA.toString());
        formData.append("scoreB", scoreB.toString());
        formData.append("demoUrl", demoUrl);
        formData.append("demoFile", demoFile);

        const res = await fetch(`/api/tournaments/${tournamentSlug}/matches/${match.id}`, {
          method: "PUT",
          body: formData,
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "Failed to save match score");
        } else {
          onSuccess();
          onClose();
        }
      } else {
        const res = await fetch(`/api/tournaments/${tournamentSlug}/matches/${match.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scoreA: Number(scoreA),
            scoreB: Number(scoreB),
            demoUrl: demoUrl.trim(),
            status: "FINISHED",
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "Failed to save match score");
        } else {
          onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to save match");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetMatch() {
    if (!confirm("Вы уверены, что хотите сбросить результат матча?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentSlug}/matches/${match.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESET" }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#888] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col gap-1 border-b border-[#1A1A1A] pb-4">
          <h3 className="text-sm font-bold uppercase text-white tracking-widest">
            Редактирование Результата Матча
          </h3>
          <p className="text-xs text-[#888888]">
            {nameA} vs {nameB} (BO{match.bestOf || 1})
          </p>
        </div>

        {error && (
          <div className="p-3 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Score Input Row */}
          <div className="grid grid-cols-2 gap-4 items-center bg-[#111111] p-4 rounded-xl border border-[#222]">
            <div className="flex flex-col gap-2 items-center">
              <span className="text-xs font-mono font-semibold text-white truncate max-w-[140px]">
                {nameA}
              </span>
              <input
                type="number"
                min="0"
                value={scoreA}
                onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                className="w-20 text-center text-xl font-bold font-mono bg-[#050505] border border-[#333] rounded-lg py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex flex-col gap-2 items-center">
              <span className="text-xs font-mono font-semibold text-white truncate max-w-[140px]">
                {nameB}
              </span>
              <input
                type="number"
                min="0"
                value={scoreB}
                onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                className="w-20 text-center text-xl font-bold font-mono bg-[#050505] border border-[#333] rounded-lg py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Existing Demo Parser Attachment */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-mono font-bold text-[#A0A0A0] uppercase tracking-wider flex items-center gap-2">
              <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ссылка на демку Cybershoke или файл .dem</span>
            </label>

            <input
              type="text"
              placeholder="https://cybershoke.net/ru/match/1234567..."
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              className="w-full bg-[#111111] border border-[#222] rounded-lg py-2.5 px-3 text-xs font-mono text-white placeholder-[#555] focus:outline-none focus:border-white/40"
            />

            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-[#141414] border border-[#333] hover:border-white/40 rounded-lg text-xs font-mono text-[#888] hover:text-white cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>{demoFile ? demoFile.name : "Загрузить файл демо (.dem, .zip, .bz2)"}</span>
                <input
                  type="file"
                  accept=".dem,.zip,.bz2"
                  className="hidden"
                  onChange={(e) => setDemoFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1A1A1A]">
            <button
              type="button"
              onClick={handleResetMatch}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-mono text-rose-400 hover:text-rose-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Сбросить матч
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[#141414] text-xs font-mono text-[#888] hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-mono font-bold text-white transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {loading ? "Сохранение..." : "Сохранить и обработать"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
