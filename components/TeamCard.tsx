"use client";

import Link from "next/link";
import { getBanStatus } from "@/lib/disqualification";
import { AlertTriangle } from "lucide-react";

interface TeamCardProps {
  name: string;
  tag: string;
  slug: string;
  tier?: string;
  logoUrl: string;
  playerCount: number;
  isDisqualified?: boolean;
  disqualifiedUntil?: Date | string | null;
  disqualifyReason?: string | null;
}

export function TeamCard({
  name,
  tag,
  slug,
  logoUrl,
  playerCount,
  isDisqualified,
  disqualifiedUntil,
  disqualifyReason,
}: TeamCardProps) {
  const ban = getBanStatus({ isDisqualified: !!isDisqualified, disqualifiedUntil, disqualifyReason });

  return (
    <Link href={`/teams/${slug}`} className="block group">
      <div
        className={`bg-[#0A0A0A] border rounded-xl p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 flex flex-col items-center text-center relative overflow-hidden h-full ${
          ban.isBanned
            ? "border-red-900/60 hover:border-red-600 bg-red-950/10"
            : "border-[#222222] hover:border-[#444444]"
        }`}
      >
        {/* Disqualification Banner */}
        {ban.isBanned && (
          <div className="absolute top-2 left-2 right-2 bg-red-950/80 border border-red-800/80 rounded-md py-1 px-2 flex items-center justify-center gap-1 text-red-300 text-[10px] font-extrabold uppercase tracking-wider">
            <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
            <span className="truncate">ДИСКВАЛИФИКАЦИЯ ({ban.remainingText})</span>
          </div>
        )}

        {/* Team Logo Container */}
        <div className={`w-24 h-24 my-4 relative flex items-center justify-center bg-[#050505] border rounded-xl p-3 group-hover:border-[#333333] transition-colors ${ban.isBanned ? "border-red-900/40" : "border-[#1A1A1A]"}`}>
          <img
            src={logoUrl}
            alt={`${name} Logo`}
            className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {tag}
          </div>
        </div>

        {/* Team Name & Tag */}
        <h3 className="text-base font-bold text-white tracking-wide group-hover:text-white transition-colors line-clamp-1">
          {name}
        </h3>
        <span className="text-xs font-semibold text-[#858585] tracking-widest uppercase mt-0.5">
          {tag}
        </span>

        {/* Meta Footer Info */}
        <div className="mt-6 pt-4 border-t border-[#181818] w-full flex items-center justify-center gap-2 text-[11px] font-semibold tracking-wider text-[#858585]">
          <span>{playerCount} {playerCount === 1 ? "PLAYER" : "PLAYERS"}</span>
        </div>
      </div>
    </Link>
  );
}
