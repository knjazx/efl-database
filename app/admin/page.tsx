"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Shield, Users, RefreshCw, Activity, UserCheck, ArrowRight } from "lucide-react";
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
  const [stats, setStats] = useState<DashboardStats>({
    teamsCount: 0,
    playersCount: 0,
    activeRostersCount: 0,
    recentChanges: [],
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoadingStats(true);
    try {
      const [teamsRes, playersRes] = await Promise.all([
        fetch("/api/teams").then((r) => r.json()).catch(() => ({ success: false })),
        fetch("/api/players").then((r) => r.json()).catch(() => ({ success: false })),
      ]);

      let teamsCount = 0;
      let activeRostersCount = 0;
      if (teamsRes?.success && Array.isArray(teamsRes.teams)) {
        teamsCount = teamsRes.teams.length;
        activeRostersCount = teamsRes.teams.filter((t: any) => t.playerCount > 0).length;
      }

      let playersCount = 0;
      if (playersRes?.success && Array.isArray(playersRes.players)) {
        playersCount = playersRes.players.length;
      }

      // Fetch Recent Changes Activity Logs
      const logsRes = await fetch("/api/admin/activity")
        .then((r) => r.json())
        .catch(() => ({ success: false }));
      const recentChanges = logsRes?.success && Array.isArray(logsRes.logs)
        ? logsRes.logs
        : [];

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

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="border-b border-white/[0.08] pb-4">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            EFL DATABASE DASHBOARD
          </h2>
          <p className="text-xs text-[#8E95A5] mt-1">
            Общая статистика базы данных и журнал последних действий.
          </p>
        </div>

        {/* Statistics Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link href="/admin/teams" className="glass-panel border border-white/[0.08] hover:border-blue-500/50 rounded-2xl p-6 flex items-center justify-between transition-all group">
            <div>
              <span className="text-[10px] font-bold text-[#8E95A5] uppercase tracking-widest block mb-1">
                КОМАНДЫ
              </span>
              <span className="text-4xl font-black text-white font-mono">
                {loadingStats ? "-" : stats.teamsCount}
              </span>
              <span className="text-xs text-blue-400 font-semibold flex items-center gap-1 mt-2">
                <span>Управление командами</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Shield className="w-7 h-7" />
            </div>
          </Link>

          <Link href="/admin/players" className="glass-panel border border-white/[0.08] hover:border-emerald-500/50 rounded-2xl p-6 flex items-center justify-between transition-all group">
            <div>
              <span className="text-[10px] font-bold text-[#8E95A5] uppercase tracking-widest block mb-1">
                ИГРОКИ
              </span>
              <span className="text-4xl font-black text-white font-mono">
                {loadingStats ? "-" : stats.playersCount}
              </span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-2">
                <span>Управление игроками</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-7 h-7" />
            </div>
          </Link>

          <div className="glass-panel border border-white/[0.08] rounded-2xl p-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#8E95A5] uppercase tracking-widest block mb-1">
                АКТИВНЫЕ СОСТАВЫ
              </span>
              <span className="text-4xl font-black text-white font-mono">
                {loadingStats ? "-" : stats.activeRostersCount}
              </span>
              <span className="text-xs text-[#8E95A5] block mt-2">
                Команд с игроками в ростере
              </span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <UserCheck className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* Recent Changes Log */}
        <div className="glass-panel border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                ЖУРНАЛ АКТИВНОСТИ
              </h3>
            </div>
            <button
              onClick={loadDashboardData}
              className="text-xs text-[#8E95A5] hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Обновить</span>
            </button>
          </div>

          {stats.recentChanges.length > 0 ? (
            <div className="space-y-3">
              {stats.recentChanges.map((change) => (
                <div
                  key={change.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-[#090B10] border border-white/[0.06] rounded-xl text-xs"
                >
                  <div className="flex items-center gap-3">
                    {change.teamName && (
                      <span className="font-bold text-white bg-white/[0.08] border border-white/10 px-2 py-0.5 rounded text-[11px]">
                        {change.teamName}
                      </span>
                    )}
                    <span className="text-[#F3F4F6]">{change.description}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#8E95A5]">
                    {new Date(change.timestamp).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8E95A5] py-4 text-center">
              В журнале активности пока нет записей.
            </p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}