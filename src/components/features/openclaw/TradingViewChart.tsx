"use client";

import React, { useState } from "react";

interface TradingViewChartProps {
  activeSymbol: string;
}

const SYMBOL_MAP: Record<string, string> = {
  SOL: "BINANCE:SOLUSDT",
  ssSOL: "BINANCE:SOLUSDT",
  SNAP: "BINANCE:JUPUSDT", // JUP represents custom Solana tokens
  USDC: "BINANCE:USDCUSDT"
};

const TIMEFRAMES = [
  { label: "5m", value: "5" },
  { label: "1h", value: "60" },
  { label: "1D", value: "D" },
  { label: "1W", value: "W" }
];

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ activeSymbol }) => {
  const [interval, setInterval] = useState("60"); // Default 1 hour

  const tvSymbol = SYMBOL_MAP[activeSymbol] || "BINANCE:SOLUSDT";

  // Construct TradingView Widget iframe URL
  const iframeUrl = `https://s3.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=${interval}&hidesidetoolbar=0&symboledit=0&saveimage=1&toolbarbg=1b1b1b&theme=dark&style=1&timezone=Etc%2FUTC&studies=%5B%5D&locale=en`;

  return (
    <div className="flex-1 w-full h-full flex flex-col min-h-0 select-none">
      
      {/* Timeframe selector header */}
      <div className="flex items-center gap-1.5 border-b border-border/20 pb-2 mb-2 shrink-0">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.label}
            onClick={() => setInterval(tf.value)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-colors ${
              interval === tf.value
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            {tf.label}
          </button>
        ))}
        <span className="text-[10px] text-muted-foreground font-mono ml-auto">
          TradingView Widget • {tvSymbol}
        </span>
      </div>

      {/* Chart Iframe */}
      <div className="flex-1 w-full h-full rounded-xl overflow-hidden bg-black/30 border border-border/40 relative">
        <iframe
          src={iframeUrl}
          style={{ width: "100%", height: "100%", border: "none" }}
          allowFullScreen
          title="TradingView Chart"
        />
      </div>

    </div>
  );
};
