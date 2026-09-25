"use client";

import React, { useMemo } from "react";
import { Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PublicKey } from "@solana/web3.js";

export type Market = {
  id: string;
  title: string;
  volume: string;
  yesPrice: number;
  noPrice: number;
  category: string;
  resolved: boolean;
  outcome: boolean | null;
  totalYesShares: number;
  totalNoShares: number;
  expiryTs?: number;
  marketStatePubkey: PublicKey;
  yesMint: PublicKey;
  noMint: PublicKey;
  vault: PublicKey;
};

interface MarketCardProps {
  market: Market;
  isFeatured?: boolean;
  onTrade: (market: Market, side: "yes" | "no") => void;
}

export function MarketCard({ market, onTrade }: MarketCardProps) {
  // Real-time calculations derived strictly from the market pool state
  const yesPercent = Math.max(1, Math.min(99, Math.round(market.yesPrice * 100)));
  const noPercent = 100 - yesPercent;

  // Real pool size in SOL derived from market vault / total shares
  const totalPoolSol = (market.totalYesShares + market.totalNoShares) / 1e9;
  const formattedPool = totalPoolSol.toLocaleString(undefined, {
    minimumFractionDigits: totalPoolSol >= 1000 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  // Calculate participant count from recorded trades for this market
  const participantCount = useMemo(() => {
    try {
      const stored = localStorage.getItem("street_sync_prediction_history");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const marketTrades = parsed.filter(
            (t: any) => t.marketId === market.id || t.marketTitle === market.title
          );
          const uniqueUsers = new Set(marketTrades.map((t: any) => t.user || t.signature || t.date));
          return uniqueUsers.size;
        }
      }
    } catch {
      // LocalStorage access fallback
    }
    return 0;
  }, [market.id, market.title]);

  // Calculate real-time trend vs initial 50% baseline
  const trendDiff = Math.round((market.yesPrice - 0.5) * 100);

  // Expiry / Active label
  const timeRemainingLabel = useMemo(() => {
    if (market.expiryTs && market.expiryTs > 0) {
      const now = Math.floor(Date.now() / 1000);
      const diffSec = market.expiryTs - now;
      if (diffSec <= 0) return "Expired";
      const days = Math.floor(diffSec / 86400);
      const hours = Math.floor((diffSec % 86400) / 3600);
      if (days > 0) return `Ends in ${days}d ${hours}h`;
      return `Ends in ${hours}h`;
    }
    return "Active Market";
  }, [market.expiryTs]);

  // Real-time trajectory points from recorded trades or base-to-current path (NO MOCK DATA)
  const trajectoryData = useMemo(() => {
    let tradeHistory: Array<{ prob: number; timeStr: string }> = [];
    try {
      const stored = localStorage.getItem("street_sync_prediction_history");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          tradeHistory = parsed
            .filter((t: any) => t.marketId === market.id || t.marketTitle === market.title)
            .map((t: any) => {
              const d = new Date(t.date || Date.now());
              const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
              const prob = t.side === "YES" 
                ? Math.round((t.price || 0.5) * 100)
                : Math.round((1 - (t.price || 0.5)) * 100);
              return { prob, timeStr };
            });
        }
      }
    } catch {
      // LocalStorage access fallback
    }

    // Always start at 50% baseline (market initial condition)
    const points: Array<{ prob: number; label: string }> = [{ prob: 50, label: "00:00 (50%)" }];

    if (tradeHistory.length > 0) {
      // Add real historical trades
      tradeHistory.forEach((t) => {
        points.push({ prob: t.prob, label: `${t.timeStr} (${t.prob}%)` });
      });
    }

    // Final point is always current real-time odds
    points.push({ prob: yesPercent, label: `Now: ${yesPercent}%` });

    return points;
  }, [market.id, market.title, yesPercent]);

  // Generate SVG path for the real-time sparkline
  const svgWidth = 500;
  const svgHeight = 70;
  const paddingX = 12;
  const paddingY = 8;
  const drawWidth = svgWidth - paddingX * 2;
  const drawHeight = svgHeight - paddingY * 2;

  const pathCoordinates = useMemo(() => {
    if (trajectoryData.length === 1) {
      const y = paddingY + drawHeight * (1 - trajectoryData[0].prob / 100);
      return `M ${paddingX} ${y} L ${svgWidth - paddingX} ${y}`;
    }

    return trajectoryData.map((pt, i) => {
      const x = paddingX + (i / (trajectoryData.length - 1)) * drawWidth;
      // Invert Y so 100% is near the top (paddingY) and 0% near bottom
      const y = paddingY + drawHeight * (1 - pt.prob / 100);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
  }, [trajectoryData, drawWidth, drawHeight]);

  const areaCoordinates = useMemo(() => {
    const bottomY = svgHeight;
    return `${pathCoordinates} L ${svgWidth - paddingX} ${bottomY} L ${paddingX} ${bottomY} Z`;
  }, [pathCoordinates, svgWidth, svgHeight, paddingX]);

  return (
    <div className="bg-card/50 backdrop-blur-xl border border-border/80 hover:border-primary/50 rounded-3xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between group relative overflow-hidden">
      {/* Subtle background ambient corner glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

      {/* TOP HEADER: Expiry / Status & Pool Calculation */}
      <div className="flex items-center justify-between gap-2.5 mb-4 relative z-10">
        <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground bg-muted/40 border border-border/60 px-3 py-1 rounded-full">
          <Clock className="w-3.5 h-3.5 text-muted-foreground/80" />
          {timeRemainingLabel}
        </span>

        <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground">
          {participantCount > 0 && (
            <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">
              {participantCount} {participantCount === 1 ? "player" : "players"} ·
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="text-primary font-black">◎</span> {formattedPool} SOL Pool
          </span>
        </div>
      </div>

      {/* MARKET TITLE */}
      <div className="mb-5 relative z-10">
        <h3 className="text-xl font-bold font-display leading-tight text-foreground group-hover:text-primary transition-colors">
          {market.title}
        </h3>
      </div>

      {/* PROBABILITY STATS & TWO-TONE PROBABILITY BAR */}
      <div className="space-y-2 mb-5 relative z-10">
        <div className="flex justify-between items-baseline text-xs font-mono">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-500 font-display">
              {yesPercent}%
            </span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Chance YES
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Chance NO
            </span>
            <span className="text-2xl font-black text-rose-500 font-display">
              {noPercent}%
            </span>
          </div>
        </div>

        {/* Real-time two-tone probability bar */}
        <div className="w-full h-2.5 bg-muted/60 rounded-full overflow-hidden flex p-0.5 gap-1 border border-border/40">
          <div
            style={{ width: `${yesPercent}%` }}
            className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
          />
          <div
            style={{ width: `${noPercent}%` }}
            className="h-full bg-rose-500 rounded-r-full transition-all duration-500"
          />
        </div>
      </div>

      {/* REAL-TIME IMPLIED TRAJECTORY SPARKLINE */}
      <div className="bg-background/40 border border-border/60 rounded-2xl p-4 mb-5 relative z-10">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Implied SOL Trajectory
          </span>
          <div className="flex items-center gap-1 font-bold text-xs">
            {trendDiff > 0 ? (
              <span className="text-emerald-500 flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> +{trendDiff}% trend
              </span>
            ) : trendDiff < 0 ? (
              <span className="text-rose-500 flex items-center gap-0.5">
                <TrendingDown className="w-3.5 h-3.5" /> {trendDiff}% trend
              </span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-0.5">
                <Minus className="w-3.5 h-3.5" /> 0.0% stable
              </span>
            )}
          </div>
        </div>

        {/* SVG Area Chart for Trajectory */}
        <div className="w-full h-[65px] relative">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`grad-yes-${market.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Guide Lines */}
            <line
              x1={paddingX}
              y1={paddingY + drawHeight * 0.25}
              x2={svgWidth - paddingX}
              y2={paddingY + drawHeight * 0.25}
              stroke="currentColor"
              strokeDasharray="4 4"
              className="text-border/40"
              strokeWidth="1"
            />
            <line
              x1={paddingX}
              y1={paddingY + drawHeight * 0.75}
              x2={svgWidth - paddingX}
              y2={paddingY + drawHeight * 0.75}
              stroke="currentColor"
              strokeDasharray="4 4"
              className="text-border/40"
              strokeWidth="1"
            />

            {/* Area Fill */}
            <path
              d={areaCoordinates}
              fill={`url(#grad-yes-${market.id})`}
            />

            {/* Line Stroke */}
            <path
              d={pathCoordinates}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* End Point Dot */}
            <circle
              cx={svgWidth - paddingX}
              cy={paddingY + drawHeight * (1 - yesPercent / 100)}
              r="3.5"
              className="fill-emerald-400 stroke-background stroke-2"
            />
          </svg>
        </div>

        {/* Time / Prob Axis Labels */}
        <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground/70 mt-1 border-t border-border/30 pt-1.5">
          <span>{trajectoryData[0]?.label || "Start (50%)"}</span>
          {trajectoryData.length > 2 && (
            <span>{trajectoryData[Math.floor(trajectoryData.length / 2)]?.label}</span>
          )}
          <span className="font-bold text-foreground">{`Now: ${yesPercent}%`}</span>
        </div>
      </div>

      {/* ACTION BUTTONS: Clean BUY YES & BUY NO */}
      <div className="grid grid-cols-2 gap-3 relative z-10 mt-auto">
        <button
          onClick={() => onTrade(market, "yes")}
          className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/30 font-black text-sm uppercase tracking-wider font-display transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-emerald-500/20 active:scale-[0.98] cursor-pointer"
        >
          Buy YES
        </button>

        <button
          onClick={() => onTrade(market, "no")}
          className="w-full py-3.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 font-black text-sm uppercase tracking-wider font-display transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-rose-500/20 active:scale-[0.98] cursor-pointer"
        >
          Buy NO
        </button>
      </div>
    </div>
  );
}
