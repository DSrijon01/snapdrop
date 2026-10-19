"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Flame,
  ArrowRight,
  Coins,
  DollarSign,
  Lock,
  Unlock,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  CheckCircle2,
  Info,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

// Tokenized Stocks & Risk Specifications
export interface StockAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  ltvBps: number; // e.g. 6500 = 65%
  liquidationThresholdBps: number; // e.g. 7500 = 75%
  borrowAprBps: number; // e.g. 480 = 4.80%
  marketCap: string;
  peRatio: string;
  category: "MegaCap" | "Tech" | "EV" | "Fintech";
  logoBg: string;
}

const SUPPORTED_STOCKS: Record<string, StockAsset> = {
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    price: 128.4,
    change24h: 3.42,
    ltvBps: 6500, // 65% LTV
    liquidationThresholdBps: 7500, // 75% Liq Threshold
    borrowAprBps: 485, // 4.85%
    marketCap: "$3.15T",
    peRatio: "68.2",
    category: "Tech",
    logoBg: "from-emerald-500/20 to-emerald-900/40 text-emerald-400 border-emerald-500/30",
  },
  AAPL: {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 173.5,
    change24h: 1.15,
    ltvBps: 7000, // 70% LTV (Blue-chip)
    liquidationThresholdBps: 8000, // 80% Liq Threshold
    borrowAprBps: 420, // 4.20%
    marketCap: "$2.68T",
    peRatio: "26.4",
    category: "MegaCap",
    logoBg: "from-zinc-400/20 to-zinc-800/40 text-zinc-200 border-zinc-500/30",
  },
  TSLA: {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 218.2,
    change24h: -2.35,
    ltvBps: 6000, // 60% LTV (Higher Beta)
    liquidationThresholdBps: 7000, // 70% Liq Threshold
    borrowAprBps: 540, // 5.40%
    marketCap: "$695B",
    peRatio: "42.8",
    category: "EV",
    logoBg: "from-red-500/20 to-red-900/40 text-red-400 border-red-500/30",
  },
  AMZN: {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 178.1,
    change24h: 1.84,
    ltvBps: 6500, // 65% LTV
    liquidationThresholdBps: 7500, // 75% Liq Threshold
    borrowAprBps: 460, // 4.60%
    marketCap: "$1.85T",
    peRatio: "38.9",
    category: "MegaCap",
    logoBg: "from-amber-500/20 to-amber-900/40 text-amber-400 border-amber-500/30",
  },
  COIN: {
    symbol: "COIN",
    name: "Coinbase Global",
    price: 224.5,
    change24h: 5.12,
    ltvBps: 5500, // 55% LTV (High Volatility)
    liquidationThresholdBps: 6500, // 65% Liq Threshold
    borrowAprBps: 620, // 6.20%
    marketCap: "$53.2B",
    peRatio: "31.2",
    category: "Fintech",
    logoBg: "from-blue-500/20 to-blue-900/40 text-blue-400 border-blue-500/30",
  },
};

