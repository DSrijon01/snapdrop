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
  Calendar,
  Crosshair,
  CheckCircle2,
  X,
  Share2,
  HelpCircle,
  AlertTriangle,
  Scale
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar
} from "recharts";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";

export interface FuturesContract {
  symbol: string;
  name: string;
  category: "Crypto" | "Stock";
  underlying: string;
  spotPrice: number;
  futuresPrice: number;
  change24h: number;
  expiryDate: string;
  dte: number; // days to expiry
  openInterestUsd: number;
  volume24hUsd: number;
  maxLeverage: number;
  basis: number; // futuresPrice - spotPrice
  basisPercent: number;
  annualizedBasis: number; // APR %
  multiplier: number; // e.g. 1 for stock, 0.01 for BTC
}

const INITIAL_FUTURES: Record<string, FuturesContract> = {
  "BTC-MAR28": {
    symbol: "BTC-MAR28",
    name: "Bitcoin Mar 2026 Future",
    category: "Crypto",
    underlying: "BTC",
    spotPrice: 91850.0,
    futuresPrice: 92320.0,
    change24h: 2.45,
    expiryDate: "Mar 28, 2026",
    dte: 14,
    openInterestUsd: 284500000,
    volume24hUsd: 142000000,
    maxLeverage: 50,
    basis: 470.0,
    basisPercent: 0.51,
    annualizedBasis: 13.29,
    multiplier: 0.01
  },
  "ETH-MAR28": {
    symbol: "ETH-MAR28",
    name: "Ethereum Mar 2026 Future",
    category: "Crypto",
    underlying: "ETH",
    spotPrice: 3420.0,
    futuresPrice: 3438.5,
    change24h: -0.85,
    expiryDate: "Mar 28, 2026",
    dte: 14,
    openInterestUsd: 120500000,
    volume24hUsd: 68400000,
    maxLeverage: 50,
    basis: 18.5,
    basisPercent: 0.54,
    annualizedBasis: 14.08,
    multiplier: 0.1
  },
  "SOL-MAR28": {
    symbol: "SOL-MAR28",
    name: "Solana Mar 2026 Future",
    category: "Crypto",
    underlying: "SOL",
    spotPrice: 142.5,
    futuresPrice: 143.65,
    change24h: 5.12,
    expiryDate: "Mar 28, 2026",
    dte: 14,
    openInterestUsd: 94500000,
    volume24hUsd: 58900000,
    maxLeverage: 50,
    basis: 1.15,
    basisPercent: 0.81,
    annualizedBasis: 21.12,
    multiplier: 1
  },
  "BTC-JUN27": {
    symbol: "BTC-JUN27",
    name: "Bitcoin Jun 2026 Future",
    category: "Crypto",
    underlying: "BTC",
    spotPrice: 91850.0,
    futuresPrice: 93480.0,
    change24h: 2.18,
    expiryDate: "Jun 27, 2026",
    dte: 105,
    openInterestUsd: 185000000,
    volume24hUsd: 49200000,
    maxLeverage: 50,
    basis: 1630.0,
    basisPercent: 1.77,
    annualizedBasis: 6.15,
    multiplier: 0.01
  },
  "TSLA-MAR28": {
    symbol: "TSLA-MAR28",
    name: "Tesla Inc. Mar 2026 Tokenized Future",
    category: "Stock",
    underlying: "TSLA",
    spotPrice: 184.2,
    futuresPrice: 185.1,
    change24h: 3.15,
    expiryDate: "Mar 28, 2026",
    dte: 14,
    openInterestUsd: 64200000,
    volume24hUsd: 31500000,
    maxLeverage: 20,
    basis: 0.9,
    basisPercent: 0.49,
    annualizedBasis: 12.77,
    multiplier: 1
  },
  "NVDA-MAR28": {
    symbol: "NVDA-MAR28",
    name: "NVIDIA Corp. Mar 2026 Tokenized Future",
    category: "Stock",
    underlying: "NVDA",
    spotPrice: 128.4,
    futuresPrice: 129.25,
    change24h: 1.84,
    expiryDate: "Mar 28, 2026",
    dte: 14,
    openInterestUsd: 89400000,
    volume24hUsd: 54100000,
    maxLeverage: 20,
    basis: 0.85,
    basisPercent: 0.66,
    annualizedBasis: 17.21,
    multiplier: 1
  },
  "AAPL-MAR28": {
    symbol: "AAPL-MAR28",
    name: "Apple Inc. Mar 2026 Tokenized Future",
    category: "Stock",
    underlying: "AAPL",
    spotPrice: 173.5,
    futuresPrice: 174.15,
    change24h: -0.42,
    expiryDate: "Mar 28, 2026",
    dte: 14,
    openInterestUsd: 41200000,
    volume24hUsd: 19800000,
    maxLeverage: 20,
    basis: 0.65,
    basisPercent: 0.37,
    annualizedBasis: 9.65,
    multiplier: 1
  },
  "SPY-MAR28": {
    symbol: "SPY-MAR28",
    name: "S&P 500 Tokenized Index Future",
    category: "Stock",
    underlying: "SPY",
    spotPrice: 512.0,
    futuresPrice: 514.2,
    change24h: 0.62,
    expiryDate: "Mar 28, 2026",
    dte: 14,
    openInterestUsd: 112000000,
    volume24hUsd: 74500000,
    maxLeverage: 20,
    basis: 2.2,
    basisPercent: 0.43,
    annualizedBasis: 11.21,
    multiplier: 1
  }
};

