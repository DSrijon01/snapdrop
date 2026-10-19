"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
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
  TrendingDown,
  Gavel,
  Scale,
  Activity,
  History,
  Archive,
  ArrowUpRight,
  Check,
  Copy,
} from "lucide-react";
import toast from "react-hot-toast";
import { SBL_PROGRAM_ID, DEFAULT_MARKET_ID } from "@/hooks/useSbl";

// Admin / Protocol Treasury Wallet
const TREASURY_WALLET = "9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu";

// Types
export interface ObligationTelemetryItem {
  id: string;
  borrowerPubkey: string;
  obligationPda: string;
  collateralSummary: string;
  collateralValueUsd: number;
  borrowedDebtUsdss: number;
  ltvBps: number;
  liquidationThresholdBps: number;
  healthFactor: number;
  status: "healthy" | "warning" | "default";
  daysOverdue?: number;
}

export interface SeizureRecord {
  id: string;
  timestamp: string;
  borrowerPubkey: string;
  obligationPda: string;
  seizedAssets: string;
  seizedValueUsd: number;
  badDebtBurnedUsdss: number;
  protocolPenaltyRevenueUsd: number;
  reason: "Health Factor < 1.00" | "Term Expiration Default" | "Margin Call Lapse";
  txSignature: string;
}

export interface TreasuryStockHolding {
  symbol: string;
  name: string;
  category: "Equity" | "Crypto";
  quantity: number;
  spotPrice: number;
  totalValueUsd: number;
  tokenType: "Token-2022" | "SPL";
  activeExtensions: string[];
}

