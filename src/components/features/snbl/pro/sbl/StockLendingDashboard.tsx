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
  ExternalLink,
  Code2,
  Cpu,
  Wallet,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSbl, SBL_PROGRAM_ID, DEFAULT_MARKET_ID } from "@/hooks/useSbl";
import { useWallet } from "@solana/wallet-adapter-react";

// Tokenized Collateral Assets (Equities + Major Currencies)
export interface CollateralAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  ltvBps: number; // e.g. 6500 = 65%
  liquidationThresholdBps: number; // e.g. 7500 = 75%
  baseAprBps: number; // e.g. 480 = 4.80%
  marketCap: string;
  peRatio?: string;
  category: "Equity" | "Crypto";
  tokenType: "Token-2022" | "SPL";
  token2022Extensions: string[];
  logoBg: string;
}

export const SUPPORTED_COLLATERAL: Record<string, CollateralAsset> = {
  // --- US Equities ---
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    price: 128.4,
    change24h: 3.42,
    ltvBps: 6500, // 65% LTV
    liquidationThresholdBps: 7500,
    baseAprBps: 485,
    marketCap: "$3.15T",
    peRatio: "68.2",
    category: "Equity",
    tokenType: "Token-2022",
    token2022Extensions: ["PermanentDelegate", "MetadataPointer", "DefaultAccountState"],
    logoBg: "from-emerald-500/20 to-emerald-900/40 text-emerald-400 border-emerald-500/30",
  },
  AAPL: {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 173.5,
    change24h: 1.15,
    ltvBps: 7000, // 70% LTV (Blue-chip)
    liquidationThresholdBps: 8000,
    baseAprBps: 420,
    marketCap: "$2.68T",
    peRatio: "26.4",
    category: "Equity",
    tokenType: "Token-2022",
    token2022Extensions: ["PermanentDelegate", "MetadataPointer", "TransferHook"],
    logoBg: "from-zinc-400/20 to-zinc-800/40 text-zinc-200 border-zinc-500/30",
  },
  TSLA: {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 218.2,
    change24h: -2.35,
    ltvBps: 6000, // 60% LTV (Higher Beta)
    liquidationThresholdBps: 7000,
    baseAprBps: 540,
    marketCap: "$695B",
    peRatio: "42.8",
    category: "Equity",
    tokenType: "Token-2022",
    token2022Extensions: ["PermanentDelegate", "MetadataPointer", "DefaultAccountState"],
    logoBg: "from-red-500/20 to-red-900/40 text-red-400 border-red-500/30",
  },
  AMZN: {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 178.1,
    change24h: 1.84,
    ltvBps: 6500, // 65% LTV
    liquidationThresholdBps: 7500,
    baseAprBps: 460,
    marketCap: "$1.85T",
    peRatio: "38.9",
    category: "Equity",
    tokenType: "Token-2022",
    token2022Extensions: ["PermanentDelegate", "MetadataPointer"],
    logoBg: "from-amber-500/20 to-amber-900/40 text-amber-400 border-amber-500/30",
  },
  COIN: {
    symbol: "COIN",
    name: "Coinbase Global",
    price: 224.5,
    change24h: 5.12,
    ltvBps: 5500, // 55% LTV (Crypto Beta)
    liquidationThresholdBps: 6500,
    baseAprBps: 620,
    marketCap: "$53.2B",
    peRatio: "31.2",
    category: "Equity",
    tokenType: "Token-2022",
    token2022Extensions: ["PermanentDelegate", "MetadataPointer", "TransferHook"],
    logoBg: "from-blue-500/20 to-blue-900/40 text-blue-400 border-blue-500/30",
  },

  // --- Major Currencies & Crypto ---
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    price: 64250.0,
    change24h: 2.14,
    ltvBps: 7500, // 75% LTV
    liquidationThresholdBps: 8500,
    baseAprBps: 410,
    marketCap: "$1.26T",
    category: "Crypto",
    tokenType: "SPL",
    token2022Extensions: ["WrappedCustody"],
    logoBg: "from-orange-500/20 to-orange-900/40 text-orange-400 border-orange-500/30",
  },
  BCH: {
    symbol: "BCH",
    name: "Bitcoin Cash",
    price: 345.2,
    change24h: -1.2,
    ltvBps: 6000, // 60% LTV
    liquidationThresholdBps: 7000,
    baseAprBps: 580,
    marketCap: "$6.8B",
    category: "Crypto",
    tokenType: "SPL",
    token2022Extensions: ["WrappedCustody"],
    logoBg: "from-emerald-600/20 to-teal-900/40 text-emerald-300 border-emerald-500/30",
  },
  BNB: {
    symbol: "BNB",
    name: "Binance Coin",
    price: 582.4,
    change24h: 0.85,
    ltvBps: 7000, // 70% LTV
    liquidationThresholdBps: 8000,
    baseAprBps: 490,
    marketCap: "$87.4B",
    category: "Crypto",
    tokenType: "Token-2022",
    token2022Extensions: ["PermanentDelegate", "MetadataPointer"],
    logoBg: "from-yellow-500/20 to-yellow-900/40 text-yellow-400 border-yellow-500/30",
  },
  SOL: {
    symbol: "SOL",
    name: "Solana",
    price: 152.8,
    change24h: 4.35,
    ltvBps: 7500, // 75% LTV
    liquidationThresholdBps: 8500,
    baseAprBps: 450,
    marketCap: "$71.2B",
    category: "Crypto",
    tokenType: "Token-2022",
    token2022Extensions: ["MetadataPointer", "InterestBearingConfig"],
    logoBg: "from-purple-500/20 to-purple-900/40 text-purple-400 border-purple-500/30",
  },
};

