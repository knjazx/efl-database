"use client";

import React, { useState } from "react";
import { getCountry } from "@/lib/countries";

interface CountryFlagProps {
  code?: string | null;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  showName?: boolean;
  nameClassName?: string;
}

export function CountryFlag({
  code,
  className = "",
  size = "sm",
  showName = false,
  nameClassName = "",
}: CountryFlagProps) {
  const [hasError, setHasError] = useState(false);
  const country = getCountry(code);

  const sizeClasses = {
    xs: "w-3.5 h-2.5",
    sm: "w-5 h-3.5",
    md: "w-6 h-4",
    lg: "w-8 h-5",
  };

  const selectedSizeClass = sizeClasses[size] || sizeClasses.sm;
  const isIsoCode = country.code && country.code.length === 2 && country.code !== "OTHER";
  const flagSrc = isIsoCode
    ? `https://flagcdn.com/w40/${country.code.toLowerCase()}.png`
    : "";
  const flagSrcSet = isIsoCode
    ? `https://flagcdn.com/w80/${country.code.toLowerCase()}.png 2x`
    : "";

  return (
    <span className="inline-flex items-center gap-1.5 align-middle flex-shrink-0" title={`${country.name} (${country.code})`}>
      {flagSrc && !hasError ? (
        <img
          src={flagSrc}
          srcSet={flagSrcSet}
          alt={country.name}
          onError={() => setHasError(true)}
          className={`object-cover border border-white/20 shadow-sm flex-shrink-0 ${selectedSizeClass} ${className}`}
          loading="lazy"
        />
      ) : (
        <span className="text-sm select-none" role="img" aria-label={country.name}>
          {country.flagEmoji || "🌐"}
        </span>
      )}
      {showName && (
        <span className={`text-xs font-semibold text-white truncate ${nameClassName}`}>
          {country.name}
        </span>
      )}
    </span>
  );
}