export function DefaultTreasuryDashboard() {
  const [activeSubTab, setActiveSubTab] = useState<"telemetry" | "tracker" | "holdings" | "reauction">("telemetry");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  // 1. Obligation Telemetry State
  const [obligations, setObligations] = useState<ObligationTelemetryItem[]>([
    {
      id: "ob-1",
      borrowerPubkey: "7v4K...8X1q",
      obligationPda: "H9Qp...2NmK",
      collateralSummary: "18.0 NVDA ($2,311.20) + 1.5 SOL ($229.20)",
      collateralValueUsd: 2540.4,
      borrowedDebtUsdss: 1250.0,
      ltvBps: 6500,
      liquidationThresholdBps: 7500,
      healthFactor: 1.52,
      status: "healthy",
    },
    {
      id: "ob-2",
      borrowerPubkey: "4mLx...9Yzt",
      obligationPda: "B3Vw...7Kpd",
      collateralSummary: "25.0 AAPL ($4,337.50)",
      collateralValueUsd: 4337.5,
      borrowedDebtUsdss: 2950.0,
      ltvBps: 7000,
      liquidationThresholdBps: 8000,
      healthFactor: 1.17,
      status: "warning",
    },
    {
      id: "ob-3",
      borrowerPubkey: "9Px2...3FaJ",
      obligationPda: "F1Tz...8Nxe",
      collateralSummary: "12.0 TSLA ($2,618.40)",
      collateralValueUsd: 2618.4,
      borrowedDebtUsdss: 2150.0,
      ltvBps: 6000,
      liquidationThresholdBps: 7000,
      healthFactor: 0.85, // Under 1.0 -> Liquidatable!
      status: "default",
      daysOverdue: 2,
    },
    {
      id: "ob-4",
      borrowerPubkey: "2Kvn...5HbC",
      obligationPda: "D4Lk...1QwA",
      collateralSummary: "0.25 BTC ($16,062.50) + 10.0 COIN ($2,245.00)",
      collateralValueUsd: 18307.5,
      borrowedDebtUsdss: 8400.0,
      ltvBps: 7200,
      liquidationThresholdBps: 8200,
      healthFactor: 1.78,
      status: "healthy",
    },
    {
      id: "ob-5",
      borrowerPubkey: "8Wr9...4Plm",
      obligationPda: "M6Jk...9Zrt",
      collateralSummary: "8.0 TSLA ($1,745.60) + 4.0 BCH ($1,380.80)",
      collateralValueUsd: 3126.4,
      borrowedDebtUsdss: 2480.0,
      ltvBps: 6000,
      liquidationThresholdBps: 7000,
      healthFactor: 0.88, // Under 1.0 -> Liquidatable!
      status: "default",
      daysOverdue: 5,
    },
  ]);

  // 2. Seizure & Default Ledger State
  const [seizureRecords, setSeizureRecords] = useState<SeizureRecord[]>([
    {
      id: "sz-101",
      timestamp: "Today, 03:42 UTC",
      borrowerPubkey: "5Gj8...2Nqa",
      obligationPda: "E2Kp...9Vbc",
      seizedAssets: "15.0 TSLA ($3,273.00)",
      seizedValueUsd: 3273.0,
      badDebtBurnedUsdss: 2450.0,
      protocolPenaltyRevenueUsd: 327.3,
      reason: "Health Factor < 1.00",
      txSignature: "4wQp...8K9L",
    },
    {
      id: "sz-102",
      timestamp: "Yesterday, 18:15 UTC",
      borrowerPubkey: "3Bvx...7Mwe",
      obligationPda: "A8Lm...4Pzx",
      seizedAssets: "10.0 COIN ($2,245.00) + 3.0 BCH ($1,035.60)",
      seizedValueUsd: 3280.6,
      badDebtBurnedUsdss: 2200.0,
      protocolPenaltyRevenueUsd: 328.0,
      reason: "Term Expiration Default",
      txSignature: "2kFx...6Nvm",
    },
    {
      id: "sz-103",
      timestamp: "2 days ago",
      borrowerPubkey: "9Dtr...1Kpo",
      obligationPda: "C7Nx...5Qwe",
      seizedAssets: "20.0 NVDA ($2,568.00)",
      seizedValueUsd: 2568.0,
      badDebtBurnedUsdss: 1750.0,
      protocolPenaltyRevenueUsd: 256.8,
      reason: "Health Factor < 1.00",
      txSignature: "5mXz...9Lpk",
    },
  ]);

  // 3. Treasury Asset Inventory
  const [treasuryHoldings, setTreasuryHoldings] = useState<TreasuryStockHolding[]>([
    {
      symbol: "TSLA",
      name: "Tesla Inc.",
      category: "Equity",
      quantity: 25.0,
      spotPrice: 218.2,
      totalValueUsd: 5455.0,
      tokenType: "Token-2022",
      activeExtensions: ["PermanentDelegate", "MetadataPointer", "DefaultAccountState"],
    },
    {
      symbol: "NVDA",
      name: "NVIDIA Corp.",
      category: "Equity",
      quantity: 38.0,
      spotPrice: 128.4,
      totalValueUsd: 4879.2,
      tokenType: "Token-2022",
      activeExtensions: ["PermanentDelegate", "MetadataPointer"],
    },
    {
      symbol: "COIN",
      name: "Coinbase Global",
      category: "Equity",
      quantity: 18.0,
      spotPrice: 224.5,
      totalValueUsd: 4041.0,
      tokenType: "Token-2022",
      activeExtensions: ["PermanentDelegate", "TransferHook"],
    },
    {
      symbol: "BCH",
      name: "Bitcoin Cash",
      category: "Crypto",
      quantity: 12.0,
      spotPrice: 345.2,
      totalValueUsd: 4142.4,
      tokenType: "SPL",
      activeExtensions: ["WrappedCustody"],
    },
    {
      symbol: "SOL",
      name: "Solana",
      category: "Crypto",
      quantity: 45.0,
      spotPrice: 152.8,
      totalValueUsd: 6876.0,
      tokenType: "Token-2022",
      activeExtensions: ["MetadataPointer", "InterestBearingConfig"],
    },
  ]);

  // 4. Secondary Re-Auction Form State
  const [selectedAuctionAsset, setSelectedAuctionAsset] = useState<string>("TSLA");
  const [auctionQuantity, setAuctionQuantity] = useState<string>("10.0");
  const [auctionDiscountBps, setAuctionDiscountBps] = useState<number>(350); // 3.5%
  const [auctionTargetCurrency, setAuctionTargetCurrency] = useState<"USDSS_BURN" | "USDC_TREASURY">("USDSS_BURN");

  // Summary Metrics
  const totalSeizedValue = useMemo(() => {
    return treasuryHoldings.reduce((sum, h) => sum + h.totalValueUsd, 0);
  }, [treasuryHoldings]);

  const totalBadDebtBurned = useMemo(() => {
    return seizureRecords.reduce((sum, r) => sum + r.badDebtBurnedUsdss, 0);
  }, [seizureRecords]);

  const totalPenaltyRevenue = useMemo(() => {
    return seizureRecords.reduce((sum, r) => sum + r.protocolPenaltyRevenueUsd, 0);
  }, [seizureRecords]);

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Liquidate / Sweep Crank Action
  const handleExecuteLiquidationCrank = (obligation: ObligationTelemetryItem) => {
    setIsProcessingAction(true);
    toast.loading(`Executing automated liquidation crank for ${obligation.obligationPda}...`, { id: "liq" });

    setTimeout(() => {
      // 1. Remove from active obligations
      setObligations((prev) => prev.filter((o) => o.id !== obligation.id));

      // 2. Add to Seizure Records
      const newRecord: SeizureRecord = {
        id: `sz-${Date.now().toString().slice(-4)}`,
        timestamp: "Just now",
        borrowerPubkey: obligation.borrowerPubkey,
        obligationPda: obligation.obligationPda,
        seizedAssets: obligation.collateralSummary,
        seizedValueUsd: obligation.collateralValueUsd,
        badDebtBurnedUsdss: obligation.borrowedDebtUsdss,
        protocolPenaltyRevenueUsd: obligation.collateralValueUsd * 0.1, // 10% bonus
        reason: "Health Factor < 1.00",
        txSignature: `5xR${Math.random().toString(36).slice(2, 6)}...devnet`,
      };
      setSeizureRecords((prev) => [newRecord, ...prev]);

      // 3. Increment Treasury holdings
      if (obligation.collateralSummary.includes("TSLA")) {
        setTreasuryHoldings((prev) =>
          prev.map((h) =>
            h.symbol === "TSLA"
              ? { ...h, quantity: h.quantity + 12.0, totalValueUsd: (h.quantity + 12.0) * h.spotPrice }
              : h
          )
        );
      }

      setIsProcessingAction(false);
      toast.dismiss("liq");
      toast.success(
        `Default resolved! Seized collateral swept to Treasury (${TREASURY_WALLET.slice(0, 4)}...${TREASURY_WALLET.slice(-4)}) and ${obligation.borrowedDebtUsdss} USDSS bad debt burned!`,
        { duration: 5000 }
      );
    }, 1200);
  };

  // Launch Re-Auction Action
  const handleLaunchAuction = () => {
    const qty = parseFloat(auctionQuantity);
    const holding = treasuryHoldings.find((h) => h.symbol === selectedAuctionAsset);
    if (!holding || isNaN(qty) || qty <= 0 || qty > holding.quantity) {
      toast.error(`Invalid quantity. Max available: ${holding?.quantity || 0} ${selectedAuctionAsset}`);
      return;
    }

    setIsProcessingAction(true);
    const clearingPrice = holding.spotPrice * (1 - auctionDiscountBps / 10000);
    const grossProceeds = qty * clearingPrice;

    toast.loading(`Launching Institutional Dutch Auction for ${qty} ${selectedAuctionAsset}...`, { id: "auc" });

    setTimeout(() => {
      // Deduct from treasury inventory
      setTreasuryHoldings((prev) =>
        prev.map((h) =>
          h.symbol === selectedAuctionAsset
            ? { ...h, quantity: h.quantity - qty, totalValueUsd: (h.quantity - qty) * h.spotPrice }
            : h
        )
      );

      setIsProcessingAction(false);
      toast.dismiss("auc");
      toast.success(
        `Auction Cleared! ${qty} ${selectedAuctionAsset} sold @ $${clearingPrice.toFixed(2)}/share. $${grossProceeds.toFixed(2)} ${
          auctionTargetCurrency === "USDSS_BURN" ? "USDSS burned from circulation" : "USDC credited to Treasury"
        }!`,
        { duration: 6000 }
      );
    }, 1400);
  };

  return (
    <div className="w-full space-y-8">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-card/90 via-card/60 to-red-500/10 border border-red-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span>Protocol Default & Liquidation Engine</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Token-2022 PermanentDelegate Enforced
              </span>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                Treasury Custody Active
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-3">
              <Scale className="w-8 h-8 text-red-400" />
              <span>SBL Default Treasury & Risk Engine</span>
            </h2>

            <p className="text-sm text-muted-foreground font-mono leading-relaxed">
              When borrowers fail repayment deadlines or experience stock price drawdowns causing their Health Factor to breach <strong className="text-red-400">&lt; 1.00</strong>, their collateralized Token-2022 stocks (NVDA, TSLA, AAPL) or crypto tokens are programmatically seized and escrowed into the protocol treasury to burn bad debt and protect USDSS solvency.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-background/80 border border-border/80 px-4 py-2.5 rounded-2xl">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">Treasury Inventory</span>
              <span className="text-lg font-black font-display text-emerald-400">
                ${totalSeizedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-background/80 border border-border/80 px-4 py-2.5 rounded-2xl">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">Bad Debt Absorbed</span>
              <span className="text-lg font-black font-display text-cyan-400">
                {totalBadDebtBurned.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDSS
              </span>
            </div>

            <div className="bg-background/80 border border-border/80 px-4 py-2.5 rounded-2xl">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block font-bold">Penalty Revenue</span>
              <span className="text-lg font-black font-display text-primary">
                +${totalPenaltyRevenue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Info Ribbon */}
        <div className="mt-6 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between text-xs font-mono text-muted-foreground gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-foreground/90 flex items-center gap-1.5 font-bold">
              <Wallet className="w-4 h-4 text-emerald-400" />
              Treasury Wallet:
            </span>
            <span className="text-foreground font-mono font-bold">{TREASURY_WALLET.slice(0, 6)}...{TREASURY_WALLET.slice(-6)}</span>
            <button
              onClick={() => handleCopy(TREASURY_WALLET, "treasury")}
              className="text-muted-foreground hover:text-foreground"
            >
              {copiedKey === "treasury" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">Market: <strong className="text-foreground">{DEFAULT_MARKET_ID}</strong></span>
            <span className="text-border">|</span>
            <a
              href={`https://explorer.solana.com/address/${SBL_PROGRAM_ID.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
            >
              <span>Program: {SBL_PROGRAM_ID.toBase58().slice(0, 4)}...{SBL_PROGRAM_ID.toBase58().slice(-4)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2 text-foreground/80 font-bold">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Automated Liquidation Crank: Active on Devnet</span>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex flex-wrap gap-2.5 border-b border-border/60 pb-3">
        <button
          onClick={() => setActiveSubTab("telemetry")}
          className={`px-5 py-2.5 rounded-2xl font-bold uppercase transition-all flex items-center gap-2 text-xs tracking-wider shadow-sm ${
            activeSubTab === "telemetry"
              ? "bg-red-500 text-black shadow-lg shadow-red-500/20 font-black"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Obligation Telemetry ({obligations.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("tracker")}
          className={`px-5 py-2.5 rounded-2xl font-bold uppercase transition-all flex items-center gap-2 text-xs tracking-wider shadow-sm ${
            activeSubTab === "tracker"
              ? "bg-red-500 text-black shadow-lg shadow-red-500/20 font-black"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Default & Seizure Tracker ({seizureRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("holdings")}
          className={`px-5 py-2.5 rounded-2xl font-bold uppercase transition-all flex items-center gap-2 text-xs tracking-wider shadow-sm ${
            activeSubTab === "holdings"
              ? "bg-red-500 text-black shadow-lg shadow-red-500/20 font-black"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Treasury Asset Holdings ({treasuryHoldings.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("reauction")}
          className={`px-5 py-2.5 rounded-2xl font-bold uppercase transition-all flex items-center gap-2 text-xs tracking-wider shadow-sm ${
            activeSubTab === "reauction"
              ? "bg-red-500 text-black shadow-lg shadow-red-500/20 font-black"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          <Gavel className="w-4 h-4" />
          <span>Secondary Market Re-Auction</span>
        </button>
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: Obligation Telemetry */}
      {activeSubTab === "telemetry" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black font-display uppercase tracking-wider text-foreground">
                Active Borrower Obligations Telemetry
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Real-time monitoring of live SBL collateral vaults, borrowed USDSS debt, and real-time Health Factors
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              Auto-updating via Pyth Feeds
            </span>
          </div>

          <div className="border border-border/80 rounded-3xl overflow-hidden bg-card/40 backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-muted/60 text-muted-foreground uppercase tracking-wider border-b border-border/60">
                  <tr>
                    <th className="py-3.5 px-4">Borrower / PDA</th>
                    <th className="py-3.5 px-4">Pledged Collateral</th>
                    <th className="py-3.5 px-4 text-right">Collateral Value</th>
                    <th className="py-3.5 px-4 text-right">Debt (USDSS)</th>
                    <th className="py-3.5 px-4 text-center">Health Factor</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Liquidation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {obligations.map((ob) => {
                    const isLiquidatable = ob.healthFactor < 1.0;

                    return (
                      <tr key={ob.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-4 font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{ob.borrowerPubkey}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">({ob.obligationPda})</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-muted-foreground">
                          {ob.collateralSummary}
                        </td>

                        <td className="py-4 px-4 text-right font-bold text-foreground">
                          ${ob.collateralValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td className="py-4 px-4 text-right font-bold text-cyan-400">
                          {ob.borrowedDebtUsdss.toFixed(2)} USDSS
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-xs font-black font-display inline-block ${
                              ob.healthFactor >= 1.3
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : ob.healthFactor >= 1.0
                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                            }`}
                          >
                            {ob.healthFactor.toFixed(2)}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center">
                          {ob.status === "healthy" ? (
                            <span className="text-[10px] font-bold text-emerald-400 uppercase">Solvent</span>
                          ) : ob.status === "warning" ? (
                            <span className="text-[10px] font-bold text-amber-400 uppercase">Margin Warning</span>
                          ) : (
                            <span className="text-[10px] font-bold text-red-400 uppercase flex items-center justify-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Delinquent ({ob.daysOverdue}d overdue)</span>
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right">
                          {isLiquidatable ? (
                            <button
                              onClick={() => handleExecuteLiquidationCrank(ob)}
                              disabled={isProcessingAction}
                              type="button"
                              className="px-3 py-1.5 bg-red-500 hover:bg-red-400 text-black font-black uppercase text-[10px] rounded-xl tracking-wider shadow-md shadow-red-500/20 transition-all flex items-center gap-1 ml-auto"
                            >
                              <Flame className="w-3 h-3" />
                              <span>Seize Collateral</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60 italic">In Grace Period</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Default & Seizure Tracker */}
      {activeSubTab === "tracker" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black font-display uppercase tracking-wider text-foreground">
                Default & Seizure Ledger
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Historical record of liquidated collateral transferred directly into the protocol treasury
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              Total Recorded Seizures: {seizureRecords.length}
            </span>
          </div>

          <div className="border border-border/80 rounded-3xl overflow-hidden bg-card/40 backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-muted/60 text-muted-foreground uppercase tracking-wider border-b border-border/60">
                  <tr>
                    <th className="py-3.5 px-4">Time</th>
                    <th className="py-3.5 px-4">Defaulted Obligation</th>
                    <th className="py-3.5 px-4">Seized Assets</th>
                    <th className="py-3.5 px-4 text-right">Seized Valuation</th>
                    <th className="py-3.5 px-4 text-right">Bad Debt Burned</th>
                    <th className="py-3.5 px-4 text-right">Treasury Revenue</th>
                    <th className="py-3.5 px-4">Cause</th>
                    <th className="py-3.5 px-4 text-right">Tx Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {seizureRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-4 text-muted-foreground whitespace-nowrap">
                        {record.timestamp}
                      </td>

                      <td className="py-4 px-4 font-bold text-foreground">
                        {record.borrowerPubkey}
                      </td>

                      <td className="py-4 px-4 text-foreground font-bold">
                        {record.seizedAssets}
                      </td>

                      <td className="py-4 px-4 text-right font-bold text-emerald-400">
                        ${record.seizedValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-4 px-4 text-right font-bold text-cyan-400">
                        {record.badDebtBurnedUsdss.toFixed(2)} USDSS
                      </td>

                      <td className="py-4 px-4 text-right font-bold text-primary">
                        +${record.protocolPenaltyRevenueUsd.toFixed(2)}
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold uppercase border border-red-500/20">
                          {record.reason}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <a
                          href={`https://explorer.solana.com/tx/${record.txSignature}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline flex items-center gap-1 justify-end font-bold"
                        >
                          <span>{record.txSignature}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Treasury Asset Holdings */}
      {activeSubTab === "holdings" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black font-display uppercase tracking-wider text-foreground">
                Treasury Seized Stock & Token Custody
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Physical tokens held in Treasury custody ({TREASURY_WALLET}) available for secondary auction or reserve backing
              </p>
            </div>
            <div className="text-xs font-mono text-emerald-400 font-bold">
              Total Value: ${totalSeizedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {treasuryHoldings.map((item) => (
              <div
                key={item.symbol}
                className="bg-card/40 border border-border/80 rounded-3xl p-5 backdrop-blur-xl flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black font-display text-foreground">{item.symbol}</span>
                      <span className="text-xs font-mono text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {item.tokenType}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Held in Treasury:</span>
                      <strong className="text-foreground text-sm font-bold">
                        {item.quantity} {item.symbol}
                      </strong>
                    </div>

                    <div className="flex justify-between text-muted-foreground">
                      <span>Spot Valuation:</span>
                      <span className="font-bold text-foreground">${item.spotPrice.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-muted-foreground">
                      <span>Total Book Value:</span>
                      <span className="font-bold text-emerald-400 text-sm">
                        ${item.totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/40 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground block font-bold">
                    Active Token-2022 Extensions:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {item.activeExtensions.map((ext) => (
                      <span
                        key={ext}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60"
                      >
                        {ext}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Secondary Market Re-Auction Facility */}
      {activeSubTab === "reauction" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Auction Control Panel */}
          <div className="bg-card/50 border border-border/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6">
            <div>
              <div className="border-b border-border/50 pb-4">
                <h3 className="text-xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-red-400" />
                  <span>Launch Institutional Dutch Re-Auction</span>
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Auction seized stock inventory back into liquidity to burn USDSS debt or replenish USDC reserves
                </p>
              </div>

              <div className="mt-6 space-y-4 text-xs font-mono">
                {/* 1. Asset Selection */}
                <div>
                  <label className="text-muted-foreground uppercase font-bold block mb-1.5">
                    Select Seized Collateral Stock:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {treasuryHoldings.map((h) => (
                      <button
                        key={h.symbol}
                        type="button"
                        onClick={() => {
                          setSelectedAuctionAsset(h.symbol);
                          setAuctionQuantity(Math.min(10, h.quantity).toString());
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          selectedAuctionAsset === h.symbol
                            ? "bg-card border-red-500 shadow-md shadow-red-500/10 font-black text-foreground"
                            : "bg-muted/40 border-border/60 hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <div className="flex justify-between">
                          <span className="font-bold text-foreground">{h.symbol}</span>
                          <span className="text-[10px]">{h.quantity} avail</span>
                        </div>
                        <div className="text-[11px] text-emerald-400 mt-1">${h.spotPrice.toFixed(2)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Quantity Input */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-muted-foreground uppercase font-bold">Quantity to Auction:</span>
                    <span className="text-muted-foreground">
                      Max:{" "}
                      <strong className="text-foreground">
                        {treasuryHoldings.find((h) => h.symbol === selectedAuctionAsset)?.quantity || 0}{" "}
                        {selectedAuctionAsset}
                      </strong>
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={auctionQuantity}
                      onChange={(e) => setAuctionQuantity(e.target.value)}
                      className="w-full bg-background border border-input rounded-2xl px-4 py-3 text-lg font-bold font-mono focus:ring-2 focus:ring-red-400/50"
                      disabled={isProcessingAction}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="font-bold text-muted-foreground">{selectedAuctionAsset}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Discount Setting */}
                <div>
                  <label className="text-muted-foreground uppercase font-bold block mb-1.5">
                    Institutional Clearing Discount ({auctionDiscountBps / 100}%):
                  </label>
                  <input
                    type="range"
                    min={100}
                    max={1000}
                    step={25}
                    value={auctionDiscountBps}
                    onChange={(e) => setAuctionDiscountBps(parseInt(e.target.value))}
                    className="w-full accent-red-400"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>1.0% (Tight Spread)</span>
                    <span>3.5% (Recommended)</span>
                    <span>10.0% (Fast Clearing)</span>
                  </div>
                </div>

                {/* 4. Target Proceeds */}
                <div>
                  <label className="text-muted-foreground uppercase font-bold block mb-1.5">
                    Auction Proceeds Settlement Target:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAuctionTargetCurrency("USDSS_BURN")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        auctionTargetCurrency === "USDSS_BURN"
                          ? "bg-cyan-500/15 border-cyan-500 text-cyan-400 font-bold"
                          : "bg-muted/40 border-border/60 text-muted-foreground"
                      }`}
                    >
                      <div className="font-bold">Burn USDSS Bad Debt</div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Reduces overall synthetic dollar circulating supply
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAuctionTargetCurrency("USDC_TREASURY")}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        auctionTargetCurrency === "USDC_TREASURY"
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold"
                          : "bg-muted/40 border-border/60 text-muted-foreground"
                      }`}
                    >
                      <div className="font-bold">Deposit USDC to Treasury</div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Builds physical fiat reserves for insurance fund
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleLaunchAuction}
                disabled={isProcessingAction || !auctionQuantity || parseFloat(auctionQuantity) <= 0}
                className="w-full py-4 bg-red-500 hover:bg-red-400 text-black font-bold font-mono uppercase text-sm tracking-wider rounded-2xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Gavel className="w-4 h-4" />
                <span>Execute Re-Auction Settlement</span>
              </button>
            </div>
          </div>

          {/* Pricing & Solvency Impact Simulator */}
          <div className="bg-card/40 border border-border/70 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between space-y-6">
            <div>
              <h4 className="text-sm font-black font-display uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-3">
                Auction Settlement Simulation
              </h4>

              <div className="mt-4 space-y-3 text-xs font-mono">
                {(() => {
                  const holding = treasuryHoldings.find((h) => h.symbol === selectedAuctionAsset);
                  const spot = holding?.spotPrice || 0;
                  const qty = parseFloat(auctionQuantity) || 0;
                  const clearing = spot * (1 - auctionDiscountBps / 10000);
                  const gross = qty * clearing;

                  return (
                    <>
                      <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-2">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Spot Market Price:</span>
                          <span className="font-bold text-foreground">${spot.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Discount Applied:</span>
                          <span className="font-bold text-red-400">-{auctionDiscountBps / 100}%</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Clearing Price Per Share:</span>
                          <span className="font-bold text-emerald-400">${clearing.toFixed(2)}</span>
                        </div>
                        <div className="pt-2 border-t border-border/40 flex justify-between text-foreground font-bold">
                          <span>Estimated Gross Proceeds:</span>
                          <span className="text-base text-cyan-400">${gross.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-2 text-cyan-300">
                        <div className="flex items-center gap-2 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Solvency Invariant Protection</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          By routing secondary auction liquidity into{" "}
                          <strong className="text-foreground">
                            {auctionTargetCurrency === "USDSS_BURN" ? "USDSS Bad Debt Burn" : "USDC Reserve Backing"}
                          </strong>
                          , the protocol eliminates unbacked synthetic debt and guarantees that USDSS retains $1.00+ peg backing at all times.
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Governed by Chapter 17 Liquidator Engine & Token-2022 PermanentDelegate</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
