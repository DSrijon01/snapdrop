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
  CheckCircle2,
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
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";

export interface OptionUnderlying {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  ivAvg: number; // average IV %
  category: "Stock" | "Crypto";
}

const UNDERLYINGS: Record<string, OptionUnderlying> = {
  TSLA: {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 184.5,
    change24h: 3.42,
    ivAvg: 58.4,
    category: "Stock",
  },
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    price: 128.2,
    change24h: -1.15,
    ivAvg: 64.2,
    category: "Stock",
  },
  AAPL: {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 173.8,
    change24h: 0.85,
    ivAvg: 28.6,
    category: "Stock",
  },
  SOL: {
    symbol: "SOL",
    name: "Solana",
    price: 142.5,
    change24h: 5.68,
    ivAvg: 72.1,
    category: "Crypto",
  },
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    price: 92450.0,
    change24h: 2.14,
    ivAvg: 52.8,
    category: "Crypto",
  },
  COIN: {
    symbol: "COIN",
    name: "Coinbase Global",
    price: 224.8,
    change24h: -2.4,
    ivAvg: 76.5,
    category: "Stock",
  },
  GME: {
    symbol: "GME",
    name: "GameStop Corp.",
    price: 24.6,
    change24h: 12.8,
    ivAvg: 115.0,
    category: "Stock",
  },
};

const EXPIRIES = [
  { id: "7d", label: "7 Days", dte: 7, tag: "Weekly" },
  { id: "14d", label: "14 Days", dte: 14, tag: "Bi-Weekly" },
  { id: "30d", label: "30 Days", dte: 30, tag: "Monthly" },
  { id: "60d", label: "60 Days", dte: 60, tag: "Quarterly" },
];

export interface OpenContractPosition {
  id: string;
  symbol: string;
  type: "CALL" | "PUT";
  strike: number;
  expiryLabel: string;
  dte: number;
  contracts: number;
  entryPremium: number;
  currentPremium: number;
  totalCostUsd: number;
  createdAt: string;
}

