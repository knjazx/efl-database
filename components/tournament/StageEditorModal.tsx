"use client";

import React, { useState } from "react";
import { X, Plus, Layers, Settings2, Trophy } from "lucide-react";

interface Props {
  tournamentSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function StageEditorModal({ tournamentSlug, isOpen, onClose, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState("GROUP_STAGE");
  const [format, setFormat] = useState("BO1");
  const [groupCount, setGroupCount] = useState(4);
  const [teamsPerGroup, setTeamsPerGroup] = useState(4);
  const [advancingCount, setAdvancingCount] = useState(2);

  // Group Stage & Round Robin extra settings
  const [pointsWin, setPointsWin] = useState(3);
  const [pointsDraw, setPointsDraw] = useState(1);
  const [pointsLoss, setPointsLoss] = useState(0);

  // Swiss stage settings
  const [winsRequired, setWinsRequired] = useState(3);
  const [lossesRequired, setLossesRequired] = useState(3);
  const [maxRounds, setMaxRounds] = useState(5);
  const [fixedRounds, setFixedRounds] = useState(false);
  const [swissAdvancingCount, setSwissAdvancingCount] = useState(8);

  // Double Elimination
  const [grandFinalFormat, setGrandFinalFormat] = useState("BO3");

  // Custom
  const [customDescription, setCustomDescription] = useState("");

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      let settingsObj: any = {};

      if (type === "SWISS") {
        settingsObj = {
          swiss: {
            winsRequired: Number(winsRequired),
            lossesRequired: Number(lossesRequired),
            maxRounds: Number(maxRounds),
            fixedRounds: Boolean(fixedRounds),
            advancingCount: Number(swissAdvancingCount),
            eliminatedCount: Number(swissAdvancingCount),
            allowDraws: false,
            seedingMode: "INITIAL_SEED",
            playoffSeedingMode: "SWISS_STANDINGS",
          },
        };
      } else if (type === "GROUP_STAGE" || type === "ROUND_ROBIN") {
        settingsObj = {
          groupCount: type === "ROUND_ROBIN" ? 1 : Number(groupCount),
          teamsPerGroup: Number(teamsPerGroup),
          pointsWin: Number(pointsWin),
          pointsDraw: Number(pointsDraw),
          pointsLoss: Number(pointsLoss),
        };
      } else if (type === "DOUBLE_ELIMINATION") {
        settingsObj = { grandFinalFormat };
      } else if (type === "CUSTOM") {
        settingsObj = { customDescription };
      }

      const res = await fetch(`/api/tournaments/${tournamentSlug}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          type,
          format,
          advancingCount: type === "SWISS" ? Number(swissAdvancingCount) : Number(advancingCount),
          groupCount: type === "ROUND_ROBIN" ? 1 : Number(groupCount),
          teamsPerGroup: Number(teamsPerGroup),
          settings: settingsObj,
        }),
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
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#888] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col gap-1 border-b border-[#1A1A1A] pb-4 mt-2">
          <h3 className="text-sm font-bold uppercase text-white tracking-widest flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" /> + ADD STAGE
          </h3>
          <p className="text-xs text-[#888888]">Добавление новой стадии турнира</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-[#888]">Название стадии</label>
            <input
              type="text"
              placeholder="Stage 1: Swiss Stage"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#111] border border-[#222] rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-white/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-[#888]">Тип стадии</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="bg-[#111] border border-[#222] rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-white/40"
              >
                <option value="GROUP_STAGE">Group Stage</option>
                <option value="SWISS">Swiss System</option>
                <option value="SINGLE_ELIMINATION">Single Elimination</option>
                <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                <option value="ROUND_ROBIN">Round Robin</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-[#888]">Формат матчей</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="bg-[#111] border border-[#222] rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-white/40"
              >
                <option value="BO1">Best of 1 (BO1)</option>
                <option value="BO3">Best of 3 (BO3)</option>
                <option value="BO5">Best of 5 (BO5)</option>
              </select>
            </div>
          </div>

          {/* Group Stage & Round Robin Settings */}
          {(type === "GROUP_STAGE" || type === "ROUND_ROBIN") && (
            <div className="flex flex-col gap-3 bg-[#111] p-3 rounded-xl border border-[#222]">
              <div className="grid grid-cols-3 gap-3">
                {type === "GROUP_STAGE" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-[#888]">Групп</label>
                    <input
                      type="number"
                      min="1"
                      max="16"
                      value={groupCount}
                      onChange={(e) => setGroupCount(parseInt(e.target.value) || 1)}
                      className="bg-[#050505] border border-[#333] rounded p-1.5 text-xs font-mono text-white text-center"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-[#888]">Команд{type === "GROUP_STAGE" ? "/Группа" : ""}</label>
                  <input
                    type="number"
                    min="2"
                    max="32"
                    value={teamsPerGroup}
                    onChange={(e) => setTeamsPerGroup(parseInt(e.target.value) || 2)}
                    className="bg-[#050505] border border-[#333] rounded p-1.5 text-xs font-mono text-white text-center"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-[#888]">Top Advance</label>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={advancingCount}
                    onChange={(e) => setAdvancingCount(parseInt(e.target.value) || 1)}
                    className="bg-[#050505] border border-[#333] rounded p-1.5 text-xs font-mono text-emerald-400 font-bold text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#222]">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-[#888]">Points Win</label>
                  <input
                    type="number"
                    value={pointsWin}
                    onChange={(e) => setPointsWin(parseInt(e.target.value) || 0)}
                    className="bg-[#050505] border border-[#333] rounded p-1.5 text-xs font-mono text-emerald-400 text-center"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-[#888]" title="N/A in CS2">Points Draw</label>
                  <input
                    type="number"
                    value={pointsDraw}
                    disabled
                    onChange={(e) => setPointsDraw(parseInt(e.target.value) || 0)}
                    className="bg-[#050505] border border-[#333] rounded p-1.5 text-xs font-mono text-[#555] text-center cursor-not-allowed"
                    title="N/A in CS2"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-[#888]">Points Loss</label>
                  <input
                    type="number"
                    value={pointsLoss}
                    onChange={(e) => setPointsLoss(parseInt(e.target.value) || 0)}
                    className="bg-[#050505] border border-[#333] rounded p-1.5 text-xs font-mono text-rose-400 text-center"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Swiss System Settings */}
          {type === "SWISS" && (
            <div className="flex flex-col gap-3 bg-[#111] p-4 rounded-xl border border-amber-500/30">
              <div className="flex items-center gap-2 border-b border-[#222] pb-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                  SWISS FORMAT CONFIGURATION
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-[#888]">Wins to Advance</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={winsRequired}
                    onChange={(e) => setWinsRequired(parseInt(e.target.value) || 3)}
                    className="bg-[#050505] border border-[#333] rounded p-2 text-xs font-mono text-emerald-400 font-bold text-center"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-[#888]">Losses to Eliminate</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={lossesRequired}
                    onChange={(e) => setLossesRequired(parseInt(e.target.value) || 3)}
                    className="bg-[#050505] border border-[#333] rounded p-2 text-xs font-mono text-rose-400 font-bold text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-[#888]">Max Rounds</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxRounds}
                    onChange={(e) => setMaxRounds(parseInt(e.target.value) || 5)}
                    className="bg-[#050505] border border-[#333] rounded p-2 text-xs font-mono text-white text-center"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-[#888]">Teams Advancing</label>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={swissAdvancingCount}
                    onChange={(e) => setSwissAdvancingCount(parseInt(e.target.value) || 8)}
                    className="bg-[#050505] border border-[#333] rounded p-2 text-xs font-mono text-cyan-400 font-bold text-center"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Single Elimination Settings */}
          {type === "SINGLE_ELIMINATION" && (
            <div className="flex flex-col gap-3 bg-[#111] p-3 rounded-xl border border-[#222]">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-[#888]">Top Advance (Winner/s)</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={advancingCount}
                  onChange={(e) => setAdvancingCount(parseInt(e.target.value) || 1)}
                  className="bg-[#050505] border border-[#333] rounded p-1.5 text-xs font-mono text-emerald-400 font-bold text-center"
                />
              </div>
            </div>
          )}

          {/* Double Elimination Settings */}
          {type === "DOUBLE_ELIMINATION" && (
            <div className="flex flex-col gap-3 bg-[#111] p-3 rounded-xl border border-[#222]">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-[#888]">Grand Final Format</label>
                <select
                  value={grandFinalFormat}
                  onChange={(e) => setGrandFinalFormat(e.target.value)}
                  className="bg-[#050505] border border-[#333] rounded p-1.5 text-xs font-mono text-white text-center focus:outline-none"
                >
                  <option value="BO3">Best of 3 (BO3)</option>
                  <option value="BO5">Best of 5 (BO5)</option>
                </select>
              </div>
            </div>
          )}

          {/* Custom Settings */}
          {type === "CUSTOM" && (
            <div className="flex flex-col gap-3 bg-[#111] p-3 rounded-xl border border-[#222]">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-[#888]">Custom Description / Admin Notes</label>
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Enter details for the custom stage..."
                  className="bg-[#050505] border border-[#333] rounded p-2 text-xs font-mono text-white focus:outline-none min-h-[80px]"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1A1A1A]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#141414] text-xs font-mono text-[#888] hover:text-white"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-mono font-bold text-white shadow-lg shadow-emerald-600/20"
            >
              Создать Стадию
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
