"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Users, ChevronRight } from "lucide-react";

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

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

  const filteredTournaments = tournaments.filter((t) => {
    if (filter === "ACTIVE") return t.status === "ACTIVE";
    if (filter === "FINISHED") return t.status === "FINISHED";
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto w-full px-6 py-10 flex-1 flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222222] pb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#141414] border border-[#222222] text-white">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="text-2xl font-black tracking-wider uppercase">TOURNAMENTS</h1>
          </div>
          <p className="text-xs text-[#858585] tracking-wide font-mono">
            Официальные турниры и лиги Ascent League (ASCENT)
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1A1A1A] pb-3 text-xs font-mono">
        {["ALL", "ACTIVE", "FINISHED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === f
                ? "bg-[#141414] border border-[#333333] text-white font-bold"
                : "text-[#666666] hover:text-white"
            }`}
          >
            {f === "ALL" ? "ВСЕ ТУРНИРЫ" : f === "ACTIVE" ? "АКТИВНЫЕ" : "ЗАВЕРШЁННЫЕ"}
          </button>
        ))}
      </div>

      {/* Tournaments Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-[#666] animate-pulse">
          ЗАГРУЗКА ТУРНИРОВ...
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[#222] rounded-xl p-8 flex flex-col items-center gap-3">
          <Trophy className="w-10 h-10 text-[#333]" />
          <span className="text-xs font-mono text-[#888]">Турниры пока не созданы.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((t) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.slug}`}
              className="group bg-[#151515] border border-[#222222] hover:border-white/40 rounded-xl p-6 transition-all flex flex-col justify-between gap-6 shadow-xl relative overflow-hidden"
            >
              <div className="flex flex-col gap-4">
                {/* Status Badge & Preset */}
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span
                    className={`px-2.5 py-1 rounded font-bold uppercase ${
                      t.status === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : t.status === "FINISHED"
                        ? "bg-neutral-800 text-[#888] border border-[#333]"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {t.status}
                  </span>
                  <span className="text-[#666] font-mono uppercase tracking-wider">
                    {t.presetType?.replace("ASCENT_", "").replace("_", " ")}
                  </span>
                </div>

                {/* Title & Description */}
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-wider">
                    {t.name}
                  </h2>
                  {t.description && (
                    <p className="text-xs text-[#888888] line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Metadata Row */}
              <div className="flex items-center justify-between border-t border-[#1A1A1A] pt-4 text-xs font-mono text-[#888888]">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {t.participants?.length || 0} / {t.maxParticipants} Команд
                  </span>
                </div>
                <div className="flex items-center gap-1 text-white font-bold group-hover:translate-x-1 transition-transform">
                  <span>ОТКРЫТЬ</span>
                  <ChevronRight className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
