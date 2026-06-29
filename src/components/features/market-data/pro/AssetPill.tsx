"use client";

import React from "react";

export interface TokenData {
  ticker: string;
  name: string;
  price: number;
  change24h: number;
  logoBg: string;
  description?: string;
}

interface AssetPillProps extends TokenData {
  showDescription?: boolean;
}

export function AssetPill({ ticker, name, price, change24h, logoBg, description, showDescription }: AssetPillProps) {
  const isPositive = change24h >= 0;
  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-border/80 rounded-xl hover:bg-secondary/40 transition-all shadow-sm max-w-sm shrink-0">
      <div className={`w-8 h-8 rounded-full ${logoBg} flex items-center justify-center font-bold text-xs text-white shadow-inner font-mono`}>
        {ticker.slice(0, 3)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-black text-sm text-foreground tracking-tight">{ticker}</span>
          <span className="text-[10px] text-muted-foreground uppercase font-mono truncate">
            {showDescription && description ? description : name}
          </span>
        </div>
        <div className="text-xs font-mono font-bold text-foreground/90">
          ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
      <div className={`text-xs font-mono font-black px-2 py-0.5 rounded ${isPositive ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
        {isPositive ? "+" : ""}{change24h.toFixed(2)}%
      </div>
    </div>
  );
}
