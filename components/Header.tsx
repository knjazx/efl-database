"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Lock, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";

export function Header() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [teamCount, setTeamCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/auth")
      .then((res) => res.json())
      .then((data) => setIsAdmin(data.authenticated))
      .catch(() => setIsAdmin(false));

    fetch("/api/teams")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.teams)) {
          setTeamCount(data.teams.length);
        }
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full h-[76px] bg-[#050505]/90 backdrop-blur-md border-b border-[#222222]">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        {/* Left: EFL Branding */}
        <Link href="/teams" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-[#0A0A0A] border border-[#222222] group-hover:border-[#444444] transition-colors flex items-center justify-center text-white font-black text-sm tracking-wider">
            EFL
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold tracking-wider text-sm leading-tight group-hover:text-white transition-colors">
              EFL
            </span>
            <span className="text-[#858585] text-[10px] tracking-widest font-medium uppercase">
              ELECTRONIC FUTURE LEAGUE
            </span>
          </div>
        </Link>

        {/* Center: Public Navigation */}
        <nav className="flex items-center gap-8">
          <Link
            href="/teams"
            className={`text-xs font-semibold tracking-widest uppercase transition-colors py-1 relative flex items-center gap-2 ${
              pathname.startsWith("/teams") || pathname === "/"
                ? "text-white"
                : "text-[#858585] hover:text-white"
            }`}
          >
            <span>TEAMS</span>
            {teamCount !== null && (
              <span className="px-1.5 py-0.2 bg-[#141414] border border-[#222222] text-[10px] font-mono text-[#858585] rounded">
                {teamCount}
              </span>
            )}
            {(pathname.startsWith("/teams") || pathname === "/") && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-white rounded-full" />
            )}
          </Link>
        </nav>

        {/* Right: Login / Admin */}
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <Link
              href="/admin"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#141414] border border-[#333333] hover:border-white/40 text-xs font-medium text-white transition-all"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admin Panel</span>
            </Link>
          ) : (
            <Link
              href="/admin"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0A0A0A] border border-[#222222] hover:border-[#444444] hover:text-white text-xs font-medium text-[#858585] transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Login / Admin</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
