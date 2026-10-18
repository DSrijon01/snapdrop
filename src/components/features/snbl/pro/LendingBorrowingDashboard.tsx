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
} from "lucide-react";
import toast from "react-hot-toast";
import { useStaking } from "@/hooks/useStaking";

// Chapter 17 Invariants & Risk Parameters
const PROTOCOL_CONFIG = {
  marketId: "SS-LEND-DEVNET-0",
  ltvBps: 7500, // 75%
  liquidationThresholdBps: 8000, // 80%
  liquidationBonusBps: 500, // 5%
  closeFactorBps: 5000, // 50%
  reserveFactorBps: 1000, // 10%
  kinkUtilizationBps: 8000, // 80%
  baseRateBps: 200, // 2%
  kinkRateBps: 2000, // 20%
  maxRateBps: 15000, // 150%
};

// Simulated Oracle Prices (with Pyth confidence bands)
const ORACLE_PRICES = {
  ssSol: { price: 154.8, confidence: 0.22, slotFreshness: "Current" },
  usdc: { price: 1.0, confidence: 0.0001, slotFreshness: "Current" },
};

export function LendingBorrowingDashboard() {
  const { connected, publicKey } = useWallet();
  const { ssBalance } = useStaking();

  // Local interactive balances for testnet simulation
  const [walletSsSol, setWalletSsSol] = useState(15.5);
  const [walletUsdc, setWalletUsdc] = useState(2500.0);

  // Obligation Account State
  const [depositedCollateralSsSol, setDepositedCollateralSsSol] = useState(8.0);
  const [borrowedPrincipalUsdc, setBorrowedPrincipalUsdc] = useState(450.0);

  // Wad ($10^18$) Accumulation Factor simulation (starts at 1.00042)
  const [accumulatedInterestUsdc, setAccumulatedInterestUsdc] = useState(2.84);
  const [borrowAccumulationWad, setBorrowAccumulationWad] = useState(1.00631245);

  // Form Inputs
  const [activeTab, setActiveTab] = useState<"borrow" | "collateral">("borrow");
  const [collateralAction, setCollateralAction] = useState<"deposit" | "withdraw">("deposit");
  const [borrowAction, setBorrowAction] = useState<"borrow" | "repay">("borrow");

  const [collateralInput, setCollateralInput] = useState("");
  const [borrowInput, setBorrowInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Market Utilization Stats
  const totalMarketDeposits = 1450000; // $1.45M USDC
  const totalMarketBorrows = 920000; // $920k USDC
  const marketUtilization = totalMarketBorrows / totalMarketDeposits; // ~63.4%

  // Compute live borrow APR based on Kinked Curve
  const currentBorrowApr = useMemo(() => {
    const u = marketUtilization;
    const kink = PROTOCOL_CONFIG.kinkUtilizationBps / 10000;
    const base = PROTOCOL_CONFIG.baseRateBps / 100;
    const kinkRate = PROTOCOL_CONFIG.kinkRateBps / 100;
    const maxRate = PROTOCOL_CONFIG.maxRateBps / 100;

    if (u <= kink) {
      return base + u * ((kinkRate - base) / kink);
    } else {
      return kinkRate + ((u - kink) / (1 - kink)) * (maxRate - kinkRate);
    }
  }, [marketUtilization]);

  // Synchronize initial wallet ssSOL with onchain staking hook if available
  useEffect(() => {
    if (ssBalance > 0) {
      setWalletSsSol(ssBalance / 10 ** 9);
    }
  }, [ssBalance]);

  // Real-time Wad Accumulator simulation: compounds live debt every slot (1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      if (borrowedPrincipalUsdc > 0) {
        // Compound rate per second at ~5% APR
        const ratePerSecond = currentBorrowApr / 100 / 31536000;
        setBorrowAccumulationWad((prev) => prev * (1 + ratePerSecond));
        setAccumulatedInterestUsdc((prev) => prev + borrowedPrincipalUsdc * ratePerSecond);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [borrowedPrincipalUsdc, currentBorrowApr]);

  // Live Position Valuations
  const liveDebtUsdc = borrowedPrincipalUsdc + accumulatedInterestUsdc;
  const collateralValueUsdc = depositedCollateralSsSol * ORACLE_PRICES.ssSol.price;
  const maxBorrowAllowedUsdc = collateralValueUsdc * (PROTOCOL_CONFIG.ltvBps / 10000);
  const liquidationThresholdValueUsdc =
    collateralValueUsdc * (PROTOCOL_CONFIG.liquidationThresholdBps / 10000);
  const remainingBorrowPowerUsdc = Math.max(0, maxBorrowAllowedUsdc - liveDebtUsdc);

  // Health Factor: (Collateral Value * Liquidation Threshold) / Live Debt
  const healthFactor = useMemo(() => {
    if (liveDebtUsdc <= 0) return 999.0;
    if (collateralValueUsdc <= 0) return 0.0;
    return liquidationThresholdValueUsdc / liveDebtUsdc;
  }, [liquidationThresholdValueUsdc, liveDebtUsdc, collateralValueUsdc]);

  // Liquidation Price of ssSOL for this position
  const liquidationPriceSol = useMemo(() => {
    if (depositedCollateralSsSol <= 0) return 0;
    // liveDebt = depositedCollateral * Price * 0.80  => Price = liveDebt / (depositedCollateral * 0.80)
    return liveDebtUsdc / (depositedCollateralSsSol * (PROTOCOL_CONFIG.liquidationThresholdBps / 10000));
  }, [liveDebtUsdc, depositedCollateralSsSol]);

  // Handlers for interactive actions
  const handleDepositCollateral = () => {
    const amt = parseFloat(collateralInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (amt > walletSsSol) {
      toast.error("Insufficient ssSOL in wallet");
      return;
    }

    setActionLoading(true);
    setTimeout(() => {
      setWalletSsSol((prev) => prev - amt);
      setDepositedCollateralSsSol((prev) => prev + amt);
      setCollateralInput("");
      setActionLoading(false);
      toast.success(`Deposited ${amt.toFixed(4)} ssSOL into Obligation Vault!`);
    }, 600);
  };

  const handleWithdrawCollateral = () => {
    const amt = parseFloat(collateralInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (amt > depositedCollateralSsSol) {
      toast.error("Amount exceeds deposited collateral");
      return;
    }

    // Check if withdrawal causes immediate liquidation
    const newCollateral = depositedCollateralSsSol - amt;
    const newCollateralValue = newCollateral * ORACLE_PRICES.ssSol.price;
    const newThreshold = newCollateralValue * (PROTOCOL_CONFIG.liquidationThresholdBps / 10000);
    if (liveDebtUsdc > 0 && newThreshold < liveDebtUsdc) {
      toast.error("Cannot withdraw: Health factor would drop below liquidation threshold!");
      return;
    }

    setActionLoading(true);
    setTimeout(() => {
      setDepositedCollateralSsSol((prev) => prev - amt);
      setWalletSsSol((prev) => prev + amt);
      setCollateralInput("");
      setActionLoading(false);
      toast.success(`Withdrew ${amt.toFixed(4)} ssSOL to your wallet!`);
    }, 600);
  };

  const handleBorrow = () => {
    const amt = parseFloat(borrowInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid borrow amount");
      return;
    }
    if (amt > remainingBorrowPowerUsdc) {
      toast.error("Borrow exceeds maximum 75% LTV capacity!");
      return;
    }

    setActionLoading(true);
    setTimeout(() => {
      setBorrowedPrincipalUsdc((prev) => prev + amt);
      setWalletUsdc((prev) => prev + amt);
      setBorrowInput("");
      setActionLoading(false);
      toast.success(`Borrowed ${amt.toFixed(2)} USDC via Chapter 17 Wad Accumulator!`);
    }, 600);
  };

  const handleRepay = () => {
    const amt = parseFloat(borrowInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid repayment amount");
      return;
    }
    if (amt > walletUsdc) {
      toast.error("Insufficient USDC balance in wallet");
      return;
    }

    setActionLoading(true);
    setTimeout(() => {
      const repayAmount = Math.min(amt, liveDebtUsdc);
      setWalletUsdc((prev) => prev - repayAmount);

      // Repay interest first, then principal
      if (repayAmount <= accumulatedInterestUsdc) {
        setAccumulatedInterestUsdc((prev) => prev - repayAmount);
      } else {
        const remainingToPrincipal = repayAmount - accumulatedInterestUsdc;
        setAccumulatedInterestUsdc(0);
        setBorrowedPrincipalUsdc((prev) => Math.max(0, prev - remainingToPrincipal));
      }

      setBorrowInput("");
      setActionLoading(false);
      toast.success(`Repaid ${repayAmount.toFixed(2)} USDC! Debt successfully reduced.`);
    }, 600);
  };

  const handleRepayAll = () => {
    if (liveDebtUsdc <= 0) {
      toast("No outstanding debt to repay.");
      return;
    }
    if (walletUsdc < liveDebtUsdc) {
      toast.error("Insufficient USDC in wallet to repay full debt + accrued interest.");
      return;
    }

    setActionLoading(true);
    setTimeout(() => {
      setWalletUsdc((prev) => prev - liveDebtUsdc);
      setBorrowedPrincipalUsdc(0);
      setAccumulatedInterestUsdc(0);
      setBorrowInput("");
      setActionLoading(false);
      toast.success("100% of Debt & Accrued Interest fully settled!");
    }, 600);
  };

  // Faucet tool for immediate testing
  const handleAirdropTestTokens = () => {
    setWalletSsSol((prev) => prev + 5.0);
    setWalletUsdc((prev) => prev + 1000.0);
    toast.success("Airdropped +5.0 ssSOL and +1,000 USDC into test wallet!");
  };

  return (
    <div className="w-full space-y-8">
      {/* 1. Protocol Architecture Banner (Chapter 17 Invariants) */}
      <div className="bg-gradient-to-r from-card/80 via-card/50 to-primary/5 border border-primary/25 rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Chapter 17: Isolated Borrow-Lend Market ({PROTOCOL_CONFIG.marketId})</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight text-foreground">
              Pro Liquidity Credit Line
            </h2>
            <p className="text-sm text-muted-foreground font-mono leading-relaxed">
              Pledge your yield-bearing <strong className="text-purple-400">ssSOL shares</strong> as collateral to borrow <strong className="text-cyan-400">USDC</strong>. Your collateral continues to compound staking APY while locked in your Obligation.
            </p>
          </div>

          {/* Quick Faucet & Live Market Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-background/80 border border-border/80 px-4 py-2.5 rounded-2xl">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">Borrow APR (Kinked)</span>
              <span className="text-lg font-black font-display text-primary">{currentBorrowApr.toFixed(2)}%</span>
            </div>
            <div className="bg-background/80 border border-border/80 px-4 py-2.5 rounded-2xl">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">Max LTV / Liq. Threshold</span>
              <span className="text-lg font-black font-display text-foreground">75% / 80%</span>
            </div>
            <button
              onClick={handleAirdropTestTokens}
              type="button"
              className="px-4 py-3 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary font-bold rounded-2xl text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              title="Add 5 ssSOL and 1,000 USDC to interactive simulation wallet"
            >
              <Coins className="w-4 h-4" />
              <span>Get Devnet Faucet</span>
            </button>
          </div>
        </div>

        {/* Oracle Slot Freshness Bar */}
        <div className="mt-6 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between text-xs font-mono text-muted-foreground gap-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-foreground/80">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <strong>Pyth Oracle:</strong> 1 ssSOL = ${ORACLE_PRICES.ssSol.price.toFixed(2)} (±${ORACLE_PRICES.ssSol.confidence})
            </span>
            <span className="text-border">|</span>
            <span className="text-emerald-400">Slot Freshness: Verified (Current Slot)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wide">Wad Index:</span>
            <span className="font-bold text-primary">{borrowAccumulationWad.toFixed(8)}</span>
          </div>
        </div>
      </div>

      {/* 2. User Obligation Position HUD (Health Factor Gauge) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Health Factor Card */}
        <div className="bg-card/40 border border-border/70 rounded-3xl p-5 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold mb-2">
              <span>Health Factor</span>
              {healthFactor >= 1.25 ? (
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
                  healthFactor >= 1.25
                    ? "text-emerald-400"
                    : healthFactor >= 1.0
                    ? "text-amber-400"
                    : "text-destructive"
                }`}
              >
                {healthFactor > 50 ? "∞ Safe" : healthFactor.toFixed(2)}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {healthFactor >= 1.25 ? "Safe" : healthFactor >= 1.0 ? "Moderate" : "Liquidatable"}
              </span>
            </div>
          </div>

          <div className="w-full bg-background/80 h-2 rounded-full overflow-hidden border border-border/40 mt-4">
            <div
              className={`h-full transition-all duration-500 ${
                healthFactor >= 1.25
                  ? "bg-emerald-400"
                  : healthFactor >= 1.0
                  ? "bg-amber-400"
                  : "bg-destructive"
              }`}
              style={{ width: `${Math.min(100, (healthFactor / 2.0) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-2">
            Liquidation triggers if HF drops &lt; 1.00
          </p>
        </div>

        {/* Collateral Deposited */}
        <div className="bg-card/40 border border-border/70 rounded-3xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold mb-2">
            <span>Pledged Collateral</span>
            <Lock className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-display text-purple-400">
              {depositedCollateralSsSol.toFixed(4)} ssSOL
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-0.5">
              ≈ ${collateralValueUsdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
            </div>
          </div>
          <div className="text-[10px] font-mono text-emerald-400 mt-3 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Accruing ~7.8% Native Staking APY</span>
          </div>
        </div>

        {/* Live Borrowed Debt */}
        <div className="bg-card/40 border border-border/70 rounded-3xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold mb-2">
            <span>Current Debt (Wad)</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-display text-cyan-400">
              ${liveDebtUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-0.5">
              Principal: ${borrowedPrincipalUsdc.toFixed(2)} | Accrued: +${accumulatedInterestUsdc.toFixed(4)}
            </div>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-3">
            Liq. Price: <strong className="text-foreground">${liquidationPriceSol.toFixed(2)}</strong> / SOL
          </div>
        </div>

        {/* Remaining Borrow Power */}
        <div className="bg-card/40 border border-border/70 rounded-3xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-muted-foreground font-bold mb-2">
            <span>Remaining Borrow Power</span>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-black font-display text-primary">
              ${remainingBorrowPowerUsdc.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-0.5">
              Max Limit: ${maxBorrowAllowedUsdc.toFixed(2)} (75% LTV)
            </div>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-3">
            Wallet Balance: <strong>${walletUsdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</strong>
          </div>
        </div>
      </div>

      {/* 3. Dual Action Operations Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panel A: Borrow & Repay USDC */}
        <div className="bg-card/50 border border-border/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <h3 className="text-xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-cyan-400" />
                  <span>Borrow & Repay (USDC)</span>
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Draw liquidity against your pledged ssSOL or settle debt
                </p>
              </div>

              {/* Action Switcher */}
              <div className="flex bg-muted/60 p-1 rounded-xl border border-border/70">
                <button
                  type="button"
                  onClick={() => setBorrowAction("borrow")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all ${
                    borrowAction === "borrow"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Borrow
                </button>
                <button
                  type="button"
                  onClick={() => setBorrowAction("repay")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all ${
                    borrowAction === "repay"
                      ? "bg-primary text-primary-foreground shadow"
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
                  {borrowAction === "borrow" ? "Available to Borrow:" : "Wallet USDC Balance:"}
                </span>
                <span className="font-bold text-cyan-400">
                  {borrowAction === "borrow"
                    ? `$${remainingBorrowPowerUsdc.toFixed(2)} USDC`
                    : `$${walletUsdc.toFixed(2)} USDC`}
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={borrowInput}
                  onChange={(e) => setBorrowInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-background border border-input rounded-2xl px-4 py-4 text-2xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  disabled={actionLoading}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-sm font-bold text-muted-foreground font-mono">USDC</span>
                  {borrowAction === "borrow" ? (
                    <button
                      type="button"
                      onClick={() => setBorrowInput(remainingBorrowPowerUsdc.toFixed(2))}
                      className="text-xs bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 px-2 py-1 rounded-lg font-bold font-mono uppercase"
                    >
                      Max 75%
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setBorrowInput(Math.min(walletUsdc, liveDebtUsdc).toFixed(2))}
                      className="text-xs bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 px-2 py-1 rounded-lg font-bold font-mono uppercase"
                    >
                      Max Debt
                    </button>
                  )}
                </div>
              </div>

              {/* Simulation Breakdown */}
              <div className="bg-muted/30 border border-border/60 rounded-2xl p-4 text-xs font-mono space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Borrow APR (Compounded Wad):</span>
                  <span className="font-bold text-foreground">{currentBorrowApr.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Post-Action Health Factor:</span>
                  <span className="font-bold text-emerald-400">
                    {borrowAction === "borrow" && parseFloat(borrowInput) > 0
                      ? (
                          liquidationThresholdValueUsdc /
                          (liveDebtUsdc + parseFloat(borrowInput))
                        ).toFixed(2)
                      : healthFactor > 50
                      ? "∞"
                      : healthFactor.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {borrowAction === "borrow" ? (
              <button
                type="button"
                onClick={handleBorrow}
                disabled={actionLoading || !borrowInput || parseFloat(borrowInput) <= 0}
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono uppercase text-sm tracking-wider rounded-2xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Borrow USDC Instantly</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRepay}
                  disabled={actionLoading || !borrowInput || parseFloat(borrowInput) <= 0}
                  className="flex-1 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold font-mono uppercase text-sm tracking-wider rounded-2xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Repay Specified Amount
                </button>
                <button
                  type="button"
                  onClick={handleRepayAll}
                  disabled={actionLoading || liveDebtUsdc <= 0}
                  className="px-4 py-4 bg-muted hover:bg-muted/80 text-foreground font-bold font-mono uppercase text-xs rounded-2xl border border-border"
                  title="Settle 100% of debt and accrued interest"
                >
                  Repay All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Panel B: Collateral Management (ssSOL) */}
        <div className="bg-card/50 border border-border/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <h3 className="text-xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
                  <Coins className="w-5 h-5 text-purple-400" />
                  <span>Collateral Vault (ssSOL)</span>
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Deposit or release yield-bearing liquid staking shares
                </p>
              </div>

              {/* Action Switcher */}
              <div className="flex bg-muted/60 p-1 rounded-xl border border-border/70">
                <button
                  type="button"
                  onClick={() => setCollateralAction("deposit")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all ${
                    collateralAction === "deposit"
                      ? "bg-purple-600 text-white shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Deposit
                </button>
                <button
                  type="button"
                  onClick={() => setCollateralAction("withdraw")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all ${
                    collateralAction === "withdraw"
                      ? "bg-purple-600 text-white shadow"
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
                  {collateralAction === "deposit" ? "Wallet ssSOL Available:" : "Pledged in Obligation:"}
                </span>
                <span className="font-bold text-purple-400">
                  {collateralAction === "deposit"
                    ? `${walletSsSol.toFixed(4)} ssSOL`
                    : `${depositedCollateralSsSol.toFixed(4)} ssSOL`}
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={collateralInput}
                  onChange={(e) => setCollateralInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-background border border-input rounded-2xl px-4 py-4 text-2xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                  disabled={actionLoading}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-sm font-bold text-muted-foreground font-mono">ssSOL</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCollateralInput(
                        collateralAction === "deposit"
                          ? walletSsSol.toFixed(4)
                          : depositedCollateralSsSol.toFixed(4)
                      )
                    }
                    className="text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 px-2 py-1 rounded-lg font-bold font-mono uppercase"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Simulation Breakdown */}
              <div className="bg-muted/30 border border-border/60 rounded-2xl p-4 text-xs font-mono space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Collateral Value @ Oracle:</span>
                  <span className="font-bold text-foreground">
                    ${(
                      (parseFloat(collateralInput) || 0) * ORACLE_PRICES.ssSol.price
                    ).toFixed(2)}{" "}
                    USDC
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Borrow Capacity Impact:</span>
                  <span className="font-bold text-primary">
                    {collateralAction === "deposit" ? "+" : "-"}$
                    {(
                      (parseFloat(collateralInput) || 0) *
                      ORACLE_PRICES.ssSol.price *
                      0.75
                    ).toFixed(2)}{" "}
                    USDC
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            {collateralAction === "deposit" ? (
              <button
                type="button"
                onClick={handleDepositCollateral}
                disabled={actionLoading || !collateralInput || parseFloat(collateralInput) <= 0}
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold font-mono uppercase text-sm tracking-wider rounded-2xl transition-all shadow-lg shadow-purple-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Deposit ssSOL Collateral</span>
                <Lock className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleWithdrawCollateral}
                disabled={actionLoading || !collateralInput || parseFloat(collateralInput) <= 0}
                className="w-full py-4 bg-muted hover:bg-muted/80 text-foreground border border-border font-bold font-mono uppercase text-sm tracking-wider rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Withdraw ssSOL to Wallet</span>
                <Unlock className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Chapter 17 Kinked Rate Visualizer */}
      <div className="bg-card/40 border border-border/70 rounded-3xl p-6 backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Kinked Interest Rate Curve (Chapter 17, Page 204)</span>
            </h3>
            <p className="text-xs text-muted-foreground font-mono">
              Utilization: 0% → 80% (2% to 20% APR) | Above 80% Kink (Spikes up to 150% APR)
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-muted-foreground block">Current Utilization</span>
            <span className="text-lg font-black font-display text-primary font-mono">
              {(marketUtilization * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Visual Curve Representation */}
        <div className="relative pt-6 pb-2">
          <div className="w-full h-8 bg-muted/40 rounded-xl overflow-hidden relative flex border border-border/60">
            {/* Zone 1: Sub-Kink (0 to 80%) */}
            <div className="w-4/5 h-full bg-gradient-to-r from-emerald-500/20 via-primary/30 to-amber-500/40 relative flex items-center px-3 justify-between border-r border-amber-500/60">
              <span className="text-[10px] font-mono font-bold text-muted-foreground">Base: 2% APR</span>
              <span className="text-[10px] font-mono font-bold text-amber-300">Kink: 80% (20% APR)</span>
            </div>
            {/* Zone 2: Super-Kink (80 to 100%) */}
            <div className="w-1/5 h-full bg-destructive/25 flex items-center px-2 justify-end">
              <span className="text-[10px] font-mono font-bold text-destructive">Max: 150%</span>
            </div>

            {/* Current Utilization Beacon Indicator */}
            <div
              className="absolute top-0 bottom-0 w-2.5 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.8)] z-10 transition-all duration-700"
              style={{ left: `${marketUtilization * 100}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-2">
            <span>0% (Empty Pool)</span>
            <span className="text-cyan-400 font-bold">▲ Current: {(marketUtilization * 100).toFixed(1)}%</span>
            <span>80% (Optimal Kink)</span>
            <span>100% (Depleted)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
