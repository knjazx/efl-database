"use client";

import { useState } from "react";
import { Shield, ArrowRight, User, Users, ChevronDown, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { REGIONS, COUNTRIES } from "@/lib/countries";

interface PlayerForm {
  nickname: string;
  faceitUrl: string;
  steamUrl: string;
  country: string;
}

const emptyPlayer = (): PlayerForm => ({ nickname: "", faceitUrl: "", steamUrl: "", country: "OTHER" });

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    teamName: "",
    teamTag: "",
    region: "CIS",
    logoUrl: "",
    captainNickname: "",
    captainDiscord: "",
    captainTelegram: "",
    captainSteam: "",
    captainFaceit: "",
    captainCountry: "OTHER",
    mainPlayers: [emptyPlayer(), emptyPlayer(), emptyPlayer(), emptyPlayer(), emptyPlayer()],
    subs: [emptyPlayer(), emptyPlayer(), emptyPlayer()],
    coach: emptyPlayer()
  });
  
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingLogo(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, logoUrl: data.url }));
      } else {
        alert("Ошибка загрузки");
      }
    } catch {
      alert("Ошибка сети при загрузке");
    }
    setUploadingLogo(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Произошла ошибка при отправке заявки.");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg("Ошибка сети. Попробуйте еще раз.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleArrayChange = (type: 'mainPlayers' | 'subs' | 'coach', index: number, field: keyof PlayerForm, value: string) => {
    const newFormData = { ...formData };
    if (type === 'coach') {
      newFormData.coach = { ...newFormData.coach, [field]: value };
    } else {
      newFormData[type][index] = { ...newFormData[type][index], [field]: value };
    }
    setFormData(newFormData);
  };

  if (status === "success") {
    return (
      <div className="max-w-3|e mx-auto px-6 py-20 min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-white/[0.04] border border-white/10 flex items-center justify-center text-emerald-500 mb-8">
          <Shield className="w-10 h-10" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tight mb-4">
          ЗАЯВКА ПРИНЯТА
        </h1>
        <p className="text-[#888888] text-sm max-w-lg mb-10 leading-relaxed">
          Ваша заявка на регистрацию команды успешно отправлена. Администрация лиги рассмотрит её в ближайшее время. Если заявка будет одобрена, команда и все указанные игроки появятся в реестре.
        </p>
        <Link 
          href="/"
          className="px-8 py-3 bg-white text-black text-xs font-extrabold uppercase tracking-widest hover:bg-neutral-200 transition-colors"
        >
          НА ГЛАВНУЮ
        </Link>
      </div>
    );
  }

  const renderPlayerBlock = (title: string, type: any, index: number, data: any, required: boolean = false) => (
    <div key={type + "-" + index} className="bg-[#151515] border border-white/10 p-6 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-widest">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-[#666666] uppercase tracking-widest mb-1">Никнейм {required ? '*' : ''}</label>
              <input 
                required={required}
                value={data.nickname}
                onChange={(e) => handleArrayChange(type, index, 'nickname', e.target.value)}
                className="w-full bg-[#121212] border border-white/[0.15] p-2 text-white text-sm focus:border-white focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#666666] uppercase tracking-widest mb-1">Страна</label>
              <select 
                value={data.country}
                onChange={(e) => handleArrayChange(type, index, 'country', e.target.value)}
                className="w-full bg-[#121212] border border-white/[0.15] p-2 text-white text-sm focus:border-white focus:outline-none transition-colors appearance-none"
              >
                {
                  COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))
                }
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#666666] uppercase tracking-widest mb-1">Steam URL (опционально)</label>
              <input 
                value={data.steamUrl}
                onChange={(e) => handleArrayChange(type, index, 'steamUrl', e.target.value)}
                className="w-full bg-[#121212] border border-white/[0.15] p-2 text-white text-sm focus:border-white focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#666666] uppercase tracking-widest mb-1">Faceit URL (опционально)</label>
              <input 
                value={data.faceitUrl}
                onChange={(e) => handleArrayChange(type, index, 'faceitUrl', e.target.value)}
                className="w-full bg-[#121212] border border-white/[0.15] p-2 text-white text-sm focus:border-white focus:outline-none transition-colors"
              />
            </div>
        </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-12 border-b border-white/10 pb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tight mb-3">
          РЕГИСТРАЦИЯ <span className="text-[#555555]">КОМАНДЫ</span>
        </h1>
        <p className="text-[#888888] text-sm leading-relaxed max-w-2xl">
          Заполните форму ниже для подачи заявки. <b>Важно:</b> В команде должно быть ровно 5 игроков основы (включая владельца), до 3 запасных и 1 тренер (по желанию).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* TEAM INFO */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 border-b border-white/[0.1] pb-2">
            <Shield className="w-4 h-4 text-[#555555]" />
            1. ДАННЫЕ КОМАНДЫ
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-mono text-[#666666] uppercase tracking-widest mb-2">Название команды *</label>
              <input 
                required
                name="teamName"
                value={formData.teamName}
                onChange={handleChange}
                className="w-full bg-[#151515] border border-white/[0.15] p-3 text-white focus:border-white focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#666666] uppercase tracking-widest mb-2">Тег *</label>
              <input 
                required
                name="teamTag"
                value={formData.teamTag}
                onChange={handleChange}
                className="w-full bg-[#151515] border border-white/[0.15] p-3 text-white focus:border-white focus:outline-none transition-colors uppercase"
                maxLength={6}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-mono text-[#666666] uppercase tracking-widest mb-2">Регион *</label>
              <select 
                name="region"
                value={formData.region}
                onChange={handleChange}
                className="w-full bg-[#151515] border border-white/[0.15] p-3 text-white focus:border-white focus:outline-none transition-colors appearance-none"
              >
                {
                  REGIONS.map((r) => (
                    <option key={r.code} value={r.code}>{r.name}</option>
                  ))
                }
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#666666] uppercase tracking-widest mb-2">Ссылка на логотип ИЛИ файл *</label>
              <div className="flex gap-2">
                <input 
                  required={!formData.logoUrl}
                  name="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleChange}
                  className="flex-1 w-full bg-[#151515] border border-white/[0.15] p-3 text-white focus:border-white focus:outline-none transition-colors"
                  placeholder="https://..."
                />
                <label className="bg-[#151515] border border-white/[0.15] px-4 py-3 text-[#aaa] cursor-pointer hover:bg-white/[0.02] flex items-center justify-center transition-colors">
                  <span className="text-[10px] font-bold uppercase tracking-widest">{uploadingLogo ? '...' : 'Загрузить'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* OWNER INFO */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 border-b border-white/[0.1] pb-2">
            <User className="w-4 h-4 text-[#555555]" />
            2. КОНТАКТЫ ВЛАДЕЛЬЦА
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-mono text-[#666666] uppercase tracking-widest mb-2">Никнейм *</label>
              <input 
                required
                name="captainNickname"
                value={formData.captainNickname}
                onChange={handleChange}
                className="w-full bg-[#151515] border border-white/[0.15] p-3 text-white focus:border-white focus:outline-none transition-colors "
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#666666] uppercase tracking-widest mb-2">Страна</label>
              <select 
                name="captainCountry"
                value={formData.captainCountry}
                onChange={handleChange}
                className="w-full bg-[#151515] border border-white/[0.15] p-3 text-white focus:border-white focus:outline-none transition-colors appearance-none"
              >
                {
                  COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))
                }
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-mono text-[#666666] uppercase tracking-widest mb-2">Discord для связи *</label>
              <input 
                required
                name="captainDiscord"
                value={formData.captainDiscord}
                onChange={handleChange}
                className="w-full bg-[#151515] border border-white/[0.15] p-3 text-white focus:border-white focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#666666] uppercase tracking-widest mb-2">Telegram для связи *</label>
              <input 
                required
                name="captainTelegram"
                value={formData.captainTelegram}
                onChange={handleChange}
                className="w-full bg-[#151515] border border-white/[0.15] p-3 text-white focus:border-white focus:outline-none transition-colors"
                placeholder="@username"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-mono text-[#666666] uppercase tracking-widest mb-2">Steam URL (опционально)</label>
              <input 
                name="captainSteam"
                value={formData.captainSteam}
                onChange={handleChange}
                className="w-full bg-[#151515] border border-white/[0.15] p-3 text-white focus:border-white focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[#666666] uppercase tracking-widest mb-2">FACEIT URL (опционально)</label>
              <input 
                name="captainFaceit"
                value={formData.captainFaceit}
                onChange={handleChange}
                className="w-full bg-[#151515] border border-white/[0.15] p-3 text-white focus:border-white focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* ROSTER INFO */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 border-b border-white/[0.1] pb-2">
            <Users className="w-4 h-4 text-[#555555]" />
            3. ОСТАЛАНОЙ СОСТАВ
          </h2>
          
          <div className="space-y-4">
            <h3 className="text-xs text-[#888] font-bold uppercase tracking-widest mb-2">Игроки основы (обязательно)</h3>
            {formData.mainPlayers.map((p, i) => (
                renderPlayerBlock(`Игрок основы #${i+1}`, "mainPlayers", i, p, true)
            ))}
          </div>

          <div className="space-y-4 mt-8">
            <h3 className="text-xs text-[#888] font-bold uppercase tracking-widest mb-2">Запасные игроки (до 3)</h3>
            {formData.subs.map((p, i) => (
                renderPlayerBlock(`Запасной #${i+1}`, "subs", i, p, false)
            ))}
          </div>

          <div className="space-y-4 mt-8">
            <h3 className="text-xs text-[#888] font-bold uppercase tracking-widest mb-2">Тренер (опционально)</h3>
            {renderPlayerBlock(`Тренер`, "coach", 0, formData.coach, false)}
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-widest">
            {errorMsg}
          </div>
        )}

        <button 
          type="submit" 
          disabled={status === "loading"}
          className="w-full py-5 bg-white text-black font-black uppercase tracking-widest hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === "loading" ? "ОТПРАВКА..." : "ОТПРАВИТЬ ЗАЯВКУ"}
          {status !== "loading" && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
