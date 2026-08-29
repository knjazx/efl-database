"use client";

import React from "react";
import { getRegionInfo } from "@/lib/countries";

interface RegionBadgeProps {
  region?: string | null;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  showFullName?: boolean;
}

export function RegionBadge({
  region,
  className = "",
  size = "sm",
  showFullName = false,
}: RegionBadgeProps) {
  const reg = getRegionInfo(region);

  const sizeClasses = {
    xs: "px-1.5 py-[2px] text-[9px] font-black min-w-[20px]",
    sm: "px-2 py-[2.5px] text-[10.5px] font-black min-w-[25px]",
    md: "px-2.5 py-1 text-xs font-black min-w-[28px]",
    lg: "px-3 py-1.5 text-sm font-black min-w-[34px]",
  };

  return (
    <span
      style={{ backgroundColor: reg.colorHex }}
      className={`inline-flex items-center justify-center gap-1.5 uppercase font-sans font-black tracking-wide text-white ${sizeClasses[size] || sizeClasses.sm} shadow-sm select-none shrink-0 ${className}`}
      title={`${reg.name} (${reg.englishName})`}
    >
      <span className="leading-none">{reg.tag}</span>
      {showFullName && (
        <span className="font-bold text-white/95 normal-case text-[11px] tracking-normal leading-none ml-0.5">
          {reg.name}
        </span>
      )}
    </span>
  );
}
