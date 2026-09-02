"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, UserCheck, Shield } from "lucide-react";
import { useEffect, useState } from "react";

export function Header() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((res) => res.json())
      .then((data) => setIsAdmin(data.authenticated === true))
      .catch(() => setIsAdmin(false));
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full h-[70px] bg-[#000000] border-b border-white/20">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        {/* Left: AL Branding */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="h-8 w-8 overflow-hidden flex-shrink-0 grayscale group-hover:grayscale-0 transition-all duration-300">
            <img src="/al-logo.png" alt="AL Logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold tracking-wider text-sm leading-none group-hover:text-neutral-300 transition-colors">
                ASCENT
              </span>
              <span className="text-[9px] font-mono tracking-widest text-[#666666]">
                DATABASE
              </span>
            </div>
          </div>
        </Link>

        {/* Center: Public Navigation */}
        <nav className="flex items-center gap-8">
          <Link
            href="/"
            className={`text-xs font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${
              pathname === "/"
                ? "text-white"
                : "text-[#666666] hover:text-[#aaaaaa]"
            }`}
          >
            <span>ГЛАВНАЯ</span>
          </Link>

          <Link
            href="/teams"
            className={`text-xs font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${
              pathname.startsWith("/teams")
                ? "text-white"
                : "text-[#666666] hover:text-[#aaaaaa]"
            }`}
          >
            <span>КОМАНДЫ</span>
          </Link>

          <Link
            href="/players"
            className={`text-xs font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${
              pathname.startsWith("/players")
                ? "text-white"
                : "text-[#666666] hover:text-[#aaaaaa]"
            }`}
          >
            <span>ИГРОКИ</span>
          </Link>
        </nav>

        {/* Right: Login / Admin */}
        <div className="flex items-center gap-3">
          {
            isAdmin && (
              <Link
                href="/admin"
                className="text-[10px] text-[10px] font-mono tracking-widest uppercase transition-colors flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.1] px-3 py-1.5 text-white"
              >
                <UserCheck className="w-3 h-3" />
                <span>ADMIN PANEL</span>
              </Link>
            )
          }
        </div>
      </div>
    </header>
  );
}
