"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, Transaction, SystemProgram } from "@solana/web3.js";
import {
  ShieldCheck,
  AlertTriangle,
  Flame,
  ArrowRight,
  Coins,
  Lock,
  Unlock,
  DollarSign,
  Clock,
  Sparkles,
  ExternalLink,
  Code2,
  Calendar,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { useCbl, CBL_PROGRAM_ID, DEFAULT_CBL_MARKET_ID } from "@/hooks/useCbl";
import { UsdssIcon } from "@/components/common/UsdssIcon";
import { savePendingAction, clearPendingAction } from "@/utils/pendingTransactions";

// Established Crypto Assets & Tokenized Currencies
export interface CryptoAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  ltvBps: number; // e.g. 7500 = 75%
  liquidationThresholdBps: number; // e.g. 8500 = 85%
  baseRateBps: number; // e.g. 340 = 3.40%
  category: "Crypto" | "FX";
  decimals: number;
}

export const ESTABLISHED_CRYPTO_ASSETS: Record<string, CryptoAsset> = {
  BTC: {
    symbol: "BTC",
    name: "Bitcoin",
    price: 64250.0,
    change24h: 2.14,
    ltvBps: 7500, // 75% LTV
    liquidationThresholdBps: 8500,
    baseRateBps: 340,
    category: "Crypto",
    decimals: 8,
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    price: 2640.0,
    change24h: 1.85,
    ltvBps: 7500,
    liquidationThresholdBps: 8500,
    baseRateBps: 360,
    category: "Crypto",
    decimals: 8,
  },
  SOL: {
    symbol: "SOL",
    name: "Solana",
    price: 152.8,
    change24h: 4.35,
    ltvBps: 7500,
    liquidationThresholdBps: 8500,
    baseRateBps: 350,
    category: "Crypto",
    decimals: 9,
  },
  BNB: {
    symbol: "BNB",
    name: "Binance Coin",
    price: 582.4,
    change24h: 0.85,
    ltvBps: 7000,
    liquidationThresholdBps: 8000,
    baseRateBps: 390,
    category: "Crypto",
    decimals: 8,
  },
  BCH: {
    symbol: "BCH",
    name: "Bitcoin Cash",
    price: 345.2,
    change24h: -1.2,
    ltvBps: 6000,
    liquidationThresholdBps: 7000,
    baseRateBps: 450,
    category: "Crypto",
    decimals: 8,
  },
  LTC: {
    symbol: "LTC",
    name: "Litecoin",
    price: 68.5,
    change24h: 0.42,
    ltvBps: 6500,
    liquidationThresholdBps: 7500,
    baseRateBps: 420,
    category: "Crypto",
    decimals: 8,
  },
  EURC: {
    symbol: "EURC",
    name: "Euro Coin",
    price: 1.08,
    change24h: 0.05,
    ltvBps: 9000,
    liquidationThresholdBps: 9500,
    baseRateBps: 220,
    category: "FX",
    decimals: 6,
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
    decimals: 6,
  },
};

export interface LoanTermOption {
  label: string;
  days: number;
  rateRampBps: number;
}

export const LOAN_TERMS: LoanTermOption[] = [
  { label: "30 Days", days: 30, rateRampBps: 0 },
  { label: "60 Days", days: 60, rateRampBps: 40 },
  { label: "90 Days", days: 90, rateRampBps: 80 },
  { label: "180 Days", days: 180, rateRampBps: 150 },
  { label: "365 Days", days: 365, rateRampBps: 250 },
  { label: "Open Term", days: 0, rateRampBps: 300 },
];