export function StockLendingDashboard() {
  const { connected, publicKey } = useWallet();
  const {
    program,
    loading: sblLoading,
    obligationPda,
    isObligationCreated,
    initObligation,
    programId,
  } = useSbl();

  // Collateral Filter: all | equities | crypto
  const [filterCategory, setFilterCategory] = useState<"all" | "Equity" | "Crypto">("all");

  // Selected Collateral Asset
  const [selectedAssetKey, setSelectedAssetKey] = useState<string>("NVDA");
  const selectedAsset = SUPPORTED_COLLATERAL[selectedAssetKey] || SUPPORTED_COLLATERAL.NVDA;

  // Local Wallet Balances (Tokens owned by user)
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({
    NVDA: 15.0,
    AAPL: 25.0,
    TSLA: 10.0,
    AMZN: 12.0,
    COIN: 8.0,
    BTC: 0.25,
    BCH: 4.5,
    BNB: 3.0,
    SOL: 24.5,
  });

  // Wallet Synthetic USDSS Cash (Minted via Token-2022)
  const [walletUsdss, setWalletUsdss] = useState<number>(2500.0);

  // User Obligation Pledged Collateral
  const [pledgedCollateral, setPledgedCollateral] = useState<Record<string, number>>({
    NVDA: 10.0, // 10 * 128.40 = $1,284.00
    AAPL: 5.0, // 5 * 173.50 = $867.50
    TSLA: 0.0,
    AMZN: 0.0,
    COIN: 0.0,
    BTC: 0.05, // 0.05 * 64,250 = $3,212.50
    BCH: 0.0,
    BNB: 0.0,
    SOL: 10.0, // 10 * 152.80 = $1,528.00
  });

  // Borrowed Debt in Synthetic USDSS (Token-2022)
  const [borrowedDebtUsdss, setBorrowedDebtUsdss] = useState<number>(1450.0);

  // Action Tabs
  const [collateralSubAction, setCollateralSubAction] = useState<"deposit" | "withdraw">("deposit");
  const [borrowSubAction, setBorrowSubAction] = useState<"borrow" | "repay">("borrow");

  // Inputs
  const [collateralAmountInput, setCollateralAmountInput] = useState<string>("");
  const [usdssAmountInput, setUsdssAmountInput] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showExtensionMatrix, setShowExtensionMatrix] = useState<boolean>(false);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return Object.values(SUPPORTED_COLLATERAL).filter((asset) => {
      if (filterCategory === "all") return true;
      return asset.category === filterCategory;
    });
  }, [filterCategory]);

  // Compute Total Pledged Collateral Value & Max Allowed Borrow Limit
  const { totalPledgedValueUsd, maxBorrowLimitUsd, liquidationThresholdValueUsd } = useMemo(() => {
    let totalValue = 0;
    let maxBorrow = 0;
    let liqThreshold = 0;

    Object.entries(pledgedCollateral).forEach(([symbol, amount]) => {
      const asset = SUPPORTED_COLLATERAL[symbol];
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

  // Health Factor: (Liquidation Threshold Value) / (Borrowed Debt)
  const healthFactor = useMemo(() => {
    if (borrowedDebtUsdss <= 0) return 999.0;
    if (totalPledgedValueUsd <= 0) return 0.0;
    return liquidationThresholdValueUsd / borrowedDebtUsdss;
  }, [liquidationThresholdValueUsd, borrowedDebtUsdss, totalPledgedValueUsd]);

  // Drop-to-liquidation buffer: percentage portfolio can drop before HF hits 1.00
  const liquidationDropBuffer = useMemo(() => {
    if (borrowedDebtUsdss <= 0 || liquidationThresholdValueUsd <= 0) return 100.0;
    const diff = liquidationThresholdValueUsd - borrowedDebtUsdss;
    if (diff <= 0) return 0.0;
    return (diff / liquidationThresholdValueUsd) * 100;
  }, [liquidationThresholdValueUsd, borrowedDebtUsdss]);

  // Variable Interest Rate Calculator (Solana Book Chapter 17 Kinked Curve Model)
  // Utilization U = borrowedDebt / maxBorrowLimit
  const { currentUtilizationBps, currentBorrowApr } = useMemo(() => {
    if (maxBorrowLimitUsd <= 0) {
      return { currentUtilizationBps: 0, currentBorrowApr: 2.0 };
    }
    const util = Math.min(1.0, borrowedDebtUsdss / maxBorrowLimitUsd);
    const utilBps = Math.round(util * 10000);

    // Kink at 80% (8000 bps)
    const baseRate = 2.0; // 2% base
    const optimalRate = 8.5; // 8.5% at 80% utilization
    const maxRate = 25.0; // 25% at 100% utilization

    let apr = baseRate;
    if (utilBps <= 8000) {
      apr = baseRate + (util / 0.8) * (optimalRate - baseRate);
    } else {
      const excess = (util - 0.8) / 0.2;
      apr = optimalRate + excess * (maxRate - optimalRate);
    }

    return {
      currentUtilizationBps: utilBps,
      currentBorrowApr: apr,
    };
  }, [borrowedDebtUsdss, maxBorrowLimitUsd]);

  // Actions
  const handleDepositCollateral = () => {
    const amt = parseFloat(collateralAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid collateral amount");
      return;
    }
    const available = walletBalances[selectedAssetKey] || 0;
    if (amt > available) {
      toast.error(`Insufficient ${selectedAssetKey} balance in wallet`);
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setWalletBalances((prev) => ({ ...prev, [selectedAssetKey]: prev[selectedAssetKey] - amt }));
      setPledgedCollateral((prev) => ({ ...prev, [selectedAssetKey]: (prev[selectedAssetKey] || 0) + amt }));
      setCollateralAmountInput("");
      setIsProcessing(false);
      toast.success(`Successfully deposited ${amt} ${selectedAssetKey} into SBL Collateral Vault!`);
    }, 600);
  };

  const handleWithdrawCollateral = () => {
    const amt = parseFloat(collateralAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const currentPledged = pledgedCollateral[selectedAssetKey] || 0;
    if (amt > currentPledged) {
      toast.error(`Cannot withdraw more than pledged balance`);
      return;
    }

    // Check post-withdrawal solvency
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
      toast.success(`Released ${amt} ${selectedAssetKey} back to your wallet!`);
    }, 600);
  };

  const handleBorrowUsdss = () => {
    const amt = parseFloat(usdssAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid USDSS borrow amount");
      return;
    }
    if (amt > remainingBorrowPowerUsdss) {
      toast.error("Requested borrow exceeds available collateral-backed credit limit!");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setBorrowedDebtUsdss((prev) => prev + amt);
      setWalletUsdss((prev) => prev + amt);
      setUsdssAmountInput("");
      setIsProcessing(false);
      toast.success(`Minted ${amt.toFixed(2)} USDSS (Token-2022) to wallet against stock & crypto collateral!`);
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
      toast.success(`Repaid & burned ${repayAmount.toFixed(2)} USDSS debt! Solvency increased.`);
    }, 600);
  };

  const handleAirdropAssets = () => {
    setWalletBalances((prev) => ({
      ...prev,
      NVDA: prev.NVDA + 10.0,
      AAPL: prev.AAPL + 10.0,
      TSLA: prev.TSLA + 5.0,
      BTC: prev.BTC + 0.1,
      BCH: prev.BCH + 2.0,
      BNB: prev.BNB + 2.0,
      SOL: prev.SOL + 10.0,
    }));
    toast.success("Airdropped test Stocks (NVDA, AAPL, TSLA) & Currencies (BTC, BCH, BNB, SOL)!");
  };

  return (
    <div className="w-full space-y-8">
      {/* 1. Devnet Protocol Header & Status Banner */}
      <div className="bg-gradient-to-r from-card/90 via-card/60 to-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Solana Devnet Live</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                Token-2022 USDSS Synthetic Engine
              </span>
              <span className="px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                Multi-Collateral (Stock + Crypto)
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-3">
              <Building2 className="w-8 h-8 text-emerald-400" />
              <span>Securities-Backed Lending (SBL)</span>
            </h2>

            <p className="text-sm text-muted-foreground font-mono leading-relaxed">
              Pledge your tokenized equities (<strong className="text-emerald-400">NVDA, AAPL, TSLA, AMZN, COIN</strong>) and premier crypto currencies (<strong className="text-orange-400">BTC, BCH, BNB, SOL</strong>) to mint synthetic <strong className="text-cyan-400">USDSS</strong> without triggering capital gains taxes or forfeiting corporate voting and dividends.
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-background/80 border border-border/80 px-4 py-2.5 rounded-2xl">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">Borrow Token</span>
              <span className="text-lg font-black font-display text-cyan-400 flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                <span>USDSS (Token-2022)</span>
              </span>
            </div>

            <div className="bg-background/80 border border-border/80 px-4 py-2.5 rounded-2xl">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">Variable APR (Piecewise)</span>
              <span className="text-lg font-black font-display text-emerald-400">
                {currentBorrowApr.toFixed(2)}%
              </span>
            </div>

            <button
              onClick={handleAirdropAssets}
              type="button"
              className="px-4 py-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold rounded-2xl text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              title="Add test stocks & tokens to wallet"
            >
              <Coins className="w-4 h-4" />
              <span>Faucet Test Collateral</span>
            </button>
          </div>
        </div>

        {/* On-Chain Program Info Bar */}
        <div className="mt-6 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between text-xs font-mono text-muted-foreground gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-foreground/90 flex items-center gap-1.5 font-bold">
              <Code2 className="w-4 h-4 text-emerald-400" />
              Program:
            </span>
            <a
              href={`https://explorer.solana.com/address/${programId.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
            >
              <span>{programId.toBase58().slice(0, 4)}...{programId.toBase58().slice(-4)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">Market ID: <strong className="text-foreground">{DEFAULT_MARKET_ID}</strong></span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">
              Obligation:{" "}
              {connected ? (
                <strong className={isObligationCreated ? "text-emerald-400" : "text-amber-400"}>
                  {isObligationCreated ? "Active On-Chain" : "Ready to Initialize"}
                </strong>
              ) : (
                <span className="text-muted-foreground">Connect Wallet</span>
              )}
            </span>
          </div>

          {connected && !isObligationCreated && (
            <button
              onClick={initObligation}
              disabled={sblLoading}
              type="button"
              className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold rounded-xl text-xs font-mono uppercase flex items-center gap-1.5 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{sblLoading ? "Initializing..." : "Init Obligation on Devnet"}</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExtensionMatrix(!showExtensionMatrix)}
              type="button"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{showExtensionMatrix ? "Hide Token-2022 Architecture" : "View Token-2022 Architecture"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Token-2022 Extension Architecture Drawer (Connecting One-Click Launch extensions) */}
      <AnimatePresence>
        {showExtensionMatrix && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card/70 border border-cyan-500/30 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-black font-display uppercase tracking-wider text-foreground">
                    Token-2022 Extensions Architecture (Solana Chapter 17 & One-Click Launch)
                  </h3>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  SPL Token-2022 Standard
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                {/* USDSS Extensions */}
                <div className="bg-background/80 border border-border/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-cyan-400 font-bold border-b border-border/50 pb-2">
                    <span>USDSS (Synthetic Dollar)</span>
                    <span className="text-[10px] bg-cyan-500/10 px-1.5 py-0.5 rounded">Mint Program</span>
                  </div>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span><strong>InterestBearingConfig:</strong> Automatically reflects variable debt APY & synthetic dollar savings rate directly on mint balances.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span><strong>MetadataPointer:</strong> Embeds immutable name, ticker, and verification URI directly on-chain.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span><strong>PermanentDelegate:</strong> Bound to SBL Market PDA for automated debt burning during liquidations.</span>
                    </li>
                  </ul>
                </div>

                {/* Equities Extensions */}
                <div className="bg-background/80 border border-border/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-border/50 pb-2">
                    <span>Equities (NVDA, AAPL, TSLA)</span>
                    <span className="text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded">Securities Standards</span>
                  </div>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>PermanentDelegate:</strong> Executes corporate actions like stock splits (e.g. 10-for-1 NVDA) and dividend credits seamlessly.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>DefaultAccountState:</strong> Enforces compliance/KYC accreditation checks before unfreezing user accounts.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>TransferHook:</strong> Cross-checks NYSE/NASDAQ market sessions and halts trading during volatility curbs.</span>
                    </li>
                  </ul>
                </div>

                {/* Crypto Collateral */}
                <div className="bg-background/80 border border-border/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-orange-400 font-bold border-b border-border/50 pb-2">
                    <span>Currencies (BTC, BCH, BNB, SOL)</span>
                    <span className="text-[10px] bg-orange-500/10 px-1.5 py-0.5 rounded">Native & Wrapped</span>
                  </div>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                      <span><strong>Multi-Reserve Vaults:</strong> Isolated PDA vaults per mint (<code className="text-xs">b"sbl_reserve", market, mint</code>).</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                      <span><strong>Pyth Price Oracles:</strong> Sub-second high-confidence price feeds validating collateral valuation.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                      <span><strong>Wad Arithmetic:</strong> 10^18 Wad precision preventing rounding loss on high-value tokens like BTC.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Portfolio & Health Factor HUD */}
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

        {/* Total Collateral Value */}
        <div className="bg-card/40 border border-border/70 rounded-3xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold mb-2">
            <span>Pledged Collateral</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-display text-emerald-400">
              ${totalPledgedValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-0.5 truncate">
              {Object.entries(pledgedCollateral)
                .filter(([_, q]) => q > 0)
                .map(([sym, q]) => `${q} ${sym}`)
                .join(", ") || "No collateral pledged"}
            </div>
          </div>
          <div className="text-[10px] font-mono text-emerald-400 mt-3 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Multi-asset isolated vault</span>
          </div>
        </div>

        {/* Current Borrowed USDSS Debt */}
        <div className="bg-card/40 border border-border/70 rounded-3xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold mb-2">
            <span>Borrowed Debt (USDSS)</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-display text-cyan-400">
              {borrowedDebtUsdss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDSS
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-0.5">
              Interest APR: ~{currentBorrowApr.toFixed(2)}%
            </div>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-3 flex justify-between">
            <span>Wallet USDSS:</span>
            <strong className="text-foreground">{walletUsdss.toFixed(2)} USDSS</strong>
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
              {remainingBorrowPowerUsdss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDSS
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-0.5">
              Max Facility Limit: ${maxBorrowLimitUsd.toFixed(2)}
            </div>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-3 flex justify-between">
            <span>Utilization:</span>
            <strong className="text-primary">{(currentUtilizationBps / 100).toFixed(1)}% (Kink @ 80%)</strong>
          </div>
        </div>
      </div>

      {/* 4. Collateral Selection Hub & Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black font-display uppercase tracking-wider text-muted-foreground">
              Select Collateral Asset
            </h3>
            <span className="text-xs font-mono text-muted-foreground">
              Choose US stocks or major currencies to pledge into your SBL facility
            </span>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex bg-muted/60 p-1 rounded-2xl border border-border/70 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFilterCategory("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono uppercase transition-all ${
                filterCategory === "all"
                  ? "bg-card text-foreground shadow font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Assets ({Object.keys(SUPPORTED_COLLATERAL).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory("Equity")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono uppercase transition-all ${
                filterCategory === "Equity"
                  ? "bg-emerald-500 text-black shadow font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              US Equities (5)
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory("Crypto")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono uppercase transition-all ${
                filterCategory === "Crypto"
                  ? "bg-orange-500 text-black shadow font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Currencies & Crypto (4)
            </button>
          </div>
        </div>

        {/* Collateral Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {filteredAssets.map((asset) => {
            const isSelected = selectedAssetKey === asset.symbol;
            const walletQty = walletBalances[asset.symbol] || 0;
            const pledgedQty = pledgedCollateral[asset.symbol] || 0;

            return (
              <button
                key={asset.symbol}
                type="button"
                onClick={() => setSelectedAssetKey(asset.symbol)}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? "bg-card border-emerald-500 shadow-lg shadow-emerald-500/10 scale-[1.02]"
                    : "bg-card/40 border-border/70 hover:bg-card/70 hover:border-border"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black font-display text-base text-foreground flex items-center gap-1.5">
                      <span>{asset.symbol}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {asset.category === "Equity" ? "Stock" : "Crypto"}
                      </span>
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        asset.change24h >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {asset.change24h >= 0 ? "+" : ""}
                      {asset.change24h}%
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-lg font-black font-display text-foreground">
                      ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                      <span>LTV: {asset.ltvBps / 100}%</span>
                      <span>APR: {(asset.baseAprBps / 100).toFixed(2)}%</span>
                    </div>
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

      {/* 5. Dual Operation Hub (Collateral Vault vs Mint/Repay USDSS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panel A: Collateral Management (Stock or Crypto) */}
        <div className="bg-card/50 border border-border/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <h3 className="text-xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-400" />
                  <span>{selectedAsset.symbol} Collateral Vault</span>
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Deposit tokenized {selectedAsset.category === "Equity" ? "shares" : "tokens"} or withdraw pledged assets
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
                    ? `Wallet ${selectedAsset.symbol} Balance:`
                    : `Pledged in Obligation:`}
                </span>
                <span className="font-bold text-emerald-400">
                  {collateralSubAction === "deposit"
                    ? `${(walletBalances[selectedAssetKey] || 0)} ${selectedAsset.symbol}`
                    : `${(pledgedCollateral[selectedAssetKey] || 0)} ${selectedAsset.symbol}`}
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={collateralAmountInput}
                  onChange={(e) => setCollateralAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-background border border-input rounded-2xl px-4 py-4 text-2xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
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
                    className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg font-bold font-mono uppercase"
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
                  <span>Token Standard:</span>
                  <span className="font-bold text-cyan-400">
                    {selectedAsset.tokenType} ({selectedAsset.token2022Extensions.join(", ")})
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
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-mono uppercase text-sm tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        {/* Panel B: Mint / Repay USDSS (Synthetic Dollar via Token-2022) */}
        <div className="bg-card/50 border border-border/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <h3 className="text-xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-cyan-400" />
                  <span>Borrow & Repay (USDSS)</span>
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Mint synthetic USDSS against collateral or burn debt to redeem equity
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
                  <span>Interest Rate (Piecewise Kinked):</span>
                  <span className="font-bold text-foreground">{currentBorrowApr.toFixed(2)}% APR</span>
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
                <div className="flex justify-between text-muted-foreground">
                  <span>Mint Standard:</span>
                  <span className="font-bold text-cyan-400">SPL Token-2022 (Synthetic Dollar)</span>
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
                <span>Draw USDSS Loan (Mint)</span>
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
                    toast.success(`Settled ${toRepay.toFixed(2)} USDSS debt!`);
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
          <span>SBL Invariant & Solvency Protections</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Overnight Gap Risk Shield</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Equities carry market-close jump risk. LTVs are dialed conservative (55%–70%) with a mandatory 10% liquidation buffer so overnight gap-downs don't cause undercollateralized debt.
            </p>
          </div>

          <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>100% Dividend & Yield Pass-Through</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Quarterly dividends paid out by companies (e.g. Apple, NVIDIA) or staking yield on SOL are automatically credited to the depositor's obligation account without manual claiming.
            </p>
          </div>

          <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Token-2022 USDSS Synthetic Mechanics</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Much like <strong className="text-emerald-400">ssSOL</strong> in SNBL staking, borrowers receive liquid <strong className="text-cyan-400">USDSS</strong> which can be swapped, staked, or provided as liquidity across Solana DeFi while underlying stock ownership remains untouched.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
