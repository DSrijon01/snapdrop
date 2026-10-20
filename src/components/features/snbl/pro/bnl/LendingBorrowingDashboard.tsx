"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  AlertTriangle,
  Flame,
  ArrowRight,
  TrendingUp,
  Percent,
  Coins,
  Wallet,
  RefreshCw,
  Info,
  CheckCircle2,
  Lock,
  Unlock,
  Sliders,
  DollarSign,
  Activity,
  Layers,
  Sparkles,
  Calendar,
  Clock,
  ExternalLink,
  Code2,
  Cpu,
  Zap,
  Globe,
} from "lucide-react";
import toast from "react-hot-toast";
import { useCbl, CBL_PROGRAM_ID, DEFAULT_CBL_MARKET_ID } from "@/hooks/useCbl";

// Established Crypto Assets & Tokenized Currencies
export interface CryptoAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  ltvBps: number; // e.g. 7500 = 75%
  liquidationThresholdBps: number; // e.g. 8500 = 85%
  baseRateBps: number; // e.g. 350 = 3.50%
  category: "BlueChip" | "Established" | "FX";
  tokenType: "Native" | "SPL" | "Token-2022";
  decimals: number;
  badgeBg: string;
}

export const ESTABLISHED_CRYPTO_ASSETS: Record<string, CryptoAsset> = {
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    price: 64250.0,
    change24h: 2.14,
    ltvBps: 7500, // 75% LTV
    liquidationThresholdBps: 8500,
    baseRateBps: 340, // 3.40%
    category: "BlueChip",
    tokenType: "SPL",
    decimals: 8,
    badgeBg: "from-orange-500/20 to-amber-900/40 text-orange-400 border-orange-500/30",
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    price: 2640.0,
    change24h: 1.85,
    ltvBps: 7500,
    liquidationThresholdBps: 8500,
    baseRateBps: 360,
    category: "BlueChip",
    tokenType: "SPL",
    decimals: 8,
    badgeBg: "from-indigo-500/20 to-blue-900/40 text-indigo-400 border-indigo-500/30",
  },
  SOL: {
    symbol: "SOL",
    name: "Solana",
    price: 152.8,
    change24h: 4.35,
    ltvBps: 7500,
    liquidationThresholdBps: 8500,
    baseRateBps: 350,
    category: "BlueChip",
    tokenType: "Native",
    decimals: 9,
    badgeBg: "from-purple-500/20 to-purple-900/40 text-purple-400 border-purple-500/30",
  },
  BNB: {
    symbol: "BNB",
    name: "Binance Coin",
    price: 582.4,
    change24h: 0.85,
    ltvBps: 7000,
    liquidationThresholdBps: 8000,
    baseRateBps: 390,
    category: "Established",
    tokenType: "SPL",
    decimals: 8,
    badgeBg: "from-yellow-500/20 to-amber-900/40 text-yellow-400 border-yellow-500/30",
  },
  BCH: {
    symbol: "BCH",
    name: "Bitcoin Cash",
    price: 345.2,
    change24h: -1.2,
    ltvBps: 6000,
    liquidationThresholdBps: 7000,
    baseRateBps: 450,
    category: "Established",
    tokenType: "SPL",
    decimals: 8,
    badgeBg: "from-emerald-600/20 to-teal-900/40 text-emerald-300 border-emerald-500/30",
  },
  LTC: {
    symbol: "LTC",
    name: "Litecoin",
    price: 68.5,
    change24h: 0.42,
    ltvBps: 6500,
    liquidationThresholdBps: 7500,
    baseRateBps: 420,
    category: "Established",
    tokenType: "SPL",
    decimals: 8,
    badgeBg: "from-zinc-400/20 to-slate-800/40 text-zinc-300 border-zinc-500/30",
  },
  // Tokenized Currencies / FX Room
  EURC: {
    symbol: "EURC",
    name: "Euro Coin",
    price: 1.08,
    change24h: 0.05,
    ltvBps: 9000, // 90% LTV on stable FX
    liquidationThresholdBps: 9500,
    baseRateBps: 220,
    category: "FX",
    tokenType: "Token-2022",
    decimals: 6,
    badgeBg: "from-blue-600/20 to-cyan-900/40 text-blue-300 border-blue-500/30",
  },
  JPYC: {
    symbol: "JPYC",
    name: "Japanese Yen Coin",
    price: 0.0067,
    change24h: -0.15,
    ltvBps: 8500,
    liquidationThresholdBps: 9200,
    baseRateBps: 200,
    category: "FX",
    tokenType: "Token-2022",
    decimals: 6,
    badgeBg: "from-rose-500/20 to-pink-900/40 text-rose-300 border-rose-500/30",
  },
};

