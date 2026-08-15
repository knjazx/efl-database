"use client";

import React, { useState } from "react";
import { X, Settings2 } from "lucide-react";

interface TournamentSettingsModalProps {
  tournament: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TournamentSettingsModal({ tournament, isOpen, onClose, onSuccess }: TournamentSettingsModalProps) {
  const [name, setName] = useState(tournament?.name || "");
  const [description, setDescription] = useState(tournament?.description || "");
  const [logoUrl, setLogoUrl] = useState(tournament?.logoUrl || "");
  
  const formatDate = (d: string | null) => d ? new Date(d).toISOString().split('T')[0] : "";
  const [startDate, setStartDate] = useState(formatDate(tournament?.startDate));
  const [endDate, setEndDate] = useState(formatDate(tournament?.endDate));
  
  const [status, setStatus] = useState(tournament?.status || "DRAFT");
  const [maxParticipants, setMaxParticipants] = useState(tournament?.maxParticipants || 16);
  const [pointsWin, setPointsWin] = useState(tournament?.pointsWin || 3);
  const [pointsLoss, setPointsLoss] = useState(tournament?.pointsLoss || 0);
  const [tiebreakers, setTiebreakers] = useState(tournament?.tiebreakers || "POINTS,DIFF,H2H,WINS");
  const [isPublished, setIsPublished] = useState(tournament?.isPublished ?? true);
  
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/tournaments/${tournament.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          logoUrl,
          startDate: startDate ? new Date(startDate).toISOString() : null,
          endDate: endDate ? new Date(endDate).toISOString() : null,
          status,
          maxParticipants: Number(maxParticipants),
          pointsWin: Number(pointsWin),
          pointsLoss: Number(pointsLoss),
          tiebreakers,
          isPublished
        })
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl w-full max-w-2xl p-6 shadow-2xl flex flex-col gap-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#888] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col gap-1 border-b border-[#1A1A1A] pb-4">
          <h3 className="text-sm font-bold uppercase text-white tracking-widest flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-emerald-400" /> TOURNAMENT SETTINGS
          </h3>
          <p className="text-xs text-[#888888]">Изменение основных настроек турнира</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-bold text-[#888] uppercase">Название турнира</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#111] border border-[#222] rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-white/40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-bold text-[#888] uppercase">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-[#111] border border-[#222] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-white/40 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-bold text-[#888] uppercase">Logo URL</label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="bg-[#111] border border-[#222] rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-white/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-[#888] uppercase">Дата начала</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#111] border border-[#222] rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-white/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-[#888] uppercase">Дата окончания</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#111] border border-[#222] rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-[#111] p-4 rounded-xl border border-[#222]">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-[#888] uppercase">Статус</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="bg-[#050505] border border-[#333] rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-white/40"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="REGISTRATION">REGISTRATION</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="FINISHED">FINISHED</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-[#888] uppercase">Макс. участников</label>
              <input
                type="number"
                min="2"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                className="bg-[#050505] border border-[#333] rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-white/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-[#888] uppercase">Очки за победу</label>
              <input
                type="number"
                value={pointsWin}
                onChange={(e) => setPointsWin(parseInt(e.target.value))}
                className="bg-[#050505] border border-[#333] rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-white/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold text-[#888] uppercase">Очки за поражение</label>
              <input
                type="number"
                value={pointsLoss}
                onChange={(e) => setPointsLoss(parseInt(e.target.value))}
                className="bg-[#050505] border border-[#333] rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-white/40"
              />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-mono font-bold text-[#888] uppercase">Тайбрейки</label>
              <input
                type="text"
                value={tiebreakers}
                onChange={(e) => setTiebreakers(e.target.value)}
                className="bg-[#050505] border border-[#333] rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-white/40"
                placeholder="POINTS,DIFF,H2H,WINS"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              <div className="w-9 h-5 bg-[#222] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-3 text-xs font-mono font-bold text-white uppercase">Опубликован</span>
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-[#1A1A1A]">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              СОХРАНИТЬ ИЗМЕНЕНИЯ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
