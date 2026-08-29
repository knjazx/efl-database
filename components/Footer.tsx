import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/[0.05] bg-[#040405] py-8 mt-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-[#555555] uppercase tracking-widest font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">EFL</span>
          <span>&bull;</span>
          <span>Database</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/teams" className="hover:text-white transition-colors">
            TEAMS
          </Link>
          <Link href="/admin" className="hover:text-white transition-colors">
            ADMIN
          </Link>
        </div>
      </div>
    </footer>
  );
}