export function StockLendingDashboard() {
  // Selected stock for operations
  const [selectedStockKey, setSelectedStockKey] = useState<string>("NVDA");
  const selectedStock = SUPPORTED_STOCKS[selectedStockKey] || SUPPORTED_STOCKS.NVDA;

  // Local Wallet Balances (Tokens owned by user)
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({
    NVDA: 15.0,
    AAPL: 25.0,
    TSLA: 10.0,
    AMZN: 12.0,
    COIN: 8.0,
  });
  const [walletUsdc, setWalletUsdc] = useState<number>(3500.0);

  // User Obligation Pledged Collateral (Stocks locked in lending contract)
  const [pledgedCollateral, setPledgedCollateral] = useState<Record<string, number>>({
    NVDA: 10.0, // 10 * 128.40 = $1,284.00
    AAPL: 5.0, // 5 * 173.50 = $867.50
    TSLA: 0.0,
    AMZN: 0.0,
    COIN: 0.0,
  });

  // Borrowed Debt in USDC
  const [borrowedDebtUsdc, setBorrowedDebtUsdc] = useState<number>(850.0);

  // Action Tabs
  const [actionTab, setActionTab] = useState<"borrow" | "collateral">("collateral");
  const [collateralSubAction, setCollateralSubAction] = useState<"deposit" | "withdraw">("deposit");
  const [borrowSubAction, setBorrowSubAction] = useState<"borrow" | "repay">("borrow");

  // Form Inputs
  const [stockAmountInput, setStockAmountInput] = useState<string>("");
  const [usdcAmountInput, setUsdcAmountInput] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Compute Total Pledged Collateral Value & Max Allowed Borrow Limit
  const { totalPledgedValueUsdc, maxBorrowLimitUsdc, liquidationThresholdValueUsdc } = useMemo(() => {
    let totalValue = 0;
    let maxBorrow = 0;
    let liqThreshold = 0;

    Object.entries(pledgedCollateral).forEach(([symbol, amount]) => {
      const stock = SUPPORTED_STOCKS[symbol];
      if (stock && amount > 0) {
        const val = amount * stock.price;
        totalValue += val;
        maxBorrow += val * (stock.ltvBps / 10000);
        liqThreshold += val * (stock.liquidationThresholdBps / 10000);
      }
    });

    return {
      totalPledgedValueUsdc: totalValue,
      maxBorrowLimitUsdc: maxBorrow,
      liquidationThresholdValueUsdc: liqThreshold,
    };
  }, [pledgedCollateral]);

  // Remaining Borrow Power
  const remainingBorrowPowerUsdc = Math.max(0, maxBorrowLimitUsdc - borrowedDebtUsdc);

  // Health Factor: (Liquidation Threshold Value) / (Borrowed Debt)
  const healthFactor = useMemo(() => {
    if (borrowedDebtUsdc <= 0) return 999.0;
    if (totalPledgedValueUsdc <= 0) return 0.0;
    return liquidationThresholdValueUsdc / borrowedDebtUsdc;
  }, [liquidationThresholdValueUsdc, borrowedDebtUsdc, totalPledgedValueUsdc]);

  // Drop-to-liquidation buffer: percentage equity value can drop before HF hits 1.00
  const liquidationDropBuffer = useMemo(() => {
    if (borrowedDebtUsdc <= 0 || liquidationThresholdValueUsdc <= 0) return 100.0;
    const diff = liquidationThresholdValueUsdc - borrowedDebtUsdc;
    if (diff <= 0) return 0.0;
    return (diff / liquidationThresholdValueUsdc) * 100;
  }, [liquidationThresholdValueUsdc, borrowedDebtUsdc]);

  // Actions
  const handleDepositStock = () => {
    const amt = parseFloat(stockAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid stock amount");
      return;
    }
    const available = walletBalances[selectedStockKey] || 0;
    if (amt > available) {
      toast.error(`Insufficient ${selectedStockKey} balance in wallet`);
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setWalletBalances((prev) => ({ ...prev, [selectedStockKey]: prev[selectedStockKey] - amt }));
      setPledgedCollateral((prev) => ({ ...prev, [selectedStockKey]: (prev[selectedStockKey] || 0) + amt }));
      setStockAmountInput("");
      setIsProcessing(false);
      toast.success(`Successfully deposited ${amt.toFixed(2)} ${selectedStockKey} into Stock Collateral Vault!`);
    }, 600);
  };

  const handleWithdrawStock = () => {
    const amt = parseFloat(stockAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const currentPledged = pledgedCollateral[selectedStockKey] || 0;
    if (amt > currentPledged) {
      toast.error(`Cannot withdraw more than pledged balance`);
      return;
    }

    // Check post-withdrawal solvency
    const stockVal = amt * selectedStock.price;
    const lostThreshold = stockVal * (selectedStock.liquidationThresholdBps / 10000);
    const newThreshold = liquidationThresholdValueUsdc - lostThreshold;

    if (borrowedDebtUsdc > 0 && newThreshold < borrowedDebtUsdc) {
      toast.error("Withdrawal rejected: Would drop Health Factor below liquidation threshold!");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setPledgedCollateral((prev) => ({ ...prev, [selectedStockKey]: prev[selectedStockKey] - amt }));
      setWalletBalances((prev) => ({ ...prev, [selectedStockKey]: (prev[selectedStockKey] || 0) + amt }));
      setStockAmountInput("");
      setIsProcessing(false);
      toast.success(`Released ${amt.toFixed(2)} ${selectedStockKey} back to your wallet!`);
    }, 600);
  };

  const handleBorrowUsdc = () => {
    const amt = parseFloat(usdcAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid USDC borrow amount");
      return;
    }
    if (amt > remainingBorrowPowerUsdc) {
      toast.error("Requested borrow exceeds available stock-backed credit limit!");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setBorrowedDebtUsdc((prev) => prev + amt);
      setWalletUsdc((prev) => prev + amt);
      setUsdcAmountInput("");
      setIsProcessing(false);
      toast.success(`Borrowed $${amt.toFixed(2)} USDC against your stock portfolio!`);
    }, 600);
  };

  const handleRepayUsdc = () => {
    const amt = parseFloat(usdcAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid repayment amount");
      return;
    }
    if (amt > walletUsdc) {
      toast.error("Insufficient USDC in wallet");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const repayAmount = Math.min(amt, borrowedDebtUsdc);
      setWalletUsdc((prev) => prev - repayAmount);
      setBorrowedDebtUsdc((prev) => Math.max(0, prev - repayAmount));
      setUsdcAmountInput("");
      setIsProcessing(false);
      toast.success(`Repaid $${repayAmount.toFixed(2)} USDC! Debt reduced.`);
    }, 600);
  };

  const handleAirdropStocks = () => {
    setWalletBalances((prev) => ({
      ...prev,
      NVDA: prev.NVDA + 10.0,
      AAPL: prev.AAPL + 10.0,
      TSLA: prev.TSLA + 5.0,
    }));
    toast.success("Airdropped +10 NVDA, +10 AAPL, and +5 TSLA test stocks into wallet!");
  };

  return (
    <div className="w-full space-y-8">
      {/* 1. Header: Securities-Backed Lending Facility */}
      <div className="bg-gradient-to-r from-card/80 via-card/50 to-emerald-500/5 border border-emerald-500/25 rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Securities-Backed Lending (SBL) • Institutional Credit Facility</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="w-7 h-7 text-emerald-400" />
              <span>Borrow Against Stocks</span>
            </h2>
            <p className="text-sm text-muted-foreground font-mono leading-relaxed">
              Deposit your tokenized US Equities (<strong className="text-emerald-400">NVDA, AAPL, TSLA, AMZN, COIN</strong>) into an isolated collateral vault and borrow liquid <strong className="text-cyan-400">USDC</strong>. Never trigger taxable sales or miss out on corporate dividends.
            </p>
          </div>

          {/* Quick Metrics & Faucet */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-background/80 border border-border/80 px-4 py-2.5 rounded-2xl">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">Stock LTV Range</span>
              <span className="text-lg font-black font-display text-emerald-400">55% – 70%</span>
            </div>
            <div className="bg-background/80 border border-border/80 px-4 py-2.5 rounded-2xl">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">Dividend Pass-Through</span>
              <span className="text-lg font-black font-display text-foreground">100% Retained</span>
            </div>
            <button
              onClick={handleAirdropStocks}
              type="button"
              className="px-4 py-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold rounded-2xl text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              title="Add 10 NVDA, 10 AAPL, 5 TSLA to wallet"
            >
              <Coins className="w-4 h-4" />
              <span>Get Test Stocks</span>
            </button>
          </div>
        </div>

        {/* Oracle Status & Market Hours Bar */}
        <div className="mt-6 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between text-xs font-mono text-muted-foreground gap-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-foreground/80">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <strong>NYSE/NASDAQ Session:</strong> <span className="text-emerald-400 font-bold">Regular Hours (Live)</span>
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">Pyth Equity Feeds: Sub-second slot validation</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground/90">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>Overnight Gap Buffer: Active (10% Safety Haircut)</span>
          </div>
        </div>
      </div>

      {/* 2. Stock Portfolio & Health Factor HUD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Health Factor */}
        <div className="bg-card/40 border border-border/70 rounded-3xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold mb-2">
              <span>Health Factor</span>
              {healthFactor >= 1.3 ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : healthFactor >= 1.0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : (
                <Flame className="w-4 h-4 text-destructive animate-pulse" />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-black font-display tracking-tight ${
                  healthFactor >= 1.3
                    ? "text-emerald-400"
                    : healthFactor >= 1.0
                    ? "text-amber-400"
                    : "text-destructive"
                }`}
              >
                {healthFactor > 50 ? "∞ Safe" : healthFactor.toFixed(2)}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {healthFactor >= 1.3 ? "Well Guarded" : healthFactor >= 1.0 ? "Moderate" : "Danger"}
              </span>
            </div>
          </div>

          <div className="w-full bg-background/80 h-2 rounded-full overflow-hidden border border-border/40 mt-4">
            <div
              className={`h-full transition-all duration-500 ${
                healthFactor >= 1.3
                  ? "bg-emerald-400"
                  : healthFactor >= 1.0
                  ? "bg-amber-400"
                  : "bg-destructive"
              }`}
              style={{ width: `${Math.min(100, (healthFactor / 2.0) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-2">
            Buffer: Equity can fall <strong className="text-emerald-400">{liquidationDropBuffer.toFixed(1)}%</strong> before liquidation
          </p>
        </div>

        {/* Total Pledged Stock Equity */}
        <div className="bg-card/40 border border-border/70 rounded-3xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold mb-2">
            <span>Pledged Stock Equity</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-display text-emerald-400">
              ${totalPledgedValueUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-0.5">
              {Object.entries(pledgedCollateral)
                .filter(([_, q]) => q > 0)
                .map(([sym, q]) => `${q} ${sym}`)
                .join(", ") || "No stocks pledged"}
            </div>
          </div>
          <div className="text-[10px] font-mono text-emerald-400 mt-3 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Retains full voting & dividend rights</span>
          </div>
        </div>

        {/* Current Borrowed Debt */}
        <div className="bg-card/40 border border-border/70 rounded-3xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold mb-2">
            <span>Active Debt (USDC)</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-display text-cyan-400">
              ${borrowedDebtUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-0.5">
              Blended Interest Rate: ~4.72% APR
            </div>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-3">
            Wallet Cash: <strong>${walletUsdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</strong>
          </div>
        </div>

        {/* Available Borrow Capacity */}
        <div className="bg-card/40 border border-border/70 rounded-3xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold mb-2">
            <span>Borrowing Headroom</span>
            <Coins className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-black font-display text-primary">
              ${remainingBorrowPowerUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-0.5">
              Max Facility Limit: ${maxBorrowLimitUsdc.toFixed(2)}
            </div>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-3">
            Weighted Average LTV: ~66.5%
          </div>
        </div>
      </div>

      {/* 3. Stock Collateral Selection Row */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black font-display uppercase tracking-wider text-muted-foreground">
            Select Collateral Stock Asset
          </h3>
          <span className="text-xs font-mono text-muted-foreground">
            Click to manage deposits & borrowing parameters
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.values(SUPPORTED_STOCKS).map((stock) => {
            const isSelected = selectedStockKey === stock.symbol;
            const walletQty = walletBalances[stock.symbol] || 0;
            const pledgedQty = pledgedCollateral[stock.symbol] || 0;

            return (
              <button
                key={stock.symbol}
                type="button"
                onClick={() => setSelectedStockKey(stock.symbol)}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? "bg-card border-emerald-500 shadow-lg shadow-emerald-500/10 scale-[1.02]"
                    : "bg-card/40 border-border/70 hover:bg-card/70 hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black font-display text-base text-foreground">{stock.symbol}</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      stock.change24h >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {stock.change24h >= 0 ? "+" : ""}
                    {stock.change24h}%
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-lg font-black font-display text-foreground">
                    ${stock.price.toFixed(2)}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span>LTV: {stock.ltvBps / 100}%</span>
                    <span>APR: {(stock.borrowAprBps / 100).toFixed(2)}%</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/50 text-[10px] font-mono text-muted-foreground flex justify-between">
                  <span>Pledged: <strong className="text-emerald-400">{pledgedQty}</strong></span>
                  <span>Wallet: <strong className="text-foreground">{walletQty}</strong></span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Dual Operation Hub (Stock Collateral vs Borrow Cash) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panel A: Stock Collateral Management */}
        <div className="bg-card/50 border border-border/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <h3 className="text-xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-400" />
                  <span>{selectedStock.symbol} Collateral Vault</span>
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Deposit tokenized shares or release pledged equity
                </p>
              </div>

              {/* Sub-action Switcher */}
              <div className="flex bg-muted/60 p-1 rounded-xl border border-border/70">
                <button
                  type="button"
                  onClick={() => setCollateralSubAction("deposit")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all ${
                    collateralSubAction === "deposit"
                      ? "bg-emerald-500 text-black shadow font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Deposit
                </button>
                <button
                  type="button"
                  onClick={() => setCollateralSubAction("withdraw")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all ${
                    collateralSubAction === "withdraw"
                      ? "bg-emerald-500 text-black shadow font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Withdraw
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">
                  {collateralSubAction === "deposit"
                    ? `Wallet ${selectedStock.symbol} Balance:`
                    : `Pledged in Obligation:`}
                </span>
                <span className="font-bold text-emerald-400">
                  {collateralSubAction === "deposit"
                    ? `${(walletBalances[selectedStockKey] || 0).toFixed(2)} ${selectedStock.symbol}`
                    : `${(pledgedCollateral[selectedStockKey] || 0).toFixed(2)} ${selectedStock.symbol}`}
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={stockAmountInput}
                  onChange={(e) => setStockAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-background border border-input rounded-2xl px-4 py-4 text-2xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                  disabled={isProcessing}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-sm font-bold text-muted-foreground font-mono">{selectedStock.symbol}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setStockAmountInput(
                        collateralSubAction === "deposit"
                          ? (walletBalances[selectedStockKey] || 0).toString()
                          : (pledgedCollateral[selectedStockKey] || 0).toString()
                      )
                    }
                    className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg font-bold font-mono uppercase"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Simulation Breakdown */}
              <div className="bg-muted/30 border border-border/60 rounded-2xl p-4 text-xs font-mono space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Valuation @ Spot Price (${selectedStock.price}):</span>
                  <span className="font-bold text-foreground">
                    ${((parseFloat(stockAmountInput) || 0) * selectedStock.price).toFixed(2)} USDC
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Borrow Capacity Impact ({selectedStock.ltvBps / 100}% LTV):</span>
                  <span className="font-bold text-emerald-400">
                    {collateralSubAction === "deposit" ? "+" : "-"}$
                    {(
                      (parseFloat(stockAmountInput) || 0) *
                      selectedStock.price *
                      (selectedStock.ltvBps / 10000)
                    ).toFixed(2)}{" "}
                    USDC
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            {collateralSubAction === "deposit" ? (
              <button
                type="button"
                onClick={handleDepositStock}
                disabled={isProcessing || !stockAmountInput || parseFloat(stockAmountInput) <= 0}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-mono uppercase text-sm tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Deposit {selectedStock.symbol} Collateral</span>
                <Lock className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleWithdrawStock}
                disabled={isProcessing || !stockAmountInput || parseFloat(stockAmountInput) <= 0}
                className="w-full py-4 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold font-mono uppercase text-sm tracking-wider rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Withdraw {selectedStock.symbol} to Wallet</span>
                <Unlock className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Panel B: Borrow & Repay USDC against Stock Portfolio */}
        <div className="bg-card/50 border border-border/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <h3 className="text-xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-cyan-400" />
                  <span>Borrow & Repay (USDC)</span>
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Draw liquid dollars or repay your stock credit line
                </p>
              </div>

              {/* Sub-action Switcher */}
              <div className="flex bg-muted/60 p-1 rounded-xl border border-border/70">
                <button
                  type="button"
                  onClick={() => setBorrowSubAction("borrow")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all ${
                    borrowSubAction === "borrow"
                      ? "bg-cyan-500 text-black shadow font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Borrow
                </button>
                <button
                  type="button"
                  onClick={() => setBorrowSubAction("repay")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all ${
                    borrowSubAction === "repay"
                      ? "bg-cyan-500 text-black shadow font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Repay
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">
                  {borrowSubAction === "borrow" ? "Available to Borrow:" : "Wallet USDC Cash:"}
                </span>
                <span className="font-bold text-cyan-400">
                  {borrowSubAction === "borrow"
                    ? `$${remainingBorrowPowerUsdc.toFixed(2)} USDC`
                    : `$${walletUsdc.toFixed(2)} USDC`}
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={usdcAmountInput}
                  onChange={(e) => setUsdcAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-background border border-input rounded-2xl px-4 py-4 text-2xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  disabled={isProcessing}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-sm font-bold text-muted-foreground font-mono">USDC</span>
                  {borrowSubAction === "borrow" ? (
                    <button
                      type="button"
                      onClick={() => setUsdcAmountInput(remainingBorrowPowerUsdc.toFixed(2))}
                      className="text-xs bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg font-bold font-mono uppercase"
                    >
                      MAX
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setUsdcAmountInput(Math.min(walletUsdc, borrowedDebtUsdc).toFixed(2))}
                      className="text-xs bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg font-bold font-mono uppercase"
                    >
                      MAX DEBT
                    </button>
                  )}
                </div>
              </div>

              {/* Simulation Breakdown */}
              <div className="bg-muted/30 border border-border/60 rounded-2xl p-4 text-xs font-mono space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Interest Rate (Annual):</span>
                  <span className="font-bold text-foreground">{(selectedStock.borrowAprBps / 100).toFixed(2)}% APR</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Projected Health Factor:</span>
                  <span className="font-bold text-emerald-400">
                    {borrowSubAction === "borrow" && parseFloat(usdcAmountInput) > 0
                      ? (
                          liquidationThresholdValueUsdc /
                          (borrowedDebtUsdc + parseFloat(usdcAmountInput))
                        ).toFixed(2)
                      : healthFactor > 50
                      ? "∞"
                      : healthFactor.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            {borrowSubAction === "borrow" ? (
              <button
                type="button"
                onClick={handleBorrowUsdc}
                disabled={isProcessing || !usdcAmountInput || parseFloat(usdcAmountInput) <= 0}
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono uppercase text-sm tracking-wider rounded-2xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Draw USDC Loan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRepayUsdc}
                  disabled={isProcessing || !usdcAmountInput || parseFloat(usdcAmountInput) <= 0}
                  className="flex-1 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold font-mono uppercase text-sm tracking-wider rounded-2xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Repay Specified Amount
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const toRepay = Math.min(walletUsdc, borrowedDebtUsdc);
                    if (toRepay <= 0) return;
                    setWalletUsdc((prev) => prev - toRepay);
                    setBorrowedDebtUsdc((prev) => prev - toRepay);
                    toast.success(`Settled $${toRepay.toFixed(2)} USDC!`);
                  }}
                  disabled={isProcessing || borrowedDebtUsdc <= 0}
                  className="px-4 py-4 bg-muted hover:bg-muted/80 text-foreground font-bold font-mono uppercase text-xs rounded-2xl border border-border"
                >
                  Repay All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Securities Lending Invariants & Protections */}
      <div className="bg-card/40 border border-border/70 rounded-3xl p-6 backdrop-blur-xl space-y-4">
        <h3 className="text-base font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Securities-Based Lending Safety Architecture</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Overnight Gap Risk Shield</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Equities carry market-close price jump risk. LTVs are dialed conservative (55%–70%) with a mandatory 10% liquidation buffer so gap-downs don't trigger cascading insolvency.
            </p>
          </div>

          <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>100% Dividend Pass-Through</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              When quarterly dividends are paid out by companies (e.g. Apple, NVIDIA), 100% of the tokenized dividend yield is auto-credited to the depositor's obligation account.
            </p>
          </div>

          <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Tax-Advantaged Liquidity</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Borrowing against stock assets provides instant fiat-equivalent buying power without realizing capital gains or losing exposure to long-term market upside.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
