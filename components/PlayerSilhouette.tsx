"use client";

import React from "react";

interface PlayerSilhouetteProps {
  className?: string;
  glowColor?: "blue" | "amber" | "purple" | "emerald";
}

export function PlayerSilhouette({ className = "w-full h-full" }: PlayerSilhouetteProps) {
  return (
    <div className={`relative flex items-end justify-center overflow-hidden select-none w-full h-full ${className}`}>
      {/* Studio Background Ambient Halo Glow - Pure Monochrome White */}
      <div
        className="absolute top-1 left-1/2 -translate-x-1/2 w-44 h-44 rounded-full blur-2xl pointer-events-none transition-opacity duration-500 opacity-60 group-hover:opacity-90"
        style={{
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 60%, transparent 100%)",
        }}
      />

      {/* User's Exact Silhouette - 100% Pure Black & White Grayscale */}
      <img
        src="/player-silhouette.png"
        alt="Player Silhouette"
        className="w-full h-full object-cover object-top relative z-10 transition-transform duration-500 group-hover:scale-105 drop-shadow-[0_8px_24px_rgba(0,0,0,0.8)] grayscale contrast-125 brightness-95"
        loading="eager"
      />

      {/* Bottom subtle gradient fade into pitch black */}
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#050505] via-[#080808]/80 to-transparent pointer-events-none z-20" />
    </div>
  );
}

export function PlayerThumbnailSilhouette({ className = "w-full h-full" }: { className?: string }) {
  return (
    <div className={`relative flex items-end justify-center overflow-hidden bg-[#111111] select-none w-full h-full ${className}`}>
      <img
        src="/player-silhouette.png"
        alt="Player Thumbnail Silhouette"
        className="w-full h-full object-cover object-top opacity-90 pointer-events-none grayscale contrast-125"
        loading="lazy"
      />
    </div>
  );
}
