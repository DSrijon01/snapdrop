"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  Info,
  SlidersHorizontal,
  Layers,
  ChevronDown,
  RefreshCw,
  Percent,
  Activity,
  ShieldAlert,
  Zap,
  Flame,
  CheckCircle2,
  X,
  Share2,
  Target,
  BarChart2,
  Lock,
  Unlock,
  AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";

export interface PerpMarket {
  symbol: string;
  name: string;
  markPrice: number;
  indexPrice: number;
  change24h: number;
  fundingRate: number; // 8h % e.g. 0.0125%
  fundingCountdown: string; // e.g. 04:18:22
  annualizedFunding: number; // APR %
  openInterestUsd: number;
  volume24hUsd: number;
  high24h: number;
  low24h: number;
  maxLeverage: number;
}

const INITIAL_PERPS: Record<string, PerpMarket> = {
  "SOL-PERP": {
    symbol: "SOL-PERP",
    name: "Solana Perpetual",
    markPrice: 142.85,
    indexPrice: 142.7,
    change24h: 5.48,
    fundingRate: 0.0105,
    fundingCountdown: "03:42:10",
    annualizedFunding: 11.49,
    openInterestUsd: 184500000,
    volume24hUsd: 94200000,
    high24h: 146.2,
    low24h: 135.4,
    maxLeverage: 100
  },
  "BTC-PERP": {
    symbol: "BTC-PERP",
    name: "Bitcoin Perpetual",
    markPrice: 91920.0,
    indexPrice: 91880.0,
    change24h: 2.14,
    fundingRate: 0.0082,
    fundingCountdown: "03:42:10",
    annualizedFunding: 8.97,
    openInterestUsd: 489000000,
    volume24hUsd: 310000000,
    high24h: 93400.0,
    low24h: 89800.0,
    maxLeverage: 100
  },
  "ETH-PERP": {
    symbol: "ETH-PERP",
    name: "Ethereum Perpetual",
    markPrice: 3425.5,
    indexPrice: 3422.0,
    change24h: -1.05,
    fundingRate: -0.0042,
    fundingCountdown: "03:42:10",
    annualizedFunding: -4.6,
    openInterestUsd: 215000000,
    volume24hUsd: 142000000,
    high24h: 3490.0,
    low24h: 3380.0,
    maxLeverage: 100
  },
  "JUP-PERP": {
    symbol: "JUP-PERP",
    name: "Jupiter Perpetual",
    markPrice: 1.18,
    indexPrice: 1.178,
    change24h: 8.64,
    fundingRate: 0.0245,
    fundingCountdown: "03:42:10",
    annualizedFunding: 26.8,
    openInterestUsd: 38500000,
    volume24hUsd: 29400000,
    high24h: 1.24,
    low24h: 1.06,
    maxLeverage: 50
  },
  "DOGE-PERP": {
    symbol: "DOGE-PERP",
    name: "Dogecoin Perpetual",
    markPrice: 0.224,
    indexPrice: 0.2238,
    change24h: 14.25,
    fundingRate: 0.038,
    fundingCountdown: "03:42:10",
    annualizedFunding: 41.6,
    openInterestUsd: 68000000,
    volume24hUsd: 84000000,
    high24h: 0.245,
    low24h: 0.192,
    maxLeverage: 50
  },
  "SUI-PERP": {
    symbol: "SUI-PERP",
    name: "Sui Perpetual",
    markPrice: 3.42,
    indexPrice: 3.415,
    change24h: 4.18,
    fundingRate: 0.0118,
    fundingCountdown: "03:42:10",
    annualizedFunding: 12.9,
    openInterestUsd: 44000000,
    volume24hUsd: 38200000,
    high24h: 3.58,
    low24h: 3.24,
    maxLeverage: 50
  }
};

export interface OpenPerpPosition {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  markPrice: number;
  sizeTokens: number;
  notionalUsd: number;
  marginUsd: number;
  leverage: number;
  marginMode: "Cross" | "Isolated";
  liquidationPrice: number;
  pnlUsd: number;
  pnlPercent: number;
  tpPrice?: number;
  slPrice?: number;
  createdAt: string;
}

interface OrderBookRow {
  price: number;
  size: number;
  total: number;
}

