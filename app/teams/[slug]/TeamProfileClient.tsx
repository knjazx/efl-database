"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Download,
  ExternalLink,
  ArrowLeft,
  RefreshCw,
  Crown,
  AlertTriangle,
  Users,
  Globe,
  Shield,
  ShieldCheck,
  UserCheck,
  Clock,
  Info,
  Calendar,
  UserX,
} from "lucide-react";
import { getBanStatus } from "@/lib/disqualification";
import { formatRosterRole } from "@/lib/roles";
import { getCountry, getRegionInfo } from "@/lib/countries";
import { TeamLogo } from "@/components/TeamLogo";
import { CountryFlag } from "@/components/CountryFlag";
import { RegionBadge } from "@/components/RegionBadge";
import { PlayerSilhouette, PlayerThumbnailSilhouette } from "@/components/PlayerSilhouette";
import { SteamIcon, FaceitIcon, DiscordIcon } from "@/components/SocialIcons";

interface PlayerMember {
  membershipId: string;
  id: string;
  nickname: string;
  slug: string;
  avatarUrl?: string;
  country?: string;
  role: string;
  steamUrl?: string;
  faceitUrl?: string;
  discordUrl?: string;
  isDisqualified?: boolean;
  disqualifiedUntil?: Date | string | null;
  disqualifyReason?: string | null;
  joinedAt: string;
  leftAt?: string;
}

interface TeamDetail {
  id: string;
  name: string;
  tag: string;
  slug: string;
  region?: string;
  logoUrl: string;
  contactDiscord?: string;
  contactTelegram?: string;
  description?: string;
  isDisqualified?: boolean;
  disqualifiedUntil?: Date | string | null;
  disqualifyReason?: string | null;
  createdAt: string;
  activeRoster: PlayerMember[];
  formerPlayers: PlayerMember[];
}

