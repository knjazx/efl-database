"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Shield, RefreshCw, Crown, AlertTriangle } from "lucide-react";
import { getBanStatus } from "@/lib/disqualification";

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
}

export default function PlayerProfilePage({ params }: { params: { slug: string } }) {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/players/${params.slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPlayer(data.player);
        } else {
          setError(data.error || "Player not found");
        }
      })
      .catch((err) => {
        console.error("Error fetching player profile:", err);
        setError("Failed to load player details");
      })
      .finally(() => setLoading(false));
  }, [params.slug]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 flex flex-col items-center justify-center gap-3 text-[#858585]">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="text-xs font-medium tracking-widest uppercase">Loading player profile...</span>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <Link href="/teams" className="inline-flex items-center gap-2 text-xs font-semibold text-[#858585] hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Teams
        </Link>
        <div className="p-12 border border-[#222222] bg-[#0A0A0A] rounded-xl max-w-md mx-auto">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-2">PLAYER NOT FOUND</h2>
          <p className="text-xs text-[#858585] mb-6">{error || "The requested player profile does not exist."}</p>
          <Link href="/teams" className="px-4 py-2 bg-white text-black text-xs font-bold rounded-md hover:bg-neutral-200 transition-colors">
            BROWSE TEAMS
          </Link>
        </div>
      </div>
    );
  }

  const activeRole = player.currentTeam?.role || player.defaultRole || "";
  const isCaptain = activeRole.toUpperCase() === "CAPTAIN";
  const playerBan = getBanStatus(player);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Back Navigation */}
      <Link href="/teams" className="inline-flex items-center gap-2 text-xs font-semibold text-[#858585] hover:text-white mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Teams
      </Link>

      {/* Disqualification Banner */}
      {playerBan.isBanned && (
        <div className="bg-red-950/80 border border-red-800 rounded-2xl p-6 mb-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-red-950/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-900/60 border border-red-700 flex items-center justify-center flex-shrink-0">
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
          <div className="bg-red-900/40 border border-red-700/60 px-4 py-2 rounded-xl font-mono text-xs font-bold text-red-300">
            {playerBan.remainingText}
          </div>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className={`bg-[#0A0A0A] border rounded-2xl p-8 mb-8 ${playerBan.isBanned ? "border-red-900/60" : "border-[#222222]"}`}>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
          {/* Avatar */}
          <div className="w-32 h-32 relative bg-[#050505] border border-[#222222] rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0">
            {player.avatarUrl ? (
              <img src={player.avatarUrl} alt={player.nickname} className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-[#858585]" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-4xl font-black text-white tracking-tight uppercase mb-2">
              {player.nickname}
            </h1>

            {isCaptain && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-950/40 border border-amber-500/50 text-amber-400 text-xs font-bold tracking-widest uppercase rounded">
                  <Crown className="w-4 h-4" />
                  <span>CAPTAIN</span>
                </span>
              </div>
            )}

            {/* Current Team Status */}
            <div className="bg-[#050505] border border-[#222222] rounded-xl p-4 inline-block w-full sm:w-auto">
              <span className="text-[10px] font-bold text-[#858585] uppercase tracking-widest block mb-2">
                Current Team
              </span>

              {player.currentTeam ? (
                <Link
                  href={`/teams/${player.currentTeam.slug}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] border border-[#222222] p-1 flex items-center justify-center">
                    <img src={player.currentTeam.logoUrl} alt={player.currentTeam.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-white group-hover:underline block leading-none">
                      {player.currentTeam.name}
                    </span>
                    <span className="text-[10px] text-[#858585] font-semibold">
                      {player.currentTeam.tag}
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Shield className="w-4 h-4 text-[#858585]" />
                  <span>Free Agent</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Steam & FACEIT External Buttons */}
        <div className="mt-8 pt-6 border-t border-[#181818] flex flex-wrap gap-4 justify-center sm:justify-start">
          {player.steamUrl ? (
            <a
              href={player.steamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#141414] border border-[#222222] hover:border-white rounded-xl text-xs font-bold text-white transition-all"
            >
              <span>STEAM ↗</span>
            </a>
          ) : (
            <span className="px-5 py-2.5 bg-[#050505] border border-[#141414] rounded-xl text-xs text-[#555555]">
              STEAM NOT LINKED
            </span>
          )}

          {player.faceitUrl ? (
            <a
              href={player.faceitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#141414] border border-[#222222] hover:border-white rounded-xl text-xs font-bold text-white transition-all"
            >
              <span>FACEIT ↗</span>
            </a>
          ) : (
            <span className="px-5 py-2.5 bg-[#050505] border border-[#141414] rounded-xl text-xs text-[#555555]">
              FACEIT NOT LINKED
            </span>
          )}

          {/* Discord Button for Captains */}
          {isCaptain && player.discordUrl && (
            <a
              href={player.discordUrl.startsWith("http") ? player.discordUrl : `https://discord.com/users/${player.discordUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-950/50 border border-indigo-500/50 hover:border-indigo-400 rounded-xl text-xs font-bold text-indigo-200 hover:text-white transition-all"
            >
              <span>DISCORD ({player.discordUrl}) ↗</span>
            </a>
          )}
        </div>
      </div>

      {/* Roster History */}
      {player.history && player.history.length > 0 && (
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-2xl p-8">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-4 border-b border-[#222222] pb-3">
            ROSTER HISTORY
          </h2>
          <div className="space-y-3">
            {player.history.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-[#050505] border border-[#1C1C1C] rounded-xl">
                <Link href={`/teams/${h.teamSlug}`} className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded bg-[#0A0A0A] border border-[#222222] p-1">
                    <img src={h.teamLogoUrl} alt={h.teamName} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white group-hover:underline block">
                      {h.teamName}
                    </span>
                  </div>
                </Link>

                <div className="text-right text-[11px] font-mono text-[#858585]">
                  {h.leftAt ? `Left: ${new Date(h.leftAt).toLocaleDateString()}` : "Active"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
