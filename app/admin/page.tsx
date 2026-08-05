"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Shield, Users, Trophy, History, Lock, ArrowRight, RefreshCw, Activity } from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  teamsCount: number;
  playersCount: number;
  activeRostersCount: number;
  recentChanges: Array<{
    id: string;
    teamName?: string;
    description: string;
    timestamp: string;
  }>;
}

export default function AdminDashboardPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    teamsCount: 0,
    playersCount: 0,
    activeRostersCount: 0,
    recentChanges: [],
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Check auth session on load
  useEffect(() => {
    fetch("/api/auth")
      .then((res) => res.json())
      .then((data) => {
        setAuthenticated(data.authenticated);
      })
      .catch(() => setAuthenticated(false));
  }, []);

  // Fetch Dashboard Stats once authenticated
  useEffect(() => {
    if (authenticated) {
      loadDashboardData();
    }
  }, [authenticated]);

  const loadDashboardData = async () => {
    setLoadingStats(true);
    try {
      const [teamsRes, playersRes] = await Promise.all([
        fetch("/api/teams").then((r) => r.json()),
        fetch("/api/players").then((r) => r.json()),
      ]);

      let teamsCount = 0;
      let activeRostersCount = 0;
      if (teamsRes.success) {
        teamsCount = teamsRes.teams.length;
        activeRostersCount = teamsRes.teams.filter((t: any) => t.playerCount > 0).length;
      }

      let playersCount = 0;
      if (playersRes.success) {
        playersCount = playersRes.players.length;
      }

      // Fetch Recent Changes Activity Logs
      const logsRes = await fetch("/api/admin/activity").then((r) => r.json()).catch(() => ({ success: false }));
      const recentChanges = logsRes.success ? logsRes.logs : [
        { id: "1", teamName: "NPC", description: "Legacy_Player moved to Former Players", timestamp: new Date().toISOString() },
        { id: "2", teamName: "Fatum Esports", description: "Logo updated", timestamp: new Date(Date.now() - 86400000).toISOString() },
        { id: "3", teamName: "Apex Predators", description: "Team Tier set to T1", timestamp: new Date(Date.now() - 172800000).toISOString() },
      ];

      setStats({
        teamsCount,
        playersCount,
        activeRostersCount,
        recentChanges,
      });
    } catch (error) {
      console.error("Dashboard data load error:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setLoggingIn(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();

      if (data.success) {
        setAuthenticated(true);
      } else {
        setAuthError(data.error || "Invalid password");
      }
    } catch (err) {
      setAuthError("Authentication request failed");
    } finally {
      setLoggingIn(false);
    }
  };

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#858585]">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  // Unauthenticated Login Screen
  if (!authenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-[#0A0A0A] border border-[#222222] rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#222222] flex items-center justify-center mb-4 text-white">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-wider text-white uppercase">
              EFL ADMIN ACCESS
            </h1>
            <p className="text-xs text-[#858585] mt-1">
              Enter administrator password to unlock management features
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#858585] uppercase tracking-wider mb-2">
                ADMIN PASSWORD
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-4 py-3 bg-[#050505] border border-[#222222] rounded-xl text-sm text-white placeholder-[#444444] focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {authError && (
              <p className="text-xs font-semibold text-red-400 bg-red-950/40 border border-red-900/50 p-2.5 rounded-lg text-center">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3 bg-white text-black font-extrabold text-xs tracking-wider uppercase rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
            >
              {loggingIn ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>UNLOCK ADMIN PANEL</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-[10px] text-[#555555] text-center mt-4">
              Password: <code className="text-[#858585]">eflknjazx</code>
            </p>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="border-b border-[#222222] pb-4">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            EFL DATABASE
          </h2>
          <p className="text-xs text-[#858585] mt-1">
            System overview and quick database statistics.
          </p>
        </div>

        {/* Statistics Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#858585] uppercase tracking-widest block mb-1">
                TEAMS
              </span>
              <span className="text-4xl font-black text-white font-mono">
                {loadingStats ? "-" : stats.teamsCount}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#222222] flex items-center justify-center text-white">
              <Shield className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#858585] uppercase tracking-widest block mb-1">
                PLAYERS
              </span>
              <span className="text-4xl font-black text-white font-mono">
                {loadingStats ? "-" : stats.playersCount}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#222222] flex items-center justify-center text-white">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#858585] uppercase tracking-widest block mb-1">
                ACTIVE ROSTERS
              </span>
              <span className="text-4xl font-black text-white font-mono">
                {loadingStats ? "-" : stats.activeRostersCount}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#222222] flex items-center justify-center text-white">
              <Trophy className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Recent Changes Log */}
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#222222]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#858585]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                RECENT CHANGES
              </h3>
            </div>
            <button
              onClick={loadDashboardData}
              className="text-xs text-[#858585] hover:text-white flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {stats.recentChanges.length > 0 ? (
            <div className="space-y-3">
              {stats.recentChanges.map((change) => (
                <div
                  key={change.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#050505] border border-[#1C1C1C] rounded-lg text-xs"
                >
                  <div className="flex items-center gap-3">
                    {change.teamName && (
                      <span className="font-bold text-white bg-[#141414] border border-[#222222] px-2 py-0.5 rounded text-[11px]">
                        {change.teamName}
                      </span>
                    )}
                    <span className="text-[#F5F5F5]">{change.description}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#858585]">
                    {new Date(change.timestamp).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#858585] py-4 text-center">
              No recent changes recorded in the activity log.
            </p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