export function BuyOptionsTerminal() {
  const { publicKey } = useWallet();
  const [underlyings, setUnderlyings] = useState(UNDERLYINGS);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("TSLA");
  const [contractType, setContractType] = useState<"CALL" | "PUT">("CALL");
  const [selectedExpiry, setSelectedExpiry] = useState(EXPIRIES[0]);
  const [selectedStrike, setSelectedStrike] = useState<number>(185);
  const [contractsCount, setContractsCount] = useState<number>(1);
  const [currency, setCurrency] = useState<"SOL" | "USDC">("USDC");
  const [activeSubTab, setActiveSubTab] = useState<"chain" | "positions">("chain");
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txState, setTxState] = useState<"idle" | "simulating" | "success">("idle");
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  // User simulated balance
  const [usdcBalance, setUsdcBalance] = useState<number>(15400.0);
  const [solBalance, setSolBalance] = useState<number>(24.5);

  // Active user positions
  const [positions, setPositions] = useState<OpenContractPosition[]>([
    {
      id: "pos-1",
      symbol: "TSLA",
      type: "CALL",
      strike: 180,
      expiryLabel: "7 Days",
      dte: 5,
      contracts: 2,
      entryPremium: 6.2,
      currentPremium: 7.8,
      totalCostUsd: 1240,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: "pos-2",
      symbol: "SOL",
      type: "CALL",
      strike: 140,
      expiryLabel: "14 Days",
      dte: 11,
      contracts: 5,
      entryPremium: 8.5,
      currentPremium: 10.2,
      totalCostUsd: 4250,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);

  const currentAsset = underlyings[selectedSymbol] || underlyings["TSLA"];
  const solPrice = underlyings["SOL"]?.price || 142.5;

  // Real-time price fluctuations simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setUnderlyings((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          const u = next[key];
          const pct = (Math.random() - 0.49) * 0.0018;
          const newPrice = parseFloat((u.price * (1 + pct)).toFixed(2));
          next[key] = {
            ...u,
            price: newPrice,
          };
        });
        return next;
      });
    }, 3500);

    return () => clearInterval(timer);
  }, []);

  // Update default selected strike when asset changes
  useEffect(() => {
    const p = currentAsset.price;
    const step = p > 1000 ? 500 : p > 100 ? 5 : 1;
    const rounded = Math.round(p / step) * step;
    setSelectedStrike(rounded);
  }, [selectedSymbol]);

  // Generate strike ladder around current price
  const strikeChain = useMemo(() => {
    const p = currentAsset.price;
    const step = p > 1000 ? 500 : p > 100 ? 5 : 1;
    const baseStrike = Math.round(p / step) * step;
    const strikes: number[] = [];

    for (let i = -3; i <= 3; i++) {
      strikes.push(baseStrike + i * step);
    }

    return strikes.map((strike) => {
      const diff = strike - p;
      const pctDiff = (diff / p) * 100;
      const isCall = contractType === "CALL";
      const isItm = isCall ? p >= strike : p <= strike;
      const isAtm = Math.abs(diff) < step * 0.5;

      // Realistic Black-Scholes approximation for mock premiums
      const intrinsic = isCall ? Math.max(0, p - strike) : Math.max(0, strike - p);
      const timeVal = Math.sqrt(selectedExpiry.dte / 365) * p * (currentAsset.ivAvg / 100) * 0.35;
      const rawPremium = Math.max(0.25, intrinsic + timeVal);
      const premium = parseFloat(rawPremium.toFixed(2));

      // Greeks
      const moneyness = (p - strike) / (p * 0.1);
      const delta = isCall
        ? Math.min(0.98, Math.max(0.02, parseFloat((0.5 + moneyness * 0.25).toFixed(2))))
        : Math.min(-0.02, Math.max(-0.98, parseFloat((-0.5 + moneyness * 0.25).toFixed(2))));
      const theta = parseFloat((-((premium * 0.05) / Math.sqrt(selectedExpiry.dte))).toFixed(2));
      const volume = Math.floor(Math.abs(Math.sin(strike)) * 2400) + 120;
      const oi = Math.floor(Math.abs(Math.cos(strike)) * 8900) + 500;

      return {
        strike,
        isItm,
        isAtm,
        pctDiff,
        premium,
        contractPrice: premium * 100, // standard 100 shares multiplier
        delta,
        theta,
        volume,
        oi,
        iv: Math.round(currentAsset.ivAvg + (Math.abs(diff) / p) * 15),
      };
    });
  }, [currentAsset, contractType, selectedExpiry]);

  // Current selected strike details
  const activeStrikeData = useMemo(() => {
    return (
      strikeChain.find((s) => s.strike === selectedStrike) ||
      strikeChain[Math.floor(strikeChain.length / 2)]
    );
  }, [strikeChain, selectedStrike]);

  // Breakeven and Payoff metrics
  const breakevenPrice = useMemo(() => {
    if (!activeStrikeData) return 0;
    if (contractType === "CALL") {
      return parseFloat((activeStrikeData.strike + activeStrikeData.premium).toFixed(2));
    } else {
      return parseFloat((activeStrikeData.strike - activeStrikeData.premium).toFixed(2));
    }
  }, [activeStrikeData, contractType]);

  const totalCostUsd = useMemo(() => {
    if (!activeStrikeData) return 0;
    return parseFloat((activeStrikeData.contractPrice * contractsCount).toFixed(2));
  }, [activeStrikeData, contractsCount]);

  const totalCostSol = useMemo(() => {
    if (!solPrice || solPrice <= 0) return 0;
    return parseFloat((totalCostUsd / solPrice).toFixed(4));
  }, [totalCostUsd, solPrice]);

  const maxLoss = totalCostUsd;
  const maxProfit = contractType === "CALL" ? "Unlimited" : `$${(activeStrikeData.strike * 100 * contractsCount - totalCostUsd).toLocaleString()}`;

  // Execute Option Order
  const handleBuyOption = () => {
    if (currency === "USDC" && totalCostUsd > usdcBalance) {
      toast.error("Insufficient USDC balance for this option purchase.");
      return;
    }
    if (currency === "SOL" && totalCostSol > solBalance) {
      toast.error("Insufficient SOL balance for this option purchase.");
      return;
    }

    setTxState("simulating");
    setTxModalOpen(true);

    setTimeout(() => {
      // Deduct balance
      if (currency === "USDC") {
        setUsdcBalance((prev) => parseFloat((prev - totalCostUsd).toFixed(2)));
      } else {
        setSolBalance((prev) => parseFloat((prev - totalCostSol).toFixed(4)));
      }

      // Add to positions
      const newPos: OpenContractPosition = {
        id: `opt-${Date.now()}`,
        symbol: selectedSymbol,
        type: contractType,
        strike: activeStrikeData.strike,
        expiryLabel: selectedExpiry.label,
        dte: selectedExpiry.dte,
        contracts: contractsCount,
        entryPremium: activeStrikeData.premium,
        currentPremium: activeStrikeData.premium,
        totalCostUsd: totalCostUsd,
        createdAt: new Date().toISOString(),
      };

      setPositions((prev) => [newPos, ...prev]);

      setLastReceipt({
        txHash: `sim_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
        symbol: selectedSymbol,
        type: contractType,
        strike: activeStrikeData.strike,
        contracts: contractsCount,
        totalUsd: totalCostUsd,
        breakeven: breakevenPrice,
        expiry: selectedExpiry.label,
      });

      setTxState("success");
      toast.success(
        `Successfully purchased ${contractsCount}x ${selectedSymbol} $${activeStrikeData.strike} ${contractType}!`
      );
    }, 1200);
  };

  // Close / Exercise an existing position
  const handleClosePosition = (posId: string) => {
    const pos = positions.find((p) => p.id === posId);
    if (!pos) return;

    const returnUsd = pos.contracts * 100 * pos.currentPremium;
    setUsdcBalance((prev) => parseFloat((prev + returnUsd).toFixed(2)));
    setPositions((prev) => prev.filter((p) => p.id !== posId));

    const pnl = returnUsd - pos.totalCostUsd;
    if (pnl >= 0) {
      toast.success(`Position closed! Locked in +$${pnl.toFixed(2)} gain.`);
    } else {
      toast(`Position closed. Realized -$${Math.abs(pnl).toFixed(2)} loss.`, {
        icon: "📉",
      });
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Banner / Asset Selection Strip */}
      <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Asset pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {Object.values(underlyings).map((asset) => {
            const isSelected = selectedSymbol === asset.symbol;
            const isUp = asset.change24h >= 0;

            return (
              <button
                key={asset.symbol}
                onClick={() => setSelectedSymbol(asset.symbol)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all shrink-0 active:scale-95 border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.02]"
                    : "bg-secondary/40 text-foreground border-border hover:bg-secondary hover:border-border/80"
                }`}
              >
                <span className="font-black text-sm">{asset.symbol}</span>
                <span
                  className={`font-mono text-[11px] ${
                    isSelected ? "text-primary-foreground/90" : isUp ? "text-green-500" : "text-red-500"
                  }`}
                >
                  ${asset.price.toLocaleString()}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : isUp
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {isUp ? "+" : ""}
                  {asset.change24h}%
                </span>
              </button>
            );
          })}
        </div>

        {/* User Balance pill */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-muted-foreground block leading-none">
              Buying Power
            </span>
            <span className="text-sm font-black font-display text-foreground">
              ${usdcBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC
            </span>
          </div>
          <button
            onClick={() => setUsdcBalance((prev) => prev + 2500)}
            className="p-1.5 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-[10px] font-mono font-bold uppercase transition-all"
            title="Faucet 2,500 USDC"
          >
            + Faucet
          </button>
        </div>
      </div>

      {/* Main Options Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Option Chain / Strikes / Positions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Controls Bar: Call/Put Toggle & Expirations */}
          <div className="glass-card p-3 sm:p-4 rounded-2xl border border-border shadow-md space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Call vs Put Selector */}
              <div className="flex p-1 bg-secondary/50 rounded-xl border border-border max-w-[280px] w-full">
                <button
                  type="button"
                  onClick={() => setContractType("CALL")}
                  className={`flex-1 py-2 rounded-lg text-xs font-black font-display uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    contractType === "CALL"
                      ? "bg-green-600 text-white shadow-md shadow-green-600/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ArrowUpRight size={16} />
                  <span>Call (Bullish)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContractType("PUT")}
                  className={`flex-1 py-2 rounded-lg text-xs font-black font-display uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    contractType === "PUT"
                      ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ArrowDownRight size={16} />
                  <span>Put (Bearish)</span>
                </button>
              </div>

              {/* View Switcher: Chain vs My Positions */}
              <div className="flex p-1 bg-secondary/40 rounded-xl border border-border text-xs font-mono">
                <button
                  onClick={() => setActiveSubTab("chain")}
                  className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all ${
                    activeSubTab === "chain"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Strikes Chain
                </button>
                <button
                  onClick={() => setActiveSubTab("positions")}
                  className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all flex items-center gap-1.5 ${
                    activeSubTab === "positions"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>My Contracts</span>
                  {positions.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-bold">
                      {positions.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Expirations Bar */}
            {activeSubTab === "chain" && (
              <div className="pt-2 border-t border-border/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold shrink-0">
                  Expiry:
                </span>
                {EXPIRIES.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => setSelectedExpiry(exp)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shrink-0 border ${
                      selectedExpiry.id === exp.id
                        ? "bg-secondary text-foreground border-primary shadow-xs"
                        : "bg-transparent text-muted-foreground border-border/60 hover:border-border"
                    }`}
                  >
                    <span>{exp.label}</span>
                    <span className="ml-1.5 text-[9px] opacity-70 px-1 py-0.2 rounded bg-black/10 dark:bg-white/10">
                      {exp.tag}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Strikes Chain List */}
          {activeSubTab === "chain" ? (
            <div className="glass-card rounded-2xl border border-border shadow-lg overflow-hidden">
              <div className="p-3.5 border-b border-border bg-secondary/15 flex items-center justify-between text-[11px] font-mono text-muted-foreground font-bold uppercase">
                <span className="w-24">Strike Price</span>
                <span className="flex-1 text-center">IV & Greeks</span>
                <span className="w-28 text-right">Premium / Share</span>
                <span className="w-20 text-right">Action</span>
              </div>

              <div className="divide-y divide-border/40 max-h-[460px] overflow-y-auto scrollbar-hide">
                {strikeChain.map((item) => {
                  const isSelected = selectedStrike === item.strike;
                  const isCall = contractType === "CALL";

                  return (
                    <div
                      key={item.strike}
                      onClick={() => setSelectedStrike(item.strike)}
                      className={`p-3.5 flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
                        isSelected
                          ? "bg-primary/10 border-l-4 border-l-primary"
                          : "hover:bg-secondary/30"
                      }`}
                    >
                      {/* Strike & In-The-Money badge */}
                      <div className="w-24">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black font-display text-foreground">
                            ${item.strike}
                          </span>
                          {item.isAtm ? (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 font-bold">
                              ATM
                            </span>
                          ) : item.isItm ? (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-bold">
                              ITM
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground font-bold">
                              OTM
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground block">
                          {item.pctDiff >= 0 ? "+" : ""}
                          {item.pctDiff.toFixed(1)}% to spot
                        </span>
                      </div>

                      {/* Greeks & IV */}
                      <div className="flex-1 text-center flex items-center justify-center gap-3 text-xs font-mono">
                        <div className="hidden sm:block">
                          <span className="text-[10px] text-muted-foreground block">IV</span>
                          <span className="font-bold text-foreground">{item.iv}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Delta (Δ)</span>
                          <span className="font-bold text-foreground">{item.delta}</span>
                        </div>
                        <div className="hidden md:block">
                          <span className="text-[10px] text-muted-foreground block">Theta (θ)</span>
                          <span className="font-bold text-foreground">{item.theta}</span>
                        </div>
                      </div>

                      {/* Premium per share */}
                      <div className="w-28 text-right">
                        <span className="text-sm font-black font-display text-foreground block">
                          ${item.premium.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground block">
                          ${item.contractPrice.toFixed(0)} / contract
                        </span>
                      </div>

                      {/* Select Pill */}
                      <div className="w-20 text-right">
                        <button
                          type="button"
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                            isSelected
                              ? isCall
                                ? "bg-green-600 text-white shadow-xs"
                                : "bg-red-600 text-white shadow-xs"
                              : "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                          }`}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* My Positions Tab */
            <div className="glass-card rounded-2xl border border-border shadow-lg p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h4 className="text-sm font-black font-display uppercase tracking-wider text-foreground">
                  Active Options Contracts ({positions.length})
                </h4>
                <span className="text-xs font-mono text-muted-foreground">
                  Simulated Portfolio
                </span>
              </div>

              {positions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <Activity size={32} className="mx-auto opacity-40 animate-pulse" />
                  <p className="font-display font-bold uppercase text-sm">No Active Options Contracts</p>
                  <p className="text-xs font-mono">
                    Select a strike from the chain and execute your first option trade!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {positions.map((pos) => {
                    const currentVal = pos.contracts * 100 * pos.currentPremium;
                    const pnl = currentVal - pos.totalCostUsd;
                    const pnlPct = (pnl / pos.totalCostUsd) * 100;
                    const isProfit = pnl >= 0;

                    return (
                      <div
                        key={pos.id}
                        className="p-4 rounded-xl border border-border bg-secondary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black font-display text-base text-foreground">
                              {pos.symbol}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase text-white ${
                                pos.type === "CALL" ? "bg-green-600" : "bg-red-600"
                              }`}
                            >
                              ${pos.strike} {pos.type}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground">
                              x{pos.contracts} ({pos.expiryLabel})
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-muted-foreground block">
                            Cost: ${pos.totalCostUsd.toLocaleString()} | Current Val: ${currentVal.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="text-right">
                            <span
                              className={`text-sm font-black font-mono block ${
                                isProfit ? "text-green-500" : "text-red-500"
                              }`}
                            >
                              {isProfit ? "+" : ""}${pnl.toFixed(2)} ({isProfit ? "+" : ""}
                              {pnlPct.toFixed(1)}%)
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {pos.dte} days remaining
                            </span>
                          </div>

                          <button
                            onClick={() => handleClosePosition(pos.id)}
                            className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-mono font-bold uppercase transition-all active:scale-95 text-foreground"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Order Builder & Payoff Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-border shadow-xl space-y-5">
            {/* Header: Order Summary */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase text-primary">
                    Order Builder
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-mono font-bold border border-border text-foreground">
                    100 Shares / Contract
                  </span>
                </div>
                <h3 className="text-lg font-black font-display uppercase tracking-tight text-foreground mt-0.5">
                  {selectedSymbol} ${activeStrikeData.strike} {contractType}
                </h3>
              </div>

              {/* Currency selector (SOL vs USDC) */}
              <div className="flex items-center p-1 bg-secondary/50 rounded-xl border border-border text-xs font-mono">
                <button
                  onClick={() => setCurrency("USDC")}
                  className={`px-2.5 py-1 rounded-lg font-bold uppercase transition-all ${
                    currency === "USDC"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  USDC
                </button>
                <button
                  onClick={() => setCurrency("SOL")}
                  className={`px-2.5 py-1 rounded-lg font-bold uppercase transition-all ${
                    currency === "SOL"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  SOL
                </button>
              </div>
            </div>

            {/* Number of contracts input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-mono font-bold uppercase">
                <span>Contracts Quantity</span>
                <span>= {contractsCount * 100} underlying shares</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={contractsCount}
                  onChange={(e) => setContractsCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 bg-secondary/40 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-lg font-black font-display text-foreground outline-none transition-all"
                />

                {/* Quick Stepper Presets */}
                {[1, 2, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setContractsCount(num)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                      contractsCount === num
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/40 text-foreground border-border hover:bg-secondary"
                    }`}
                  >
                    {num}x
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics & Risk Breakdown */}
            <div className="p-4 rounded-xl bg-secondary/20 border border-border space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Premium per share:</span>
                <span className="font-bold text-foreground">
                  ${activeStrikeData.premium.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Contract Cost (100x):</span>
                <span className="font-bold text-foreground">
                  ${activeStrikeData.contractPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Breakeven at Expiry:</span>
                <span className="font-bold text-foreground font-mono">
                  ${breakevenPrice} ({contractType === "CALL" ? "+" : "-"}
                  {Math.abs(((breakevenPrice - currentAsset.price) / currentAsset.price) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Max Loss (Capped):</span>
                <span className="font-bold text-amber-500">${maxLoss.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Max Profit:</span>
                <span className="font-bold text-emerald-500">{maxProfit}</span>
              </div>

              {/* Payoff Visual Bar */}
              <div className="pt-2 border-t border-border/40 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Current: ${currentAsset.price}</span>
                  <span className="font-bold text-foreground">Breakeven: ${breakevenPrice}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden flex">
                  <div
                    className={`h-full ${contractType === "CALL" ? "bg-red-500" : "bg-green-500"}`}
                    style={{ width: "45%" }}
                    title="Loss Zone"
                  />
                  <div
                    className={`h-full ${contractType === "CALL" ? "bg-green-500" : "bg-red-500"}`}
                    style={{ width: "55%" }}
                    title="Profit Zone"
                  />
                </div>
              </div>
            </div>

            {/* Total Cost Display */}
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">
                  Total Investment Required
                </span>
                <span className="text-2xl font-black font-display text-foreground">
                  ${totalCostUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {currency === "SOL" && (
                <div className="text-right">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">
                    In Solana
                  </span>
                  <span className="text-base font-bold font-mono text-primary">
                    ≈ {totalCostSol} SOL
                  </span>
                </div>
              )}
            </div>

            {/* Execute Buy Button */}
            <button
              type="button"
              onClick={handleBuyOption}
              className={`w-full py-4 rounded-xl font-black font-display uppercase tracking-wider text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                contractType === "CALL"
                  ? "bg-green-600 hover:bg-green-500 shadow-green-600/25"
                  : "bg-red-600 hover:bg-red-500 shadow-red-600/25"
              }`}
            >
              <Zap size={18} />
              <span>
                Buy {contractsCount}x {selectedSymbol} ${activeStrikeData.strike} {contractType}
              </span>
            </button>

            {/* Footnote guarantee */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/80 justify-center">
              <ShieldAlert size={12} className="text-primary" />
              <span>Simulated Tokenized Options Protocol on Solana Devnet</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Receipt Modal */}
      <AnimatePresence>
        {txModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4"
            >
              {txState === "simulating" ? (
                <div className="text-center py-8 space-y-3">
                  <RefreshCw className="w-10 h-10 text-primary animate-spin mx-auto" />
                  <h4 className="text-base font-black font-display uppercase tracking-wider text-foreground">
                    Minting Option Contract on Solana...
                  </h4>
                  <p className="text-xs font-mono text-muted-foreground">
                    Interacting with tokenized derivatives program vault
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={28} />
                  </div>

                  <div className="text-center">
                    <h4 className="text-lg font-black font-display uppercase tracking-tight text-foreground">
                      Option Contract Purchased!
                    </h4>
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                      Your position is now active and tracked in real-time.
                    </p>
                  </div>

                  {lastReceipt && (
                    <div className="p-3.5 rounded-xl bg-secondary/30 border border-border text-xs font-mono space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contract:</span>
                        <span className="font-bold text-foreground">
                          {lastReceipt.symbol} ${lastReceipt.strike} {lastReceipt.type}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Size:</span>
                        <span className="font-bold text-foreground">
                          {lastReceipt.contracts} Contracts ({lastReceipt.contracts * 100} shares)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Premium:</span>
                        <span className="font-bold text-foreground">
                          ${lastReceipt.totalUsd.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Breakeven:</span>
                        <span className="font-bold text-foreground font-mono">
                          ${lastReceipt.breakeven}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tx Signature:</span>
                        <span className="font-mono text-primary text-[10px]">
                          {lastReceipt.txHash.substring(0, 14)}...
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setTxModalOpen(false);
                        setActiveSubTab("positions");
                      }}
                      className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold font-display uppercase text-xs tracking-wider transition-all"
                    >
                      View in My Contracts
                    </button>
                    <button
                      onClick={() => setTxModalOpen(false)}
                      className="px-4 py-3 rounded-xl border border-border hover:bg-secondary font-bold font-display uppercase text-xs text-foreground transition-all"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
