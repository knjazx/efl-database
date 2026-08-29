import React from "react";

interface FaceitLevelProps {
  level: number;
  className?: string;
}

export function FaceitLevel({ level, className = "w-8 h-8" }: FaceitLevelProps) {
  // Faceit level colors
  const getColor = (lvl: number) => {
    if (lvl === 1) return "#EEEEEE"; // White
    if (lvl >= 2 && lvl <= 3) return "#1CE500"; // Green
    if (lvl >= 4 && lvl <= 7) return "#FFC600"; // Yellow
    if (lvl >= 8 && lvl <= 9) return "#FF5500"; // Orange
    if (lvl === 10) return "#FE0000"; // Red
    return "#EEEEEE"; // Fallback
  };

  // Faceit arcs don't form a complete circle, they leave a gap.
  // Max progress is around 85% of the full circle.
  const getProgress = (lvl: number) => {
    // Level 1: 5% of the arc
    // Level 10: 85% of the arc (full Faceit arc)
    return 0.05 + (0.80 * (lvl - 1) / 9);
  };

  const color = getColor(level);
  const progress = getProgress(level);

  const size = 36;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // The background arc represents the "empty" track (always 85% full)
  const bgDasharray = `${circumference * 0.85} ${circumference}`;
  // The foreground arc represents the level
  const fgDasharray = `${circumference * progress} ${circumference}`;

  // Start from bottom left (approx 135 degrees)
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background dark arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="#1F1F1F"
        stroke="#111111"
        strokeWidth={strokeWidth}
        strokeDasharray={bgDasharray}
        strokeLinecap="round"
        transform={`rotate(135 ${size / 2} ${size / 2})`}
      />
      {/* Colored Arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={fgDasharray}
        strokeLinecap="round"
        transform={`rotate(135 ${size / 2} ${size / 2})`}
      />
      {/* Level text */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".3em"
        fill={level === 10 ? "#FE0000" : color}
        fontSize="16"
        fontWeight="900"
        fontFamily="sans-serif"
      >
        {level}
      </text>
    </svg>
  );
}
