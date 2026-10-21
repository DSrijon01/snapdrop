"use client";

import React, { useState, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  ShieldCheck,
  AlertTriangle,
  Flame,
  ArrowRight,
  Building2,
  Lock,
  Unlock,
  DollarSign,
  Coins,
  Sparkles,
  ExternalLink,
  Code2,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSbl, SBL_PROGRAM_ID, DEFAULT_MARKET_ID } from "@/hooks/useSbl";
import { UsdssIcon } from "@/components/common/UsdssIcon";
import { savePendingAction, clearPendingAction } from "@/utils/pendingTransactions";

// Curated US Securities & Risk Parameters
export interface StockAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  ltvBps: number; // e.g. 6500 = 65%
  liquidationThresholdBps: number; // e.g. 7500 = 75%
  borrowAprBps: number; // e.g. 485 = 4.85%
  category: "MegaCap" | "Tech" | "EV" | "Fintech";
}

export const SUPPORTED_STOCKS: Record<string, StockAsset> = {
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    price: 128.4,
    change24h: 3.42,
    ltvBps: 6500, // 65% LTV
    liquidationThresholdBps: 7500,
    borrowAprBps: 485,
    category: "Tech",
  },
  AAPL: {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 173.5,
    change24h: 1.15,
    ltvBps: 7000, // 70% LTV
    liquidationThresholdBps: 8000,
    borrowAprBps: 420,
    category: "MegaCap",
  },
  TSLA: {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 218.2,
    change24h: -2.35,
    ltvBps: 6000, // 60% LTV
    liquidationThresholdBps: 7000,
    borrowAprBps: 540,
    category: "EV",
  },
  AMZN: {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 178.1,
    change24h: 1.84,
    ltvBps: 6500,
    liquidationThresholdBps: 7500,
    borrowAprBps: 460,
    category: "MegaCap",
  },
  COIN: {
    symbol: "COIN",
    name: "Coinbase Global",
    price: 224.5,
    change24h: 5.12,
    ltvBps: 5500,
    liquidationThresholdBps: 6500,
    borrowAprBps: 620,
    category: "Fintech",
  },
};

