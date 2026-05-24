"use client";

import React from "react";
import { Flame, TrendingUp, TrendingDown } from "lucide-react";
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
    const defaults = ["SOL", "GME", "BONK", "JUP", "BTC"];
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
        if (ticker === "SOL") displayCount += 8;
        if (ticker === "GME") displayCount += 6;
        if (ticker === "BONK") displayCount += 4;
        if (ticker === "JUP") displayCount += 3;
        if (ticker === "BTC") displayCount += 2;

        const totalSentiment = data.bullish + data.bearish + data.neutral;
        let bullishPct = 50;
        if (totalSentiment > 0) {
          bullishPct = Math.round((data.bullish / totalSentiment) * 100);
        } else {
          // Default mock sentiment
          if (ticker === "SOL") bullishPct = 88;
          if (ticker === "GME") bullishPct = 75;
          if (ticker === "BONK") bullishPct = 42;
          if (ticker === "JUP") bullishPct = 65;
          if (ticker === "BTC") bullishPct = 55;
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

  const renderSparkline = (ticker: string, bullishPct: number) => {
    const isBullish = bullishPct >= 50;
    const color = isBullish ? "#22c55e" : "#ef4444";
    
    // Vary the sparklines slightly based on ticker seed
    const hash = ticker.charCodeAt(0) + ticker.charCodeAt(ticker.length - 1);
    const points = isBullish
      ? `5,${20 + (hash % 5)} 18,${16 - (hash % 4)} 32,${22 + (hash % 3)} 48,${12 - (hash % 5)} 64,${15 + (hash % 4)} 80,${4 + (hash % 3)}`
      : `5,${4 + (hash % 5)} 18,${12 + (hash % 4)} 32,${8 - (hash % 3)} 48,${16 + (hash % 5)} 64,${14 - (hash % 4)} 80,${22 + (hash % 3)}`;

    return (
      <svg className="w-20 h-7 overflow-visible" stroke={color} strokeWidth="2" fill="none">
        <polyline points={points} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div className="glass-card p-5 rounded-2xl border border-border shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-md font-black font-display uppercase tracking-wider flex items-center gap-2 text-foreground">
          <Flame size={18} className="text-primary animate-pulse" />
          Trending Tickers
        </h3>
        {activeTicker && (
          <button
            onClick={() => onSelectTicker(null)}
            className="text-xs text-primary hover:underline uppercase font-bold font-mono"
          >
            Clear Filter
          </button>
        )}
      </div>

      <div className="space-y-3">
        {tickerStats.map(({ ticker, count, bullishPct }) => {
          const isActive = activeTicker === ticker;
          const isBullish = bullishPct >= 50;

          return (
            <button
              key={ticker}
              onClick={() => onSelectTicker(isActive ? null : ticker)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300 ${
                isActive
                  ? "bg-primary/10 border-primary text-foreground shadow-[0_0_12px_rgba(218,41,28,0.2)]"
                  : "bg-secondary/10 border-transparent hover:border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-black font-display text-base uppercase text-foreground">
                  ${ticker}
                </span>
                <span className="text-xs px-2 py-0.5 bg-muted rounded-md font-mono font-bold text-muted-foreground">
                  {count} posts
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* Mini SVG Sparkline */}
                <div className="hidden sm:block opacity-80 group-hover:opacity-100">
                  {renderSparkline(ticker, bullishPct)}
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span
                    className={`text-xs font-mono font-bold flex items-center gap-1 ${
                      isBullish ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {isBullish ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {bullishPct}%
                  </span>
                  <span className="text-[10px] uppercase text-muted-foreground tracking-widest font-mono">
                    {isBullish ? "Bullish" : "Bearish"}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
