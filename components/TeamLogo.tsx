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
    return (
      <div className={`bg-gradient-to-br from-neutral-900 to-black border border-[#222222] flex flex-col items-center justify-center text-center font-black text-white p-1 select-none ${className}`}>
        <Shield className="w-5 h-5 text-[#666666] mb-0.5" />
        <span className="text-xs font-black tracking-wider text-white uppercase">{tag || name.substring(0, 3)}</span>
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
