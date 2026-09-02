"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, User, Shield, RefreshCw, Crown, AlertTriangle, ExternalLink } from "lucide-react";
import { getBanStatus } from "@/lib/disqualification";
import { formatRosterRole } from "@/lib/roles";
import { getCountry } from "@/lib/countries";
import { CountryFlag } from "@/components/CountryFlag";
import { PlayerSilhouette, PlayerThumbnailSilhouette } from "@/components/PlayerSilhouette";
import { SteamIcon, FaceitIcon, DiscordIcon } from "@/components/SocialIcons";

interface TeamRef {
  id: string;
  name: string;
  tag: string;
  slug: string;
  logoUrl: string;
  tier?: string;
  role: string;
}

interface PlayerProfile {
  id: string;
  nickname: string;
  slug: string;
  avatarUrl?: string;
  country?: string;
  defaultRole: string;
  steamUrl?: string;
  faceitUrl?: string;
  discordUrl?: string;
  isDisqualified?: boolean;
  disqualifiedUntil?: Date | string | null;
  disqualifyReason?: string | null;
  currentTeam: TeamRef | null;
  history: Array<{
    teamId: string;
    teamName: string;
    teamTag: string;
    teamSlug: string;
    teamLogoUrl: string;
    role: string;
    joinedAt: string;
    leftAt?: string;
  }>;
  faceitStats?: {
    elo: number;
    level: number;
  } | null;
}

