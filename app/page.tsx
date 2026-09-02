import Link from "next/link";
import { ArrowRight, Shield, Users, Database, Globe } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const revalidate = 60; // Revalidate cache every 60 seconds

export default async function Home() {
  // Fetch high-level stats
  const [teamCount, playerCount] = await Promise.all([
    prisma.team.count(),
    prisma.player.count(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-20 min-h-[80vh] flex flex-col justify-center">
      {/* Top Tagline */}
      <div className="flex items-center gap-3 mb-8 text-[10px] font-mono tracking-widest uppercase">
        <span className="text-white">ASCENT LEAGUE</span>
        <span className="text-[#333333]">&bull;</span>
        <span className="text-[#666666]">SYSTEM v2.0</span>
      </div>

      {/* Main Title */}
      <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-8">
        ЦЕНТРАЛЬНАЯ<br />
        <span className="text-[#555555]">БАЗА ДАННЫХ</span>
      </h1>
      
      <p className="text-[#888888] max-w-2xl text-base sm:text-lg mb-10 font-normal leading-relaxed">
        Единый реестр киберспортивных команд и игроков Ascent League в дисциплине Counter-Strike 2. Строгий контроль составов, анализ ролей, единая система фейсита и прозрачная история банов.
      </p>

      <div className="mb-16">
        <Link 
          href="/register"
          className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-black uppercase tracking-widest hover:bg-neutral-200 transition-colors"
        >
          ЗАРЕГИСТРИРОВАТЬ КОМАНДУ
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      {/* Navigation Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Teams Block */}
        <Link 
          href="/teams" 
          className="group block bg-[#1c1c1c] border border-white/20 p-8 hover:border-white/40 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
            <Shield className="w-48 h-48" />
          </div>
          
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/[0.04] border border-white/10 flex items-center justify-center text-white mb-6">
              <Shield className="w-5 h-5" />
            </div>
            
            <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2 group-hover:text-[#dddddd] transition-colors">
              КОМАНДЫ
            </h2>
            
            <p className="text-sm text-[#666666] mb-8 max-w-xs">
              Просмотр зарегистрированных команд, их актуальных ростеров и достижений.
            </p>
            
            <div className="flex items-center justify-between mt-auto">
              <div className="text-[10px] font-mono text-[#888888] font-bold uppercase tracking-widest bg-white/[0.02] border border-white/10 px-3 py-1.5">
                {teamCount} КОМАНД
              </div>
              <ArrowRight className="w-5 h-5 text-[#444444] group-hover:text-white transition-colors group-hover:translate-x-1" />
            </div>
          </div>
        </Link>

        {/* Players Block */}
        <Link 
          href="/players" 
          className="group block bg-[#1c1c1c] border border-white/20 p-8 hover:border-white/40 transition-all duration-300 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
            <Users className="w-48 h-48" />
          </div>
          
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/[0.04] border border-white/10 flex items-center justify-center text-white mb-6">
              <Users className="w-5 h-5" />
            </div>
            
            <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2 group-hover:text-[#dddddd] transition-colors">
              ИГРОКИ
            </h2>
            
            <p className="text-sm text-[#666666] mb-8 max-w-xs">
              Поиск киберспортсменов, просмотр истории команд, ролей и привязок Faceit/Steam.
            </p>
            
            <div className="flex items-center justify-between mt-auto">
              <div className="text-[10px] font-mono text-[#888888] font-bold uppercase tracking-widest bg-white/[0.02] border border-white/10 px-3 py-1.5">
                {playerCount} ИГРОКОВ
              </div>
              <ArrowRight className="w-5 h-5 text-[#444444] group-hover:text-white transition-colors group-hover:translate-x-1" />
            </div>
          </div>
        </Link>
      </div>

      {/* Global Stat Footer */}
      <div className="mt-20 pt-8 border-t border-white/10 flex flex-wrap gap-12">
        <div className="flex items-center gap-3">
          <Database className="w-4 h-4 text-[#444444]" />
          <div>
            <div className="text-[9px] font-mono text-[#666666] uppercase tracking-widest mb-1">СТАТУС СИСТЕМЫ</div>
            <div className="text-xs font-bold text-emerald-500 uppercase tracking-widest">ONLINE</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Globe className="w-4 h-4 text-[#444444]" />
          <div>
            <div className="text-[9px] font-mono text-[#666666] uppercase tracking-widest mb-1">РЕГИОН ЛИГИ</div>
            <div className="text-xs font-bold text-white uppercase tracking-widest">GLOBAL (CIS/EU)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
