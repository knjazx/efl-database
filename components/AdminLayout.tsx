"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Shield, Users, LogOut, ArrowLeft } from "lucide-react";
import { useState } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/teams");
    router.refresh();
  };

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Teams", href: "/admin/teams", icon: Shield },
    { label: "Players", href: "/admin/players", icon: Users },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Top Admin Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#222222]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#222222] overflow-hidden flex-shrink-0">
            <img src="/efl-logo.png" alt="EFL Admin Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wider uppercase">
              EFL ADMIN PORTAL
            </h1>
            <p className="text-xs text-[#858585]">
              Management portal for teams, rosters, logos, and players
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/teams"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0A0A0A] border border-[#222222] hover:border-white text-xs font-semibold text-[#858585] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/30 border border-red-900/50 hover:bg-red-900/40 text-xs font-semibold text-red-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Admin Sub-navigation Tabs */}
      <div className="flex items-center gap-2 mt-6 mb-8 border-b border-[#222222] pb-px">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold tracking-wider uppercase rounded-t-lg transition-all relative ${
                isActive
                  ? "bg-[#0A0A0A] text-white border-t border-x border-[#222222]"
                  : "text-[#858585] hover:text-white hover:bg-[#0A0A0A]/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-white" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Main Admin Page Content */}
      {children}
    </div>
  );
}
