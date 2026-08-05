"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, User, ArrowLeft, RefreshCw, Crown, AlertTriangle, Shield, UserCheck, ShieldAlert } from "lucide-react";
import { getBanStatus } from "@/lib/disqualification";
import { formatRosterRole } from "@/lib/roles";
import { TeamLogo } from "@/components/TeamLogo";

interface PlayerMember {
  membershipId: string;
  id: string;
  nickname: string;
  slug: string;
  avatarUrl?: string;
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
  logoUrl: string;
  description?: string;
  isDisqualified?: boolean;
  disqualifiedUntil?: Date | string | null;
  disqualifyReason?: string | null;
  activeRoster: PlayerMember[];
  formerPlayers: PlayerMember[];
}

export default function TeamProfilePage({ params }: { params: { slug: string } }) {
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/teams/${params.slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTeam(data.team);
        } else {
          setError(data.error || "Team not found");
        }
      })
      .catch((err) => {
        console.error("Error fetching team profile:", err);
        setError("Failed to load team details");
      })
      .finally(() => setLoading(false));
  }, [params.slug]);

  const handleDownloadLogo = () => {
    if (!team?.logoUrl) return;
    const link = document.createElement("a");
    link.href = team.logoUrl;
    link.download = `${team.tag.toLowerCase()}_logo${team.logoUrl.substring(team.logoUrl.lastIndexOf("."))}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col items-center justify-center gap-3 text-[#858585]">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="text-xs font-medium tracking-widest uppercase">Loading team profile...</span>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <Link href="/teams" className="inline-flex items-center gap-2 text-xs font-semibold text-[#858585] hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Teams
        </Link>
        <div className="p-12 border border-[#222222] bg-[#0A0A0A] rounded-xl max-w-md mx-auto">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-2">TEAM NOT FOUND</h2>
          <p className="text-xs text-[#858585] mb-6">{error || "The requested team profile does not exist."}</p>
          <Link href="/teams" className="px-4 py-2 bg-white text-black text-xs font-bold rounded-md hover:bg-neutral-200 transition-colors">
            BROWSE TEAMS
          </Link>
        </div>
      </div>
    );
  }

  const teamBan = getBanStatus(team);

  // Group roster into 3 distinct categories
  const corePlayers = team.activeRoster.filter((p) => formatRosterRole(p.role).baseRole === "CORE");
  const substitutePlayers = team.activeRoster.filter((p) => formatRosterRole(p.role).baseRole === "SUBSTITUTE");
  const coachPlayers = team.activeRoster.filter((p) => formatRosterRole(p.role).baseRole === "COACH");

  const renderRosterGrid = (players: PlayerMember[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
      {players.map((player) => {
        const parsedRole = formatRosterRole(player.role);
        const playerBan = getBanStatus(player);

        return (
          <div
            key={player.id}
            className={`bg-[#0A0A0A] border rounded-xl p-5 transition-all flex flex-col justify-between group relative overflow-hidden ${
              playerBan.isBanned ? "border-red-900/60 bg-red-950/10" : "border-[#222222] hover:border-[#444444]"
            }`}
          >
            {playerBan.isBanned && (
              <div className="mb-3 bg-red-950/80 border border-red-800 rounded py-1 px-2 text-center text-[10px] font-bold text-red-300 uppercase">
                ДИСКВАЛИФИЦИРОВАН ({playerBan.remainingText})
              </div>
            )}

            <div>
              {/* Avatar & Roles */}
              <Link href={`/players/${player.slug}`} className="flex flex-col items-center text-center">
                <div className="w-20 h-20 relative bg-[#050505] border border-[#222222] group-hover:border-white rounded-xl mb-4 overflow-hidden flex items-center justify-center transition-colors">
                  {player.avatarUrl ? (
                    <img src={player.avatarUrl} alt={player.nickname} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-[#858585]" />
                  )}
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-white transition-colors">
                  {player.nickname}
                </h3>

                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                  {/* Roster Role Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      parsedRole.baseRole === "CORE"
                        ? "bg-blue-950/40 border border-blue-500/50 text-blue-400"
                        : parsedRole.baseRole === "SUBSTITUTE"
                        ? "bg-purple-950/40 border border-purple-500/50 text-purple-400"
                        : "bg-emerald-950/40 border border-emerald-500/50 text-emerald-400"
                    }`}
                  >
                    {parsedRole.label}
                  </span>

                  {/* Captain Badge */}
                  {parsedRole.isCaptain && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/50 text-[10px] font-bold tracking-widest text-amber-400 uppercase">
                      <Crown className="w-3 h-3" />
                      <span>Капитан</span>
                    </span>
                  )}
                </div>
              </Link>
            </div>

            {/* Steam & FACEIT & Discord Action Links */}
            <div className="mt-6 pt-4 border-t border-[#181818] flex flex-wrap gap-2 text-center">
              {player.steamUrl ? (
                <a
                  href={player.steamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#050505] border border-[#222222] hover:border-white rounded text-[11px] font-semibold text-[#858585] hover:text-white transition-colors"
                >
                  <span>Steam</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="flex-1 py-1.5 text-[11px] text-[#444444] border border-[#141414] rounded">
                  Steam —
                </span>
              )}

              {player.faceitUrl ? (
                <a
                  href={player.faceitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#050505] border border-[#222222] hover:border-white rounded text-[11px] font-semibold text-[#858585] hover:text-white transition-colors"
                >
                  <span>FACEIT</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="flex-1 py-1.5 text-[11px] text-[#444444] border border-[#141414] rounded">
                  FACEIT —
                </span>
              )}

              {parsedRole.isCaptain && player.discordUrl && (
                <a
                  href={player.discordUrl.startsWith("http") ? player.discordUrl : `https://discord.com/users/${player.discordUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-indigo-950/40 border border-indigo-500/40 hover:border-indigo-400 rounded text-[11px] font-semibold text-indigo-300 hover:text-white transition-colors"
                  title={`Discord: ${player.discordUrl}`}
                >
                  <span>Discord ({player.discordUrl})</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Back Link */}
      <Link href="/teams" className="inline-flex items-center gap-2 text-xs font-semibold text-[#858585] hover:text-white mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Teams
      </Link>

      {/* Disqualification Banner */}
      {teamBan.isBanned && (
        <div className="bg-red-950/80 border border-red-800 rounded-2xl p-6 mb-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-red-950/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-900/60 border border-red-700 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider text-red-300">
                КОМАНДА ДИСКВАЛИФИЦИРОВАНА
              </h3>
              <p className="text-xs text-red-200/80 mt-0.5">
                Причина: <span className="font-semibold text-white">{teamBan.reason}</span>
              </p>
            </div>
          </div>
          <div className="bg-red-900/40 border border-red-700/60 px-4 py-2 rounded-xl font-mono text-xs font-bold text-red-300">
            {teamBan.remainingText}
          </div>
        </div>
      )}

      {/* Hero / Header Section */}
      <div className={`bg-[#0A0A0A] border rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-12 ${teamBan.isBanned ? "border-red-900/60" : "border-[#222222]"}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Logo Container */}
          <div className="w-28 h-28 relative bg-[#050505] border border-[#222222] rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
            <TeamLogo logoUrl={team.logoUrl} name={team.name} tag={team.tag} className="w-full h-full object-cover filter drop-shadow-md" />
          </div>

          {/* Team Info */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase mb-1">
              {team.name}
            </h1>
            <p className="text-sm font-semibold text-[#858585] tracking-widest uppercase mb-3">
              TAG: {team.tag}
            </p>
            {team.description && (
              <p className="text-xs text-[#858585] max-w-2xl leading-relaxed">
                {team.description}
              </p>
            )}
          </div>
        </div>

        {/* Download Logo Action Button */}
        <div className="flex-shrink-0 w-full md:w-auto">
          <button
            onClick={handleDownloadLogo}
            className="w-full md:w-auto flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-[#141414] border border-[#222222] hover:border-white hover:bg-[#1A1A1A] text-xs font-bold tracking-wider text-white transition-all uppercase"
          >
            <Download className="w-4 h-4 text-white" />
            <span>DOWNLOAD LOGO</span>
          </button>
        </div>
      </div>

      {/* Main Roster Container */}
      <div className="space-y-12 mb-16">

        {/* SECTION 1: ОСНОВНОЙ СОСТАВ (Core Roster) */}
        <div>
          <div className="mb-6 border-b border-[#222222] pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block shadow-lg shadow-blue-500/50"></span>
              <h2 className="text-xl font-black tracking-tight text-white uppercase">
                ОСНОВНОЙ СОСТАВ ({corePlayers.length})
              </h2>
            </div>
            <span className="text-xs font-bold text-blue-400 bg-blue-950/40 border border-blue-500/30 px-3 py-1 rounded-md uppercase">
              Starting Roster
            </span>
          </div>

          {corePlayers.length > 0 ? (
            renderRosterGrid(corePlayers)
          ) : (
            <div className="p-8 border border-dashed border-[#222222] bg-[#0A0A0A]/40 rounded-xl text-center">
              <p className="text-xs font-bold text-[#858585] uppercase tracking-wider">
                Нет игроков в основном составе
              </p>
            </div>
          )}
        </div>

        {/* SECTION 2: ЗАМЕНА (Substitutes) */}
        <div>
          <div className="mb-6 border-b border-[#222222] pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-purple-500 inline-block shadow-lg shadow-purple-500/50"></span>
              <h2 className="text-xl font-black tracking-tight text-white uppercase">
                ЗАМЕНА ({substitutePlayers.length})
              </h2>
            </div>
            <span className="text-xs font-bold text-purple-400 bg-purple-950/40 border border-purple-500/30 px-3 py-1 rounded-md uppercase">
              Substitutes
            </span>
          </div>

          {substitutePlayers.length > 0 ? (
            renderRosterGrid(substitutePlayers)
          ) : (
            <div className="p-8 border border-dashed border-[#222222] bg-[#0A0A0A]/40 rounded-xl text-center">
              <p className="text-xs font-bold text-[#858585] uppercase tracking-wider">
                Запасные игроки отсутствуют
              </p>
            </div>
          )}
        </div>

        {/* SECTION 3: ТРЕНЕРСКИЙ ШТАБ (Coaches & Staff) */}
        <div>
          <div className="mb-6 border-b border-[#222222] pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-lg shadow-emerald-500/50"></span>
              <h2 className="text-xl font-black tracking-tight text-white uppercase">
                ТРЕНЕРСКИЙ ШТАБ ({coachPlayers.length})
              </h2>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-md uppercase">
              Coaches & Staff
            </span>
          </div>

          {coachPlayers.length > 0 ? (
            renderRosterGrid(coachPlayers)
          ) : (
            <div className="p-8 border border-dashed border-[#222222] bg-[#0A0A0A]/40 rounded-xl text-center">
              <p className="text-xs font-bold text-[#858585] uppercase tracking-wider">
                Тренеры не назначены
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Former Players Section */}
      {team.formerPlayers && team.formerPlayers.length > 0 && (
        <div className="mt-12">
          <div className="mb-6 border-b border-[#222222] pb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              FORMER PLAYERS
            </h3>
            <span className="text-xs text-[#858585]">
              {team.formerPlayers.length} HISTORICAL MEMBERS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {team.formerPlayers.map((player) => (
              <div
                key={player.id}
                className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <Link href={`/players/${player.slug}`} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-lg bg-[#050505] border border-[#222222] overflow-hidden flex items-center justify-center flex-shrink-0">
                    {player.avatarUrl ? (
                      <img src={player.avatarUrl} alt={player.nickname} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-[#858585]" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-white transition-colors">
                      {player.nickname}
                    </h4>
                  </div>
                </Link>

                <div className="text-right flex flex-col items-end">
                  <span className="text-[10px] text-[#858585] font-mono">
                    {player.leftAt
                      ? `Left: ${new Date(player.leftAt).toLocaleDateString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}`
                      : "Left: N/A"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