function formatTimeInTeam(joinedAtStr?: string, leftAtStr?: string): string {
  if (!joinedAtStr) return "—";
  try {
    const start = new Date(joinedAtStr);
    const end = leftAtStr ? new Date(leftAtStr) : new Date();
    if (isNaN(start.getTime())) return "—";

    const diffMonths = Math.max(
      0,
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    );
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;

    if (years > 0 && months > 0) return `${years} г. ${months} мес.`;
    if (years > 0) return `${years} г.`;
    if (months > 0) return `${months} мес.`;

    const diffDays = Math.max(
      1,
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
    return `${diffDays} дн.`;
  } catch {
    return "—";
  }
}

export default function TeamProfileClient({ team, isAdmin }: { team: TeamDetail; isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<"roster" | "former" | "info">("roster");

  const handleDownloadLogo = () => {
    if (!team?.logoUrl) return;
    const link = document.createElement("a");
    link.href = team.logoUrl;
    link.download = `${team.tag.toLowerCase()}_logo${team.logoUrl.substring(
      team.logoUrl.lastIndexOf(".")
    )}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const teamBan = getBanStatus(team);
  const regInfo = getRegionInfo(team.region);

  // Group roster members
  const corePlayers = team.activeRoster.filter(
    (p) => formatRosterRole(p.role).baseRole === "CORE"
  );
  const substitutePlayers = team.activeRoster.filter(
    (p) => formatRosterRole(p.role).baseRole === "SUBSTITUTE"
  );
  const coachPlayers = team.activeRoster.filter(
    (p) => formatRosterRole(p.role).baseRole === "COACH"
  );
  const ownerPlayers = team.activeRoster.filter(
    (p) => formatRosterRole(p.role).baseRole === "OWNER"
  );
  const captainPlayer = team.activeRoster.find(
    (p) => formatRosterRole(p.role).isCaptain
  );
  const headCoach = coachPlayers[0] || null;

  // 5 Top showcase players
  const topShowcase = [...corePlayers, ...substitutePlayers].slice(0, 5);
  const showcaseSlots = [...topShowcase];
  while (showcaseSlots.length < 5) {
    showcaseSlots.push(null as any);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Breadcrumb Link */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/teams"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.15] text-xs font-semibold text-[#8E95A5] hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Все команды</span>
        </Link>

        {isAdmin && (
          <button
            onClick={handleDownloadLogo}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 text-xs font-bold text-blue-300 transition-colors uppercase tracking-wider"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать логотип (ADMIN)</span>
          </button>
        )}
      </div>

      {/* Redesigned Cyber Disqualification Banner if banned */}
      {teamBan.isBanned && (
        <div className="bg-gradient-to-r from-red-950/95 via-[#180608] to-red-950/95 border-2 border-red-600/80 rounded-2xl p-5 mb-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl shadow-red-950/60">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-red-900/60 border border-red-600/80 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-950">
              <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <h3 className="text-sm font-black uppercase tracking-wider text-red-300">
                  КОМАНДА ДИСКВАЛИФИЦИРОВАНА
                </h3>
              </div>
              <p className="text-xs text-red-200/90 mt-1">
                Причина: <span className="font-semibold text-white">{teamBan.reason}</span>
              </p>
            </div>
          </div>
          <div className="bg-red-900/50 border border-red-600/60 px-4 py-2 rounded-xl font-mono text-xs font-black text-red-200 shadow-inner">
            {teamBan.remainingText}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HLTV-STYLE TEAM PROFILE BANNER */}
      {/* ========================================================================= */}
      <div className="bg-[#111111] border border-white/10 shadow-2xl mb-12 flex flex-col">
        
        {/* TOP HALF: Player Showcase Gallery */}
        <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-white/10 bg-[#151515]">
          {showcaseSlots.map((player, idx) => {
            if (!player) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="aspect-[4/5] sm:aspect-[3/4] border-r border-white/[0.15] last:border-r-0 flex flex-col items-center justify-between p-3 text-center text-[#4B5563] relative overflow-hidden"
                >
                  <div className="w-full h-full flex items-end justify-center pb-6 opacity-5">
                    <PlayerSilhouette className="w-full h-full" />
                  </div>
                  <div className="absolute bottom-2.5 left-0 right-0 text-center">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#222222]">
                      СЛОТ {idx + 1}
                    </span>
                  </div>
                </div>
              );
            }

            const parsedRole = formatRosterRole(player.role);
            const pBan = getBanStatus(player);

            return (
              <Link
                key={player.id}
                href={`/players/${player.slug}`}
                className="group relative aspect-[4/5] sm:aspect-[3/4] border-r border-white/[0.15] last:border-r-0 hover:bg-[#1a1a1a] overflow-hidden flex flex-col justify-between transition-colors duration-300"
              >
                {/* Top Icons (Owner / Ban) */}
                <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
                  {parsedRole.isCaptain ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white text-black text-[8px] font-bold uppercase tracking-widest rounded-sm shadow-sm">
                      <Crown className="w-2.5 h-2.5" />
                      <span>IGL</span>
                    </span>
                  ) : <span />}

                  {pBan.isBanned && (
                    <span className="px-1.5 py-0.5 bg-red-900/90 text-red-100 text-[8px] font-bold uppercase tracking-widest rounded-sm shadow-sm">
                      BAN
                    </span>
                  )}
                </div>

                {/* Player Portrait Photo or Pro Silhouette */}
                <div className={`w-full h-full flex items-end justify-center overflow-hidden ${pBan.isBanned ? 'grayscale opacity-70' : ''}`}>
                  {player.avatarUrl ? (
                    <img
                      src={player.avatarUrl}
                      alt={player.nickname}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <PlayerSilhouette className="w-full h-full" />
                  )}
                </div>

                {/* Bottom Minimalist Nameplate */}
                <div className="absolute bottom-0 left-0 right-0 py-2.5 bg-gradient-to-t from-[#000000] via-[#050505]/90 to-transparent flex items-center justify-center gap-2 text-center z-20">
                  <CountryFlag code={player.country} size="xs" />
                  <span className="text-[13px] font-black text-white tracking-widest uppercase truncate drop-shadow-md">
                    {player.nickname}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* BOTTOM HALF: Team Overview & Stats */}
        <div className="relative overflow-hidden flex flex-col lg:flex-row p-6 sm:p-10 gap-10 lg:gap-16 items-start lg:items-center justify-between">
          
          {/* HUGE BACKGROUND LOGO */}
          <div className="absolute top-1/2 right-[-100px] -translate-y-1/2 w-[800px] h-[800px] opacity-[0.04] pointer-events-none select-none mix-blend-plus-lighter grayscale">
            <img src={team.logoUrl} alt="" className="w-full h-full object-contain drop-shadow-2xl" />
          </div>

          {/* Left: Team Logo & Identity */}
          <div className="relative z-10 flex items-center gap-8 w-full lg:w-[55%]">
            <div className="w-28 h-28 sm:w-40 sm:h-40 bg-[#121212] flex items-center justify-center flex-shrink-0 border-2 border-white/10 shadow-2xl overflow-hidden relative group">
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10" />
              <TeamLogo
                logoUrl={team.logoUrl}
                name={team.name}
                tag={team.tag}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <RegionBadge region={team.region} size="sm" showFullName={true} />
                <span className="text-[#333333] text-xs font-black">&bull;</span>
                <span className="text-[11px] font-mono font-black tracking-[0.2em] text-[#888888] uppercase bg-white/5 px-2.5 py-1 border border-white/5">
                  {team.tag}
                </span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase drop-shadow-2xl leading-none">
                {team.name}
              </h1>
              {team.description && (
                <p className="text-[13px] text-[#666666] mt-4 line-clamp-2 max-w-md font-medium leading-relaxed">
                  {team.description}
                </p>
              )}
            </div>
          </div>

            {/* Right: HLTV-Style Key-Value Table */}
            <div className="relative z-10 w-full lg:w-[40%] flex flex-col gap-1">
            
            {/* Region */}
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-[13px] font-bold text-[#888888]">Регион</span>
              <div className="flex items-center gap-2">
                <RegionBadge region={team.region} size="sm" />
                <span className="font-bold text-white text-[13px]">{regInfo.name}</span>
              </div>
            </div>

            {/* Coach */}
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-[13px] font-bold text-[#888888]">Главный тренер</span>
              {headCoach ? (
                <Link
                  href={`/players/${headCoach.slug}`}
                  className="font-bold text-white hover:text-[#aaaaaa] transition-colors flex items-center gap-2 text-[13px]"
                >
                  <CountryFlag code={headCoach.country} size="sm" />
                  <span>{headCoach.nickname}</span>
                </Link>
              ) : (
                <span className="text-[13px] font-bold text-[#555555]">Не назначен</span>
              )}
            </div>

            {/* Captain */}
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-[13px] font-bold text-[#888888]">КАПИТАН (IGL)</span>
              {captainPlayer ? (
                <Link
                  href={`/players/${captainPlayer.slug}`}
                  className="font-bold text-white hover:text-[#aaaaaa] transition-colors flex items-center gap-2 text-[13px]"
                >
                  <Crown className="w-3.5 h-3.5 text-[#555555]" />
                  <CountryFlag code={captainPlayer.country} size="sm" />
                  <span>{captainPlayer.nickname}</span>
                </Link>
              ) : (
                <span className="text-[13px] font-bold text-[#555555]">НЕ НАЗНАЧЕН</span>
              )}
            </div>

            {/* Owner / Contacts */}
            {(team.contactDiscord || team.contactTelegram) && (
              <div className="flex justify-between items-center py-3 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-transparent px-3 rounded-lg -ml-3">
                <span className="text-[13px] font-black text-amber-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  ВЛАДЕЛЕЦ
                </span>
                <div className="flex items-center gap-3">
                  {team.contactDiscord && (
                    <span className="text-[13px] font-bold text-white flex items-center gap-1.5">
                      <DiscordIcon className="w-4 h-4 text-amber-400" /> 
                      {team.contactDiscord}
                    </span>
                  )}
                  {team.contactTelegram && (
                    <span className="text-[13px] font-bold text-white flex items-center gap-1.5">
                      <span className="text-amber-400">TG:</span> {team.contactTelegram}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Core Starters Count */}
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-[13px] font-bold text-[#888888]">Основной состав</span>
              <span className="font-bold text-white text-[13px]">
                {corePlayers.length} / 5
              </span>
            </div>

            {/* Substitutes Count */}
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-[13px] font-bold text-[#888888]">Запасные</span>
              <span className="font-bold text-white text-[13px]">
                {substitutePlayers.length}
              </span>
            </div>

            {/* League Status */}
            <div className="flex justify-between items-center py-3 border-b border-transparent">
              <span className="text-[13px] font-bold text-[#888888]">Статус</span>
              {teamBan.isBanned ? (
                <span className="text-red-500 font-bold text-[13px]">Бан / Дисквалификация</span>
              ) : (
                <span className="text-white font-bold flex items-center gap-1.5 text-[13px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#555555]" />
                  Активна
                </span>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. HLTV-STYLE NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 mb-8 border-b border-white/[0.15] pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab("roster")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold tracking-wider uppercase transition-all relative whitespace-nowrap ${
            activeTab === "roster"
              ? "bg-white/[0.08] text-white border-t border-x border-white/10"
              : "text-[#8E95A5] hover:text-white hover:bg-white/[0.03]"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>СОСТАВ ({team.activeRoster.length})</span>
          {activeTab === "roster" && (
            <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-white" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("former")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold tracking-wider uppercase transition-all relative whitespace-nowrap ${
            activeTab === "former"
              ? "bg-white/[0.08] text-white border-t border-x border-white/10"
              : "text-[#8E95A5] hover:text-white hover:bg-white/[0.03]"
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>ИСТОРИЯ / БЫВШИЕ ({team.formerPlayers.length})</span>
          {activeTab === "former" && (
            <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-white" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("info")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold tracking-wider uppercase transition-all relative whitespace-nowrap ${
            activeTab === "info"
              ? "bg-white/[0.08] text-white border-t border-x border-white/10"
              : "text-[#8E95A5] hover:text-white hover:bg-white/[0.03]"
          }`}
        >
          <Info className="w-4 h-4" />
          <span>ИНФОРМАЦИЯ</span>
          {activeTab === "info" && (
            <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-white" />
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4. TAB CONTENTS */}
      {/* ========================================================================= */}

      {/* TAB 1: ROSTER (HLTV Players Table & Cards) */}
      {activeTab === "roster" && (
        <div className="space-y-8">
          {/* Main Roster Section */}
          <div className="bg-[#111111] border border-white/[0.15] overflow-hidden shadow-xl">
            <div className="p-5 sm:p-6 border-b border-white/[0.15] flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 bg-white inline-block shadow-sm" />
                  <span>Игроки {team.name}</span>
                </h3>
                <p className="text-xs text-[#8E95A5] mt-0.5">
                  Активные участники основного и запасного состава команды.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-white bg-white/10 border border-white/15 px-3 py-1">
                Roster {team.activeRoster.length}
              </span>
            </div>

            {team.activeRoster.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/10 text-[#8E95A5] font-mono font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-4 px-6">Игрок</th>
                      <th className="py-4 px-6">Статус</th>
                      <th className="py-4 px-6">Роль</th>
                      <th className="py-4 px-6">В команде</th>
                      <th className="py-4 px-6 text-right">Профили / Ссылки</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    
                    {/* Render Function for rows */}
                    {[
                      { title: "ОСНОВНОЙ СОСТАВ", players: corePlayers },
                      { title: "ЗАПАСНЫЕ ИГРОКИ", players: substitutePlayers },
                      { title: "ТРЕНЕРСКИЙ ШТАБ", players: coachPlayers },
                      { title: "РУКОВОДСТВО", players: ownerPlayers }
                    ].map(group => group.players.length > 0 && (
                      <React.Fragment key={group.title}>
                        <tr>
                          <td colSpan={5} className="py-3 px-6 bg-white/[0.03] text-[#aaaaaa] font-bold uppercase tracking-widest text-[10px] border-t border-white/10">
                            {group.title}
                          </td>
                        </tr>
                        {group.players.map(player => {
                          const parsedRole = formatRosterRole(player.role);
                          const pBan = getBanStatus(player);

                          return (
                            <tr
                              key={player.id}
                              className="hover:bg-white/[0.02] transition-colors group"
                            >
                              {/* Player Photo + Graphical Flag + Nickname */}
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3.5">
                                  <Link
                                    href={`/players/${player.slug}`}
                                    className="w-11 h-11 bg-[#11131a] border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:border-blue-500/40 transition-colors shadow-inner"
                                  >
                                    {player.avatarUrl ? (
                                      <img
                                        src={player.avatarUrl}
                                        alt={player.nickname}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <PlayerThumbnailSilhouette className="w-full h-full" />
                                    )}
                                  </Link>

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <CountryFlag code={player.country} size="xs" />
                                      <Link
                                        href={`/players/${player.slug}`}
                                        className="font-extrabold text-sm text-white group-hover:text-blue-400 transition-colors block"
                                      >
                                        {player.nickname}
                                      </Link>
                                      {parsedRole.isOwner && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase font-mono">
                                          <ShieldCheck className="w-3 h-3" />
                                          <span>ВЛАДЕЛЕЦ</span>
                                        </span>
                                      )}
                                      {parsedRole.isCaptain && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 border border-white/20 text-white text-[10px] font-bold uppercase font-mono">
                                          <Crown className="w-3 h-3" />
                                          <span>IGL</span>
                                        </span>
                                      )}
                                    </div>
                                    {pBan.isBanned && (
                                      <span className="text-[10px] text-red-400 font-bold uppercase block mt-0.5">
                                        БАН ({pBan.remainingText})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Status Badge */}
                              <td className="py-4 px-6">
                                <span
                                  className={`px-3 py-1 text-[10px] font-extrabold font-mono uppercase tracking-wider ${
                                    parsedRole.baseRole === "CORE"
                                      ? "bg-blue-600/15 border border-blue-500/30 text-blue-300"
                                      : parsedRole.baseRole === "SUBSTITUTE"
                                      ? "bg-purple-600/15 border border-purple-500/30 text-purple-300"
                                      : "bg-emerald-600/15 border border-emerald-500/30 text-emerald-300"
                                  }`}
                                >
                                  {parsedRole.baseRole === "CORE"
                                    ? "STARTER"
                                    : parsedRole.baseRole === "SUBSTITUTE"
                                    ? "SUBSTITUTE"
                                    : "COACH"}
                                </span>
                              </td>

                              {/* Role Title */}
                              <td className="py-4 px-6 font-mono text-xs text-[#9CA3AF]">
                                {parsedRole.label}
                              </td>

                              {/* Time in team */}
                              <td className="py-4 px-6 font-mono text-xs text-[#8E95A5]">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
                                  <span>{formatTimeInTeam(player.joinedAt)}</span>
                                </span>
                              </td>

                              {/* Links / Socials */}
                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {player.steamUrl && (
                                    <a
                                      href={player.steamUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.15] hover:border-white/30 text-[11px] font-semibold text-[#8E95A5] hover:text-white transition-colors inline-flex items-center gap-1.5"
                                    >
                                      <span>Steam</span>
                                      <SteamIcon className="w-3.5 h-3.5" />
                                    </a>
                                  )}

                                  {player.faceitUrl && (
                                    <a
                                      href={player.faceitUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.15] hover:border-white/30 text-[11px] font-semibold text-[#8E95A5] hover:text-[#ff5500] transition-colors inline-flex items-center gap-1.5"
                                    >
                                      <span>FACEIT</span>
                                      <FaceitIcon className="w-3.5 h-3.5" />
                                    </a>
                                  )}

                                  {parsedRole.isCaptain && player.discordUrl && (
                                    <a
                                      href={
                                        player.discordUrl.startsWith("http")
                                          ? player.discordUrl
                                          : `https://discord.com/users/${player.discordUrl}`
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/30 hover:border-indigo-400 text-[11px] font-semibold text-indigo-300 hover:text-white transition-colors inline-flex items-center gap-1.5"
                                      title={`Discord: ${player.discordUrl}`}
                                    >
                                      <span>Discord</span>
                                      <DiscordIcon className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-[#8E95A5]">
                В ростере команды пока нет игроков.
              </div>
            )}
          </div>
        </div>
      )}


      {/* TAB 3: FORMER PLAYERS */}
      {activeTab === "former" && (
        <div className="bg-[#111111] border border-white/[0.15] p-6 shadow-xl">
          <div className="mb-6 pb-4 border-b border-white/[0.15] flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-purple-500 inline-block shadow-sm" />
                <span>История состава / Бывшие участники</span>
              </h3>
              <p className="text-xs text-[#8E95A5] mt-0.5">
                Игроки, ранее выступавшие за организацию {team.name}.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1">
              History {team.formerPlayers.length}
            </span>
          </div>

          {team.formerPlayers && team.formerPlayers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {team.formerPlayers.map((player) => {
                const pBan = getBanStatus(player);
                const parsedRole = formatRosterRole(player.role);

                return (
                  <div
                    key={player.id}
                    className="p-4 bg-[#151515] border border-white/[0.15] hover:border-purple-500/40 transition-colors flex flex-col justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/players/${player.slug}`}
                        className="w-12 h-12 bg-[#151515] border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:border-purple-400 transition-colors"
                      >
                        {player.avatarUrl ? (
                          <img
                            src={player.avatarUrl}
                            alt={player.nickname}
                            className={`w-full h-full object-cover ${
                              pBan.isBanned ? "grayscale opacity-70" : ""
                            }`}
                          />
                        ) : (
                          <PlayerThumbnailSilhouette className="w-full h-full" />
                        )}
                      </Link>

                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <CountryFlag code={player.country} size="xs" />
                          <Link
                            href={`/players/${player.slug}`}
                            className="font-bold text-sm text-white truncate group-hover:text-purple-400 transition-colors block"
                          >
                            {player.nickname}
                          </Link>
                        </div>
                        <span className="text-[10px] font-mono text-[#8E95A5] uppercase tracking-wider mt-0.5 block truncate">
                          {parsedRole.label}
                        </span>
                        {pBan.isBanned && (
                          <span className="text-[9px] text-red-500 font-bold uppercase tracking-widest block mt-0.5">
                            БАН ({pBan.remainingText})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-[#8E95A5] flex flex-col gap-1 font-mono uppercase tracking-widest">
                      <div className="flex justify-between items-center">
                        <span>ПРИСОЕДИНИЛСЯ:</span>
                        <span className="text-white">
                          {new Date(player.joinedAt).toLocaleDateString("ru-RU", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>ПОКИНУЛ:</span>
                        <span className="text-white">
                          {player.leftAt
                            ? new Date(player.leftAt).toLocaleDateString("ru-RU", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                              })
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-[#8E95A5]">
              В истории команды пока нет бывших участников.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: INFO */}
      {activeTab === "info" && (
        <div className="bg-[#111111] border border-white/[0.15] p-8 shadow-xl space-y-6">
          <div className="border-b border-white/[0.15] pb-4">
            <h3 className="text-base font-black text-white uppercase tracking-wider">
              ОБ ОРГАНИЗАЦИИ {team.name.toUpperCase()}
            </h3>
            <p className="text-xs text-[#8E95A5] mt-1">
              Регистрационные данные в базе данных Ascent League.
            </p>
          </div>

          <div className="space-y-4 text-sm">
            <div className="p-4 bg-[#151515] border border-white/10">
              <span className="text-[10px] font-bold text-[#8E95A5] uppercase tracking-widest block mb-1">
                ОПИСАНИЕ
              </span>
              <p className="text-white text-xs leading-relaxed">
                {team.description || "Описание для команды не указано."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 bg-[#151515] border border-white/10">
                <span className="text-[10px] font-bold text-[#8E95A5] uppercase tracking-widest block mb-1">
                  РЕГИОН
                </span>
                <div className="flex items-center gap-2">
                  <RegionBadge region={team.region} size="sm" />
                  <span className="text-white font-bold">{regInfo.name} ({regInfo.englishName})</span>
                </div>
              </div>

              <div className="p-4 bg-[#151515] border border-white/10">
                <span className="text-[10px] font-bold text-[#8E95A5] uppercase tracking-widest block mb-1">
                  ДАТА РЕГИСТРАЦИИ В БАЗЕ
                </span>
                <span className="text-white">
                  {new Date(team.createdAt).toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
