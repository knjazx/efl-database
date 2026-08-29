"use client";

import { useState } from "react";
import { Shield } from "lucide-react";

interface TeamLogoProps {
  logoUrl?: string;
  name: string;
  tag: string;
  className?: string;
}

export function TeamLogo({ logoUrl, name, tag, className = "w-full h-full" }: TeamLogoProps) {
  const [hasError, setHasError] = useState(false);

  const hasLogo = logoUrl && logoUrl.trim().length > 0;

  if (!hasLogo || hasError) {
    const displayTag = (tag || name.substring(0, 3)).toUpperCase();
    return (
      <div className={`bg-[#0A0A0A] border border-white/[0.05] flex flex-col items-center justify-center text-center select-none w-full h-full p-2 ${className}`}>
        <div className="w-8 h-8 bg-white/5 border border-white/10 flex items-center justify-center mb-1.5 shadow-inner">
          <Shield className="w-4 h-4 text-white/30" />
        </div>
        <span className="text-sm font-black font-mono tracking-widest text-white uppercase line-clamp-1">
          {displayTag}
        </span>
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={`${name} Logo`}
      className={`${className} object-cover`}
      onError={() => setHasError(true)}
    />
  );
}
