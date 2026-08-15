"use client";

import React, { useState, useRef, useEffect } from "react";
import { Swords, Check, Lock, Play, ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw } from "lucide-react";

export interface BracketNodeData {
  id: string;
  round: number;
  position: number;
  bracketType: "WINNERS" | "LOSERS" | "GRAND_FINAL";
  match?: {
    id: string;
    teamAId: string;
    teamBId: string;
    teamCustomNameA?: string | null;
    teamCustomNameB?: string | null;
    scoreA: number;
    scoreB: number;
    status: string; // SCHEDULED, LIVE, FINISHED, CANCELLED
    bestOf: number;
    teamA?: { name: string; tag: string; logoUrl?: string | null } | null;
    teamB?: { name: string; tag: string; logoUrl?: string | null } | null;
    winnerId?: string | null;
  } | null;
}

interface Props {
  nodes: BracketNodeData[];
  onMatchClick?: (matchId: string) => void;
  isAdmin?: boolean;
}

export function BracketView({ nodes, onMatchClick, isAdmin }: Props) {
  const [zoom, setZoom] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bracketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const el = bracketRef.current;
    if (!el) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((prev) => {
        const zoomFactor = e.deltaY > 0 ? -0.1 : 0.1;
        return Math.min(Math.max(prev + zoomFactor, 0.3), 2.0);
      });
    };
    
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Group nodes by round and bracket type
  const roundsMap: Record<number, BracketNodeData[]> = {};

  nodes.forEach((n) => {
    if (!roundsMap[n.round]) {
      roundsMap[n.round] = [];
    }
    roundsMap[n.round].push(n);
  });

  const sortedRounds = Object.keys(roundsMap)
    .map(Number)
    .sort((a, b) => a - b);

  function getRoundTitle(round: number, totalRounds: number) {
    if (round === totalRounds) return "GRAND FINAL";
    if (round === totalRounds - 1) return "SEMIFINALS";
    if (round === totalRounds - 2) return "QUARTERFINALS";
    if (round === totalRounds - 3) return "ROUND OF 16";
    return `ROUND ${round}`;
  }

  const totalRounds = sortedRounds.length;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.3));
  const handleReset = () => { setZoom(1); setTranslateX(0); setTranslateY(0); };
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - translateX, y: e.clientY - translateY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTranslateX(e.clientX - dragStart.x);
    setTranslateY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  return (
    <div ref={wrapperRef} className="w-full bg-[#050505] border border-[#222222] rounded-xl flex flex-col shadow-2xl relative" style={{ height: isFullscreen ? '100vh' : 'auto' }}>
      {/* Top Banner & Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1F1F1F] p-4 bg-[#0A0A0A] z-10 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">PLAYOFF BRACKET</h2>
        </div>
        
        {/* Toolbar */}
        <div className="flex items-center gap-1 bg-[#0D0D0D] border border-[#1F1F1F] rounded-xl p-1">
          <button onClick={handleZoomOut} className="p-1.5 bg-[#141414] border border-[#333] rounded-lg hover:border-white/40 transition-colors text-[#888] hover:text-white" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="px-2 text-xs font-mono text-[#666] w-12 text-center">{Math.round(zoom * 100)}%</div>
          <button onClick={handleZoomIn} className="p-1.5 bg-[#141414] border border-[#333] rounded-lg hover:border-white/40 transition-colors text-[#888] hover:text-white" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-[#333] mx-1"></div>
          <button onClick={handleReset} className="p-1.5 bg-[#141414] border border-[#333] rounded-lg hover:border-white/40 transition-colors text-[#888] hover:text-white" title="Reset View">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={toggleFullscreen} className="p-1.5 bg-[#141414] border border-[#333] rounded-lg hover:border-white/40 transition-colors text-[#888] hover:text-white" title="Toggle Fullscreen">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Interactive Bracket Container */}
      <div 
        ref={bracketRef}
        className={`flex-1 overflow-hidden relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} bg-[#050505]`}
        style={{ minHeight: '500px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          className="absolute transform-gpu origin-top-left transition-transform duration-75 ease-out p-8"
          style={{ 
            transform: `translate(${translateX}px, ${translateY}px) scale(${zoom})`,
          }}
        >
          <div className="flex items-stretch gap-12 min-w-max">
            {sortedRounds.map((rNum) => {
              const roundNodes = roundsMap[rNum].sort((a, b) => a.position - b.position);
              const title = getRoundTitle(rNum, totalRounds);

              return (
                <div key={rNum} className="flex flex-col w-72 flex-shrink-0 gap-4">
                  {/* Round Header */}
                  <div className="bg-[#0D0D0D] border border-[#222] py-2 px-3 rounded-lg text-center font-mono font-bold text-xs text-white tracking-widest uppercase shadow-md">
                    {title}
                  </div>

                  {/* Match Cards Column */}
                  <div className="flex flex-col justify-around flex-1 gap-6 py-4">
                    {roundNodes.map((n) => {
                      const match = n.match;
                      const nameA = match?.teamCustomNameA || match?.teamA?.name || "TBD";
                      const tagA = match?.teamA?.tag || "TBD";

                      const nameB = match?.teamCustomNameB || match?.teamB?.name || "TBD";
                      const tagB = match?.teamB?.tag || "TBD";

                      const isFinished = match?.status === "FINISHED";
                      const isLive = match?.status === "LIVE";

                      const isAWin = isFinished && (match?.winnerId ? match?.winnerId === match?.teamAId : (match?.scoreA ?? 0) > (match?.scoreB ?? 0));
                      const isBWin = isFinished && (match?.winnerId ? match?.winnerId === match?.teamBId : (match?.scoreB ?? 0) > (match?.scoreA ?? 0));

                      return (
                        <div
                          key={n.id}
                          onClick={(e) => {
                            if (!isDragging && match && onMatchClick) {
                              onMatchClick(match.id);
                            }
                          }}
                          className={`group relative bg-[#0D0D0D] border rounded-lg p-3 transition-all hover:border-white/40 shadow-lg ${
                            isLive
                              ? "border-emerald-500/50 shadow-emerald-500/10"
                              : "border-[#222222]"
                          } ${isDragging ? 'pointer-events-none' : 'cursor-pointer'}`}
                        >
                          {/* Status Badge & BO Format */}
                          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#1A1A1A] text-[10px] font-mono">
                            <span className="text-[#666666] font-semibold uppercase">BO{match?.bestOf || 1}</span>
                            {isFinished ? (
                              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                <Check className="w-3 h-3" /> FINISHED
                              </span>
                            ) : isLive ? (
                              <span className="flex items-center gap-1 text-emerald-400 font-bold animate-pulse">
                                <Play className="w-3 h-3 fill-current" /> LIVE
                              </span>
                            ) : (
                              <span className="text-[#555555]">UPCOMING</span>
                            )}
                          </div>

                          {/* Team A */}
                          <div
                            className={`flex items-center justify-between py-1.5 px-2 rounded transition-colors ${
                              isAWin ? "bg-emerald-950/20 text-white font-bold" : "text-[#A0A0A0]"
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              {match?.teamA?.logoUrl ? (
                                <img
                                  src={match.teamA.logoUrl}
                                  alt={nameA}
                                  className="w-5 h-5 object-contain rounded bg-[#141414]"
                                  draggable={false}
                                />
                              ) : (
                                <div className="w-5 h-5 rounded bg-[#1A1A1A] text-[9px] font-mono flex items-center justify-center text-[#666]">
                                  {tagA.substring(0, 2)}
                                </div>
                              )}
                              <span className="text-xs truncate font-mono">{nameA}</span>
                            </div>
                            <span
                              className={`text-xs font-mono font-bold ${
                                isAWin ? "text-emerald-400 text-sm" : "text-[#777]"
                              }`}
                            >
                              {match?.scoreA ?? 0}
                            </span>
                          </div>

                          {/* Team B */}
                          <div
                            className={`flex items-center justify-between py-1.5 px-2 rounded transition-colors mt-1 ${
                              isBWin ? "bg-emerald-950/20 text-white font-bold" : "text-[#A0A0A0]"
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              {match?.teamB?.logoUrl ? (
                                <img
                                  src={match.teamB.logoUrl}
                                  alt={nameB}
                                  className="w-5 h-5 object-contain rounded bg-[#141414]"
                                  draggable={false}
                                />
                              ) : (
                                <div className="w-5 h-5 rounded bg-[#1A1A1A] text-[9px] font-mono flex items-center justify-center text-[#666]">
                                  {tagB.substring(0, 2)}
                                </div>
                              )}
                              <span className="text-xs truncate font-mono">{nameB}</span>
                            </div>
                            <span
                              className={`text-xs font-mono font-bold ${
                                isBWin ? "text-emerald-400 text-sm" : "text-[#777]"
                              }`}
                            >
                              {match?.scoreB ?? 0}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
