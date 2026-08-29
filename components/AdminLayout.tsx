"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Shield,
  Users,
  LogOut,
  ArrowLeft,
  Lock,
  ArrowRight,
  RefreshCw,
  ClipboardList
} from "lucide-react";
import React, { useEffect, useState } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Check auth session on load
  useEffect(() => {
    fetch("/api/auth")
      .then((res) => res.json())
      .then((data) => {
        setAuthenticated(data.authenticated === true);
      })
      .catch(() => setAuthenticated(false));
  }, []);

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
        setPasswordInput("");
        router.refresh();
      } else {
        setAuthError(data.error || "Неверный пароль администратора");
      }
    } catch (err) {
      setAuthError("Ошибка подключения к серверу");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth", { method: "DELETE" });
    setAuthenticated(false);
    setLoggingOut(false);
    router.push("/admin");
    router.refresh();
  };

  // Loading state
  if (authenticated === null) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-[#8E95A5]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
        <span className="text-xs uppercase tracking-widest font-mono">Проверка доступа...</span>
      </div>
    );
  }

  // Unauthenticated: Password Login Gate
  if (!authenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md glass-panel border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#090B10] border border-white/10 flex items-center justify-center mb-4 text-white shadow-inner">
              <Lock className="w-7 h-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-black tracking-wider text-white uppercase">
              EFL ADMIN ACCESS
            </h1>
            <p className="text-xs text-[#8E95A5] mt-1.5">
              Вход в панель управления защищен. Введите пароль администратора.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#8E95A5] uppercase tracking-wider mb-2">
                ПАРОЛЬ АДМИНИСТРАТОРА
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                required
                autoFocus
                className="w-full px-4 py-3 bg-[#090B10] border border-white/10 rounded-xl text-sm text-white placeholder-[#444444] focus:outline-none focus:border-blue-500 transition-colors"
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
              className="w-full py-3 bg-white text-black font-extrabold text-xs tracking-wider uppercase rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              {loggingIn ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>ВОЙТИ В АДМИН-ПАНЕЛЬ</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/teams"
              className="inline-flex items-center gap-1.5 text-xs text-[#8E95A5] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Вернуться на сайт</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Applications", href: "/admin/applications", icon: ClipboardList },
    { label: "Teams", href: "/admin/teams", icon: Shield },
    { label: "Players", href: "/admin/players", icon: Users },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Top Admin Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#090B10] border border-white/10 p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src="/efl-logo.jpg" alt="EFL Admin Logo" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wider uppercase">
              EFL ADMIN PORTAL
            </h1>
            <p className="text-xs text-[#8E95A5]">
              Управление базой данных команд, составами, логотипами и игроками
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/teams"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white text-xs font-semibold text-[#8E95A5] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>На сайт</span>
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-950/30 border border-red-900/50 hover:bg-red-900/40 text-xs font-semibold text-red-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Выйти</span>
          </button>
        </div>
      </div>

      {/* Admin Sub-navigation Tabs */}
      <div className="flex items-center gap-2 mt-6 mb-8 border-b border-white/[0.08] pb-px overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold tracking-wider uppercase rounded-t-xl transition-all whitespace-nowrap relative ${
                isActive
                  ? "bg-white/[0.08] text-white border-t border-x border-white/10"
                  : "text-[#8E95A5] hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-blue-500 rounded-full" />
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