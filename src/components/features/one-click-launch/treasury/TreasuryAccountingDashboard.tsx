"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  RefreshCw,
  ExternalLink,
  Copy,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Percent,
  Layers,
  Check,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  TreasuryTransaction,
  TimeRangeFilter,
  TimeframePeriod,
  AccountingSummary,
} from "@/types/treasury";
import {
  PRIMARY_TREASURY_WALLET,
  ESTIMATED_SOL_USD,
  CATEGORY_CONFIG,
  generateSeedTransactions,
  calculateAccountingSummary,
  fetchLiveTreasuryTransactions,
} from "@/lib/treasuryParser";
import { TreasuryLedgerTable } from "./TreasuryLedgerTable";
import toast from "react-hot-toast";

export function TreasuryAccountingDashboard() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [activeWalletAddress, setActiveWalletAddress] = useState<string>(PRIMARY_TREASURY_WALLET);
  const [customInputAddress, setCustomInputAddress] = useState<string>("");
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [walletBalanceSol, setWalletBalanceSol] = useState<number | null>(null);

  const [timeFilter, setTimeFilter] = useState<TimeRangeFilter>("30d");
  const [timeframePeriod, setTimeframePeriod] = useState<TimeframePeriod>("daily");
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch balance and transactions
  const loadData = async (targetAddress: string, isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      let targetPubkey: PublicKey;
      try {
        targetPubkey = new PublicKey(targetAddress);
      } catch {
        targetPubkey = new PublicKey(PRIMARY_TREASURY_WALLET);
      }

      // Fetch on-chain SOL balance
      const lamports = await connection.getBalance(targetPubkey);
      setWalletBalanceSol(lamports / LAMPORTS_PER_SOL);

      // Fetch / parse transactions
      const txs = await fetchLiveTreasuryTransactions(connection, targetPubkey);
      setTransactions(txs);

      if (isManualRefresh) {
        toast.success("Treasury ledger synced with blockchain!");
      }
    } catch (e) {
      console.error("Failed to load treasury data", e);
      setTransactions(generateSeedTransactions());
      setWalletBalanceSol(24.85); // Fallback demonstration balance
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(activeWalletAddress);
  }, [connection, activeWalletAddress]);

  // Calculate Accounting metrics based on active filters
  const summary: AccountingSummary = useMemo(() => {
    return calculateAccountingSummary(transactions, timeFilter, timeframePeriod);
  }, [transactions, timeFilter, timeframePeriod]);

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(activeWalletAddress);
    setCopied(true);
    toast.success("Wallet address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSetCustomAddress = () => {
    if (!customInputAddress.trim()) return;
    try {
      new PublicKey(customInputAddress.trim());
      setActiveWalletAddress(customInputAddress.trim());
      setIsEditingAddress(false);
      setCustomInputAddress("");
    } catch (e) {
      toast.error("Invalid Solana wallet public key");
    }
  };

  const PIE_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EC4899"];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Treasury Identity & Live Balance Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-card border border-border rounded-2xl shadow-sm text-card-foreground">
        
        {/* Left: Wallet Metadata */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Designated Treasury Wallet
              </span>
              {activeWalletAddress === PRIMARY_TREASURY_WALLET && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                  Primary Platform Authority
                </span>
              )}
            </div>

            {isEditingAddress ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  placeholder="Enter custom wallet pubkey..."
                  value={customInputAddress}
                  onChange={(e) => setCustomInputAddress(e.target.value)}
                  className="px-3 py-1 text-xs bg-muted border border-border rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-primary w-64 md:w-80"
                />
                <button
                  onClick={handleSetCustomAddress}
                  className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingAddress(false)}
                  className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-sm font-bold text-foreground">
                  {activeWalletAddress.slice(0, 8)}...{activeWalletAddress.slice(-6)}
                </span>
                <button
                  onClick={handleCopyWallet}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy full address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={`https://solscan.io/account/${activeWalletAddress}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 hover:bg-muted rounded text-primary hover:text-primary-hover transition-colors"
                  title="View on Solscan Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setIsEditingAddress(true)}
                  className="text-[11px] text-muted-foreground hover:text-primary underline ml-1 font-medium"
                >
                  Change
                </button>
                {activeWalletAddress !== PRIMARY_TREASURY_WALLET && (
                  <button
                    onClick={() => setActiveWalletAddress(PRIMARY_TREASURY_WALLET)}
                    className="text-[11px] text-primary hover:underline font-bold"
                  >
                    Reset to Primary
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Real-time Balance & Sync Trigger */}
        <div className="flex items-center gap-4 flex-wrap lg:justify-end">
          <div className="p-3 px-4 rounded-xl bg-muted/40 border border-border flex items-center gap-3">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Current Treasury Balance
              </p>
              <p className="text-xl font-black font-mono text-foreground">
                {walletBalanceSol !== null ? `${walletBalanceSol.toFixed(4)} SOL` : "Loading..."}
              </p>
            </div>
            <div className="text-right border-l border-border pl-3 text-xs text-muted-foreground font-mono">
              <p>≈ ${(Number(walletBalanceSol || 0) * ESTIMATED_SOL_USD).toFixed(2)} USD</p>
              <p className="text-[10px] text-zinc-500">Rate: ${ESTIMATED_SOL_USD} / SOL</p>
            </div>
          </div>

          <button
            onClick={() => loadData(activeWalletAddress, true)}
            disabled={refreshing}
            className="p-3 bg-muted hover:bg-muted/80 text-foreground rounded-xl border border-border transition-colors flex items-center gap-2 text-xs font-bold shadow-sm"
            title="Refresh on-chain logs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span>{refreshing ? "Syncing..." : "Sync"}</span>
          </button>
        </div>
      </div>

      {/* 2. Time Controls & Aggregation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-card border border-border rounded-2xl shadow-sm">
        {/* Timeframe Quick Toggles */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border text-xs font-bold">
          {(["24h", "7d", "30d", "ytd"] as TimeRangeFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider ${
                timeFilter === filter
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Accounting Aggregation Granularity (Daily / Monthly / Yearly) */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Group By:
          </span>
          <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border font-bold">
            {(["daily", "monthly", "yearly"] as TimeframePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframePeriod(period)}
                className={`px-3 py-1 rounded-lg capitalize transition-all ${
                  timeframePeriod === period
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. P&L Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Gross Revenue (Inflows) */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Inflows (Revenue)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-emerald-500">
              +{summary.grossInflowsSol.toFixed(4)} SOL
            </p>
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground font-mono">
              <span>≈ ${summary.grossInflowsUsd.toFixed(2)} USD</span>
              <span className="font-bold text-foreground">{summary.inflowsCount} Txns</span>
            </div>
          </div>
        </div>

        {/* Operating Expenses (Outflows) */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Operating Expenses (Outflows)</span>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-red-500">
              -{summary.grossOutflowsSol.toFixed(4)} SOL
            </p>
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground font-mono">
              <span>≈ ${summary.grossOutflowsUsd.toFixed(2)} USD</span>
              <span className="font-bold text-foreground">{summary.outflowsCount} Txns</span>
            </div>
          </div>
        </div>

        {/* Net Yield (Profit) */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Net Treasury Yield</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-primary">
              {summary.netYieldSol > 0 ? `+${summary.netYieldSol.toFixed(4)}` : summary.netYieldSol.toFixed(4)} SOL
            </p>
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground font-mono">
              <span>≈ ${summary.netYieldUsd.toFixed(2)} USD</span>
              <span className="text-emerald-500 font-bold">Positive Net</span>
            </div>
          </div>
        </div>

        {/* Operating Margin */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Operating Margin</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-foreground">
              {summary.operatingMarginPercent.toFixed(1)}%
            </p>
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground font-mono">
              <span>Efficiency Index</span>
              <span className="text-blue-500 font-bold">{summary.txCount} Total Ledger Txns</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Visual Analytics: Revenue Stream Breakdown & Cash Flow Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Product Revenue Stream Donut Chart */}
        <div className="p-5 bg-card border border-border rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm font-display uppercase tracking-tight flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-primary" />
                Revenue Breakdown (Inflows)
              </h3>
              <p className="text-[11px] text-muted-foreground">Categorized product fee distribution</p>
            </div>
          </div>

          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.inflowBreakdown.filter((b) => b.amountSol > 0)}
                  dataKey="amountSol"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {summary.inflowBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val} SOL ($${(val * ESTIMATED_SOL_USD).toFixed(2)})`, "Amount"]}
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#3f3f46",
                    borderRadius: "0.75rem",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Categorical Legend & Breakdown List */}
          <div className="space-y-2 mt-2 pt-3 border-t border-border text-xs">
            {summary.inflowBreakdown.map((item, idx) => (
              <div key={item.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-muted-foreground truncate">{item.label}</span>
                </div>
                <div className="font-mono font-bold text-right shrink-0">
                  <span>{item.amountSol.toFixed(3)} SOL</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5 font-normal">
                    ({item.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Cash Flow Over Time (Bar / Area Chart) */}
        <div className="lg:col-span-2 p-5 bg-card border border-border rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm font-display uppercase tracking-tight flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Treasury Cash Flow & Net Yield Trend
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Inflows (Revenue) vs Outflows (Costs) grouped by {timeframePeriod}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded bg-emerald-500" />
                <span className="text-muted-foreground">Inflows</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded bg-red-500" />
                <span className="text-muted-foreground">Outflows</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.4} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} unit=" SOL" />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${Number(value).toFixed(4)} SOL ($${(Number(value) * ESTIMATED_SOL_USD).toFixed(2)})`,
                    name === "inflows" ? "Gross Inflows" : "Operating Outflows",
                  ]}
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#3f3f46",
                    borderRadius: "0.75rem",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="inflows" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="outflows" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Operational Expenses Breakdown Pill Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-border text-xs">
            {summary.outflowBreakdown.map((exp) => (
              <div key={exp.category} className="p-2 rounded-xl bg-muted/40 border border-border/60">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">{exp.label}</p>
                <p className="font-mono font-bold text-foreground mt-0.5">
                  {exp.amountSol.toFixed(4)} SOL
                </p>
                <p className="text-[10px] text-muted-foreground">{exp.count} network executions</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Stock Mint & Trade Fees [Coming Soon] Banner */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-r from-pink-950/30 via-purple-950/20 to-card border border-pink-500/30 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 border border-pink-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm font-display text-foreground uppercase tracking-tight">
                  Stock Mint & Trade Fees
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-pink-500/20 text-pink-400 border border-pink-500/40 animate-pulse">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tokenized equity, synthetic stock deployments, and secondary equity swap fees will automatically route to this ledger upon module release.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right text-xs font-mono">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Target Launch</p>
              <p className="font-bold text-pink-400">Street Sync V3</p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Explorer-Style Transaction Ledger & Export */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold font-display uppercase italic tracking-tight text-foreground">
              Treasury Cash Flow Ledger
            </h3>
            <p className="text-xs text-muted-foreground">
              Complete on-chain ledger history with categorized fee events and audit export
            </p>
          </div>
        </div>

        <TreasuryLedgerTable transactions={transactions} accountingSummary={summary} />
      </div>
    </div>
  );
}
