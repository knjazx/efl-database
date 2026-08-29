"use client";

import Link from "next/link";
import { getBanStatus } from "@/lib/disqualification";
import { AlertTriangle, Users, ChevronRight } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";
import { RegionBadge } from "@/components/RegionBadge";

export interface TeamCardProps {
  name: string;
  tag: string;
  slug: string;
  region?: string;
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
  region = "EU",
  logoUrl,
  playerCount,
  isDisqualified,
  disqualifiedUntil,
  disqualifyReason,
}: TeamCardProps) {
  const ban = getBanStatus({ isDisqualified: !!isDisqualified, disqualifiedUntil, disqualifyReason });
  const targetSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

  return (
    <Link href={`/teams/${targetSlug}`} className="block group h-full">
      <div
        className={`p-4 relative flex flex-col items-center text-center overflow-hidden h-full transition-all duration-300 ${
          ban.isBanned
            ? "border border-red-900/50 bg-red-950/10"
            : "border border-white/[0.04] bg-[#080808] hover:bg-[#0c0c0c]"
        }`}
      >
        {/* Disqualification Banner */}
        {ban.isBanned && (
          <div className="absolute top-0 left-0 right-0 bg-red-900/80 py-0.5 px-2 flex items-center justify-center gap-1 text-red-200 text-[9px] font-bold uppercase tracking-widest z-10">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">БАН ({ban.remainingText})</span>
          </div>
        )}

        {/* Team Logo Container - minimal */}
        <div className={`w-28 h-28 my-4 flex items-center justify-center overflow-hidden transition-all duration-300 ${ban.isBanned ? 'opacity-80 grayscale-[30%]' : ''}`}>
          <TeamLogo
            logoUrl={logoUrl}
            name={name}
            tag={tag}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Team Name & Tag */}
        <h3 className="text-base font-bold text-white tracking-tight transition-colors line-clamp-1 mt-1 uppercase group-hover:text-[#dddddd]">
          {name}
        </h3>
        <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#777777] uppercase">
            [{tag}]
          </span>
          <RegionBadge region={region} size="xs" />
        </div>

        {/* Meta Footer - Minimalist */}
        <div className="mt-5 w-full flex items-center justify-center gap-1.5 text-[10px] font-mono text-[#666666] uppercase tracking-widest">
          <Users className="w-3.5 h-3.5" />
          <span>{playerCount} ИГРОКОВ</span>
        </div>
      </div>
    </Link>
  );
}
