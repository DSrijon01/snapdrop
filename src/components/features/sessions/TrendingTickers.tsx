"use client";

import React from "react";
import { Flame, TrendingUp, TrendingDown, Sparkles, Filter } from "lucide-react";
import { Post } from "./mockData";

interface TrendingTickersProps {
  posts: Post[];
  activeTicker: string | null;
  onSelectTicker: (ticker: string | null) => void;
}

export function TrendingTickers({ posts, activeTicker, onSelectTicker }: TrendingTickersProps) {
  // Aggregate stats from posts
  const tickerStats = React.useMemo(() => {
    const stats: Record<string, { count: number; bullish: number; bearish: number; neutral: number }> = {};
    
    // Add default popular tickers to guarantee they show up
    const defaults = ["SOL", "GME", "BONK", "JUP", "BTC", "ETH"];
    defaults.forEach((t) => {
      stats[t] = { count: 0, bullish: 0, bearish: 0, neutral: 0 };
    });

    posts.forEach((post) => {
      if (post.ticker) {
        const t = post.ticker.toUpperCase();
        if (!stats[t]) {
          stats[t] = { count: 0, bullish: 0, bearish: 0, neutral: 0 };
        }
        stats[t].count++;
        if (post.sentiment === "BULLISH") stats[t].bullish++;
        else if (post.sentiment === "BEARISH") stats[t].bearish++;
        else stats[t].neutral++;
      }
    });

    // Clean up defaults with 0 counts if they aren't mentioned, but keep top ones
    return Object.entries(stats)
      .map(([ticker, data]) => {
        // Boost counts slightly for defaults to make it look active
        let displayCount = data.count;
        if (ticker === "SOL") displayCount += 9;
        if (ticker === "GME") displayCount += 6;
        if (ticker === "BONK") displayCount += 4;
        if (ticker === "JUP") displayCount += 3;
        if (ticker === "BTC") displayCount += 5;
        if (ticker === "ETH") displayCount += 2;

        const totalSentiment = data.bullish + data.bearish + data.neutral;
        let bullishPct = 50;
        if (totalSentiment > 0) {
          bullishPct = Math.round((data.bullish / totalSentiment) * 100);
        } else {
          // Default mock sentiment
          if (ticker === "SOL") bullishPct = 92;
          if (ticker === "GME") bullishPct = 78;
          if (ticker === "BONK") bullishPct = 45;
          if (ticker === "JUP") bullishPct = 68;
          if (ticker === "BTC") bullishPct = 60;
          if (ticker === "ETH") bullishPct = 55;
        }

        return {
          ticker,
          count: displayCount,
          bullishPct,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [posts]);

  // Premium, smooth SVG financial sparkline with area gradient fill
  const renderSparkline = (ticker: string, bullishPct: number, idx: number) => {
    const isBullish = bullishPct >= 50;
    const strokeColor = isBullish ? "#10b981" : "#ef4444";
    const gradientId = `ticker-grad-${ticker}-${idx}`;
    
    // Deterministic curve variation based on ticker
    const hash = ticker.charCodeAt(0) * 5 + (ticker.charCodeAt(1) || 2) * 11;
    const y0 = isBullish ? 22 : 8;
    const y1 = isBullish ? 16 - (hash % 6) : 12 + (hash % 6);
    const y2 = isBullish ? 18 + (hash % 4) : 14 - (hash % 4);
    const y3 = isBullish ? 10 - (hash % 4) : 22 + (hash % 4);
    const y4 = isBullish ? 5 : 26;

    const pathD = `M 2 ${y0} C 18 ${y1}, 34 ${y2}, 50 ${y3} L 72 ${y4}`;
    const fillD = `M 2 ${y0} C 18 ${y1}, 34 ${y2}, 50 ${y3} L 72 ${y4} L 72 30 L 2 30 Z`;

    return (
      <svg className="w-16 sm:w-20 h-7 overflow-hidden shrink-0" viewBox="0 0 74 30" fill="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill={`url(#${gradientId})`} />
        <path d={pathD} stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return "bg-amber-500/20 text-amber-500 border-amber-500/30";
      case 1:
        return "bg-slate-300/20 text-slate-300 border-slate-300/30";
      case 2:
        return "bg-amber-700/20 text-amber-600 border-amber-700/30";
      default:
        return "bg-secondary text-muted-foreground border-border/40";
    }
  };

  return (
    <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border shadow-lg space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Flame size={16} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black font-display uppercase tracking-wider text-foreground leading-tight">
              Trending Tickers
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">
              Live Social Alpha &amp; Sentiment
            </span>
          </div>
        </div>

        {activeTicker && (
          <button
            onClick={() => onSelectTicker(null)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/15 border border-primary/30 text-[11px] text-primary hover:bg-primary/25 font-bold font-mono transition-colors cursor-pointer"
          >
            <Filter size={11} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Tickers List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
        {tickerStats.map(({ ticker, count, bullishPct }, index) => {
          const isActive = activeTicker === ticker;
          const isBullish = bullishPct >= 50;

          return (
            <button
              key={ticker}
              onClick={() => onSelectTicker(isActive ? null : ticker)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 group text-left cursor-pointer ${
                isActive
                  ? "bg-primary/10 border-primary text-foreground shadow-[0_0_14px_rgba(218,41,28,0.2)] ring-1 ring-primary/40"
                  : "bg-secondary/20 hover:bg-secondary/50 border-border/60 hover:border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {/* Left: Rank & Ticker Info */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-5 h-5 rounded-md border text-[10px] font-mono font-black flex items-center justify-center shrink-0 ${getRankBadge(
                    index
                  )}`}
                >
                  {index + 1}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black font-display text-sm uppercase text-foreground tracking-tight">
                      ${ticker}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-secondary/80 rounded font-mono font-bold text-muted-foreground">
                      {count}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Sparkline + Sentiment Badge */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* SVG Area Sparkline */}
                <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                  {renderSparkline(ticker, bullishPct, index)}
                </div>

                {/* Sentiment Pill */}
                <div
                  className={`px-2 py-1 rounded-lg border font-mono text-[11px] font-bold flex items-center gap-1 shrink-0 ${
                    isBullish
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                      : "bg-red-500/10 text-red-500 border-red-500/25"
                  }`}
                >
                  {isBullish ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{bullishPct}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