export interface OpenFuturesPosition {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  category: "Crypto" | "Stock";
  entryPrice: number;
  markPrice: number;
  sizeContracts: number;
  notionalUsd: number;
  marginUsd: number;
  leverage: number;
  marginMode: "Cross" | "Isolated";
  liquidationPrice: number;
  pnlUsd: number;
  pnlPercent: number;
  expiryDate: string;
  createdAt: string;
}

const generateFuturesHistory = (basePrice: number, points = 30) => {
  let p = basePrice * 0.96;
  const data = [];
  const now = new Date();
  for (let i = points; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 6 * 60 * 60 * 1000);
    const variance = (Math.random() - 0.48) * 0.015;
    p = p * (1 + variance);
    const basisSpread = (basePrice * 0.005) * (i / points);
    data.push({
      time: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      futuresPrice: parseFloat(p.toFixed(2)),
      spotPrice: parseFloat((p - basisSpread).toFixed(2)),
      basis: parseFloat(basisSpread.toFixed(2))
    });
  }
  return data;
};

export function TradeFuturesTerminal() {
  const { publicKey } = useWallet();
  const [contracts, setContracts] = useState<Record<string, FuturesContract>>(INITIAL_FUTURES);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTC-MAR28");
  const [filterCategory, setFilterCategory] = useState<"ALL" | "CRYPTO" | "STOCK">("ALL");
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">("MARKET");
  const [marginMode, setMarginMode] = useState<"Cross" | "Isolated">("Cross");
  const [leverage, setLeverage] = useState<number>(10);
  const [contractsInput, setContractsInput] = useState<string>("1");
  const [limitPriceInput, setLimitPriceInput] = useState<string>("");
  const [takeProfitInput, setTakeProfitInput] = useState<string>("");
  const [stopLossInput, setStopLossInput] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"positions" | "orders" | "specs">("positions");

  // Balances
  const [usdcBalance, setUsdcBalance] = useState<number>(12850.75);

  // Active positions
  const [positions, setPositions] = useState<OpenFuturesPosition[]>([
    {
      id: "pos-fut-1",
      symbol: "BTC-MAR28",
      side: "LONG",
      category: "Crypto",
      entryPrice: 91400.0,
      markPrice: 92320.0,
      sizeContracts: 0.5,
      notionalUsd: 46160.0,
      marginUsd: 4616.0,
      leverage: 10,
      marginMode: "Cross",
      liquidationPrice: 83200.0,
      pnlUsd: 460.0,
      pnlPercent: 9.97,
      expiryDate: "Mar 28, 2026",
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: "pos-fut-2",
      symbol: "TSLA-MAR28",
      side: "SHORT",
      category: "Stock",
      entryPrice: 187.5,
      markPrice: 185.1,
      sizeContracts: 50,
      notionalUsd: 9255.0,
      marginUsd: 1851.0,
      leverage: 5,
      marginMode: "Isolated",
      liquidationPrice: 218.4,
      pnlUsd: 120.0,
      pnlPercent: 6.48,
      expiryDate: "Mar 28, 2026",
      createdAt: new Date(Date.now() - 43200000).toISOString()
    }
  ]);

  // Tx Modal state
  const [isSimulating, setIsSimulating] = useState(false);
  const [txDetails, setTxDetails] = useState<string>("");
  const [shareModalPos, setShareModalPos] = useState<OpenFuturesPosition | null>(null);

  const currentContract = contracts[selectedSymbol] || INITIAL_FUTURES["BTC-MAR28"];

  // Clamp leverage if switching to stock
  useEffect(() => {
    if (leverage > currentContract.maxLeverage) {
      setLeverage(currentContract.maxLeverage);
    }
  }, [selectedSymbol, currentContract.maxLeverage, leverage]);

  // Price live ticker random walk
  useEffect(() => {
    const interval = setInterval(() => {
      setContracts(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(sym => {
          const c = next[sym];
          const pct = (Math.random() - 0.49) * 0.0014;
          const newFutures = parseFloat((c.futuresPrice * (1 + pct)).toFixed(2));
          const newSpot = parseFloat((c.spotPrice * (1 + pct * 0.95)).toFixed(2));
          const basis = parseFloat((newFutures - newSpot).toFixed(2));
          const basisPercent = parseFloat(((basis / newSpot) * 100).toFixed(2));
          const annualized = parseFloat((basisPercent * (365 / Math.max(c.dte, 1))).toFixed(2));

          next[sym] = {
            ...c,
            futuresPrice: newFutures,
            spotPrice: newSpot,
            basis,
            basisPercent,
            annualizedBasis: annualized
          };
        });
        return next;
      });

      // Update positions PnL
      setPositions(prev =>
        prev.map(pos => {
          const contract = contracts[pos.symbol] || currentContract;
          const currentPrice = contract.futuresPrice;
          const diff = pos.side === "LONG" ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
          const rawPnl = diff * pos.sizeContracts;
          const pnlUsd = parseFloat(rawPnl.toFixed(2));
          const pnlPercent = parseFloat(((pnlUsd / pos.marginUsd) * 100).toFixed(2));
          return {
            ...pos,
            markPrice: currentPrice,
            pnlUsd,
            pnlPercent
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [contracts, currentContract]);

  // Chart data
  const chartData = useMemo(() => {
    return generateFuturesHistory(currentContract.futuresPrice, 24);
  }, [selectedSymbol]);

  // Calculations
  const contractsCount = parseFloat(contractsInput) || 0;
  const effectivePrice = orderType === "LIMIT" && parseFloat(limitPriceInput) > 0
    ? parseFloat(limitPriceInput)
    : currentContract.futuresPrice;

  const notionalValue = useMemo(() => {
    return contractsCount * effectivePrice;
  }, [contractsCount, effectivePrice]);

  const requiredMargin = useMemo(() => {
    if (leverage <= 0) return 0;
    return parseFloat((notionalValue / leverage).toFixed(2));
  }, [notionalValue, leverage]);

  const estLiquidationPrice = useMemo(() => {
    if (!effectivePrice || leverage <= 0) return 0;
    const maintenanceMargin = 0.02; // 2% maintenance
    if (side === "LONG") {
      return parseFloat((effectivePrice * (1 - 1 / leverage + maintenanceMargin)).toFixed(2));
    } else {
      return parseFloat((effectivePrice * (1 + 1 / leverage - maintenanceMargin)).toFixed(2));
    }
  }, [effectivePrice, leverage, side]);

  const tradingFee = useMemo(() => {
    return parseFloat((notionalValue * 0.0004).toFixed(2)); // 0.04% taker fee
  }, [notionalValue]);

  const isAffordable = requiredMargin + tradingFee <= usdcBalance && contractsCount > 0;

  // Filtered contracts list
  const filteredContracts = useMemo(() => {
    return Object.values(contracts).filter(c => {
      if (filterCategory === "CRYPTO") return c.category === "Crypto";
      if (filterCategory === "STOCK") return c.category === "Stock";
      return true;
    });
  }, [contracts, filterCategory]);

  // Order Execution
  const handlePlaceOrder = async () => {
    if (!isAffordable) {
      toast.error("Insufficient USDC balance for initial margin!");
      return;
    }

    setIsSimulating(true);
    setTxDetails(`Constructing ${side} ${currentContract.symbol} ${leverage}x order...`);

    await new Promise(r => setTimeout(r, 1000));
    setTxDetails("Routing order to Street Sync Solana settlement vault...");
    await new Promise(r => setTimeout(r, 1100));
    setTxDetails("Verifying Pyth Oracle basis price & finalizing devnet tx...");
    await new Promise(r => setTimeout(r, 900));

    // Deduct margin
    setUsdcBalance(prev => parseFloat((prev - requiredMargin - tradingFee).toFixed(2)));

    // Add new position
    const newPos: OpenFuturesPosition = {
      id: `pos-${Date.now()}`,
      symbol: currentContract.symbol,
      side,
      category: currentContract.category,
      entryPrice: effectivePrice,
      markPrice: currentContract.futuresPrice,
      sizeContracts: contractsCount,
      notionalUsd: notionalValue,
      marginUsd: requiredMargin,
      leverage,
      marginMode,
      liquidationPrice: estLiquidationPrice,
      pnlUsd: 0,
      pnlPercent: 0,
      expiryDate: currentContract.expiryDate,
      createdAt: new Date().toISOString()
    };

    setPositions(prev => [newPos, ...prev]);
    setIsSimulating(false);
    toast.success(`Opened ${side} position on ${currentContract.symbol} (${leverage}x)!`, {
      icon: "🎯"
    });
  };

  const handleClosePosition = (posId: string) => {
    const target = positions.find(p => p.id === posId);
    if (!target) return;

    setPositions(prev => prev.filter(p => p.id !== posId));
    const returnedCapital = target.marginUsd + target.pnlUsd;
    setUsdcBalance(prev => parseFloat((prev + returnedCapital).toFixed(2)));

    toast.success(
      `Closed ${target.side} ${target.symbol} position! PnL: ${target.pnlUsd >= 0 ? "+" : ""}$${target.pnlUsd}`,
      { icon: target.pnlUsd >= 0 ? "💰" : "📉" }
    );
  };

  const isPositiveChange = currentContract.change24h >= 0;

  return (
    <div className="w-full flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Top Banner / Ticker Stats */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-display font-black text-sm">
            FUT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight">
                {currentContract.symbol}
              </h2>
              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                STAGE BETA
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                currentContract.category === "Crypto" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
              }`}>
                {currentContract.category}
              </span>
              <span className="text-[10px] font-mono border border-border bg-muted/50 px-2 py-0.5 rounded text-muted-foreground flex items-center gap-1">
                <Calendar size={11} /> Exp: {currentContract.expiryDate} ({currentContract.dte}d)
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{currentContract.name}</p>
          </div>
        </div>

        {/* Real-time Ticker Metrics */}
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar py-1">
          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Futures Mark</div>
            <div className="font-mono font-black text-lg sm:text-xl text-foreground">
              ${currentContract.futuresPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Spot Index</div>
            <div className="font-mono font-bold text-sm text-muted-foreground">
              ${currentContract.spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Basis (Contango)</div>
            <div className={`font-mono font-bold text-sm flex items-center gap-1 ${
              currentContract.basis >= 0 ? "text-emerald-500" : "text-red-500"
            }`}>
              {currentContract.basis >= 0 ? "+" : ""}${currentContract.basis.toFixed(2)} ({currentContract.basisPercent}%)
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Basis APR</div>
            <div className="font-mono font-bold text-sm text-primary">
              +{currentContract.annualizedBasis}%
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Open Interest</div>
            <div className="font-mono font-bold text-sm text-foreground">
              ${(currentContract.openInterestUsd / 1_000_000).toFixed(1)}M
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground">24h Change</div>
            <div className={`font-mono font-bold text-sm flex items-center gap-0.5 ${
              isPositiveChange ? "text-emerald-500" : "text-red-500"
            }`}>
              {isPositiveChange ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {isPositiveChange ? "+" : ""}{currentContract.change24h}%
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left List (3 cols), Center Chart (6 cols), Right Execution Panel (3 cols) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ================= LEFT COLUMN: CONTRACTS SELECTOR ================= */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl shadow-sm flex flex-col overflow-hidden">
          {/* Filter Pills */}
          <div className="p-3 border-b border-border bg-muted/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-display font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Scale size={13} className="text-primary" />
                Delivery Futures
              </span>
              <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                Solana Pyth
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-1 bg-muted/40 p-1 rounded-xl">
              {(["ALL", "CRYPTO", "STOCK"] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`py-1 text-[11px] font-mono font-bold uppercase rounded-lg transition-all ${
                    filterCategory === cat
                      ? "bg-card text-foreground shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* List items */}
          <div className="divide-y divide-border overflow-y-auto max-h-[540px]">
            {filteredContracts.map(item => {
              const active = selectedSymbol === item.symbol;
              const pos = item.change24h >= 0;
              return (
                <button
                  key={item.symbol}
                  onClick={() => setSelectedSymbol(item.symbol)}
                  className={`w-full p-3.5 flex items-center justify-between text-left transition-all hover:bg-muted/40 ${
                    active ? "bg-muted/70 border-l-4 border-primary" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-black text-sm tracking-tight">{item.symbol}</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground">
                        {item.maxLeverage}x
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1">
                      <span>Exp: {item.expiryDate.split(",")[0]}</span>
                      <span>•</span>
                      <span className="text-primary">APR +{item.annualizedBasis}%</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-sm">
                      ${item.futuresPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <span className={`text-[10px] font-mono inline-flex items-center gap-0.5 ${
                      pos ? "text-emerald-500" : "text-red-500"
                    }`}>
                      {pos ? "+" : ""}{item.change24h}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom USDC Balance summary */}
          <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
              <Wallet size={13} /> Collateral USDC:
            </span>
            <span className="font-mono font-bold text-sm text-foreground">
              ${usdcBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* ================= CENTER COLUMN: CHART & ANLYTICS ================= */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-display font-black text-base uppercase tracking-tight">
                  Futures vs Spot Basis Curve
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-1 bg-primary rounded-full inline-block" /> Futures
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-1 bg-muted-foreground/50 rounded-full inline-block" /> Spot
                </span>
              </div>
            </div>

            {/* Area Chart with Basis Spread */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="futuresGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2081e2" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2081e2" stopOpacity={0.0} />
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
                    dataKey="futuresPrice"
                    stroke="#2081e2"
                    strokeWidth={2}
                    fill="url(#futuresGrad)"
                    name="Futures Price"
                  />
                  <Area
                    type="monotone"
                    dataKey="spotPrice"
                    stroke="#9ca3af"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    fill="none"
                    name="Spot Price"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Basis spread convergence info banner */}
            <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-primary shrink-0" />
                <span className="text-muted-foreground">
                  Basis will converge to <strong>$0.00</strong> at expiry settlement ({currentContract.expiryDate}).
                </span>
              </div>
              <span className="text-primary font-bold">100% Cash Settled</span>
            </div>
          </div>

          {/* Positions & Orders Tabs */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="flex border-b border-border bg-muted/20">
              <button
                onClick={() => setActiveTab("positions")}
                className={`py-3 px-4 text-xs font-display font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === "positions"
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
                onClick={() => setActiveTab("specs")}
                className={`py-3 px-4 text-xs font-display font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === "specs"
                    ? "border-b-2 border-primary text-foreground bg-card"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Contract Specifications</span>
              </button>
            </div>

            <div className="p-4">
              {activeTab === "positions" && (
                <div className="flex flex-col gap-3">
                  {positions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground font-mono text-xs">
                      No open futures positions yet. Place an order to start trading!
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
                                  {pos.marginMode}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-muted-foreground">
                                Entry: ${pos.entryPrice.toLocaleString()} • Mark: ${pos.markPrice.toLocaleString()} • Liq: ${pos.liquidationPrice.toLocaleString()}
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

              {activeTab === "specs" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <div className="text-muted-foreground text-[10px] uppercase">Underlying Index</div>
                    <div className="font-bold text-foreground mt-0.5">{currentContract.underlying} (USD)</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <div className="text-muted-foreground text-[10px] uppercase">Settlement Date</div>
                    <div className="font-bold text-foreground mt-0.5">{currentContract.expiryDate} 08:00 UTC</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <div className="text-muted-foreground text-[10px] uppercase">Settlement Mechanism</div>
                    <div className="font-bold text-foreground mt-0.5">Cash Settled (USDC)</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <div className="text-muted-foreground text-[10px] uppercase">Oracle Benchmark</div>
                    <div className="font-bold text-foreground mt-0.5">Pyth Network Low-Latency</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <div className="text-muted-foreground text-[10px] uppercase">Trading Fee</div>
                    <div className="font-bold text-foreground mt-0.5">Maker 0.02% / Taker 0.04%</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <div className="text-muted-foreground text-[10px] uppercase">Max Permitted Leverage</div>
                    <div className="font-bold text-foreground mt-0.5">{currentContract.maxLeverage}x Dynamic</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: ORDER EXECUTION PANEL ================= */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col gap-4">
          
          {/* Side Tabs: Buy/Long vs Sell/Short */}
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

          {/* Leverage Selector Slider */}
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
              max={currentContract.maxLeverage}
              value={leverage}
              onChange={e => setLeverage(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer h-1.5 bg-muted rounded-lg"
            />

            <div className="flex justify-between gap-1 text-[10px] font-mono">
              {[1, 5, 10, 20, currentContract.maxLeverage].map(l => (
                <button
                  key={l}
                  onClick={() => setLeverage(l)}
                  className={`px-2 py-0.5 rounded border ${
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
              <label className="text-[11px] font-mono text-muted-foreground uppercase">Limit Order Price</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={currentContract.futuresPrice.toString()}
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
              <span>Order Contracts</span>
              <span>Available: ${usdcBalance.toFixed(2)}</span>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="1.0"
                value={contractsInput}
                onChange={e => setContractsInput(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              />
              <span className="absolute right-3 top-2.5 text-xs font-mono text-muted-foreground">
                Contracts
              </span>
            </div>
          </div>

          {/* Order Summary & Risk Calculation */}
          <div className="p-3 rounded-xl bg-muted/20 border border-border flex flex-col gap-1.5 text-xs font-mono">
            <div className="flex justify-between text-muted-foreground">
              <span>Notional Value:</span>
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
              <span>Trading Fee (0.04%):</span>
              <span>${tradingFee.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Button */}
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
                ? "Executing on Devnet..."
                : `${side} ${currentContract.symbol} (${leverage}x)`}
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
                Solana Devnet Settlement
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
                STREET SYNC FUTURES
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
                toast.success("PnL card link copied to clipboard!");
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
