"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Shield, Check, X, Clock, ExternalLink, ChevronDown, ChevronUp, User } from "lucide-react";

interface Application {
  id: string;
  teamName: string;
  teamTag: string;
  region: string;
  logoUrl: string | null;
  captainNickname: string;
  captainDiscord: string;
  captainTelegram: string | null;
  captainSteam: string | null;
  captainFaceit: string | null;
  status: string;
  roster: any;
  createdAt: string;
}

export default function ApplicationsAdminPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/applications");
      const data = await res.json();
      if (data.success) {
        setApps(data.applications);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    if (!confirm('Вы уверены?')) return;

    try {
      const res = await fetch("/api/admin/applications/" + id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        loadApps();
      } else {
        const d = await res.json();
        alert(d.error || "Ошибка");
      }
    } catch (e) {
      alert("Ошибка сети");
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const pendingApps = apps.filter(a => a.status === "PENDING");
  const historyApps = apps.filter(a => a.status !== "pending" && a.status !== "PENDING");

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <Clock className="w-6 h-6 text-emerald-500" />
            ЗАЯВКИ НА РЕГИСТРАЦИЮ
          </h1>
        </div>
        <button
          onClick={loadApps}
          className="text-xs font-bold text-white bg-white/[0.05] hover:bg-white/[0.1] px-4 py-2 transition-colors border border-white/[0.1]"
        >
          ОБНОВИТЬ
        </button>
      </div>

      <div className="space-y-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/[0.1] pb-2">
          НОВЫЕ ЗАЯВКИ ({pendingApps.length})
        </h2>

        {loading ? (
          <div className="text-xs text-[#666] animate-pulse">Загрузка...</div>
        ) : pendingApps.length === 0 ? (
          <div className="p-8 text-center border border-white/[0.05] bg-[#050505]">
            <p className="text-xs text-[#666]">Нет новых заявок.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingApps.map((app) => (
              <div key={app.id} className="p-0 border border-white/[0.1] bg-[#050505]">
                
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/[0.05] border border-white/[0.1] flex items-center justify-center flex-shrink-0">
                      {app.logoUrl ? (
                        <img src={app.logoUrl} alt={app.teamName} className="w-full h-full object-cover" />
                      ) : (
                        <Shield className="w-5 h-5 text-[#666]" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-[#666] font-mono mb-1">
                        REGION: {app.region} &bull; TAG: [{app.teamTag}]
                      </div>
                      <div className="font-black text-lg text-white uppercase">{app.teamName}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleExpand(app.id)}
                      className="px-6 py-3 border border-white/[0.2] text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                      {expanded[app.id] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      <span className="text-xs font-bold uppercase tracking-widest">{expanded[app.id] ? "Свернуть" : "Рассмотреть"}</span>
                    </button>
                  </div>
                </div>

                {expanded[app.id] && (
                  <div className="p-5 bg-[#020202] border-t border-white/10">
                    
                    {/* FULL DATA DOSSIER */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      {/* TEAM INFO */}
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2 mb-4">Данные команды</h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-[#666]">Название:</span>
                            <span className="text-white font-bold">{app.teamName}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-[#666]">Тег:</span>
                            <span className="text-white font-bold">[{app.teamTag}]</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-[#666]">Регион:</span>
                            <span className="text-white font-bold">{app.region}</span>
                          </div>
                          <div className="flex flex-col gap-2 pt-2">
                            <span className="text-[#666]">Логотип:</span>
                            {app.logoUrl ? (
                              <img src={app.logoUrl} alt="Logo" className="w-24 h-24 object-cover border border-white/10" />
                            ) : <span className="text-[#444]">Нет логотипа</span>}
                          </div>
                        </div>
                      </div>

                      {/* OWNER INFO */}
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2 mb-4 flex items-center gap-2">
                          <User className="w-4 h-4 text-emerald-500" />
                          Владелец (Контакты)
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-[#666]">Никнейм:</span>
                            <span className="text-white font-bold">{app.captainNickname}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-[#666]">Discord:</span>
                            <span className="text-emerald-400 font-mono">{app.captainDiscord}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-[#666]">Telegram:</span>
                            <span className="text-blue-400 font-mono">{app.captainTelegram || "-"}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-[#666]">Страна:</span>
                            <span className="text-white">{app.roster?.captainCountry || "Не указана"}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-[#666]">Steam:</span>
                            {app.captainSteam ? <a href={app.captainSteam} target="_blank" className="text-[#ff5500] hover:underline truncate max-w-[150px]">{app.captainSteam}</a> : <span className="text-[#444]">-</span>}
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-[#666]">Faceit:</span>
                            {app.captainFaceit ? <a href={app.captainFaceit} target="_blank" className="text-[#ff5500] hover:underline truncate max-w-[150px]">{app.captainFaceit}</a> : <span className="text-[#444]">-</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-xs font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2 mb-4">
                      Игровой состав (Ростер)
                    </h3>
                    
                    {app.roster ? (
                      <table className="w-full text-left text-xs mb-8">
                        <thead>
                          <tr className="text-[#666] border-b border-white/10">
                            <th className="pb-2">Роль</th>
                            <th className="pb-2">Ник</th>
                            <th className="pb-2">Страна</th>
                            <th className="pb-2">Steam</th>
                            <th className="pb-2">Faceit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {app.roster.mainPlayers && app.roster.mainPlayers.map((p: any, i: number) => (p.nickname && 
                            <tr key={"main-" + i} className="border-b border-white/5">
                              <td className="py-2 text-[#4d4d4d]">Main</td>
                              <td className="py-2 text-white">{p.nickname}</td>
                              <td className="py-2 text-[#888]">{p.country}</td>
                              <td className="py-2">
                                {p.steamUrl ? <a href={p.steamUrl} target="_blank" className="text-[#ff5500] hover:underline block max-w-[200px] truncate" title={p.steamUrl}>{p.steamUrl}</a> : "-"}
                              </td>
                              <td className="py-2">
                                {p.faceitUrl ? <a href={p.faceitUrl} target="_blank" className="text-[#ff5500] hover:underline block max-w-[200px] truncate" title={p.faceitUrl}>{p.faceitUrl}</a> : "-"}
                              </td>
                            </tr>
                          ))}
                          {app.roster.subs && app.roster.subs.map((p: any, i: number) => (p.nickname && 
                            <tr key={"sub-" + i} className="border-b border-white/5">
                              <td className="py-2 text-[#444]">Sub</td>
                              <td className="py-2 text-white">{p.nickname}</td>
                              <td className="py-2 text-[#888]">{p.country}</td>
                              <td className="py-2">
                                {p.steamUrl ? <a href={p.steamUrl} target="_blank" className="text-[#ff5500] hover:underline block max-w-[200px] truncate" title={p.steamUrl}>{p.steamUrl}</a> : "-"}
                              </td>
                              <td className="py-2">
                                {p.faceitUrl ? <a href={p.faceitUrl} target="_blank" className="text-[#ff5500] hover:underline block max-w-[200px] truncate" title={p.faceitUrl}>{p.faceitUrl}</a> : "-"}
                              </td>
                            </tr>
                          ))}
                          {app.roster.coach && app.roster.coach.nickname && (
                            <tr className="border-b border-white/5">
                              <td className="py-2 text-[#444]">Coach</td>
                              <td className="py-2 text-white">{app.roster.coach.nickname}</td>
                              <td className="py-2 text-[#888]">{app.roster.coach.country}</td>
                              <td className="py-2">
                                {app.roster.coach.steamUrl ? <a href={app.roster.coach.steamUrl} target="_blank" className="text-[#ff5500] hover:underline block max-w-[200px] truncate" title={app.roster.coach.steamUrl}>{app.roster.coach.steamUrl}</a> : "-"}
                              </td>
                              <td className="py-2">
                                {app.roster.coach.faceitUrl ? <a href={app.roster.coach.faceitUrl} target="_blank" className="text-[#ff5500] hover:underline block max-w-[200px] truncate" title={app.roster.coach.faceitUrl}>{app.roster.coach.faceitUrl}</a> : "-"}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-xs text-[#888] mb-8 p-4 border border-white/5 bg-white/[0.02]">
                        Эта заявка была отправлена до появления новой системы ростеров (состав не указан).
                      </div>
                    )}
                    
                    <div className="flex items-center justify-end gap-4 border-t border-white/10 pt-5 mt-8">
                      <button 
                        onClick={() => handleAction(app.id, "REJECT")}
                        className="px-6 py-3 border border-red-500/30 text-red-500 font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2"
                      >
                        <X className="w-5 h-5" /> ОТКЛОНИТЬ
                      </button>
                      <button 
                        onClick={() => handleAction(app.id, "APPROVE")}
                        className="px-6 py-3 bg-emerald-500 text-black font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors flex items-center gap-2"
                      >
                        <Check className="w-5 h-5" /> ПРИНЯТЬ И ОДОБРИТЬ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {historyApps.length > 0 && (
          <div className="mt-12">
            <h2 className="text-sm font-bold text-[#666] uppercase tracking-widest border-b border-white/[0.05] pb-2 mb-4">
              ИСТОРИЯ ЗАЯВОК
            </h2>
            <div className="space-y-2">
              {historyApps.map(app => (
                <div key={app.id} className="flex items-center justify-between p-3 border border-white/[0.02] bg-[#020202] text-xs">
                  <div className="flex items-center gap-3">
                    <span className={app.status === 'APPROVED' ? 'font-mono font-bold text-emerald-500' : 'font-mono font-bold text-red-500'}>
                      {app.status === 'APPROVED' ? '[ОДОБРЕНО]' : '[ОТКЛОНЕНО]'}
                    </span>
                    <span className="text-white font-bold">{app.teamName}</span>
                    <span className="text-[#666]">от {app.captainNickname}</span>
                  </div>
                  <div className="text-[#444] font-mono">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