export function StockLendingDashboard() {
  const { connected, publicKey } = useWallet();
  const {
    programId,
    currentSlot,
    isRpcConnected,
    isObligationCreated,
    initObligation,
    loading: sblLoading,
  } = useSbl();

  // Selected Stock Asset
  const [selectedStockKey, setSelectedStockKey] = useState<string>("NVDA");
  const selectedStock = SUPPORTED_STOCKS[selectedStockKey] || SUPPORTED_STOCKS.NVDA;

  // Local Wallet Balances
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({
    NVDA: 15.0,
    AAPL: 25.0,
    TSLA: 10.0,
    AMZN: 12.0,
    COIN: 8.0,
  });

  const [walletUsdss, setWalletUsdss] = useState<number>(2500.0);

  // User Obligation Pledged Collateral
  const [pledgedCollateral, setPledgedCollateral] = useState<Record<string, number>>({
    NVDA: 10.0,
    AAPL: 5.0,
    TSLA: 0.0,
    AMZN: 0.0,
    COIN: 0.0,
  });

  const [borrowedDebtUsdss, setBorrowedDebtUsdss] = useState<number>(1450.0);

  // Action Tabs
  const [collateralSubAction, setCollateralSubAction] = useState<"deposit" | "withdraw">("deposit");
  const [borrowSubAction, setBorrowSubAction] = useState<"borrow" | "repay">("borrow");

  // Inputs
  const [stockAmountInput, setStockAmountInput] = useState<string>("");
  const [usdssAmountInput, setUsdssAmountInput] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Calculations
  const { totalPledgedValueUsd, maxBorrowLimitUsd, liquidationThresholdValueUsd } = useMemo(() => {
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
      totalPledgedValueUsd: totalValue,
      maxBorrowLimitUsd: maxBorrow,
      liquidationThresholdValueUsd: liqThreshold,
    };
  }, [pledgedCollateral]);

  const remainingBorrowPowerUsdss = Math.max(0, maxBorrowLimitUsd - borrowedDebtUsdss);

  // How much USDSS is minted per 1 share of selected stock
  const stockUsdssPerUnit = useMemo(() => {
    return selectedStock.price * (selectedStock.ltvBps / 10000);
  }, [selectedStock]);

  const healthFactor = useMemo(() => {
    if (borrowedDebtUsdss <= 0) return 999.0;
    if (totalPledgedValueUsd <= 0) return 0.0;
    return liquidationThresholdValueUsd / borrowedDebtUsdss;
  }, [liquidationThresholdValueUsd, borrowedDebtUsdss, totalPledgedValueUsd]);

  const liquidationDropBuffer = useMemo(() => {
    if (borrowedDebtUsdss <= 0 || liquidationThresholdValueUsd <= 0) return 100.0;
    const diff = liquidationThresholdValueUsd - borrowedDebtUsdss;
    if (diff <= 0) return 0.0;
    return (diff / liquidationThresholdValueUsd) * 100;
  }, [liquidationThresholdValueUsd, borrowedDebtUsdss]);

  // Dynamic borrow APR based on utilization
  const currentBorrowApr = useMemo(() => {
    if (maxBorrowLimitUsd <= 0) return 4.5;
    const util = Math.min(1.0, borrowedDebtUsdss / maxBorrowLimitUsd);
    return 4.0 + util * 4.0;
  }, [borrowedDebtUsdss, maxBorrowLimitUsd]);

  // Interest Payback Clause & Auto-Lock State
  const accruedInterestUsdss = useMemo(() => {
    if (borrowedDebtUsdss <= 0) return 0;
    // Standard 30-day term accrued interest on drawn USDSS
    return (borrowedDebtUsdss * (currentBorrowApr / 100) * (30 / 365));
  }, [borrowedDebtUsdss, currentBorrowApr]);

  const totalPaybackAmountUsdss = useMemo(() => {
    return borrowedDebtUsdss + accruedInterestUsdss;
  }, [borrowedDebtUsdss, accruedInterestUsdss]);

  const isAutoLocked = borrowedDebtUsdss > 0;

  // Handlers
  const handleDepositStock = () => {
    const amt = parseFloat(stockAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid share amount");
      return;
    }
    const available = walletBalances[selectedStockKey] || 0;
    if (amt > available) {
      toast.error(`Insufficient ${selectedStockKey} in wallet`);
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setWalletBalances((prev) => ({ ...prev, [selectedStockKey]: prev[selectedStockKey] - amt }));
      setPledgedCollateral((prev) => ({ ...prev, [selectedStockKey]: (prev[selectedStockKey] || 0) + amt }));
      setStockAmountInput("");
      setIsProcessing(false);
      toast.success(`Deposited ${amt} ${selectedStockKey} shares as collateral`);
    }, 500);
  };

  const handleWithdrawStock = () => {
    if (isAutoLocked) {
      toast.error(
        `Collateral is AUTO-LOCKED! Outstanding USDSS debt + interest (${totalPaybackAmountUsdss.toFixed(2)} USDSS) must be repaid first.`
      );
      return;
    }

    const amt = parseFloat(stockAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const currentPledged = pledgedCollateral[selectedStockKey] || 0;
    if (amt > currentPledged) {
      toast.error("Cannot withdraw more than pledged balance");
      return;
    }

    const lostVal = amt * selectedStock.price;
    const lostThreshold = lostVal * (selectedStock.liquidationThresholdBps / 10000);
    const newThreshold = liquidationThresholdValueUsd - lostThreshold;

    if (borrowedDebtUsdss > 0 && newThreshold < borrowedDebtUsdss) {
      toast.error("Withdrawal would breach liquidation threshold!");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setPledgedCollateral((prev) => ({ ...prev, [selectedStockKey]: prev[selectedStockKey] - amt }));
      setWalletBalances((prev) => ({ ...prev, [selectedStockKey]: (prev[selectedStockKey] || 0) + amt }));
      setStockAmountInput("");
      setIsProcessing(false);
      toast.success(`Withdrew ${amt} ${selectedStockKey} shares`);
    }, 500);
  };

  const handleBorrowUsdss = () => {
    const amt = parseFloat(usdssAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid USDSS amount");
      return;
    }
    if (amt > remainingBorrowPowerUsdss) {
      toast.error("Borrow exceeds available stock credit line");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setBorrowedDebtUsdss((prev) => prev + amt);
      setWalletUsdss((prev) => prev + amt);
      setUsdssAmountInput("");
      setIsProcessing(false);
      toast.success(`Minted ${amt.toFixed(2)} USDSS against your stock portfolio! Collateral is now Auto-Locked until repayment.`);
    }, 500);
  };

  const handleRepayUsdss = () => {
    const amt = parseFloat(usdssAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amt > walletUsdss) {
      toast.error("Insufficient USDSS balance in wallet");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const totalDue = totalPaybackAmountUsdss;
      const repayAmount = Math.min(amt, totalDue);
      setWalletUsdss((prev) => Math.max(0, prev - repayAmount));

      // First pay interest, remainder pays down principal
      const interestPaid = Math.min(repayAmount, accruedInterestUsdss);
      const principalPaid = repayAmount - interestPaid;
      setBorrowedDebtUsdss((prev) => Math.max(0, prev - principalPaid));
      setUsdssAmountInput("");
      setIsProcessing(false);

      if (principalPaid >= borrowedDebtUsdss) {
        toast.success(`Repaid ${repayAmount.toFixed(2)} USDSS in full (${interestPaid.toFixed(2)} interest + ${principalPaid.toFixed(2)} principal). Collateral UNLOCKED!`);
      } else {
        toast.success(`Repaid ${repayAmount.toFixed(2)} USDSS (${interestPaid.toFixed(2)} interest + ${principalPaid.toFixed(2)} principal). Remaining debt: ${(borrowedDebtUsdss - principalPaid).toFixed(2)} USDSS.`);
      }
    }, 500);
  };

  const handleFaucetStocks = () => {
    setWalletBalances((prev) => ({
      ...prev,
      NVDA: prev.NVDA + 10.0,
      AAPL: prev.AAPL + 10.0,
      TSLA: prev.TSLA + 5.0,
      AMZN: prev.AMZN + 5.0,
      COIN: prev.COIN + 5.0,
    }));
    toast.success("Faucet test shares added to wallet");
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. Clean Securities Header (Blue Theme) */}
      <div className="bg-gradient-to-r from-card/90 via-card/50 to-blue-500/10 border border-blue-500/30 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Securities Lending
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                Institutional Equity Vaults & Synthetic USDSS
              </span>
            </div>
            <h2 className="text-2xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-400" />
              <span>Borrow Against Stocks</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-background/80 border border-border/80 px-4 py-2 rounded-2xl text-right">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">Borrow APR</span>
              <span className="text-sm font-black font-display text-blue-400">
                {currentBorrowApr.toFixed(2)}%
              </span>
            </div>

            <button
              onClick={handleFaucetStocks}
              type="button"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Coins className="w-4 h-4" />
              <span>Faucet</span>
            </button>
          </div>
        </div>

        {/* Functional Connection & Minimal status strip */}
        <div className="mt-4 pt-3 border-t border-border/40 flex flex-wrap items-center justify-between text-xs font-mono text-muted-foreground gap-2">
          <div className="flex flex-wrap items-center gap-3">
            {/* Functional Devnet RPC Connection Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Solana Devnet {currentSlot ? `(#${currentSlot})` : "Live"}</span>
            </div>

            <div className="flex items-center gap-1.5 text-foreground/80">
              <span className="text-muted-foreground">Wallet:</span>
              <strong className="text-blue-400">
                {connected && publicKey
                  ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
                  : "Ready / Local"}
              </strong>
            </div>

            <span className="text-border">|</span>

            <span className="text-foreground/90 font-bold flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              Program:
            </span>
            <a
              href={`https://explorer.solana.com/address/${programId.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>{programId.toBase58().slice(0, 4)}...{programId.toBase58().slice(-4)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <span className="text-border">|</span>
            <span>Market: <strong className="text-foreground">{DEFAULT_MARKET_ID}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {isObligationCreated ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Obligation Active</span>
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase">
                  Obligation: Ready to Initialize
                </span>
                <button
                  type="button"
                  onClick={initObligation}
                  disabled={sblLoading || !connected}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-black font-mono uppercase tracking-wider transition-all shadow-sm shadow-blue-500/20"
                >
                  {sblLoading ? "Initializing..." : "Init Obligation On Devnet"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. User Collateralized Equities & Stock to USDSS Conversion Engine */}
      <div className="space-y-4">
        {/* Equities to USDSS Conversion Rate Banner */}
        <div className="bg-gradient-to-r from-blue-600/15 via-card/70 to-card/90 border border-blue-500/40 rounded-3xl p-5 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <UsdssIcon className="w-8 h-8" size={32} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-blue-400">
                    Stock Collateral Conversion Rate
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {selectedStock.ltvBps / 100}% LTV
                  </span>
                </div>
                <div className="text-xl md:text-2xl font-black font-display text-foreground flex items-center gap-2 mt-0.5">
                  <span>1 {selectedStock.symbol} (${selectedStock.price.toFixed(2)})</span>
                  <ArrowRight className="w-5 h-5 text-blue-400 shrink-0" />
                  <span className="text-blue-400 flex items-center gap-1.5">
                    <UsdssIcon className="w-6 h-6 inline-block" size={24} />
                    {stockUsdssPerUnit.toFixed(2)} USDSS
                  </span>
                </div>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  For each 1 share of {selectedStock.name} pledged, you can draw <strong>{stockUsdssPerUnit.toFixed(2)} USDSS</strong> while retaining all voting rights and dividends.
                </p>
              </div>
            </div>

            <div className="bg-background/80 border border-border/80 px-4 py-2.5 rounded-2xl text-right shrink-0">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">
                Borrow Rate (Piecewise Kinked)
              </span>
              <span className="text-base font-black font-display text-blue-400">
                {currentBorrowApr.toFixed(2)}% APR
              </span>
            </div>
          </div>
        </div>

        {/* User-Specific Positions & Invariant Clauses */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card A: Specific User Collateralized Equities */}
          <div className="bg-card/45 border border-border/80 rounded-2xl p-4 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold">
              <span>Your Collateralized</span>
              <Building2 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-black font-display text-blue-400">
                ${totalPledgedValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs font-mono text-foreground font-bold mt-0.5">
                Total Equity Collateral Value
              </p>
              <div className="text-[10px] font-mono text-muted-foreground mt-1.5 pt-1.5 border-t border-border/40 truncate">
                {Object.entries(pledgedCollateral)
                  .filter(([_, q]) => q > 0)
                  .map(([s, q]) => `${q} ${s}`)
                  .join(", ") || "No shares pledged"}
              </div>
            </div>
          </div>

          {/* Card B: Specific User USDSS Position */}
          <div className="bg-card/45 border border-border/80 rounded-2xl p-4 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold">
              <span>Your USDSS Facility</span>
              <UsdssIcon className="w-4 h-4" size={16} />
            </div>
            <div>
              <div className="text-2xl font-black font-display text-cyan-400 flex items-center gap-1.5">
                <UsdssIcon className="w-5 h-5 inline-block" size={20} />
                <span>{borrowedDebtUsdss.toFixed(2)} USDSS</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                Available to Draw: <strong className="text-foreground">{remainingBorrowPowerUsdss.toFixed(2)} USDSS</strong>
              </p>
              <div className="text-[10px] font-mono text-muted-foreground mt-1.5 pt-1.5 border-t border-border/40 flex justify-between">
                <span>Wallet: {walletUsdss.toFixed(2)} USDSS</span>
                <span className="text-blue-400 font-bold">Max Limit: ${maxBorrowLimitUsd.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Card C: Payback Clause & Custodial Lock */}
          <div className="bg-card/45 border border-border/80 rounded-2xl p-4 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold">
              <span>Payback Clause & Custodial Lock</span>
              {isAutoLocked ? (
                <Lock className="w-4 h-4 text-blue-400 animate-pulse" />
              ) : (
                <Unlock className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black uppercase flex items-center gap-1.5 ${
                    isAutoLocked
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {isAutoLocked ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Equities Auto-Locked</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Equities Unlocked</span>
                    </>
                  )}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {currentBorrowApr.toFixed(2)}% APR
                </span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground mt-1.5 leading-snug">
                {isAutoLocked ? (
                  <span>
                    Pay back <strong className="text-foreground">{totalPaybackAmountUsdss.toFixed(2)} USDSS</strong> (principal + {accruedInterestUsdss.toFixed(2)} interest) to release your pledged shares.
                  </span>
                ) : (
                  <span>No outstanding debt. Deposited equity shares are unlocked and withdrawable at any time.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Stock Asset Selector (Clean Cards) */}
      <div className="space-y-2">
        <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
          Select Stock Collateral
        </span>

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
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? "bg-blue-600/10 border-blue-500 shadow-md shadow-blue-500/10"
                    : "bg-card/40 border-border/60 hover:bg-card/80"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-black font-display text-base ${isSelected ? "text-blue-400" : "text-foreground"}`}>
                    {stock.symbol}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      stock.change24h >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {stock.change24h >= 0 ? "+" : ""}{stock.change24h}%
                  </span>
                </div>

                <div className="text-base font-black font-display text-foreground">
                  ${stock.price.toFixed(2)}
                </div>

                <div className="mt-2.5 pt-2 border-t border-border/40 text-[10px] font-mono text-muted-foreground flex justify-between">
                  <span>Pledged: {pledgedQty}</span>
                  <span>Bal: {walletQty}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Clean Action Hub (Deposit vs Borrow) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel A: Stock Collateral */}
        <div className="bg-card/50 border border-border/80 rounded-2xl p-5 backdrop-blur-xl shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <span className="font-bold text-sm font-display uppercase tracking-wide text-foreground flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-400" />
                <span>{selectedStock.symbol} Equity</span>
              </span>

              <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setCollateralSubAction("deposit")}
                  className={`px-3 py-1 rounded-md text-xs font-bold font-mono uppercase transition-all ${
                    collateralSubAction === "deposit"
                      ? "bg-blue-600 text-white font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Deposit
                </button>
                <button
                  type="button"
                  onClick={() => setCollateralSubAction("withdraw")}
                  className={`px-3 py-1 rounded-md text-xs font-bold font-mono uppercase transition-all ${
                    collateralSubAction === "withdraw"
                      ? "bg-blue-600 text-white font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Withdraw
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>{collateralSubAction === "deposit" ? "Wallet Shares:" : "Pledged Shares:"}</span>
                <span className="font-bold text-blue-400">
                  {collateralSubAction === "deposit"
                    ? `${walletBalances[selectedStockKey] || 0} ${selectedStock.symbol}`
                    : `${pledgedCollateral[selectedStockKey] || 0} ${selectedStock.symbol}`}
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={stockAmountInput}
                  onChange={(e) => setStockAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-background border border-input rounded-xl px-3 py-3 text-lg font-bold font-mono focus:ring-2 focus:ring-blue-400/50"
                  disabled={isProcessing}
                />
                <button
                  type="button"
                  onClick={() =>
                    setStockAmountInput(
                      collateralSubAction === "deposit"
                        ? (walletBalances[selectedStockKey] || 0).toString()
                        : (pledgedCollateral[selectedStockKey] || 0).toString()
                    )
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded font-mono font-bold"
                >
                  MAX
                </button>
              </div>

              {isAutoLocked && collateralSubAction === "withdraw" && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-xs font-mono text-amber-300">
                  <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>
                    Auto-Lock active: Shares locked in escrow while {totalPaybackAmountUsdss.toFixed(2)} USDSS debt remains.
                  </span>
                </div>
              )}

              <div className="flex justify-between text-xs font-mono text-muted-foreground pt-1">
                <span>Value: ${((parseFloat(stockAmountInput) || 0) * selectedStock.price).toFixed(2)}</span>
                <span className="text-emerald-400">
                  {collateralSubAction === "deposit" ? "+" : "-"}$
                  {(
                    (parseFloat(stockAmountInput) || 0) *
                    selectedStock.price *
                    (selectedStock.ltvBps / 10000)
                  ).toFixed(2)}{" "}
                  Limit
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={collateralSubAction === "deposit" ? handleDepositStock : handleWithdrawStock}
            disabled={
              isProcessing ||
              !stockAmountInput ||
              parseFloat(stockAmountInput) <= 0 ||
              (collateralSubAction === "withdraw" && isAutoLocked)
            }
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black font-mono uppercase text-xs tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {collateralSubAction === "deposit"
              ? `Deposit ${selectedStock.symbol}`
              : isAutoLocked
              ? `Locked: Pay USDSS Debt First`
              : `Withdraw ${selectedStock.symbol}`}
          </button>
        </div>

        {/* Panel B: USDSS Draw / Repay */}
        <div className="bg-card/50 border border-border/80 rounded-2xl p-5 backdrop-blur-xl shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <span className="font-bold text-sm font-display uppercase tracking-wide text-foreground flex items-center gap-2">
                <UsdssIcon size={20} />
                <span>Stock Credit Line (USDSS)</span>
              </span>

              <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setBorrowSubAction("borrow")}
                  className={`px-3 py-1 rounded-md text-xs font-bold font-mono uppercase transition-all ${
                    borrowSubAction === "borrow"
                      ? "bg-cyan-500 text-black font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Borrow
                </button>
                <button
                  type="button"
                  onClick={() => setBorrowSubAction("repay")}
                  className={`px-3 py-1 rounded-md text-xs font-bold font-mono uppercase transition-all ${
                    borrowSubAction === "repay"
                      ? "bg-cyan-500 text-black font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Repay
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>{borrowSubAction === "borrow" ? "Borrow Headroom:" : "Wallet USDSS:"}</span>
                <span className="font-bold text-cyan-400">
                  {borrowSubAction === "borrow"
                    ? `${remainingBorrowPowerUsdss.toFixed(2)} USDSS`
                    : `${walletUsdss.toFixed(2)} USDSS`}
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={usdssAmountInput}
                  onChange={(e) => setUsdssAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-background border border-input rounded-xl px-3 py-3 text-lg font-bold font-mono focus:ring-2 focus:ring-cyan-400/50"
                  disabled={isProcessing}
                />
                <button
                  type="button"
                  onClick={() =>
                    setUsdssAmountInput(
                      borrowSubAction === "borrow"
                        ? remainingBorrowPowerUsdss.toFixed(2)
                        : Math.min(walletUsdss, totalPaybackAmountUsdss).toFixed(2)
                    )
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded font-mono font-bold"
                >
                  MAX
                </button>
              </div>

              {borrowSubAction === "repay" && borrowedDebtUsdss > 0 && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Principal Debt:</span>
                    <span className="font-bold text-foreground">{borrowedDebtUsdss.toFixed(2)} USDSS</span>
                  </div>
                  <div className="flex justify-between text-amber-400">
                    <span>Accrued Interest (30d @ {currentBorrowApr.toFixed(2)}%):</span>
                    <span className="font-bold">+{accruedInterestUsdss.toFixed(2)} USDSS</span>
                  </div>
                  <div className="flex justify-between border-t border-border/40 pt-1 font-bold text-foreground">
                    <span>Total Payback Required:</span>
                    <span className="text-cyan-400">{totalPaybackAmountUsdss.toFixed(2)} USDSS</span>
                  </div>
                  <div className="text-[10px] text-amber-300 flex items-center gap-1 pt-1">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span>Collateral will auto-unlock once total payback is settled.</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-xs font-mono text-muted-foreground pt-1">
                <span>Rate: {currentBorrowApr.toFixed(2)}% APR</span>
                <span className="text-foreground">LTV: {selectedStock.ltvBps / 100}%</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={borrowSubAction === "borrow" ? handleBorrowUsdss : handleRepayUsdss}
            disabled={isProcessing || !usdssAmountInput || parseFloat(usdssAmountInput) <= 0}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black font-mono uppercase text-xs tracking-wider rounded-xl transition-all shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {borrowSubAction === "borrow" ? "Draw USDSS Loan" : "Repay USDSS"}
          </button>
        </div>
      </div>
    </div>
  );
}