const generatePerpHistory = (basePrice: number, points = 30) => {
  let p = basePrice * 0.94;
  const data = [];
  const now = new Date();
  for (let i = points; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    const variance = (Math.random() - 0.48) * 0.018;
    p = p * (1 + variance);
    data.push({
      time: `${d.getHours()}:00`,
      price: parseFloat(p.toFixed(basePrice < 10 ? 4 : 2))
    });
  }
  return data;
};

export function TradePerpsTerminal() {
  const { publicKey } = useWallet();
  const [markets, setMarkets] = useState<Record<string, PerpMarket>>(INITIAL_PERPS);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("SOL-PERP");
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">("MARKET");
  const [marginMode, setMarginMode] = useState<"Cross" | "Isolated">("Cross");
  const [leverage, setLeverage] = useState<number>(20);
  const [sizeInput, setSizeInput] = useState<string>("10");
  const [limitPriceInput, setLimitPriceInput] = useState<string>("");
  const [tpInput, setTpInput] = useState<string>("");
  const [slInput, setSlInput] = useState<string>("");
  const [activeBottomTab, setActiveBottomTab] = useState<"positions" | "book" | "funding">("positions");

  // Balance
  const [usdcBalance, setUsdcBalance] = useState<number>(14250.0);

  // Active positions
  const [positions, setPositions] = useState<OpenPerpPosition[]>([
    {
      id: "pos-perp-1",
      symbol: "SOL-PERP",
      side: "LONG",
      entryPrice: 138.4,
      markPrice: 142.85,
      sizeTokens: 50,
      notionalUsd: 7142.5,
      marginUsd: 357.12,
      leverage: 20,
      marginMode: "Cross",
      liquidationPrice: 132.1,
      pnlUsd: 222.5,
      pnlPercent: 62.3,
      createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: "pos-perp-2",
      symbol: "BTC-PERP",
      side: "SHORT",
      entryPrice: 92800.0,
      markPrice: 91920.0,
      sizeTokens: 0.25,
      notionalUsd: 22980.0,
      marginUsd: 459.6,
      leverage: 50,
      marginMode: "Isolated",
      liquidationPrice: 94250.0,
      pnlUsd: 220.0,
      pnlPercent: 47.86,
      createdAt: new Date(Date.now() - 14400000).toISOString()
    }
  ]);

  // Simulation modal & share modal
  const [isSimulating, setIsSimulating] = useState(false);
  const [txDetails, setTxDetails] = useState<string>("");
  const [shareModalPos, setShareModalPos] = useState<OpenPerpPosition | null>(null);

  const currentMarket = markets[selectedSymbol] || INITIAL_PERPS["SOL-PERP"];

  // Random walk for Perps ticks and funding countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setMarkets(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(sym => {
          const m = next[sym];
          const pct = (Math.random() - 0.49) * 0.0018;
          const mark = parseFloat((m.markPrice * (1 + pct)).toFixed(m.markPrice < 10 ? 4 : 2));
          const index = parseFloat((m.indexPrice * (1 + pct * 0.98)).toFixed(m.indexPrice < 10 ? 4 : 2));
          const high = Math.max(m.high24h, mark);
          const low = Math.min(m.low24h, mark);

          next[sym] = {
            ...m,
            markPrice: mark,
            indexPrice: index,
            high24h: high,
            low24h: low
          };
        });
        return next;
      });

      // Update positions PnL
      setPositions(prev =>
        prev.map(pos => {
          const m = markets[pos.symbol] || currentMarket;
          const currentPrice = m.markPrice;
          const diff = pos.side === "LONG" ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
          const pnlUsd = parseFloat((diff * pos.sizeTokens).toFixed(2));
          const pnlPercent = parseFloat(((pnlUsd / pos.marginUsd) * 100).toFixed(2));
          return {
            ...pos,
            markPrice: currentPrice,
            pnlUsd,
            pnlPercent
          };
        })
      );
    }, 2500);

    return () => clearInterval(interval);
  }, [markets, currentMarket]);

  // Chart data
  const chartData = useMemo(() => {
    return generatePerpHistory(currentMarket.markPrice, 20);
  }, [selectedSymbol]);

  // Simulated Order Book
  const orderBook = useMemo(() => {
    const base = currentMarket.markPrice;
    const isSmall = base < 10;
    const step = isSmall ? 0.002 : base * 0.0006;
    const asks: OrderBookRow[] = [];
    const bids: OrderBookRow[] = [];

    let askTotal = 0;
    for (let i = 5; i >= 1; i--) {
      const p = parseFloat((base + i * step).toFixed(isSmall ? 4 : 2));
      const s = parseFloat((Math.random() * 15 + 2).toFixed(2));
      askTotal += s;
      asks.push({ price: p, size: s, total: parseFloat(askTotal.toFixed(2)) });
    }

    let bidTotal = 0;
    for (let i = 1; i <= 5; i++) {
      const p = parseFloat((base - i * step).toFixed(isSmall ? 4 : 2));
      const s = parseFloat((Math.random() * 18 + 3).toFixed(2));
      bidTotal += s;
      bids.push({ price: p, size: s, total: parseFloat(bidTotal.toFixed(2)) });
    }

    return { asks, bids };
  }, [currentMarket.markPrice]);

  // Calculations
  const tokenSize = parseFloat(sizeInput) || 0;
  const effectivePrice = orderType === "LIMIT" && parseFloat(limitPriceInput) > 0
    ? parseFloat(limitPriceInput)
    : currentMarket.markPrice;

  const notionalValue = useMemo(() => {
    return parseFloat((tokenSize * effectivePrice).toFixed(2));
  }, [tokenSize, effectivePrice]);

  const requiredMargin = useMemo(() => {
    if (leverage <= 0) return 0;
    return parseFloat((notionalValue / leverage).toFixed(2));
  }, [notionalValue, leverage]);

  const estLiquidationPrice = useMemo(() => {
    if (!effectivePrice || leverage <= 0) return 0;
    const mm = 0.01; // 1% maintenance margin
    if (side === "LONG") {
      return parseFloat((effectivePrice * (1 - 1 / leverage + mm)).toFixed(effectivePrice < 10 ? 4 : 2));
    } else {
      return parseFloat((effectivePrice * (1 + 1 / leverage - mm)).toFixed(effectivePrice < 10 ? 4 : 2));
    }
  }, [effectivePrice, leverage, side]);

  const tradingFee = useMemo(() => {
    return parseFloat((notionalValue * 0.0005).toFixed(2)); // 0.05% taker fee
  }, [notionalValue]);

  const isAffordable = requiredMargin + tradingFee <= usdcBalance && tokenSize > 0;

  // Order Placement
  const handlePlaceOrder = async () => {
    if (!isAffordable) {
      toast.error("Insufficient USDC for initial perp margin!");
      return;
    }

    setIsSimulating(true);
    setTxDetails(`Signing ${leverage}x ${side} on ${currentMarket.symbol}...`);
    await new Promise(r => setTimeout(r, 900));
    setTxDetails("Matching perpetual order with Drift/Solana liquidity pool...");
    await new Promise(r => setTimeout(r, 1000));
    setTxDetails("Confirming position state on Solana ledger...");
    await new Promise(r => setTimeout(r, 900));

    setUsdcBalance(prev => parseFloat((prev - requiredMargin - tradingFee).toFixed(2)));

    const newPos: OpenPerpPosition = {
      id: `perp-${Date.now()}`,
      symbol: currentMarket.symbol,
      side,
      entryPrice: effectivePrice,
      markPrice: currentMarket.markPrice,
      sizeTokens: tokenSize,
      notionalUsd: notionalValue,
      marginUsd: requiredMargin,
      leverage,
      marginMode,
      liquidationPrice: estLiquidationPrice,
      pnlUsd: 0,
      pnlPercent: 0,
      createdAt: new Date().toISOString()
    };

    setPositions(prev => [newPos, ...prev]);
    setIsSimulating(false);
    toast.success(`Successfully opened ${side} ${currentMarket.symbol} (${leverage}x)!`, {
      icon: "⚡"
    });
  };

  const handleClosePosition = (posId: string) => {
    const target = positions.find(p => p.id === posId);
    if (!target) return;

    setPositions(prev => prev.filter(p => p.id !== posId));
    const returned = target.marginUsd + target.pnlUsd;
    setUsdcBalance(prev => parseFloat((prev + returned).toFixed(2)));

    toast.success(
      `Closed ${target.side} ${target.symbol}! PnL: ${target.pnlUsd >= 0 ? "+" : ""}$${target.pnlUsd}`,
      { icon: target.pnlUsd >= 0 ? "🚀" : "📉" }
    );
  };

  const isPositive = currentMarket.change24h >= 0;

  return (
    <div className="w-full flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Top Banner / Ticker Header */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-display font-black text-sm">
            PERP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight">
                {currentMarket.symbol}
              </h2>
              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                STAGE BETA
              </span>
              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                Crypto Perps
              </span>
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                <Flame size={11} /> Up to {currentMarket.maxLeverage}x
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{currentMarket.name}</p>
          </div>
        </div>

        {/* Real-time Ticker Metrics */}
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar py-1">
          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Mark Price</div>
            <div className="font-mono font-black text-lg sm:text-xl text-foreground">
              ${currentMarket.markPrice.toLocaleString(undefined, { minimumFractionDigits: currentMarket.markPrice < 10 ? 4 : 2 })}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Index Price</div>
            <div className="font-mono font-bold text-sm text-muted-foreground">
              ${currentMarket.indexPrice.toLocaleString(undefined, { minimumFractionDigits: currentMarket.markPrice < 10 ? 4 : 2 })}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Funding Rate (8h)</div>
            <div className={`font-mono font-bold text-sm flex items-center gap-1 ${
              currentMarket.fundingRate >= 0 ? "text-emerald-500" : "text-red-500"
            }`}>
              {currentMarket.fundingRate >= 0 ? "+" : ""}{currentMarket.fundingRate}%
              <span className="text-[10px] text-muted-foreground">({currentMarket.fundingCountdown})</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Annualized Rate</div>
            <div className="font-mono font-bold text-sm text-primary">
              {currentMarket.annualizedFunding >= 0 ? "+" : ""}{currentMarket.annualizedFunding}% APR
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Open Interest</div>
            <div className="font-mono font-bold text-sm text-foreground">
              ${(currentMarket.openInterestUsd / 1_000_000).toFixed(1)}M
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground">24h Change</div>
            <div className={`font-mono font-bold text-sm flex items-center gap-0.5 ${
              isPositive ? "text-emerald-500" : "text-red-500"
            }`}>
              {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {isPositive ? "+" : ""}{currentMarket.change24h}%
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Markets (3 cols), Center Chart & Bottom Tabs (6 cols), Right Execution (3 cols) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ================= LEFT COLUMN: PERP MARKETS SELECTOR ================= */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-display font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap size={13} className="text-primary" />
              Crypto Perps
            </span>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-bold">
              Pyth Realtime
            </span>
          </div>

          {/* Markets List */}
          <div className="divide-y divide-border overflow-y-auto max-h-[540px]">
            {Object.values(markets).map(m => {
              const active = selectedSymbol === m.symbol;
              const pos = m.change24h >= 0;
              return (
                <button
                  key={m.symbol}
                  onClick={() => setSelectedSymbol(m.symbol)}
                  className={`w-full p-3.5 flex items-center justify-between text-left transition-all hover:bg-muted/40 ${
                    active ? "bg-muted/70 border-l-4 border-primary" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-black text-sm tracking-tight">{m.symbol}</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground font-bold">
                        {m.maxLeverage}x
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      Funding: <span className={m.fundingRate >= 0 ? "text-emerald-500" : "text-red-500"}>
                        {m.fundingRate >= 0 ? "+" : ""}{m.fundingRate}%
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-sm">
                      ${m.markPrice.toLocaleString(undefined, { minimumFractionDigits: m.markPrice < 10 ? 4 : 2 })}
                    </div>
                    <span className={`text-[10px] font-mono inline-flex items-center gap-0.5 ${
                      pos ? "text-emerald-500" : "text-red-500"
                    }`}>
                      {pos ? "+" : ""}{m.change24h}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* User Margin Balance Footer */}
          <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
              <Wallet size={13} /> Margin USDC:
            </span>
            <span className="font-mono font-bold text-sm text-foreground">
              ${usdcBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* ================= CENTER COLUMN: CHART & TERMINAL VIEWS ================= */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <h3 className="font-display font-black text-base uppercase tracking-tight">
                  {currentMarket.symbol} Price Action
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span className="px-2 py-0.5 rounded bg-muted/50 border border-border">
                  24h H: ${currentMarket.high24h}
                </span>
                <span className="px-2 py-0.5 rounded bg-muted/50 border border-border">
                  24h L: ${currentMarket.low24h}
                </span>
              </div>
            </div>

            {/* Price Chart */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="perpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#6b7280" fontSize={10} tickLine={false} />
                  <YAxis
                    domain={["auto", "auto"]}
                    stroke="#6b7280"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={v => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1b1b1b",
                      borderColor: "#374151",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontFamily: "monospace"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={isPositive ? "#10b981" : "#ef4444"}
                    strokeWidth={2}
                    fill="url(#perpGrad)"
                    name="Mark Price"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Tabs: Positions, Order Book, Funding Info */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex border-b border-border bg-muted/20">
              <button
                onClick={() => setActiveBottomTab("positions")}
                className={`py-3 px-4 text-xs font-display font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeBottomTab === "positions"
                    ? "border-b-2 border-primary text-foreground bg-card"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Open Positions</span>
                <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-mono">
                  {positions.length}
                </span>
              </button>

              <button
                onClick={() => setActiveBottomTab("book")}
                className={`py-3 px-4 text-xs font-display font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeBottomTab === "book"
                    ? "border-b-2 border-primary text-foreground bg-card"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Live Order Book</span>
              </button>

              <button
                onClick={() => setActiveBottomTab("funding")}
                className={`py-3 px-4 text-xs font-display font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeBottomTab === "funding"
                    ? "border-b-2 border-primary text-foreground bg-card"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Funding Rate Schedule</span>
              </button>
            </div>

            <div className="p-4">
              {activeBottomTab === "positions" && (
                <div className="flex flex-col gap-3">
                  {positions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground font-mono text-xs">
                      No open perp positions yet. Open a Long or Short to trade perpetuals!
                    </div>
                  ) : (
                    positions.map(pos => {
                      const isProfit = pos.pnlUsd >= 0;
                      return (
                        <div
                          key={pos.id}
                          className="p-3.5 rounded-xl border border-border bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`px-2 py-1 rounded text-xs font-display font-black uppercase tracking-wider ${
                              pos.side === "LONG" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                            }`}>
                              {pos.side} {pos.leverage}x
                            </div>
                            <div>
                              <div className="font-display font-bold text-sm tracking-tight flex items-center gap-1.5">
                                <span>{pos.symbol}</span>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {pos.marginMode} • {pos.sizeTokens} units
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-muted-foreground">
                                Entry: ${pos.entryPrice} • Mark: ${pos.markPrice} • Liq: <span className="text-amber-500 font-bold">${pos.liquidationPrice}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="text-right">
                              <div className={`font-mono font-bold text-sm flex items-center gap-0.5 justify-end ${
                                isProfit ? "text-emerald-500" : "text-red-500"
                              }`}>
                                {isProfit ? "+" : ""}${pos.pnlUsd} ({isProfit ? "+" : ""}{pos.pnlPercent}%)
                              </div>
                              <div className="text-[10px] font-mono text-muted-foreground">
                                Margin: ${pos.marginUsd}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setShareModalPos(pos)}
                                title="Share PnL Card"
                                className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                              >
                                <Share2 size={13} />
                              </button>
                              <button
                                onClick={() => handleClosePosition(pos.id)}
                                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-mono font-bold transition-all"
                              >
                                Market Close
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeBottomTab === "book" && (
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  {/* Bids */}
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground mb-1.5 flex justify-between">
                      <span>Bid Price</span>
                      <span>Size</span>
                    </div>
                    <div className="space-y-1">
                      {orderBook.bids.map((b, i) => (
                        <div key={i} className="flex justify-between items-center relative py-0.5 px-1 rounded overflow-hidden">
                          <div
                            className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 pointer-events-none"
                            style={{ width: `${Math.min(b.size * 5, 100)}%` }}
                          />
                          <span className="text-emerald-500 font-bold relative z-10">${b.price}</span>
                          <span className="text-muted-foreground relative z-10">{b.size}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Asks */}
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground mb-1.5 flex justify-between">
                      <span>Ask Price</span>
                      <span>Size</span>
                    </div>
                    <div className="space-y-1">
                      {orderBook.asks.map((a, i) => (
                        <div key={i} className="flex justify-between items-center relative py-0.5 px-1 rounded overflow-hidden">
                          <div
                            className="absolute right-0 top-0 bottom-0 bg-red-500/10 pointer-events-none"
                            style={{ width: `${Math.min(a.size * 5, 100)}%` }}
                          />
                          <span className="text-red-500 font-bold relative z-10">${a.price}</span>
                          <span className="text-muted-foreground relative z-10">{a.size}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeBottomTab === "funding" && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col gap-3 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">8-Hour Predicted Funding Rate:</span>
                    <span className={`font-bold ${currentMarket.fundingRate >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {currentMarket.fundingRate >= 0 ? "+" : ""}{currentMarket.fundingRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Countdown to Settlement:</span>
                    <span className="font-bold text-foreground">{currentMarket.fundingCountdown}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Annualized Rate:</span>
                    <span className="font-bold text-primary">+{currentMarket.annualizedFunding}% APR</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground border-t border-border pt-2 mt-1">
                    {currentMarket.fundingRate >= 0
                      ? "💡 Positive funding: Longs pay Shorts every 8 hours."
                      : "💡 Negative funding: Shorts pay Longs every 8 hours."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: EXECUTION PANEL ================= */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col gap-4">
          
          {/* Long / Short Buttons */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/40 rounded-xl">
            <button
              onClick={() => setSide("LONG")}
              className={`py-2 text-xs font-display font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                side === "LONG"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.01]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowUpRight size={14} /> Buy / Long
            </button>
            <button
              onClick={() => setSide("SHORT")}
              className={`py-2 text-xs font-display font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                side === "SHORT"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/20 scale-[1.01]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowDownRight size={14} /> Sell / Short
            </button>
          </div>

          {/* Margin Mode & Order Type Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex bg-muted/40 rounded-lg p-0.5 border border-border text-[11px] font-mono">
              <button
                onClick={() => setMarginMode("Cross")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  marginMode === "Cross" ? "bg-card text-foreground font-bold shadow-xs" : "text-muted-foreground"
                }`}
              >
                Cross
              </button>
              <button
                onClick={() => setMarginMode("Isolated")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  marginMode === "Isolated" ? "bg-card text-foreground font-bold shadow-xs" : "text-muted-foreground"
                }`}
              >
                Isolated
              </button>
            </div>

            <div className="flex bg-muted/40 rounded-lg p-0.5 border border-border text-[11px] font-mono">
              {(["MARKET", "LIMIT"] as const).map(ot => (
                <button
                  key={ot}
                  onClick={() => setOrderType(ot)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    orderType === ot ? "bg-card text-foreground font-bold shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  {ot}
                </button>
              ))}
            </div>
          </div>

          {/* Leverage Slider */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-muted-foreground flex items-center gap-1">
                <SlidersHorizontal size={12} className="text-primary" /> Leverage:
              </span>
              <span className="font-mono font-black text-sm text-primary">
                {leverage}x
              </span>
            </div>

            <input
              type="range"
              min="1"
              max={currentMarket.maxLeverage}
              value={leverage}
              onChange={e => setLeverage(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer h-1.5 bg-muted rounded-lg"
            />

            <div className="flex justify-between gap-1 text-[10px] font-mono">
              {[2, 5, 10, 20, 50, currentMarket.maxLeverage].map(l => (
                <button
                  key={l}
                  onClick={() => setLeverage(l)}
                  className={`px-1.5 py-0.5 rounded border ${
                    leverage === l ? "border-primary text-primary font-bold bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l}x
                </button>
              ))}
            </div>
          </div>

          {/* Limit Price Input if LIMIT */}
          {orderType === "LIMIT" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-muted-foreground uppercase">Limit Price</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={currentMarket.markPrice.toString()}
                  value={limitPriceInput}
                  onChange={e => setLimitPriceInput(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                />
                <span className="absolute right-3 top-2.5 text-xs font-mono text-muted-foreground">USDC</span>
              </div>
            </div>
          )}

          {/* Order Size Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span>Order Size</span>
              <span>Available: ${usdcBalance.toFixed(2)}</span>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="10"
                value={sizeInput}
                onChange={e => setSizeInput(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              />
              <span className="absolute right-3 top-2.5 text-xs font-mono text-muted-foreground">
                {currentMarket.symbol.split("-")[0]}
              </span>
            </div>
          </div>

          {/* Risk Metrics */}
          <div className="p-3 rounded-xl bg-muted/20 border border-border flex flex-col gap-1.5 text-xs font-mono">
            <div className="flex justify-between text-muted-foreground">
              <span>Position Value:</span>
              <span className="font-bold text-foreground">${notionalValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Required Margin:</span>
              <span className="font-bold text-primary">${requiredMargin.toFixed(2)} USDC</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Est. Liquidation Price:</span>
              <span className="font-bold text-amber-500">
                ${estLiquidationPrice > 0 ? estLiquidationPrice.toFixed(2) : "--"}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Trading Fee (0.05%):</span>
              <span>${tradingFee.toFixed(2)}</span>
            </div>
          </div>

          {/* Submit Action */}
          <button
            onClick={handlePlaceOrder}
            disabled={!isAffordable || isSimulating}
            className={`w-full py-3 rounded-xl font-display font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              side === "LONG"
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 active:scale-98"
                : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/25 active:scale-98"
            } disabled:opacity-50 disabled:pointer-events-none`}
          >
            {isSimulating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : side === "LONG" ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            <span>
              {isSimulating
                ? "Routing Order to Devnet..."
                : `${side} ${currentMarket.symbol} (${leverage}x)`}
            </span>
          </button>
        </div>
      </div>

      {/* Transaction simulation overlay modal */}
      {isSimulating && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center animate-spin">
              <RefreshCw size={24} />
            </div>
            <div>
              <h3 className="font-display font-black text-lg uppercase tracking-tight">
                Executing Perpetual Order
              </h3>
              <p className="text-xs font-mono text-muted-foreground mt-2">{txDetails}</p>
            </div>
          </div>
        </div>
      )}

      {/* Share PnL Card Modal */}
      {shareModalPos && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full shadow-2xl relative flex flex-col gap-4">
            <button
              onClick={() => setShareModalPos(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>

            <div className="text-center">
              <span className="text-[10px] font-mono tracking-widest uppercase text-primary font-bold">
                STREET SYNC PERPETUALS
              </span>
              <h3 className="font-display font-black text-xl uppercase mt-1">
                {shareModalPos.symbol}
              </h3>
            </div>

            <div className={`p-6 rounded-2xl flex flex-col items-center justify-center text-center ${
              shareModalPos.pnlUsd >= 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"
            }`}>
              <div className="text-xs font-mono uppercase text-muted-foreground">ROI Return</div>
              <div className={`text-4xl font-mono font-black mt-1 ${
                shareModalPos.pnlUsd >= 0 ? "text-emerald-500" : "text-red-500"
              }`}>
                {shareModalPos.pnlUsd >= 0 ? "+" : ""}{shareModalPos.pnlPercent}%
              </div>
              <div className="text-xs font-mono text-muted-foreground mt-1">
                {shareModalPos.pnlUsd >= 0 ? "+" : ""}${shareModalPos.pnlUsd} USDC
              </div>
            </div>

            <div className="text-xs font-mono space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>Side:</span>
                <span className="font-bold text-foreground">{shareModalPos.side} {shareModalPos.leverage}x</span>
              </div>
              <div className="flex justify-between">
                <span>Entry:</span>
                <span className="font-bold text-foreground">${shareModalPos.entryPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Mark:</span>
                <span className="font-bold text-foreground">${shareModalPos.markPrice.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => {
                toast.success("Perp PnL card link copied to clipboard!");
                setShareModalPos(null);
              }}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-black text-xs uppercase tracking-wider"
            >
              Copy Image / Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
