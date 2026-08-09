"use client";

import Link from "next/link";
import { getBanStatus } from "@/lib/disqualification";
import { AlertTriangle, Sparkles } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";

export interface TeamCardProps {
  name: string;
  tag: string;
  slug: string;
  tier?: string;
  logoUrl: string;
  playerCount: number;
  frameStyle?: string; // NONE, GOLD, SILVER, COPPER, NEON, CRIMSON
  isDisqualified?: boolean;
  disqualifiedUntil?: Date | string | null;
  disqualifyReason?: string | null;
}

export function getFrameStyles(frameStyle?: string) {
  switch (frameStyle?.toUpperCase()) {
    case "GOLD":
      return {
        cardClass:
          "border-amber-400/70 shadow-[0_0_25px_rgba(251,191,36,0.3)] hover:shadow-[0_0_35px_rgba(251,191,36,0.5)] hover:border-amber-300 bg-gradient-to-b from-[#120F05] to-[#0A0A0A]",
        logoBorder: "border-amber-400/50 group-hover:border-amber-300",
        badgeClass:
          "bg-amber-950/70 border border-amber-400/60 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]",
        label: "GOLD FRAME",
        iconColor: "text-amber-400",
      };
    case "SILVER":
      return {
        cardClass:
          "border-slate-300/70 shadow-[0_0_25px_rgba(226,232,240,0.25)] hover:shadow-[0_0_35px_rgba(226,232,240,0.45)] hover:border-white bg-gradient-to-b from-[#0F1215] to-[#0A0A0A]",
        logoBorder: "border-slate-300/50 group-hover:border-white",
        badgeClass:
          "bg-slate-900/70 border border-slate-300/60 text-slate-200 shadow-[0_0_10px_rgba(226,232,240,0.3)]",
        label: "SILVER FRAME",
        iconColor: "text-slate-200",
      };
    case "COPPER":
      return {
        cardClass:
          "border-amber-700/80 shadow-[0_0_25px_rgba(180,83,9,0.35)] hover:shadow-[0_0_35px_rgba(180,83,9,0.55)] hover:border-amber-600 bg-gradient-to-b from-[#140B05] to-[#0A0A0A]",
        logoBorder: "border-amber-700/60 group-hover:border-amber-500",
        badgeClass:
          "bg-amber-950/80 border border-amber-600/60 text-amber-400 shadow-[0_0_10px_rgba(180,83,9,0.3)]",
        label: "COPPER FRAME",
        iconColor: "text-amber-500",
      };
    case "NEON":
      return {
        cardClass:
          "border-cyan-400/70 shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] hover:border-cyan-300 bg-gradient-to-b from-[#051318] to-[#0A0A0A]",
        logoBorder: "border-cyan-400/50 group-hover:border-cyan-300",
        badgeClass:
          "bg-cyan-950/70 border border-cyan-400/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]",
        label: "NEON FRAME",
        iconColor: "text-cyan-400",
      };
    case "CRIMSON":
      return {
        cardClass:
          "border-rose-500/70 shadow-[0_0_25px_rgba(244,63,94,0.3)] hover:shadow-[0_0_35px_rgba(244,63,94,0.5)] hover:border-rose-400 bg-gradient-to-b from-[#180509] to-[#0A0A0A]",
        logoBorder: "border-rose-500/50 group-hover:border-rose-400",
        badgeClass:
          "bg-rose-950/70 border border-rose-500/60 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]",
        label: "CRIMSON FRAME",
        iconColor: "text-rose-400",
      };
    default:
      return {
        cardClass: "border-[#222222] hover:border-[#444444] bg-[#0A0A0A]",
        logoBorder: "border-[#222222] group-hover:border-white",
        badgeClass: "",
        label: "",
        iconColor: "",
      };
  }
}

export function TeamCard({
  name,
  tag,
  slug,
  tier = "TIER 1",
  logoUrl,
  playerCount,
  frameStyle = "NONE",
  isDisqualified,
  disqualifiedUntil,
  disqualifyReason,
}: TeamCardProps) {
  const ban = getBanStatus({ isDisqualified: !!isDisqualified, disqualifiedUntil, disqualifyReason });
  const frame = getFrameStyles(frameStyle);
  const targetSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  const normalizedTier = tier.toUpperCase();

  return (
    <Link href={`/teams/${targetSlug}`} className="block group">
      <div
        className={`rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col items-center text-center relative overflow-hidden h-full border ${
          ban.isBanned
            ? "border-red-900/60 hover:border-red-600 bg-red-950/10"
            : frame.cardClass
        }`}
      >
        {/* Frame Badge Indicator top right if special frame */}
        {!ban.isBanned && frame.label && (
          <div className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${frame.badgeClass}`}>
            <Sparkles className={`w-3 h-3 ${frame.iconColor}`} />
            <span>{frame.label.split(" ")[0]}</span>
          </div>
        )}

        {/* Disqualification Banner */}
        {ban.isBanned && (
          <div className="absolute top-2 left-2 right-2 bg-red-950/80 border border-red-800/80 rounded-md py-1 px-2 flex items-center justify-center gap-1 text-red-300 text-[10px] font-extrabold uppercase tracking-wider z-10">
            <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
            <span className="truncate">ДИСКВАЛИФИКАЦИЯ ({ban.remainingText})</span>
          </div>
        )}

        {/* Team Logo Container */}
        <div className={`w-28 h-28 my-4 relative overflow-hidden rounded-xl bg-[#050505] border transition-all shadow-md ${
          ban.isBanned ? "border-red-900/40" : frame.logoBorder
        }`}>
          <TeamLogo logoUrl={logoUrl} name={name} tag={tag} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>

        {/* Team Name & Tag */}
        <h3 className="text-base font-bold text-white tracking-wide group-hover:text-white transition-colors line-clamp-1">
          {name}
        </h3>
        <span className="text-xs font-semibold text-[#858585] tracking-widest uppercase mt-0.5">
          {tag}
        </span>

        {/* Meta Footer Info */}
        <div className="mt-6 pt-4 border-t border-[#181818] w-full flex items-center justify-between gap-2 text-[10px] font-bold tracking-wider">
          <span
            className={`px-2 py-0.5 rounded border uppercase text-[9px] ${
              normalizedTier.includes("1")
                ? "bg-amber-950/40 border-amber-500/50 text-amber-300"
                : normalizedTier.includes("2")
                ? "bg-purple-950/40 border-purple-500/50 text-purple-300"
                : "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
            }`}
          >
            {normalizedTier.includes("1") ? "TIER 1" : normalizedTier.includes("2") ? "TIER 2" : "TIER 3"}
          </span>
          <span className="text-[#858585]">{playerCount} {playerCount === 1 ? "PLAYER" : "PLAYERS"}</span>
        </div>
      </div>
    </Link>
  );
}