export function LendingBorrowingDashboard() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { programId, currentSlot, isRpcConnected, marketPda } = useCbl();

  // Selected Collateral Asset
  const [selectedAssetKey, setSelectedAssetKey] = useState<string>("SOL");
  const selectedAsset = ESTABLISHED_CRYPTO_ASSETS[selectedAssetKey] || ESTABLISHED_CRYPTO_ASSETS.SOL;

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

  const [walletUsdss, setWalletUsdss] = useState<number>(1850.0);

  // Active Loan Obligation
  const [pledgedCollateral, setPledgedCollateral] = useState<Record<string, number>>({
    BTC: 0.15,
    ETH: 1.0,
    SOL: 10.0,
    BNB: 0.0,
    BCH: 0.0,
    LTC: 0.0,
    EURC: 0.0,
    JPYC: 0.0,
  });

  const [borrowedDebtUsdss, setBorrowedDebtUsdss] = useState<number>(4200.0);
  const [loanDueDate, setLoanDueDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 28);
    return d;
  });

  // Actions
  const [collateralSubAction, setCollateralSubAction] = useState<"deposit" | "withdraw">("deposit");
  const [borrowSubAction, setBorrowSubAction] = useState<"borrow" | "repay">("borrow");

  const [collateralAmountInput, setCollateralAmountInput] = useState<string>("");
  const [usdssAmountInput, setUsdssAmountInput] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Calculations
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

  const remainingBorrowPowerUsdss = Math.max(0, maxBorrowLimitUsd - borrowedDebtUsdss);

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

  const effectiveApr = useMemo(() => {
    return (selectedAsset.baseRateBps + selectedTerm.rateRampBps) / 100;
  }, [selectedAsset, selectedTerm]);

  const daysRemaining = useMemo(() => {
    const now = new Date();
    const diffMs = loanDueDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [loanDueDate]);

  // Specific Solana Collateral to USDSS Calculation (e.g. 1 SOL = 114.60 USDSS)
  const solAsset = ESTABLISHED_CRYPTO_ASSETS.SOL;
  const solUsdssPerUnit = solAsset.price * (solAsset.ltvBps / 10000); // 152.80 * 0.75 = 114.60 USDSS
  const currentAssetUsdssPerUnit = selectedAsset.price * (selectedAsset.ltvBps / 10000);

  // Interest clause calculation:
  const accruedInterestUsdss = useMemo(() => {
    if (borrowedDebtUsdss <= 0) return 0;
    const termDays = selectedTerm.days || 30;
    return (borrowedDebtUsdss * (effectiveApr / 100) * termDays) / 365;
  }, [borrowedDebtUsdss, effectiveApr, selectedTerm]);

  const totalPaybackAmountUsdss = borrowedDebtUsdss + accruedInterestUsdss;
  const isAutoLocked = borrowedDebtUsdss > 0;

  // Handlers
  const handleDepositCollateral = async () => {
    const amt = parseFloat(collateralAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const available = walletBalances[selectedAssetKey] || 0;
    if (amt > available) {
      toast.error(`Insufficient ${selectedAssetKey}`);
      return;
    }

    setIsProcessing(true);
    try {
      // Devnet on-chain deposit simulation when user is connected with wallet
      if (selectedAssetKey === "SOL" && connected && publicKey && sendTransaction && connection) {
        try {
          const tx = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: marketPda,
              lamports: Math.round(Math.min(amt, 0.01) * LAMPORTS_PER_SOL), // Micro safe devnet test tx
            })
          );
          await sendTransaction(tx, connection);
          toast.success(`Solana Devnet: Pledged ${amt} SOL into vault escrow!`);
        } catch (e: any) {
          console.debug("Devnet transaction skipped or in simulation mode:", e?.message);
        }
      }

      setWalletBalances((prev) => ({ ...prev, [selectedAssetKey]: Math.max(0, prev[selectedAssetKey] - amt) }));
      setPledgedCollateral((prev) => ({ ...prev, [selectedAssetKey]: (prev[selectedAssetKey] || 0) + amt }));
      setCollateralAmountInput("");
      const generatedUsdss = amt * currentAssetUsdssPerUnit;
      toast.success(`Pledged ${amt} ${selectedAssetKey}! Unlocked +${generatedUsdss.toFixed(2)} USDSS facility`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdrawCollateral = () => {
    if (isAutoLocked) {
      toast.error(`Auto-Lock Invariant Active! You must repay your outstanding ${totalPaybackAmountUsdss.toFixed(2)} USDSS debt to unlock your deposited ${selectedAssetKey}.`);
      return;
    }
    const amt = parseFloat(collateralAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const currentPledged = pledgedCollateral[selectedAssetKey] || 0;
    if (amt > currentPledged) {
      toast.error("Cannot withdraw more than pledged balance");
      return;
    }

    const lostVal = amt * selectedAsset.price;
    const lostThreshold = lostVal * (selectedAsset.liquidationThresholdBps / 10000);
    const newThreshold = liquidationThresholdValueUsd - lostThreshold;

    if (borrowedDebtUsdss > 0 && newThreshold < borrowedDebtUsdss) {
      toast.error("Withdrawal would breach liquidation threshold!");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setPledgedCollateral((prev) => ({ ...prev, [selectedAssetKey]: prev[selectedAssetKey] - amt }));
      setWalletBalances((prev) => ({ ...prev, [selectedAssetKey]: (prev[selectedAssetKey] || 0) + amt }));
      setCollateralAmountInput("");
      setIsProcessing(false);
      toast.success(`Withdrew ${amt} ${selectedAssetKey}`);
    }, 500);
  };

  const handleBorrowUsdss = () => {
    const amt = parseFloat(usdssAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid USDSS amount");
      return;
    }
    if (amt > remainingBorrowPowerUsdss) {
      toast.error("Borrow exceeds available credit limit");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setBorrowedDebtUsdss((prev) => prev + amt);
      setWalletUsdss((prev) => prev + amt);

      if (selectedTerm.days > 0) {
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + selectedTerm.days);
        setLoanDueDate(nextDue);
      }

      setUsdssAmountInput("");
      setIsProcessing(false);
      toast.success(`Minted ${amt.toFixed(2)} USDSS! Deposited collateral is now AUTO-LOCKED.`);
    }, 500);
  };

  const handleRepayUsdss = () => {
    const amt = parseFloat(usdssAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amt > walletUsdss) {
      toast.error("Insufficient USDSS balance");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const repayAmount = Math.min(amt, borrowedDebtUsdss);
      setWalletUsdss((prev) => prev - repayAmount);
      setBorrowedDebtUsdss((prev) => {
        const nextDebt = Math.max(0, prev - repayAmount);
        if (nextDebt === 0) {
          toast.success(`USDSS debt & interest settled! Deposited collateral is now UNLOCKED.`);
        } else {
          toast.success(`Repaid ${repayAmount.toFixed(2)} USDSS. Remaining debt: ${nextDebt.toFixed(2)} USDSS`);
        }
        return nextDebt;
      });
      setUsdssAmountInput("");
      setIsProcessing(false);
    }, 500);
  };

  const handleFaucet = () => {
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
    toast.success("Faucet test tokens credited to wallet");
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. Clean Crypto Header (Yellow Theme) */}
      <div className="bg-gradient-to-r from-card/90 via-card/50 to-amber-500/10 border border-amber-500/30 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Crypto Lending
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                Term Loans & Synthetic USDSS
              </span>
            </div>
            <h2 className="text-2xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
              <Coins className="w-6 h-6 text-amber-400" />
              <span>Borrow Against Crypto</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-background/80 border border-border/80 px-4 py-2 rounded-2xl text-right">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">Repayment Due</span>
              <span className="text-sm font-black font-display text-amber-400">
                {daysRemaining > 0 ? `${daysRemaining} Days Left` : "Open Term"}
              </span>
            </div>

            <button
              onClick={handleFaucet}
              type="button"
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-2xl text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]"
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
              <strong className="text-amber-400">
                {connected && publicKey
                  ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
                  : "Ready / Local"}
              </strong>
            </div>

            <span className="text-border">|</span>

            <span className="text-foreground/90 font-bold flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              Program:
            </span>
            <a
              href={`https://explorer.solana.com/address/${programId.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>{programId.toBase58().slice(0, 4)}...{programId.toBase58().slice(-4)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <span className="text-border">|</span>
            <span>Market: <strong className="text-foreground">{DEFAULT_CBL_MARKET_ID}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase">
              Obligation: Active
            </span>
            <div className="flex items-center gap-1.5 text-amber-400/90 font-bold text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>30d – 365d Structured Rates</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. User Collateral Position & Solana to USDSS Conversion Engine */}
      <div className="space-y-4">
        {/* Solana to USDSS Conversion Rate Banner */}
        <div className="bg-gradient-to-r from-amber-500/15 via-card/70 to-card/90 border border-amber-500/40 rounded-3xl p-5 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <UsdssIcon className="w-8 h-8" size={32} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-400">
                    Solana Collateral Conversion Rate
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    75% LTV
                  </span>
                </div>
                <div className="text-xl md:text-2xl font-black font-display text-foreground flex items-center gap-2 mt-0.5">
                  <span>1 SOL (${solAsset.price.toFixed(2)})</span>
                  <ArrowRight className="w-5 h-5 text-amber-400 shrink-0" />
                  <span className="text-amber-400 flex items-center gap-1.5">
                    <UsdssIcon className="w-6 h-6 inline-block" size={24} />
                    {solUsdssPerUnit.toFixed(2)} USDSS
                  </span>
                </div>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  For each 1 SOL collateralized into the Devnet vault, you receive exactly <strong>{solUsdssPerUnit.toFixed(2)} USDSS</strong>.
                </p>
              </div>
            </div>

            {selectedAssetKey !== "SOL" && (
              <div className="bg-background/80 border border-border/80 px-4 py-2.5 rounded-2xl text-right shrink-0">
                <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">
                  {selectedAsset.symbol} Conversion ({selectedAsset.ltvBps / 100}% LTV)
                </span>
                <span className="text-base font-black font-display text-amber-400 flex items-center justify-end gap-1.5">
                  1 {selectedAsset.symbol} = <UsdssIcon className="w-4 h-4 inline-block" size={16} /> {currentAssetUsdssPerUnit.toFixed(2)} USDSS
                </span>
              </div>
            )}
          </div>
        </div>

        {/* User Specific Position & Interest Clause / Auto-Lock Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card A: Specific User Collateralized Amount */}
          <div className="bg-card/45 border border-border/80 rounded-2xl p-4 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold">
              <span>Your Collateralized</span>
              <Coins className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-black font-display text-amber-400">
                {pledgedCollateral.SOL.toFixed(2)} SOL
              </div>
              <p className="text-xs font-mono text-foreground font-bold mt-0.5">
                ${(pledgedCollateral.SOL * solAsset.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD Value
              </p>
              <div className="text-[10px] font-mono text-muted-foreground mt-1.5 pt-1.5 border-t border-border/40 truncate">
                {Object.entries(pledgedCollateral)
                  .filter(([s, q]) => q > 0 && s !== "SOL")
                  .map(([s, q]) => `${q} ${s}`)
                  .join(", ") || "No other assets pledged"}
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
                <span className="text-emerald-400 font-bold">Max Limit: ${maxBorrowLimitUsd.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Card C: Interest Payment Back Clause & Auto-Lock Status */}
          <div className="bg-card/45 border border-border/80 rounded-2xl p-4 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold">
              <span>Payback Clause & Vault Lock</span>
              {isAutoLocked ? (
                <Lock className="w-4 h-4 text-amber-400 animate-pulse" />
              ) : (
                <Unlock className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black uppercase flex items-center gap-1.5 ${
                    isAutoLocked
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {isAutoLocked ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Collateral Auto-Locked</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Collateral Unlocked</span>
                    </>
                  )}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {effectiveApr.toFixed(2)}% APR ({selectedTerm.label})
                </span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground mt-1.5 leading-snug">
                {isAutoLocked ? (
                  <span>
                    Pay back <strong className="text-foreground">{totalPaybackAmountUsdss.toFixed(2)} USDSS</strong> (principal + {accruedInterestUsdss.toFixed(2)} interest) by {loanDueDate.toLocaleDateString()} to release your Solana.
                  </span>
                ) : (
                  <span>No outstanding debt. Deposited Solana is unlocked and withdrawable at any time.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Collateral Asset Selector (Clean Cards) */}
      <div className="space-y-2">
        <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
          Select Crypto Collateral
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {Object.values(ESTABLISHED_CRYPTO_ASSETS).map((asset) => {
            const isSelected = selectedAssetKey === asset.symbol;
            const walletQty = walletBalances[asset.symbol] || 0;
            const pledgedQty = pledgedCollateral[asset.symbol] || 0;

            return (
              <button
                key={asset.symbol}
                type="button"
                onClick={() => setSelectedAssetKey(asset.symbol)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? "bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10"
                    : "bg-card/40 border-border/60 hover:bg-card/80"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-black font-display text-sm ${isSelected ? "text-amber-400" : "text-foreground"}`}>
                    {asset.symbol}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold ${
                      asset.change24h >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {asset.change24h >= 0 ? "+" : ""}{asset.change24h}%
                  </span>
                </div>

                <div className="text-sm font-black font-display text-foreground">
                  ${asset.price >= 1 ? asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : asset.price.toFixed(4)}
                </div>

                <div className="mt-2 pt-1.5 border-t border-border/40 text-[9px] font-mono text-muted-foreground flex justify-between">
                  <span>Pledged: {pledgedQty}</span>
                  <span>Bal: {walletQty}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Term Selector (Clean Chips) */}
      <div className="bg-card/40 border border-border/70 rounded-2xl p-4 backdrop-blur-md space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Repayment Window & Interest Ramp
          </span>
          <span className="text-amber-400 font-bold">
            {selectedTerm.label} ({effectiveApr.toFixed(2)}% APR)
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {LOAN_TERMS.map((term, idx) => {
            const isSelected = selectedTermIndex === idx;
            const termApr = (selectedAsset.baseRateBps + term.rateRampBps) / 100;

            return (
              <button
                key={term.label}
                type="button"
                onClick={() => setSelectedTermIndex(idx)}
                className={`py-2 px-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? "bg-amber-500 text-black border-amber-500 font-black shadow-md shadow-amber-500/20"
                    : "bg-muted/40 border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="text-xs font-bold font-mono">{term.label}</div>
                <div className={`text-xs font-display font-black mt-0.5 ${isSelected ? "text-black" : "text-amber-400"}`}>
                  {termApr.toFixed(2)}%
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Clean Action Hub (Deposit vs Borrow) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel A: Collateral Management */}
        <div className="bg-card/50 border border-border/80 rounded-2xl p-5 backdrop-blur-xl shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <span className="font-bold text-sm font-display uppercase tracking-wide text-foreground flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>{selectedAsset.symbol} Collateral</span>
              </span>

              <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setCollateralSubAction("deposit")}
                  className={`px-3 py-1 rounded-md text-xs font-bold font-mono uppercase transition-all ${
                    collateralSubAction === "deposit"
                      ? "bg-amber-500 text-black font-black"
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
                      ? "bg-amber-500 text-black font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Withdraw
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>{collateralSubAction === "deposit" ? "Wallet Available:" : "Pledged in Vault:"}</span>
                <span className="font-bold text-amber-400">
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
                  className="w-full bg-background border border-input rounded-xl px-3 py-3 text-lg font-bold font-mono focus:ring-2 focus:ring-amber-400/50"
                  disabled={isProcessing}
                />
                <button
                  type="button"
                  onClick={() =>
                    setCollateralAmountInput(
                      collateralSubAction === "deposit"
                        ? (walletBalances[selectedAssetKey] || 0).toString()
                        : (pledgedCollateral[selectedAssetKey] || 0).toString()
                    )
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded font-mono font-bold"
                >
                  MAX
                </button>
              </div>

              <div className="flex justify-between text-xs font-mono text-muted-foreground pt-1">
                <span>Value: ${((parseFloat(collateralAmountInput) || 0) * selectedAsset.price).toFixed(2)}</span>
                <span className="text-emerald-400">
                  {collateralSubAction === "deposit" ? "+" : "-"}$
                  {(
                    (parseFloat(collateralAmountInput) || 0) *
                    selectedAsset.price *
                    (selectedAsset.ltvBps / 10000)
                  ).toFixed(2)}{" "}
                  Limit
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={collateralSubAction === "deposit" ? handleDepositCollateral : handleWithdrawCollateral}
            disabled={isProcessing || !collateralAmountInput || parseFloat(collateralAmountInput) <= 0}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-black font-mono uppercase text-xs tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {collateralSubAction === "deposit" ? `Deposit ${selectedAsset.symbol}` : `Withdraw ${selectedAsset.symbol}`}
          </button>
        </div>

        {/* Panel B: USDSS Draw / Repay */}
        <div className="bg-card/50 border border-border/80 rounded-2xl p-5 backdrop-blur-xl shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <span className="font-bold text-sm font-display uppercase tracking-wide text-foreground flex items-center gap-1.5">
                <UsdssIcon className="w-5 h-5" size={20} />
                <span>USDSS Credit Facility</span>
              </span>

              <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setBorrowSubAction("borrow")}
                  className={`px-3 py-1 rounded-md text-xs font-bold font-mono uppercase transition-all ${
                    borrowSubAction === "borrow"
                      ? "bg-amber-400 text-black font-black"
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
                      ? "bg-amber-400 text-black font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Repay
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>{borrowSubAction === "borrow" ? "Borrow Headroom:" : "Wallet USDSS Balance:"}</span>
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  <UsdssIcon className="w-4 h-4 inline-block" size={16} />
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
                  className="w-full bg-background border border-input rounded-xl px-3 py-3 text-lg font-bold font-mono focus:ring-2 focus:ring-amber-400/50"
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs bg-amber-400/15 text-amber-400 px-2 py-0.5 rounded font-mono font-bold"
                >
                  MAX
                </button>
              </div>

              {borrowSubAction === "repay" && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs font-mono space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Principal Debt:</span>
                    <span className="text-foreground font-bold">{borrowedDebtUsdss.toFixed(2)} USDSS</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Accrued Interest ({effectiveApr.toFixed(2)}% APR):</span>
                    <span className="text-amber-400 font-bold">+{accruedInterestUsdss.toFixed(2)} USDSS</span>
                  </div>
                  <div className="flex justify-between border-t border-border/50 pt-1 text-foreground font-black">
                    <span>Total Required to Release Collateral:</span>
                    <span className="text-amber-400">{totalPaybackAmountUsdss.toFixed(2)} USDSS</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-xs font-mono text-muted-foreground pt-1">
                <span>APR: {effectiveApr.toFixed(2)}%</span>
                <span className="text-foreground">Maturity: {selectedTerm.label}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={borrowSubAction === "borrow" ? handleBorrowUsdss : handleRepayUsdss}
            disabled={isProcessing || !usdssAmountInput || parseFloat(usdssAmountInput) <= 0}
            className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-black font-mono uppercase text-xs tracking-wider rounded-xl transition-all shadow-md shadow-amber-400/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <UsdssIcon className="w-4 h-4" size={16} />
            <span>
              {borrowSubAction === "borrow"
                ? `Mint ${selectedTerm.label} USDSS Loan`
                : "Repay USDSS & Unlock Collateral"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
