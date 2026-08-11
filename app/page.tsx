import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TeamLogo } from "@/components/TeamLogo";
import {
  Trophy,
  Users,
  Shield,
  Swords,
  Sparkles,
  ArrowRight,
  Zap,
  CheckCircle2,
  Lock,
  BarChart3,
  Flame,
  ChevronRight,
  Activity,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Electronic Future League (EFL) — Официальный сайт киберспортивной лиги CS2",
  description: "Официальный портал киберспортивной лиги Electronic Future League. Реестр команд, составы игроков, автоматический демо-анализатор Cybershoke, рейтинги и расписание матчей CS2.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  // Fetch real data from PostgreSQL database
  let teamsCount = 0;
  let playersCount = 0;
  let matchesCount = 0;
  let topTeams: any[] = [];
  let recentMatches: any[] = [];

  try {
    const [tCount, pCount, mCount, tTeams, rMatches] = await Promise.all([
      prisma.team.count(),
      prisma.player.count(),
      prisma.match.count(),
      prisma.team.findMany({
        take: 6,
        orderBy: [{ points: "desc" }, { wins: "desc" }, { name: "asc" }],
        include: {
          memberships: {
            where: { status: "ACTIVE" },
          },
        },
      }),
      prisma.match.findMany({
        take: 4,
        orderBy: { scheduledAt: "desc" },
        include: {
          teamA: true,
          teamB: true,
        },
      }),
    ]);

    teamsCount = tCount;
    playersCount = pCount;
    matchesCount = mCount;
    topTeams = tTeams;
    recentMatches = rMatches;
  } catch (err) {
    console.error("Failed to load home page data:", err);
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] space-y-16 pb-20">
      {/* HERO BANNER SECTION */}
      <section id="hero-section" className="relative pt-12 pb-16 px-6 overflow-hidden border-b border-[#1A1A1A]">
        {/* Ambient Light & Grid Background Effect */}
        <div className="absolute inset-0 subtle-grid-bg opacity-30 pointer-events-none" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-blue-600/20 via-purple-600/10 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-8">
          {/* Top Badges */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F172A] border border-blue-500/30 text-blue-400 text-xs font-mono font-bold uppercase tracking-widest shadow-lg animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>ELECTRONIC FUTURE LEAGUE • CS2 REGISTRY</span>
          </div>

          {/* Main Title */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase leading-[1.05]">
              ОФИЦИАЛЬНАЯ ЛИГА & РЕЕСТР КОМАНД <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">EFL</span>
            </h1>
            <p className="text-sm sm:text-lg text-[#999999] max-w-2xl mx-auto font-medium leading-relaxed">
              Главный цифровой портал лиги Electronic Future League. Автоматический анализ демок Cybershoke, точный учёт MR12 счетов, дивизионы TIER 1–3 и реестр игроков CS2.
            </p>
          </div>

          {/* Action Call-To-Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/teams"
              className="px-7 py-3.5 rounded-xl bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-all flex items-center gap-2.5 shadow-2xl hover:scale-105 transform duration-200"
            >
              <Shield className="w-4 h-4 text-black" />
              <span>Смотреть Команды ({teamsCount})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/rankings"
              className="px-7 py-3.5 rounded-xl bg-[#141414] hover:bg-[#202020] border border-[#333333] hover:border-amber-400/60 text-amber-300 font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2.5 shadow-xl hover:scale-105 transform duration-200"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Турнирный Рейтинг</span>
            </Link>

            <Link
              href="/matches"
              className="px-7 py-3.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] border border-blue-500/30 text-blue-400 font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2.5 shadow-xl hover:scale-105 transform duration-200"
            >
              <Swords className="w-4 h-4 text-blue-400" />
              <span>Расписание Матчей</span>
            </Link>
          </div>
        </div>
      </section>

      {/* LEAGUE LIVE STATS COUNTER */}
      <section id="stats-section" className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {/* Stat 1 */}
          <div className="bg-[#0A0A0A] border border-[#222222] hover:border-blue-500/40 p-6 rounded-2xl transition-all shadow-xl space-y-2 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#858585]">КОМАНДЫ</span>
              <Shield className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white font-mono">{teamsCount}</div>
            <p className="text-[11px] text-[#666666]">Зарегистрировано в EFL</p>
          </div>

          {/* Stat 2 */}
          <div className="bg-[#0A0A0A] border border-[#222222] hover:border-emerald-500/40 p-6 rounded-2xl transition-all shadow-xl space-y-2 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#858585]">ИГРОКИ</span>
              <Users className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white font-mono">{playersCount}</div>
            <p className="text-[11px] text-[#666666]">В официальных ростерах</p>
          </div>

          {/* Stat 3 */}
          <div className="bg-[#0A0A0A] border border-[#222222] hover:border-amber-500/40 p-6 rounded-2xl transition-all shadow-xl space-y-2 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#858585]">МАТЧИ</span>
              <Swords className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white font-mono">{matchesCount}</div>
            <p className="text-[11px] text-[#666666]">Сыграно и запланировано</p>
          </div>

          {/* Stat 4 */}
          <div className="bg-[#0A0A0A] border border-[#222222] hover:border-purple-500/40 p-6 rounded-2xl transition-all shadow-xl space-y-2 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#858585]">ДИВИЗИОНЫ</span>
              <Trophy className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white font-mono">3 TIER</div>
            <p className="text-[11px] text-[#666666]">TIER 1, TIER 2, TIER 3</p>
          </div>
        </div>
      </section>

      {/* TOP TEAMS SHOWCASE SECTION */}
      <section id="top-teams-section" className="max-w-7xl mx-auto px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1A1A1A] pb-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase mb-1">
              <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>ЛИДЕРЫ ТУРНИРНОЙ ТАБЛИЦЫ</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              ТОП КОМАНДЫ Electronic Future League
            </h2>
          </div>

          <Link
            href="/rankings"
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 uppercase tracking-wider transition-colors"
          >
            <span>Полный рейтинг лиги</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Top Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {topTeams.length > 0 ? (
            topTeams.map((t, idx) => {
              const winrate =
                t.matchesPlayed > 0 ? Math.round((t.wins / t.matchesPlayed) * 100) : 0;

              return (
                <Link
                  key={t.id}
                  href={`/teams/${t.slug}`}
                  className="bg-[#0A0A0A] border border-[#222222] hover:border-amber-400/50 rounded-2xl p-5 transition-all shadow-xl hover:shadow-amber-500/5 flex flex-col justify-between space-y-4 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[#141414] border border-[#222222] flex items-center justify-center font-mono font-black text-xs text-amber-400">
                        #{idx + 1}
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-[#050505] border border-[#222222] overflow-hidden p-1 flex-shrink-0 group-hover:scale-105 transition-transform">
                        <TeamLogo logoUrl={t.logoUrl} name={t.name} tag={t.tag} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-sm uppercase group-hover:text-amber-300 transition-colors">
                          {t.name}
                        </h3>
                        <span className="text-[11px] font-mono text-[#858585]">[{t.tag}]</span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded bg-[#141414] border border-[#222222] text-[10px] font-mono font-bold text-white">
                      {t.tier || "TIER 3"}
                    </span>
                  </div>

                  {/* Stats Summary */}
                  <div className="bg-[#050505] border border-[#1A1A1A] p-3 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-[#666666] uppercase block font-mono">Очки</span>
                      <span className="font-black text-amber-400 font-mono text-sm">{t.points}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#666666] uppercase block font-mono">Победы</span>
                      <span className="font-black text-emerald-400 font-mono text-sm">{t.wins}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#666666] uppercase block font-mono">Винрейт</span>
                      <span className="font-black text-white font-mono text-sm">{winrate}%</span>
                    </div>
                  </div>

                  {/* Winrate Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-1.5 bg-[#141414] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full"
                        style={{ width: `${winrate}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="col-span-full p-8 border border-[#222222] bg-[#0A0A0A] rounded-2xl text-center text-xs text-[#858585]">
              Список команд пуст
            </div>
          )}
        </div>
      </section>

      {/* RECENT MATCHES PREVIEW SECTION */}
      {recentMatches.length > 0 && (
        <section id="recent-matches-section" className="max-w-7xl mx-auto px-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-4">
            <div>
              <div className="flex items-center gap-2 text-blue-400 text-xs font-mono font-bold uppercase mb-1">
                <Activity className="w-4 h-4 text-blue-400" />
                <span>ОПЕРАТИВНЫЕ РЕЗУЛЬТАТЫ</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                Последние Матчи и Эфир
              </h2>
            </div>

            <Link
              href="/matches"
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider transition-colors"
            >
              <span>Все матчи ({matchesCount})</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentMatches.map((m) => {
              const isFinished = m.status === "FINISHED";
              return (
                <div
                  key={m.id}
                  className="bg-[#0A0A0A] border border-[#222222] hover:border-blue-500/40 p-4 rounded-2xl transition-all shadow-xl flex items-center justify-between gap-4"
                >
                  {/* Team A */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#050505] border border-[#222222] overflow-hidden p-0.5 flex-shrink-0">
                      <TeamLogo logoUrl={m.teamA.logoUrl} name={m.teamA.name} tag={m.teamA.tag} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-extrabold text-white text-xs uppercase truncate">
                      {m.teamA.name}
                    </span>
                  </div>

                  {/* Score / VS Badge */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    {isFinished ? (
                      <span className="px-3 py-1 bg-emerald-950/50 border border-emerald-500/50 text-emerald-400 font-mono font-black text-sm rounded-lg">
                        {m.scoreA} : {m.scoreB}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-950/50 border border-amber-500/50 text-amber-300 font-mono font-bold text-xs rounded-lg uppercase">
                        VS (Запланирован)
                      </span>
                    )}
                    <span className="text-[9px] text-[#666666] font-mono mt-1 uppercase">
                      BO{m.bestOf} • {m.tier}
                    </span>
                  </div>

                  {/* Team B */}
                  <div className="flex items-center justify-end gap-3 flex-1 min-w-0 text-right">
                    <span className="font-extrabold text-white text-xs uppercase truncate">
                      {m.teamB.name}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-[#050505] border border-[#222222] overflow-hidden p-0.5 flex-shrink-0">
                      <TeamLogo logoUrl={m.teamB.logoUrl} name={m.teamB.name} tag={m.teamB.tag} className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SYSTEM FEATURES & INNOVATION GRID */}
      <section id="features-section" className="max-w-7xl mx-auto px-6 space-y-6">
        <div className="text-center space-y-2 border-b border-[#1A1A1A] pb-6">
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
            ИННОВАЦИОННАЯ СИСТЕМА EFL
          </span>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">
            Возможности и Тренды Платформы
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-[#0A0A0A] border border-[#222222] p-6 rounded-2xl space-y-3 hover:border-blue-500/40 transition-all shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white uppercase">
              Cybershoke Demo Parser 2.0
            </h3>
            <p className="text-xs text-[#858585] leading-relaxed">
              Автоматический сбор статистики из демок CS2 с защитой от WAF. Исключение ножевых раундов и точный учёт счёта раундов MR12.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-[#0A0A0A] border border-[#222222] p-6 rounded-2xl space-y-3 hover:border-amber-500/40 transition-all shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white uppercase">
              Винрейты и Очки (+3 Pts)
            </h3>
            <p className="text-xs text-[#858585] leading-relaxed">
              Автоматический перерасчет турнирных таблиц. Каждая победа приносит +3 очка в общую копилку и повышает рейтинг команды.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-[#0A0A0A] border border-[#222222] p-6 rounded-2xl space-y-3 hover:border-emerald-500/40 transition-all shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white uppercase">
              Реестр Игроков & Steam ID
            </h3>
            <p className="text-xs text-[#858585] leading-relaxed">
              Точный подбор участников матча по 10 никнеймам из демо с фильтрацией ложных совпадений и привязкой к ростерам PostgreSQL.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER CALL TO ACTION BANNER */}
      <section id="cta-banner" className="max-w-7xl mx-auto px-6">
        <div className="bg-gradient-to-r from-[#0F172A] via-[#0A0A0A] to-[#1E1B4B] border border-blue-500/30 rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-950/60 border border-blue-800/60 text-[10px] font-mono font-bold text-blue-400 uppercase">
              <Shield className="w-3.5 h-3.5" />
              <span>ЭКОСИСТЕМА Electronic Future League</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
              Готовы исследовать лигу EFL?
            </h2>
            <p className="text-xs sm:text-sm text-[#858585] max-w-xl">
              Смотрите составы всех 28 команд, анализируйте рейтинги или войдите в админ-панель для управления турнирами.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0 w-full md:w-auto">
            <Link
              href="/teams"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-black font-extrabold text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors text-center shadow-lg"
            >
              Перейти к Командам
            </Link>

            <Link
              href="/admin"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#141414] border border-[#333333] hover:bg-[#202020] text-amber-300 font-extrabold text-xs uppercase tracking-wider transition-colors text-center flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Админ-панель</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