export default function PlayerProfileClient({ player }: { player: PlayerProfile }) {
  const activeRole = player.currentTeam?.role || player.defaultRole || "";
  const parsedRole = formatRosterRole(activeRole);
  const playerBan = getBanStatus(player as any);
  const countryInfo = getCountry(player.country);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Back Navigation */}
      <Link href="/players" className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/[0.04] border border-white/[0.15] text-xs font-semibold text-[#858585] hover:text-white mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Назад к игрокам
      </Link>

      {/* Disqualification Banner */}
      {playerBan.isBanned && (
        <div className="bg-red-950/80 border border-red-800 p-6 mb-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-red-950/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-900/60 border border-red-700 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider text-red-300">
                ИГРОК ДИСКВАЛИФИЦИРОВАН
              </h3>
              <p className="text-xs text-red-200/80 mt-0.5">
                Причина: <span className="font-semibold text-white">{playerBan.reason}</span>
              </p>
            </div>
          </div>
          <div className="bg-red-900/40 border border-red-700/60 px-4 py-2 font-mono text-xs font-bold text-red-300">
            {playerBan.remainingText}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* LEFT COLUMN: Main Info Card */}
        <div className="w-full lg:w-[400px] flex-shrink-0">
          <div className={`bg-[#111111] border relative overflow-hidden ${playerBan.isBanned ? "border-red-900/60" : "border-white/10"}`}>

            <div className="p-8 relative z-10">
              {/* Avatar Container */}
              <div className="w-32 h-32 bg-[#151515] border border-white/10 overflow-hidden flex items-end justify-center mx-auto mb-6 shadow-2xl">
                {player.avatarUrl ? (
                  <img src={player.avatarUrl} alt={player.nickname} className={`w-full h-full object-cover ${playerBan.isBanned ? "grayscale opacity-80" : ""}`} />
                ) : (
                  <PlayerSilhouette className={`w-full h-full ${playerBan.isBanned ? "grayscale opacity-80" : ""}`} />
                )}
              </div>

              {/* Details */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <CountryFlag code={player.country} size="lg" />
                  <h1 className="text-3xl font-black text-white tracking-tight uppercase">
                    {player.nickname}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 mb-8 text-[10px] font-mono tracking-widest uppercase">
                  <span className="text-[#666666]">
                    {countryInfo.name} ({countryInfo.code})
                  </span>

                  {player.currentTeam && (
                    <>
                      <span className="text-[#333333]">&bull;</span>
                      <span
                        className={`font-bold ${
                          parsedRole.baseRole === "CORE"
                            ? "text-blue-400"
                            : parsedRole.baseRole === "SUBSTITUTE"
                            ? "text-purple-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {parsedRole.label}
                      </span>

                      {parsedRole.isCaptain && (
                        <>
                          <span className="text-[#333333]">&bull;</span>
                          <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                            <Crown className="w-3 h-3" />
                            <span>ВЛАДЕЛЕЦ</span>
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* External Links */}
                <div className="flex flex-col gap-2 mb-8">
                  {player.steamUrl && (
                    <a href={player.steamUrl.startsWith('http') ? player.steamUrl : `https://steamcommunity.com/id/${player.steamUrl}`} target="_blank" rel="noreferrer" className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] hover:bg-white/[0.06] transition-colors border border-white/10 text-[#888888] hover:text-white text-[11px] font-mono uppercase tracking-widest group">
                      <div className="flex items-center gap-3"><SteamIcon className="w-4 h-4" /> Steam</div>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  )}
                  {player.faceitUrl && (
                    <a href={player.faceitUrl.startsWith('http') ? player.faceitUrl : `https://faceit.com/en/players/${player.faceitUrl}`} target="_blank" rel="noreferrer" className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] hover:bg-white/[0.06] transition-colors border border-white/10 text-[#888888] hover:text-[#ff5500] text-[11px] font-mono uppercase tracking-widest group">
                      <div className="flex items-center gap-3"><FaceitIcon className="w-4 h-4" /> Faceit</div>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  )}
                  {player.discordUrl && (
                    player.discordUrl.startsWith('http') ? (
                      <a href={player.discordUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] hover:bg-white/[0.06] transition-colors border border-white/10 text-[#888888] hover:text-[#5865F2] text-[11px] font-mono uppercase tracking-widest group">
                        <div className="flex items-center gap-3"><DiscordIcon className="w-4 h-4" /> Discord</div>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ) : (
                      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.02] border border-white/10 text-[#888888] text-[11px] font-mono uppercase tracking-widest">
                        <div className="flex items-center gap-3"><DiscordIcon className="w-4 h-4 text-[#5865F2]" /> {player.discordUrl}</div>
                      </div>
                    )
                  )}
                </div>

                {/* Bottom Stats Container */}
                <div className="border-t border-white/10 pt-6 flex flex-col gap-6 text-left">
                  {/* Current Team Status */}
                  <div>
                    <span className="text-[10px] font-mono text-[#555555] uppercase tracking-widest block mb-3">
                      ТЕКУЩАЯ КОМАНДА
                    </span>

                    {player.currentTeam ? (
                      <Link
                        href={`/teams/${player.currentTeam.slug}`}
                        className="flex items-center gap-4 group p-3 bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="w-10 h-10 flex items-center justify-center p-1">
                          <img src={player.currentTeam.logoUrl} alt={player.currentTeam.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="text-left flex-1">
                          <span className="text-base font-bold text-white group-hover:text-[#dddddd] block leading-none transition-colors uppercase">
                            {player.currentTeam.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#666666] tracking-widest uppercase mt-1 block">
                            [{player.currentTeam.tag}]
                          </span>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-[#444] rotate-180 group-hover:text-white transition-colors" />
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/10 text-white font-bold text-sm uppercase tracking-widest">
                        <Shield className="w-5 h-5 text-[#555555]" />
                        <span>FREE AGENT</span>
                      </div>
                    )}
                  </div>

                  {/* FACEIT Stats */}
                  {player.faceitStats && (
                    <div className="pt-6 border-t border-white/10">
                      <span className="text-[10px] font-mono text-[#8E95A5] uppercase tracking-widest block mb-3">
                        FACEIT CS2
                      </span>
                      <div className="flex items-center gap-4 bg-[#111111] border border-[#222222] p-4">
                        <img 
                          src={`/faceit/level_${player.faceitStats.level}.png`} 
                          alt={`Level ${player.faceitStats.level}`}
                          className="w-12 h-12 object-contain drop-shadow-md" 
                        />
                        <div className="text-left">
                          <span className="text-xl font-black text-white block leading-none uppercase tracking-wider">
                            {player.faceitStats.elo} <span className="text-[#666] text-sm">ELO</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: History & Details */}
        <div className="flex-1 space-y-8">
          <div className="bg-[#111111] border border-white/10 p-8 shadow-xl">
            <h2 className="text-lg font-black text-white uppercase tracking-wider mb-6 flex items-center gap-3">
              <span className="w-3 h-3 bg-purple-500 inline-block shadow-sm" />
              Карьера
            </h2>
            
            {player.history.length > 0 ? (
              <div className="relative border-l-2 border-white/10 ml-3 space-y-6">
                {player.history.map((hist, idx) => {
                  const role = formatRosterRole(hist.role);
                  return (
                    <div key={`${hist.teamId}-${hist.joinedAt}-${idx}`} className="relative pl-6">
                      <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#333]" />
                      
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <Link href={`/teams/${hist.teamSlug}`} className="w-10 h-10 bg-[#151515] border border-white/10 p-1 flex-shrink-0 hover:border-purple-500/50 transition-colors">
                            <img src={hist.teamLogoUrl} alt={hist.teamName} className="w-full h-full object-contain" />
                          </Link>
                          <div>
                            <Link href={`/teams/${hist.teamSlug}`} className="text-base font-black text-white hover:text-purple-400 transition-colors uppercase">
                              {hist.teamName}
                            </Link>
                            <span className="text-xs text-[#8E95A5] block mt-0.5 font-mono uppercase">
                              {role.label}
                            </span>
                          </div>
                        </div>
                        <div className="text-[10px] font-mono font-bold text-[#666] uppercase bg-white/[0.02] border border-white/10 px-2.5 py-1">
                          {new Date(hist.joinedAt).toLocaleDateString("ru-RU")} — {hist.leftAt ? new Date(hist.leftAt).toLocaleDateString("ru-RU") : "Н.В."}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#555] font-mono">История команд пуста.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}