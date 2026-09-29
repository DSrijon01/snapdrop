"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  ReferenceLine
} from "recharts";
import { Activity, RefreshCw, BarChart2, TrendingUp, Sparkles, ExternalLink } from "lucide-react";

interface TradingViewChartProps {
  activeSymbol: string;
}

interface CandleData {
  time: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20?: number;
}

interface MarketDataResponse {
  success: boolean;
  symbol: string;
  interval: string;
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  candles: CandleData[];
  isSimulated?: boolean;
}

const TIMEFRAMES = [
  { label: "5S", value: "5s", title: "5 Seconds (Polymarket Fast Trail)" },
  { label: "1M", value: "1m", title: "1 Minute" },
  { label: "5M", value: "5m", title: "5 Minutes" },
  { label: "15M", value: "15m", title: "15 Minutes" },
  { label: "1H", value: "1h", title: "1 Hour" },
  { label: "4H", value: "4h", title: "4 Hours" },
  { label: "1D", value: "1d", title: "1 Day" },
];

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ activeSymbol }) => {
  const [interval, setInterval] = useState("5s");
  const [marketData, setMarketData] = useState<MarketDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTradingViewEmbed, setShowTradingViewEmbed] = useState(false);
  const tvContainerRef = useRef<HTMLDivElement>(null);

  // Fetch live market data from our API
  const fetchMarketData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const res = await fetch(
        `/api/openclaw/market-data?symbol=${encodeURIComponent(activeSymbol)}&interval=${interval}&limit=50`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: MarketDataResponse = await res.json();
      if (data.success && data.candles?.length > 0) {
        setMarketData(data);
      }
    } catch (err) {
      console.warn("[TradingViewChart] Failed to fetch market data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial and on symbol/interval change
  useEffect(() => {
    fetchMarketData();
  }, [activeSymbol, interval]);

  // Auto-refresh trail: high-frequency 2.5s for Polymarket 5S trail, 6s for longer
  useEffect(() => {
    const pollInterval = interval === "5s" ? 2500 : 6000;
    const timer = window.setInterval(() => {
      if (!showTradingViewEmbed) {
        fetchMarketData(true);
      }
    }, pollInterval);
    return () => clearInterval(timer);
  }, [activeSymbol, interval, showTradingViewEmbed]);

  // Official TradingView Script Embed handler when toggled
  useEffect(() => {
    if (!showTradingViewEmbed || !tvContainerRef.current) return;

    tvContainerRef.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    const pair = activeSymbol === "SNAP" ? "BINANCE:JUPUSDT" : `BINANCE:${activeSymbol}USDT`;

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: pair,
      interval: interval === "1h" ? "60" : interval === "1d" ? "D" : interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(0, 0, 0, 0)",
      gridColor: "rgba(255, 255, 255, 0.05)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });

    tvContainerRef.current.appendChild(script);
  }, [showTradingViewEmbed, activeSymbol, interval]);

  const candles = marketData?.candles || [];
  const latestPrice = marketData?.currentPrice || (candles[candles.length - 1]?.close ?? 0);
  const change24h = marketData?.change24h ?? 0;
  const isPositive = change24h >= 0;

  // Min/Max for chart scaling
  const minPrice = candles.length > 0 ? Math.min(...candles.map((c) => c.low)) : 0;
  const maxPrice = candles.length > 0 ? Math.max(...candles.map((c) => c.high)) : 100;
  const padding = (maxPrice - minPrice) * 0.08;

  // Custom Theme-Aware Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: CandleData = payload[0].payload;
      return (
        <div className="bg-popover/95 text-popover-foreground border border-border rounded-xl p-3 shadow-2xl backdrop-blur-md text-[11px] font-mono space-y-1 z-50">
          <div className="text-muted-foreground font-bold border-b border-border/40 pb-1 flex justify-between gap-3">
            <span className="text-foreground">{activeSymbol}/USDT</span>
            <span className="text-muted-foreground text-[10px]">{data.date}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1">
            <span className="text-muted-foreground">Price:</span>
            <span className="font-bold text-foreground text-right">${data.close.toLocaleString()}</span>
            <span className="text-muted-foreground">High:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-right">${data.high.toLocaleString()}</span>
            <span className="text-muted-foreground">Low:</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold text-right">${data.low.toLocaleString()}</span>
            <span className="text-muted-foreground">Volume:</span>
            <span className="text-muted-foreground text-right">{data.volume.toLocaleString()}</span>
            {data.sma20 && (
              <>
                <span className="text-amber-500 font-medium">SMA(14):</span>
                <span className="text-amber-500 font-semibold text-right">${data.sma20.toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col min-h-0 select-none">
      
      {/* Chart Control Bar */}
      <div className="flex items-center justify-between border-b border-border/20 pb-2 mb-2 shrink-0">
        
        {/* Timeframe Pills */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setInterval(tf.value)}
              title={tf.title}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                interval === tf.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Live Stream Status & Mode Toggle */}
        <div className="flex items-center gap-3">
          {marketData && (
            <div className="hidden sm:flex items-center gap-2.5 text-[10px] font-mono text-muted-foreground">
              <span>H: <strong className="text-foreground">${marketData.high24h.toFixed(activeSymbol === "BONK" ? 6 : activeSymbol === "SNAP" ? 4 : 2)}</strong></span>
              <span>L: <strong className="text-foreground">${marketData.low24h.toFixed(activeSymbol === "BONK" ? 6 : activeSymbol === "SNAP" ? 4 : 2)}</strong></span>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-emerald-500/10 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              {interval === "5s" ? "5s Trail" : "Live Feed"}
            </span>
          </div>

          <button
            onClick={() => fetchMarketData()}
            disabled={isRefreshing}
            className="hover:text-foreground text-muted-foreground transition-colors p-1"
            title="Refresh Market Stream"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>

          {/* Toggle between Native Visualizer & TradingView Pro Embed */}
          <button
            onClick={() => setShowTradingViewEmbed(!showTradingViewEmbed)}
            className={`px-2 py-1 rounded-md text-[9px] font-mono font-bold uppercase transition-colors border ${
              showTradingViewEmbed
                ? "bg-primary/20 text-primary border-primary/40"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/20"
            }`}
          >
            {showTradingViewEmbed ? "Live Stream" : "TradingView"}
          </button>
        </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="flex-1 w-full h-full rounded-xl overflow-hidden bg-card/40 dark:bg-black/35 border border-border/50 relative flex flex-col justify-center">
        {showTradingViewEmbed ? (
          <div className="tradingview-widget-container h-full w-full" ref={tvContainerRef}>
            <div className="tradingview-widget-container__widget h-full w-full"></div>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground font-mono text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span>Streaming Market Feed for {activeSymbol}...</span>
          </div>
        ) : candles.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground font-mono text-xs">
            <Activity className="w-6 h-6 text-muted-foreground opacity-50" />
            <span>Market stream paused. Click refresh to reconnect.</span>
          </div>
        ) : (
          <div className="w-full h-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={candles} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="5%" 
                      stopColor={isPositive ? "#10B981" : "#06B6D4"} 
                      stopOpacity={0.4} 
                    />
                    <stop 
                      offset="95%" 
                      stopColor={isPositive ? "#10B981" : "#06B6D4"} 
                      stopOpacity={0.0} 
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />

                <XAxis 
                  dataKey="date" 
                  stroke="rgba(128,128,128,0.3)" 
                  tick={{ fontSize: 9, fill: "#888888", fontFamily: "monospace" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(128,128,128,0.2)" }}
                  interval="preserveStartEnd"
                  minTickGap={35}
                />

                <YAxis 
                  domain={[Math.max(0, minPrice - padding), maxPrice + padding]}
                  stroke="rgba(128,128,128,0.3)"
                  tick={{ fontSize: 9, fill: "#888888", fontFamily: "monospace" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(128,128,128,0.2)" }}
                  tickFormatter={(val) => `$${val >= 10 ? val.toFixed(1) : val.toFixed(activeSymbol === "BONK" ? 6 : activeSymbol === "SNAP" ? 3 : 2)}`}
                  orientation="right"
                />

                <Tooltip content={<CustomTooltip />} />

                {/* Moving Average Line */}
                <Area 
                  type="monotone" 
                  dataKey="sma20" 
                  stroke="#F59E0B" 
                  strokeWidth={1.5} 
                  strokeDasharray="4 4"
                  fill="none" 
                  dot={false}
                  isAnimationActive={false}
                />

                {/* Live Price Trail Glowing Area */}
                <Area 
                  type="monotone" 
                  dataKey="close" 
                  stroke={isPositive ? "#10B981" : "#06B6D4"} 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#priceGradient)" 
                  isAnimationActive={true}
                  animationDuration={800}
                />

                {/* Latest Price Reference Line */}
                <ReferenceLine 
                  y={latestPrice} 
                  stroke={isPositive ? "#10B981" : "#06B6D4"} 
                  strokeDasharray="2 2" 
                  strokeOpacity={0.7} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
};