// Loan Duration Terms
export interface LoanTermOption {
  label: string;
  days: number;
  seconds: number;
  rateRampBps: number;
}

export const LOAN_TERMS: LoanTermOption[] = [
  { label: "30 Days", days: 30, seconds: 2592000, rateRampBps: 0 },
  { label: "60 Days", days: 60, seconds: 5184000, rateRampBps: 40 }, // +0.40%
  { label: "90 Days", days: 90, seconds: 7776000, rateRampBps: 80 }, // +0.80%
  { label: "180 Days", days: 180, seconds: 15552000, rateRampBps: 150 }, // +1.50%
  { label: "365 Days", days: 365, seconds: 31536000, rateRampBps: 250 }, // +2.50%
  { label: "Open Term", days: 0, seconds: 0, rateRampBps: 300 }, // Flex utilization
];

export function LendingBorrowingDashboard() {
  const { connected } = useWallet();
  const { programId } = useCbl();

  // Category filter: all | bluechip | established | fx
  const [assetFilter, setAssetFilter] = useState<"all" | "crypto" | "fx">("all");

  // Selected Collateral Asset
  const [selectedAssetKey, setSelectedAssetKey] = useState<string>("BTC");
  const selectedAsset = ESTABLISHED_CRYPTO_ASSETS[selectedAssetKey] || ESTABLISHED_CRYPTO_ASSETS.BTC;

  // Selected Loan Term
  const [selectedTermIndex, setSelectedTermIndex] = useState<number>(0);
  const selectedTerm = LOAN_TERMS[selectedTermIndex];

  // User Local Balances (Testnet / Interactive state)
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({
    BTC: 0.45,
    ETH: 3.2,
    SOL: 28.5,
    BNB: 5.0,
    BCH: 6.5,
    LTC: 18.0,
    EURC: 2500.0,
    JPYC: 450000.0,
  });

  // Wallet USDSS Cash
  const [walletUsdss, setWalletUsdss] = useState<number>(1850.0);

  // Active Loan Obligation State
  const [pledgedCollateral, setPledgedCollateral] = useState<Record<string, number>>({
    BTC: 0.15, // 0.15 * 64,250 = $9,637.50
    ETH: 1.0, // 1.0 * 2,640 = $2,640.00
    SOL: 10.0, // 10.0 * 152.80 = $1,528.00
    BNB: 0.0,
    BCH: 0.0,
    LTC: 0.0,
    EURC: 0.0,
    JPYC: 0.0,
  });

  const [borrowedDebtUsdss, setBorrowedDebtUsdss] = useState<number>(4200.0);
  const [loanDueDate, setLoanDueDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 28); // 28 days left on current loan
    return d;
  });

  // Form Inputs
  const [actionTab, setActionTab] = useState<"borrow" | "collateral">("borrow");
  const [collateralSubAction, setCollateralSubAction] = useState<"deposit" | "withdraw">("deposit");
  const [borrowSubAction, setBorrowSubAction] = useState<"borrow" | "repay">("borrow");

  const [collateralAmountInput, setCollateralAmountInput] = useState<string>("");
  const [usdssAmountInput, setUsdssAmountInput] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return Object.values(ESTABLISHED_CRYPTO_ASSETS).filter((asset) => {
      if (assetFilter === "all") return true;
      if (assetFilter === "crypto") return asset.category === "BlueChip" || asset.category === "Established";
      if (assetFilter === "fx") return asset.category === "FX";
      return true;
    });
  }, [assetFilter]);

  // Compute Total Pledged Collateral Value & Max Allowed Borrow Limit
  const { totalPledgedValueUsd, maxBorrowLimitUsd, liquidationThresholdValueUsd } = useMemo(() => {
    let totalValue = 0;
    let maxBorrow = 0;
    let liqThreshold = 0;

    Object.entries(pledgedCollateral).forEach(([symbol, amount]) => {
      const asset = ESTABLISHED_CRYPTO_ASSETS[symbol];
      if (asset && amount > 0) {
        const val = amount * asset.price;
        totalValue += val;
        maxBorrow += val * (asset.ltvBps / 10000);
        liqThreshold += val * (asset.liquidationThresholdBps / 10000);
      }
    });

    return {
      totalPledgedValueUsd: totalValue,
      maxBorrowLimitUsd: maxBorrow,
      liquidationThresholdValueUsd: liqThreshold,
    };
  }, [pledgedCollateral]);

  // Remaining Borrow Power in USDSS
  const remainingBorrowPowerUsdss = Math.max(0, maxBorrowLimitUsd - borrowedDebtUsdss);

  // Health Factor: Liquidation Threshold Value / Borrowed Debt
  const healthFactor = useMemo(() => {
    if (borrowedDebtUsdss <= 0) return 999.0;
    if (totalPledgedValueUsd <= 0) return 0.0;
    return liquidationThresholdValueUsd / borrowedDebtUsdss;
  }, [liquidationThresholdValueUsd, borrowedDebtUsdss, totalPledgedValueUsd]);

  // Drop-to-liquidation buffer
  const liquidationDropBuffer = useMemo(() => {
    if (borrowedDebtUsdss <= 0 || liquidationThresholdValueUsd <= 0) return 100.0;
    const diff = liquidationThresholdValueUsd - borrowedDebtUsdss;
    if (diff <= 0) return 0.0;
    return (diff / liquidationThresholdValueUsd) * 100;
  }, [liquidationThresholdValueUsd, borrowedDebtUsdss]);

  // Effective APR = Base Rate + Term Ramp
  const effectiveApr = useMemo(() => {
    return (selectedAsset.baseRateBps + selectedTerm.rateRampBps) / 100;
  }, [selectedAsset, selectedTerm]);

  // Days Remaining on Loan
  const daysRemaining = useMemo(() => {
    const now = new Date();
    const diffMs = loanDueDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [loanDueDate]);

  // Actions
  const handleDepositCollateral = () => {
    const amt = parseFloat(collateralAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid collateral amount");
      return;
    }
    const available = walletBalances[selectedAssetKey] || 0;
    if (amt > available) {
      toast.error(`Insufficient ${selectedAssetKey} in wallet`);
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setWalletBalances((prev) => ({ ...prev, [selectedAssetKey]: prev[selectedAssetKey] - amt }));
      setPledgedCollateral((prev) => ({ ...prev, [selectedAssetKey]: (prev[selectedAssetKey] || 0) + amt }));
      setCollateralAmountInput("");
      setIsProcessing(false);
      toast.success(`Deposited ${amt} ${selectedAssetKey} into CBL Collateral Vault!`);
    }, 600);
  };

  const handleWithdrawCollateral = () => {
    const amt = parseFloat(collateralAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid withdrawal amount");
      return;
    }
    const currentPledged = pledgedCollateral[selectedAssetKey] || 0;
    if (amt > currentPledged) {
      toast.error(`Cannot withdraw more than pledged balance`);
      return;
    }

    // Solvency check
    const lostValue = amt * selectedAsset.price;
    const lostThreshold = lostValue * (selectedAsset.liquidationThresholdBps / 10000);
    const newThreshold = liquidationThresholdValueUsd - lostThreshold;

    if (borrowedDebtUsdss > 0 && newThreshold < borrowedDebtUsdss) {
      toast.error("Withdrawal rejected: Would drop Health Factor below liquidation threshold!");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setPledgedCollateral((prev) => ({ ...prev, [selectedAssetKey]: prev[selectedAssetKey] - amt }));
      setWalletBalances((prev) => ({ ...prev, [selectedAssetKey]: (prev[selectedAssetKey] || 0) + amt }));
      setCollateralAmountInput("");
      setIsProcessing(false);
      toast.success(`Released ${amt} ${selectedAssetKey} to your wallet!`);
    }, 600);
  };

  const handleBorrowUsdss = () => {
    const amt = parseFloat(usdssAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid USDSS amount");
      return;
    }
    if (amt > remainingBorrowPowerUsdss) {
      toast.error("Requested borrow exceeds available crypto credit limit!");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setBorrowedDebtUsdss((prev) => prev + amt);
      setWalletUsdss((prev) => prev + amt);

      // Set new due date if selected
      if (selectedTerm.days > 0) {
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + selectedTerm.days);
        setLoanDueDate(nextDue);
      }

      setUsdssAmountInput("");
      setIsProcessing(false);
      toast.success(
        `Minted ${amt.toFixed(2)} USDSS (${selectedTerm.label} @ ${effectiveApr.toFixed(2)}% APR) against ${selectedAsset.symbol}!`
      );
    }, 600);
  };

  const handleRepayUsdss = () => {
    const amt = parseFloat(usdssAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid repayment amount");
      return;
    }
    if (amt > walletUsdss) {
      toast.error("Insufficient USDSS in wallet");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const repayAmount = Math.min(amt, borrowedDebtUsdss);
      setWalletUsdss((prev) => prev - repayAmount);
      setBorrowedDebtUsdss((prev) => Math.max(0, prev - repayAmount));
      setUsdssAmountInput("");
      setIsProcessing(false);
      toast.success(`Repaid ${repayAmount.toFixed(2)} USDSS! Collateral safety increased.`);
    }, 600);
  };

  const handleFaucetCrypto = () => {
    setWalletBalances((prev) => ({
      ...prev,
      BTC: prev.BTC + 0.1,
      ETH: prev.ETH + 1.0,
      SOL: prev.SOL + 10.0,
      BNB: prev.BNB + 2.0,
      BCH: prev.BCH + 2.0,
      LTC: prev.LTC + 5.0,
      EURC: prev.EURC + 1000.0,
    }));
    toast.success("Airdropped test Crypto (BTC, ETH, SOL, BNB, BCH, LTC) into wallet!");
  };

  return (
    <div className="w-full space-y-8">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-card/90 via-card/60 to-purple-500/10 border border-purple-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span>Crypto-Backed Lending (CBL)</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                Token-2022 USDSS Synthetic Dollar
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Fixed Repayment Windows & Interest Ramp
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-3">
              <Coins className="w-8 h-8 text-purple-400" />
              <span>Borrow Against Crypto & Currencies</span>
            </h2>

            <p className="text-sm text-muted-foreground font-mono leading-relaxed">
              Deposit premier established cryptocurrencies (<strong className="text-orange-400">Bitcoin</strong>, <strong className="text-indigo-400">Ethereum</strong>, <strong className="text-purple-400">Solana</strong>, <strong className="text-yellow-400">BNB</strong>, <strong className="text-emerald-400">BCH</strong>, <strong className="text-zinc-300">Litecoin</strong>) or tokenized foreign exchange (<strong className="text-blue-400">EURC, JPYC</strong>) into an isolated reserve vault to borrow synthetic <strong className="text-cyan-400">USDSS</strong>. Select custom repayment time windows with structured interest rate ramps.
            </p>
          </div>

          {/* Quick Metrics & Faucet */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-background/80 border border-border/80 px-4 py-2.5 rounded-2xl">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">Repayment Due</span>
              <span className="text-lg font-black font-display text-purple-400 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{daysRemaining > 0 ? `${daysRemaining} Days Left` : "Open Term"}</span>
              </span>
            </div>

            <div className="bg-background/80 border border-border/80 px-4 py-2.5 rounded-2xl">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">Effective APR</span>
              <span className="text-lg font-black font-display text-emerald-400">
                {effectiveApr.toFixed(2)}%
              </span>
            </div>

            <button
              onClick={handleFaucetCrypto}
              type="button"
              className="px-4 py-3 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-400 font-bold rounded-2xl text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              title="Add test BTC, ETH, SOL to wallet"
            >
              <Coins className="w-4 h-4" />
              <span>Faucet Test Crypto</span>
            </button>
          </div>
        </div>

        {/* Info Ribbon */}
        <div className="mt-6 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between text-xs font-mono text-muted-foreground gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-foreground/90 flex items-center gap-1.5 font-bold">
              <Code2 className="w-4 h-4 text-purple-400" />
              CBL Program:
            </span>
            <a
              href={`https://explorer.solana.com/address/${programId.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="text-purple-400 hover:underline flex items-center gap-1 font-bold"
            >
              <span>{programId.toBase58().slice(0, 4)}...{programId.toBase58().slice(-4)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">Market ID: <strong className="text-foreground">{DEFAULT_CBL_MARKET_ID}</strong></span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">Repayment Invariant: <strong className="text-emerald-400">Wad 10^18 Settled</strong></span>
          </div>

          <div className="flex items-center gap-2 text-foreground/80 font-bold">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>Repayment Window: Structured 30d – 365d Terms</span>
          </div>
        </div>
      </div>

      {/* 2. Portfolio & Health Factor HUD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            Safety Buffer: Portfolio can drop <strong className="text-emerald-400">{liquidationDropBuffer.toFixed(1)}%</strong> before liquidation
          </p>
        </div>

        {/* Pledged Collateral */}
        <div className="bg-card/40 border border-border/70 rounded-3xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold mb-2">
            <span>Pledged Crypto Collateral</span>
            <Lock className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-display text-purple-400">
              ${totalPledgedValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-0.5 truncate">
              {Object.entries(pledgedCollateral)
                .filter(([_, q]) => q > 0)
                .map(([sym, q]) => `${q} ${sym}`)
                .join(", ") || "No crypto pledged"}
            </div>
          </div>
          <div className="text-[10px] font-mono text-emerald-400 mt-3 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Retains full staking & price upside</span>
          </div>
        </div>

        {/* Borrowed USDSS Debt */}
        <div className="bg-card/40 border border-border/70 rounded-3xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold mb-2">
            <span>Active Debt (USDSS)</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-display text-cyan-400">
              {borrowedDebtUsdss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDSS
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-0.5">
              Due: {loanDueDate.toLocaleDateString()} ({daysRemaining}d remaining)
            </div>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-3 flex justify-between">
            <span>Wallet USDSS:</span>
            <strong className="text-foreground">{walletUsdss.toFixed(2)} USDSS</strong>
          </div>
        </div>

        {/* Available Credit Limit */}
        <div className="bg-card/40 border border-border/70 rounded-3xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold mb-2">
            <span>Borrowing Headroom</span>
            <Coins className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-black font-display text-primary">
              {remainingBorrowPowerUsdss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDSS
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-0.5">
              Max Facility Limit: ${maxBorrowLimitUsd.toFixed(2)}
            </div>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-3 flex justify-between">
            <span>Selected Term:</span>
            <strong className="text-primary">{selectedTerm.label} (+{selectedTerm.rateRampBps / 100}%)</strong>
          </div>
        </div>
      </div>

      {/* 3. Collateral Asset Selector & Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black font-display uppercase tracking-wider text-muted-foreground">
              Select Established Crypto Collateral
            </h3>
            <span className="text-xs font-mono text-muted-foreground">
              Deposit Bitcoin, Ethereum, Solana, BNB, BCH, Litecoin or tokenized currencies
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-muted/60 p-1 rounded-2xl border border-border/70 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setAssetFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono uppercase transition-all ${
                assetFilter === "all"
                  ? "bg-card text-foreground shadow font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Assets ({Object.keys(ESTABLISHED_CRYPTO_ASSETS).length})
            </button>
            <button
              type="button"
              onClick={() => setAssetFilter("crypto")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono uppercase transition-all ${
                assetFilter === "crypto"
                  ? "bg-purple-500 text-black shadow font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Established Cryptos (6)
            </button>
            <button
              type="button"
              onClick={() => setAssetFilter("fx")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono uppercase transition-all ${
                assetFilter === "fx"
                  ? "bg-blue-500 text-black shadow font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tokenized FX (2)
            </button>
          </div>
        </div>

        {/* Asset Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {filteredAssets.map((asset) => {
            const isSelected = selectedAssetKey === asset.symbol;
            const walletQty = walletBalances[asset.symbol] || 0;
            const pledgedQty = pledgedCollateral[asset.symbol] || 0;

            return (
              <button
                key={asset.symbol}
                type="button"
                onClick={() => setSelectedAssetKey(asset.symbol)}
                className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? "bg-card border-purple-500 shadow-lg shadow-purple-500/10 scale-[1.02]"
                    : "bg-card/40 border-border/70 hover:bg-card/70 hover:border-border"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black font-display text-sm text-foreground">{asset.symbol}</span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        asset.change24h >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {asset.change24h >= 0 ? "+" : ""}
                      {asset.change24h}%
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-base font-black font-display text-foreground">
                      ${asset.price >= 1 ? asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : asset.price.toFixed(4)}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span>LTV: {asset.ltvBps / 100}%</span>
                      <span>APR: {(asset.baseRateBps / 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-border/50 text-[9px] font-mono text-muted-foreground flex justify-between">
                  <span>Pledged: <strong className="text-purple-400">{pledgedQty}</strong></span>
                  <span>Wallet: <strong className="text-foreground">{walletQty}</strong></span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Structured Repayment Term & Interest Rate Ramp Selector */}
      <div className="bg-card/40 border border-border/70 rounded-3xl p-6 backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black font-display uppercase tracking-wider text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Select Repayment Term & Interest Rate Ramp</span>
            </h3>
            <p className="text-xs text-muted-foreground font-mono">
              Choose your repayment time window. Shorter maturities offer tighter interest rates; longer terms provide duration certainty.
            </p>
          </div>
          <span className="text-xs font-mono text-purple-400 font-bold">
            Selected: {selectedTerm.label} ({effectiveApr.toFixed(2)}% APR)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {LOAN_TERMS.map((term, idx) => {
            const isSelected = selectedTermIndex === idx;
            const termApr = (selectedAsset.baseRateBps + term.rateRampBps) / 100;

            return (
              <button
                key={term.label}
                type="button"
                onClick={() => setSelectedTermIndex(idx)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? "bg-card border-purple-500 shadow-md shadow-purple-500/10 scale-[1.02]"
                    : "bg-muted/40 border-border/60 hover:bg-muted text-muted-foreground"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs font-mono text-foreground">{term.label}</span>
                  {term.rateRampBps === 0 ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                      Base
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-bold">
                      +{term.rateRampBps / 100}%
                    </span>
                  )}
                </div>
                <div className="text-lg font-black font-display text-emerald-400">
                  {termApr.toFixed(2)}%
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  {term.days > 0 ? `Lockup: ${term.days} Days` : "Variable Ramp"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Dual Operation Hub (Collateral Vault vs Borrow/Repay USDSS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panel A: Collateral Management */}
        <div className="bg-card/50 border border-border/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <h3 className="text-xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
                  <Lock className="w-5 h-5 text-purple-400" />
                  <span>{selectedAsset.symbol} Collateral Vault</span>
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Deposit established crypto or unlock pledged assets
                </p>
              </div>

              {/* Sub-action Switcher */}
              <div className="flex bg-muted/60 p-1 rounded-xl border border-border/70">
                <button
                  type="button"
                  onClick={() => setCollateralSubAction("deposit")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all ${
                    collateralSubAction === "deposit"
                      ? "bg-purple-500 text-black shadow font-black"
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
                      ? "bg-purple-500 text-black shadow font-black"
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
                    ? `Wallet ${selectedAsset.symbol} Balance:`
                    : `Pledged in Obligation:`}
                </span>
                <span className="font-bold text-purple-400">
                  {collateralSubAction === "deposit"
                    ? `${walletBalances[selectedAssetKey] || 0} ${selectedAsset.symbol}`
                    : `${pledgedCollateral[selectedAssetKey] || 0} ${selectedAsset.symbol}`}
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={collateralAmountInput}
                  onChange={(e) => setCollateralAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-background border border-input rounded-2xl px-4 py-4 text-2xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                  disabled={isProcessing}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-sm font-bold text-muted-foreground font-mono">{selectedAsset.symbol}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCollateralAmountInput(
                        collateralSubAction === "deposit"
                          ? (walletBalances[selectedAssetKey] || 0).toString()
                          : (pledgedCollateral[selectedAssetKey] || 0).toString()
                      )
                    }
                    className="text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 px-2.5 py-1 rounded-lg font-bold font-mono uppercase"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Simulation Breakdown */}
              <div className="bg-muted/30 border border-border/60 rounded-2xl p-4 text-xs font-mono space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Valuation @ Spot (${selectedAsset.price.toLocaleString()}):</span>
                  <span className="font-bold text-foreground">
                    ${((parseFloat(collateralAmountInput) || 0) * selectedAsset.price).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Borrow Headroom Impact ({selectedAsset.ltvBps / 100}% LTV):</span>
                  <span className="font-bold text-emerald-400">
                    {collateralSubAction === "deposit" ? "+" : "-"}$
                    {(
                      (parseFloat(collateralAmountInput) || 0) *
                      selectedAsset.price *
                      (selectedAsset.ltvBps / 10000)
                    ).toFixed(2)}{" "}
                    USDSS
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Custodian Vault:</span>
                  <span className="font-bold text-purple-400">
                    Isolated PDA Vault (Program Owned)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            {collateralSubAction === "deposit" ? (
              <button
                type="button"
                onClick={handleDepositCollateral}
                disabled={isProcessing || !collateralAmountInput || parseFloat(collateralAmountInput) <= 0}
                className="w-full py-4 bg-purple-500 hover:bg-purple-400 text-black font-bold font-mono uppercase text-sm tracking-wider rounded-2xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Deposit {selectedAsset.symbol} Collateral</span>
                <Lock className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleWithdrawCollateral}
                disabled={isProcessing || !collateralAmountInput || parseFloat(collateralAmountInput) <= 0}
                className="w-full py-4 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold font-mono uppercase text-sm tracking-wider rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Withdraw {selectedAsset.symbol} to Wallet</span>
                <Unlock className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Panel B: Borrow & Repay USDSS */}
        <div className="bg-card/50 border border-border/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <h3 className="text-xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-cyan-400" />
                  <span>Draw or Repay Loan (USDSS)</span>
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Mint synthetic USDSS with term lock or settle loan to unlock collateral
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
                  {borrowSubAction === "borrow" ? "Available to Borrow:" : "Wallet USDSS Balance:"}
                </span>
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
                  className="w-full bg-background border border-input rounded-2xl px-4 py-4 text-2xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  disabled={isProcessing}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-sm font-bold text-muted-foreground font-mono">USDSS</span>
                  {borrowSubAction === "borrow" ? (
                    <button
                      type="button"
                      onClick={() => setUsdssAmountInput(remainingBorrowPowerUsdss.toFixed(2))}
                      className="text-xs bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg font-bold font-mono uppercase"
                    >
                      MAX
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setUsdssAmountInput(Math.min(walletUsdss, borrowedDebtUsdss).toFixed(2))}
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
                  <span>Term & Rate:</span>
                  <span className="font-bold text-foreground">
                    {selectedTerm.label} @ {effectiveApr.toFixed(2)}% APR
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Repayment Deadline:</span>
                  <span className="font-bold text-purple-400">
                    {loanDueDate.toLocaleDateString()} ({daysRemaining}d remaining)
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Projected Health Factor:</span>
                  <span className="font-bold text-emerald-400">
                    {borrowSubAction === "borrow" && parseFloat(usdssAmountInput) > 0
                      ? (
                          liquidationThresholdValueUsd /
                          (borrowedDebtUsdss + parseFloat(usdssAmountInput))
                        ).toFixed(2)
                      : healthFactor > 50
                      ? "∞ Safe"
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
                onClick={handleBorrowUsdss}
                disabled={isProcessing || !usdssAmountInput || parseFloat(usdssAmountInput) <= 0}
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono uppercase text-sm tracking-wider rounded-2xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Draw USDSS Loan ({selectedTerm.label})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRepayUsdss}
                  disabled={isProcessing || !usdssAmountInput || parseFloat(usdssAmountInput) <= 0}
                  className="flex-1 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold font-mono uppercase text-sm tracking-wider rounded-2xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Repay Specified Amount
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const toRepay = Math.min(walletUsdss, borrowedDebtUsdss);
                    if (toRepay <= 0) return;
                    setWalletUsdss((prev) => prev - toRepay);
                    setBorrowedDebtUsdss((prev) => prev - toRepay);
                    toast.success(`Settled ${toRepay.toFixed(2)} USDSS!`);
                  }}
                  disabled={isProcessing || borrowedDebtUsdss <= 0}
                  className="px-4 py-4 bg-muted hover:bg-muted/80 text-foreground font-bold font-mono uppercase text-xs rounded-2xl border border-border"
                >
                  Repay All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Protocol Safety & Invariants */}
      <div className="bg-card/40 border border-border/70 rounded-3xl p-6 backdrop-blur-xl space-y-4">
        <h3 className="text-base font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>CBL Risk Management & Repayment Rules</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Term Maturity & Grace Period</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              When a loan reaches its scheduled repayment deadline (e.g. 30d, 90d), a 48-hour grace window begins. If unpaid after grace, the collateral enters automated liquidation lock.
            </p>
          </div>

          <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Full Staking Yield Pass-Through</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              When Solana (SOL) or interest-bearing collateral is pledged, 100% of the underlying inflation staking rewards continue to accrue to the depositor's obligation balance.
            </p>
          </div>

          <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Token-2022 USDSS Synthetic Peg</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Every USDSS minted is backed by overcollateralized reserves (130%+ solvency ratio). When loans are settled, USDSS is burnt from circulation to preserve peg stability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
