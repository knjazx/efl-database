import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t border-[#222222] bg-[#050505] py-8 mt-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#858585]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white tracking-widest">EFL</span>
          <span>&bull;</span>
          <span>Electronic Future League Official Database</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/teams" className="hover:text-white transition-colors">
            Teams
          </Link>
          <Link href="/admin" className="hover:text-white transition-colors">
            Admin Portal
          </Link>
        </div>
      </div>
    </footer>
  );
}
