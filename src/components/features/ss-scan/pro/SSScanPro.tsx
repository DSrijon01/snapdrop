"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSubscription } from "@/context/SubscriptionContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, ShieldAlert, Sparkles, Zap, CheckCircle2, Database, Activity, 
  Search, RefreshCw, Maximize2, Copy, Check, ExternalLink
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

// Data Models
interface TraceNode {
  address: string;
  label: string;
  amountUsd: number;
  amountNative: number;
  txCount: number;
  toggled: boolean;
}

interface TargetWallet {
  address: string;
  label: string;
  netWorthUsd: number;
  balanceNative: number;
  chain: string;
}

interface LedgerTx {
  hash: string;
  from: string;
  fromLabel: string;
  to: string;
  toLabel: string;
  amountNative: number;
  amountUsd: number;
  timestamp: string;
  fee: number;
  status: "SUCCESS" | "PENDING";
}

// Chain configs
const CHAIN_PARAMS: Record<string, {
  name: string;
  symbol: string;
  color: string;
  nativePriceUsd: number;
  blockHeight: number;
  gasPrice: string;
  txVolume24h: string;
}> = {
  btc: { name: "Bitcoin", symbol: "BTC", color: "#F7931A", nativePriceUsd: 65200, blockHeight: 849021, gasPrice: "24 sat/vB", txVolume24h: "3.4B USD" },
  bch: { name: "Bitcoin Cash", symbol: "BCH", color: "#478559", nativePriceUsd: 380, blockHeight: 825102, gasPrice: "1.5 sat/B", txVolume24h: "185M USD" },
  ltc: { name: "Litecoin", symbol: "LTC", color: "#345D9D", nativePriceUsd: 74, blockHeight: 2684910, gasPrice: "0.001 LTC", txVolume24h: "312M USD" },
  bnb: { name: "BNB Chain", symbol: "BNB", color: "#F3BA2F", nativePriceUsd: 580, blockHeight: 38940212, gasPrice: "3.0 Gwei", txVolume24h: "1.2B USD" },
  sol: { name: "Solana", symbol: "SOL", color: "#14F195", nativePriceUsd: 145, blockHeight: 284092104, gasPrice: "0.00005 SOL", txVolume24h: "2.1B USD" },
  eth: { name: "Ethereum", symbol: "ETH", color: "#8C8CFC", nativePriceUsd: 3200, blockHeight: 19820921, gasPrice: "18 Gwei", txVolume24h: "4.8B USD" },
};

// Slicing helper
const sliceAddress = (addr: string) => {
  if (!addr) return "";
  if (addr.length <= 16) return addr;
  return `${addr.substring(0, 8)}...${addr.substring(addr.length - 8)}`;
};

export function SSScanPro() {
  const { hasAccess, openSubscriptionModal, loading } = useSubscription();
  const [isMounted, setIsMounted] = useState(false);
  const [selectedChain, setSelectedChain] = useState<string>("sol");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Inspected state
  const [inspectedWallet, setInspectedWallet] = useState<TargetWallet>({
    address: "9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu",
    label: "Raydium AMM Pool Authority",
    netWorthUsd: 125000000,
    balanceNative: 862068,
    chain: "sol"
  });

  // Toggled visibility lists for canvas trace
  const [inflows, setInflows] = useState<TraceNode[]>([]);
  const [outflows, setOutflows] = useState<TraceNode[]>([]);
  const [ledgerTxs, setLedgerTxs] = useState<LedgerTx[]>([]);

  // Toggle sub-tab for node managers
  const [activeManagerTab, setActiveManagerTab] = useState<"inflows" | "outflows">("inflows");

  // Visual/Scan loaders
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [copiedText, setCopiedText] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(1);

  // Zoom reset reference passed down to canvas
  const triggerZoomResetRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Pre-seed mock datasets for the selected chain on launch / chain switch
  useEffect(() => {
    if (!isMounted) return;
    loadPresetChainData(selectedChain);
  }, [isMounted, selectedChain]);

  const loadPresetChainData = (chain: string) => {
    const symbol = CHAIN_PARAMS[chain].symbol;
    const price = CHAIN_PARAMS[chain].nativePriceUsd;

    // Build unique wallet addresses relative to chain
    let targetAddress = "";
    let targetLabel = "";
    let targetBalance = 0;

    if (chain === "sol") {
      targetAddress = "9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu";
      targetLabel = "Raydium AMM Pool Authority";
      targetBalance = 862068;
    } else if (chain === "eth") {
      targetAddress = "0x0b925b1dc9b9b9709092bbccbfb32f14db81981d";
      targetLabel = "Lido: ETH Staking Depositor";
      targetBalance = 45000;
    } else if (chain === "btc") {
      targetAddress = "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo";
      targetLabel = "Binance: Cold Wallet 1";
      targetBalance = 248500;
    } else if (chain === "bch") {
      targetAddress = "bch1q5v177vzkj98a9hqscl2d5p42ehyld95p425";
      targetLabel = "MtGox BCH Trustee Escrow";
      targetBalance = 80000;
    } else if (chain === "ltc") {
      targetAddress = "LMCGqd9PZ2Y3gX9b5JqFv2fJ3QskJqfS82";
      targetLabel = "Litecoin Foundation Vault";
      targetBalance = 120000;
    } else {
      targetAddress = "0xF977814e90dA44bFA03b6295A0616a897441aceC";
      targetLabel = "Binance Smart Chain Bridge";
      targetBalance = 350000;
    }

    setInspectedWallet({
      address: targetAddress,
      label: targetLabel,
      netWorthUsd: targetBalance * price,
      balanceNative: targetBalance,
      chain
    });

    // Inflows
    const baseInflows: TraceNode[] = [
      { address: `${chain}-inflow-1`, label: "Exchange Reserve Node", amountUsd: targetBalance * 0.45 * price, amountNative: targetBalance * 0.45, txCount: 14, toggled: true },
      { address: `${chain}-inflow-2`, label: "OTC Escrow Wallet", amountUsd: targetBalance * 0.20 * price, amountNative: targetBalance * 0.20, txCount: 4, toggled: true },
      { address: `${chain}-inflow-3`, label: "Early Venture Angel", amountUsd: targetBalance * 0.15 * price, amountNative: targetBalance * 0.15, txCount: 2, toggled: true },
      { address: `${chain}-inflow-4`, label: "Miner Pool Payout Node", amountUsd: targetBalance * 0.10 * price, amountNative: targetBalance * 0.10, txCount: 28, toggled: false },
      { address: `${chain}-inflow-5`, label: "DeFi Router Aggregator", amountUsd: targetBalance * 0.05 * price, amountNative: targetBalance * 0.05, txCount: 8, toggled: false }
    ];

    // Outflows
    const baseOutflows: TraceNode[] = [
      { address: `${chain}-outflow-1`, label: "Binance Custody Vault", amountUsd: targetBalance * 0.35 * price, amountNative: targetBalance * 0.35, txCount: 18, toggled: true },
      { address: `${chain}-outflow-2`, label: "Coinbase Hot Wallet", amountUsd: targetBalance * 0.25 * price, amountNative: targetBalance * 0.25, txCount: 12, toggled: true },
      { address: `${chain}-outflow-3`, label: "Arbitrage Execution Bot", amountUsd: targetBalance * 0.10 * price, amountNative: targetBalance * 0.10, txCount: 52, toggled: false },
      { address: `${chain}-outflow-4`, label: "Staking Pool Deposit", amountUsd: targetBalance * 0.15 * price, amountNative: targetBalance * 0.15, txCount: 3, toggled: true },
      { address: `${chain}-outflow-5`, label: "Multi-sig Dev Reserves", amountUsd: targetBalance * 0.05 * price, amountNative: targetBalance * 0.05, txCount: 1, toggled: false }
    ];

    setInflows(baseInflows);
    setOutflows(baseOutflows);

    // Ledger transactions
    const baseTxs: LedgerTx[] = [
      {
        hash: `tx-${Math.random().toString(36).substring(2, 14)}`,
        from: baseInflows[0].address,
        fromLabel: baseInflows[0].label,
        to: targetAddress,
        toLabel: targetLabel,
        amountNative: targetBalance * 0.05,
        amountUsd: targetBalance * 0.05 * price,
        timestamp: "2026-06-27 18:24:10",
        fee: 0.0001,
        status: "SUCCESS"
      },
      {
        hash: `tx-${Math.random().toString(36).substring(2, 14)}`,
        from: targetAddress,
        fromLabel: targetLabel,
        to: baseOutflows[0].address,
        toLabel: baseOutflows[0].label,
        amountNative: targetBalance * 0.08,
        amountUsd: targetBalance * 0.08 * price,
        timestamp: "2026-06-27 17:42:01",
        fee: 0.0002,
        status: "SUCCESS"
      },
      {
        hash: `tx-${Math.random().toString(36).substring(2, 14)}`,
        from: baseInflows[1].address,
        fromLabel: baseInflows[1].label,
        to: targetAddress,
        toLabel: targetLabel,
        amountNative: targetBalance * 0.025,
        amountUsd: targetBalance * 0.025 * price,
        timestamp: "2026-06-27 16:11:54",
        fee: 0.00015,
        status: "SUCCESS"
      },
      {
        hash: `tx-${Math.random().toString(36).substring(2, 14)}`,
        from: targetAddress,
        fromLabel: targetLabel,
        to: baseOutflows[1].address,
        toLabel: baseOutflows[1].label,
        amountNative: targetBalance * 0.06,
        amountUsd: targetBalance * 0.06 * price,
        timestamp: "2026-06-27 14:05:32",
        fee: 0.00012,
        status: "SUCCESS"
      },
      {
        hash: `tx-${Math.random().toString(36).substring(2, 14)}`,
        from: baseInflows[2].address,
        fromLabel: baseInflows[2].label,
        to: targetAddress,
        toLabel: targetLabel,
        amountNative: targetBalance * 0.015,
        amountUsd: targetBalance * 0.015 * price,
        timestamp: "2026-06-27 11:30:19",
        fee: 0.00018,
        status: "SUCCESS"
      }
    ];

    setLedgerTxs(baseTxs);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Trigger professional scan animation
    setIsScanning(true);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          
          const cleanAddr = searchQuery.trim();
          const price = CHAIN_PARAMS[selectedChain].nativePriceUsd;

          // Dynamically seed custom address traces
          setInspectedWallet({
            address: cleanAddr,
            label: `Inspected Node (${cleanAddr.substring(0, 4)}...${cleanAddr.substring(cleanAddr.length - 4)})`,
            netWorthUsd: 14500000,
            balanceNative: 14500000 / price,
            chain: selectedChain
          });

          // Generate dynamic inflows
          setInflows([
            { address: `inflow-${cleanAddr}-1`, label: "DEX Trade Swap", amountUsd: 6200000, amountNative: 6200000 / price, txCount: 42, toggled: true },
            { address: `inflow-${cleanAddr}-2`, label: "Hot Wallet Transfer", amountUsd: 3100000, amountNative: 3100000 / price, txCount: 8, toggled: true },
            { address: `inflow-${cleanAddr}-3`, label: "MEV Arbitrage Input", amountUsd: 1500000, amountNative: 1500000 / price, txCount: 2, toggled: false }
          ]);

          // Generate dynamic outflows
          setOutflows([
            { address: `outflow-${cleanAddr}-1`, label: "Binance Settlement Node", amountUsd: 5800000, amountNative: 5800000 / price, txCount: 15, toggled: true },
            { address: `outflow-${cleanAddr}-2`, label: "Project Lockup Bridge", amountUsd: 2200000, amountNative: 2200000 / price, txCount: 1, toggled: true },
            { address: `outflow-${cleanAddr}-3`, label: "Retail Trading Cashout", amountUsd: 950000, amountNative: 950000 / price, txCount: 12, toggled: false }
          ]);

          // Dynamic ledger entries
          setLedgerTxs([
            {
              hash: `tx-${Math.random().toString(36).substring(2, 14)}`,
              from: `inflow-${cleanAddr}-1`,
              fromLabel: "DEX Trade Swap",
              to: cleanAddr,
              toLabel: "Inspected Node",
              amountNative: 3400000 / price,
              amountUsd: 3400000,
              timestamp: "Just now",
              fee: 0.00005,
              status: "SUCCESS"
            },
            {
              hash: `tx-${Math.random().toString(36).substring(2, 14)}`,
              from: cleanAddr,
              fromLabel: "Inspected Node",
              to: `outflow-${cleanAddr}-1`,
              toLabel: "Binance Settlement Node",
              amountNative: 2800000 / price,
              amountUsd: 2800000,
              timestamp: "Just now",
              fee: 0.0001,
              status: "SUCCESS"
            }
          ]);

          toast.success("Blockchain ledger parsed. Rendering node branch maps.");
          
          if (triggerZoomResetRef.current) {
            triggerZoomResetRef.current();
          }

          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  const toggleNodeTrace = (type: "inflow" | "outflow", address: string) => {
    if (type === "inflow") {
      setInflows((prev) => 
        prev.map(n => n.address === address ? { ...n, toggled: !n.toggled } : n)
      );
    } else {
      setOutflows((prev) => 
        prev.map(n => n.address === address ? { ...n, toggled: !n.toggled } : n)
      );
    }
  };

  const copyAddressText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    toast.success("Address copied to clipboard.");
    setTimeout(() => setCopiedText(false), 1500);
  };

  if (!isMounted || loading) {
    return (
      <div className="flex h-screen w-full bg-background items-center justify-center text-muted-foreground animate-pulse font-mono uppercase tracking-widest text-xs">
        Loading Pro Environment...
      </div>
    );
  }

  const access = hasAccess("ss-scan");

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative overflow-hidden flex flex-col items-center">
      {/* Clean Background Grid */}
      <div className="absolute inset-0 dark:bg-[radial-gradient(#111116_1px,transparent_1px)] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] pointer-events-none opacity-60" />

      {/* Header */}
      <header className="w-full max-w-7xl px-6 pt-10 pb-6 flex items-center justify-between border-b border-border relative z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/ss-scan"
            className="flex items-center gap-2 text-xs font-mono tracking-widest font-bold uppercase text-muted-foreground hover:text-primary transition-colors group px-3 py-2 -ml-3 rounded-lg hover:bg-muted/40"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Go Back</span>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black font-display uppercase tracking-tight flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                SS Scan Tracer Pro
              </h1>
              <span className="bg-primary/10 border border-primary/20 text-primary text-[9px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full font-bold">
                PRO ACTIVE
              </span>
            </div>
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-mono mt-0.5">
              Inspecting blockchain address flows, counterparty weights, and transfer branches
            </p>
          </div>
        </div>

        {/* Chain selector tabs */}
        <div className="flex items-center gap-1.5 bg-card p-1 border border-border rounded-xl">
          {Object.entries(CHAIN_PARAMS).map(([key, value]) => {
            const active = selectedChain === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedChain(key)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase transition-all cursor-pointer ${
                  active 
                    ? "bg-background text-foreground border border-border" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {value.symbol}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Portal */}
      <main className="w-full max-w-7xl px-6 py-6 flex-1 relative z-10 flex flex-col gap-6">
        <AnimatePresence mode="wait">
          {!access ? (
            /* LOCKED GATING VIEW */
            <motion.div
              key="locked"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto mt-12 bg-card/45 backdrop-blur-md border border-border/80 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />
              
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
                <ShieldAlert size={32} />
              </div>

              <h2 className="text-2xl font-black font-display uppercase tracking-tight text-foreground mb-2">
                Pro Access Locked
              </h2>
              <p className="text-muted-foreground text-sm font-mono uppercase tracking-wide mb-6">
                Subscription Required
              </p>

              <div className="bg-muted/40 border border-border/60 rounded-2xl p-4 mb-6 text-left space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Subscribe to the SS Scan Pro tier for <strong>1 SOL per 30 days</strong> to unlock:
                </p>
                <ul className="space-y-2 text-xs font-mono uppercase text-foreground/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Real-time pending transaction tracer maps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Arkham-style flow managers (6 Blockchains)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Trace visibility togglers & transaction ledgers</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => openSubscriptionModal("ss-scan")}
                  className="w-full py-4 bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg shadow-primary/20 cursor-pointer"
                >
                  Subscribe for 1 SOL / 30 Days
                </button>
                <Link
                  href="/ss-scan"
                  className="w-full py-4 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-all rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                >
                  Back to SS Scan Home
                </Link>
              </div>
            </motion.div>
          ) : (
            /* ACTIVE EXPLORER & TRACER SUITE */
            <motion.div
              key="authorized"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              {/* Telemetry Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-card border border-border rounded-2xl p-4 shadow-md font-mono text-[10px] text-muted-foreground">
                <div>
                  <span className="block uppercase text-muted-foreground/60 mb-0.5">Blockchain Network</span>
                  <span className="text-xs font-bold text-foreground uppercase">{CHAIN_PARAMS[selectedChain].name}</span>
                </div>
                <div>
                  <span className="block uppercase text-muted-foreground/60 mb-0.5">Block Height</span>
                  <span className="text-xs font-bold text-foreground">#{CHAIN_PARAMS[selectedChain].blockHeight.toLocaleString()}</span>
                </div>
                <div>
                  <span className="block uppercase text-muted-foreground/60 mb-0.5">Average Gas/Fee</span>
                  <span className="text-xs font-bold text-foreground">{CHAIN_PARAMS[selectedChain].gasPrice}</span>
                </div>
                <div>
                  <span className="block uppercase text-muted-foreground/60 mb-0.5">24h Transaction Volume</span>
                  <span className="text-xs font-bold text-primary">{CHAIN_PARAMS[selectedChain].txVolume24h}</span>
                </div>
              </div>

              {/* Dynamic Scan Progress Overlay */}
              <AnimatePresence>
                {isScanning && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-background/95 backdrop-blur-md z-30 flex flex-col items-center justify-center text-center p-6 border border-border"
                  >
                    <div className="w-16 h-16 mb-4 flex items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full border-2 border-muted border-t-primary animate-spin" />
                      <Database className="w-5 h-5 text-primary animate-pulse" />
                    </div>
                    <h4 className="text-sm font-black font-display uppercase tracking-widest text-foreground">
                      Querying {CHAIN_PARAMS[selectedChain].name} Ledger
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase mt-1 tracking-wider">
                      Tracing block indexes for transaction balances...
                    </p>
                    
                    <div className="w-48 bg-muted h-1 rounded-full overflow-hidden mt-4">
                      <div 
                        className="bg-primary h-full transition-all duration-150" 
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-primary font-bold mt-2">{scanProgress}%</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search Control & viewing badge */}
              <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-card border border-border rounded-2xl p-4">
                <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search target wallet address..."
                    className="w-full bg-muted border border-border focus:border-primary rounded-xl pl-9 pr-14 py-2 text-xs text-foreground placeholder-muted-foreground outline-none transition-all font-mono"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </form>

                <div className="flex items-center gap-2 bg-muted border border-border px-3 py-1.5 rounded-xl font-mono text-[10px]">
                  <span className="text-muted-foreground uppercase">VIEWING:</span>
                  <span className="text-primary font-bold">{inspectedWallet.label}</span>
                  <span className="text-muted-foreground">({sliceAddress(inspectedWallet.address)})</span>
                  <button 
                    onClick={() => copyAddressText(inspectedWallet.address)}
                    className="text-muted-foreground hover:text-foreground ml-1.5"
                    title="Copy address"
                  >
                    {copiedText ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Main Explorer Tracer Dashboard Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* LEFT: Visible trace nodes list manager */}
                <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-5 shadow-lg flex flex-col gap-4">
                  <div className="border-b border-border/20 pb-3 flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                      Trace Manager
                    </span>
                    <h3 className="text-xs font-mono font-black uppercase text-foreground">
                      Toggle Visible Trace Nodes
                    </h3>
                  </div>

                  {/* Manager selector sub-tabs */}
                  <div className="grid grid-cols-2 bg-muted p-0.5 border border-border rounded-lg">
                    <button
                      onClick={() => setActiveManagerTab("inflows")}
                      className={`py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                        activeManagerTab === "inflows"
                          ? "bg-background text-foreground border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Inflows
                    </button>
                    <button
                      onClick={() => setActiveManagerTab("outflows")}
                      className={`py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                        activeManagerTab === "outflows"
                          ? "bg-background text-foreground border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Outflows
                    </button>
                  </div>

                  {/* List manager Table */}
                  <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-1">
                    <table className="w-full text-left border-collapse text-[10px] font-mono">
                      <thead>
                        <tr className="border-b border-border/20 text-[9px] text-muted-foreground uppercase">
                          <th className="pb-2 font-bold">Counterparty Wallet</th>
                          <th className="pb-2 text-right font-bold">Trace Weight</th>
                          <th className="pb-2 text-center font-bold">Trace</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/10">
                        {activeManagerTab === "inflows" ? (
                          inflows.map((node) => (
                            <tr key={node.address} className="hover:bg-muted/10">
                              <td className="py-2.5 max-w-[120px] truncate">
                                <span className="text-foreground block font-bold truncate">{node.label}</span>
                                <span className="text-muted-foreground block text-[9px] truncate">{sliceAddress(node.address)}</span>
                              </td>
                              <td className="py-2.5 text-right font-bold text-foreground">
                                <div>${(node.amountUsd / 1000000).toFixed(1)}M</div>
                                <div className="text-[8px] text-muted-foreground font-medium">
                                  {node.amountNative.toLocaleString(undefined, { maximumFractionDigits: 1 })} {CHAIN_PARAMS[selectedChain].symbol} ({node.txCount} txs)
                                </div>
                              </td>
                              <td className="py-2.5 text-center">
                                <button
                                  onClick={() => toggleNodeTrace("inflow", node.address)}
                                  className={`px-2 py-1 rounded text-[9px] font-mono font-bold uppercase cursor-pointer border ${
                                    node.toggled
                                      ? "bg-primary/10 text-primary border-primary/20"
                                      : "bg-muted text-muted-foreground border-border hover:text-foreground"
                                  }`}
                                >
                                  {node.toggled ? "On" : "Off"}
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          outflows.map((node) => (
                            <tr key={node.address} className="hover:bg-muted/10">
                              <td className="py-2.5 max-w-[120px] truncate">
                                <span className="text-foreground block font-bold truncate">{node.label}</span>
                                <span className="text-muted-foreground block text-[9px] truncate">{sliceAddress(node.address)}</span>
                              </td>
                              <td className="py-2.5 text-right font-bold text-foreground">
                                <div>${(node.amountUsd / 1000000).toFixed(1)}M</div>
                                <div className="text-[8px] text-muted-foreground font-medium">
                                  {node.amountNative.toLocaleString(undefined, { maximumFractionDigits: 1 })} {CHAIN_PARAMS[selectedChain].symbol} ({node.txCount} txs)
                                </div>
                              </td>
                              <td className="py-2.5 text-center">
                                <button
                                  onClick={() => toggleNodeTrace("outflow", node.address)}
                                  className={`px-2 py-1 rounded text-[9px] font-mono font-bold uppercase cursor-pointer border ${
                                    node.toggled
                                      ? "bg-primary/10 text-primary border-primary/20"
                                      : "bg-muted text-muted-foreground border-border hover:text-foreground"
                                  }`}
                                >
                                  {node.toggled ? "On" : "Off"}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CENTER & RIGHT: Clean structural branch canvas tracer */}
                <div className="lg:col-span-8 bg-card border border-border rounded-2xl overflow-hidden relative shadow-lg min-h-[380px] flex items-center justify-center">
                  
                  {/* Floating canvas controls */}
                  <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 bg-background/80 backdrop-blur-md p-1 border border-border rounded-xl font-mono text-[9px]">
                    <button 
                      onClick={() => {
                        if (triggerZoomResetRef.current) triggerZoomResetRef.current();
                      }}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-all"
                      title="Reset View"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                    <span className="px-1 text-muted-foreground border-l border-r border-border font-bold uppercase">
                      {(canvasZoom * 100).toFixed(0)}% zoom
                    </span>
                  </div>

                  <TracerCanvas
                    target={inspectedWallet}
                    inflows={inflows}
                    outflows={outflows}
                    chainColor={CHAIN_PARAMS[selectedChain].color}
                    onZoomChange={setCanvasZoom}
                    triggerZoomReset={triggerZoomResetRef}
                  />
                </div>
              </div>

              {/* BOTTOM: Transaction Ledger Table */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-lg flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                    On-Chain Transaction Ledger
                  </h3>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-[10px] font-mono">
                    <thead>
                      <tr className="border-b border-border bg-muted text-[9px] text-muted-foreground uppercase">
                        <th className="p-3 pl-4">Transaction Hash</th>
                        <th className="p-3">Sender Wallet</th>
                        <th className="p-3">Destination Wallet</th>
                        <th className="p-3 text-right">Value (Native)</th>
                        <th className="p-3 text-right">Value (USD)</th>
                        <th className="p-3">Execution Time</th>
                        <th className="p-3 pr-4">Scan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {ledgerTxs.length > 0 ? (
                        ledgerTxs.map((tx) => (
                          <tr key={tx.hash} className="hover:bg-muted/10 transition-colors">
                            <td className="p-3 pl-4 font-bold text-primary max-w-[120px] truncate">
                              {tx.hash}
                            </td>
                            <td className="p-3 max-w-[150px] truncate">
                              <span className="text-foreground font-bold block truncate">{tx.fromLabel}</span>
                              <span className="text-muted-foreground text-[9px] block truncate">{sliceAddress(tx.from)}</span>
                            </td>
                            <td className="p-3 max-w-[150px] truncate">
                              <span className="text-foreground font-bold block truncate">{tx.toLabel}</span>
                              <span className="text-muted-foreground text-[9px] block truncate">{sliceAddress(tx.to)}</span>
                            </td>
                            <td className="p-3 text-right font-bold text-foreground">
                              {tx.amountNative.toLocaleString(undefined, { maximumFractionDigits: 4 })} {CHAIN_PARAMS[selectedChain].symbol}
                            </td>
                            <td className="p-3 text-right font-bold text-primary">
                              ${tx.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                            <td className="p-3 text-muted-foreground font-medium">
                              {tx.timestamp}
                            </td>
                            <td className="p-3 pr-4">
                              <a
                                href={selectedChain === "sol" ? `https://solscan.io/tx/${tx.hash}` : `https://etherscan.io/tx/${tx.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 font-bold hover:underline inline-flex items-center gap-0.5"
                              >
                                Explorer
                                <ExternalLink size={10} className="shrink-0" />
                              </a>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-muted-foreground italic">
                            No ledger logs match your query.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Interactive tracer canvas rendering
interface TracerCanvasProps {
  target: TargetWallet;
  inflows: TraceNode[];
  outflows: TraceNode[];
  chainColor: string;
  onZoomChange: (zoom: number) => void;
  triggerZoomReset: React.MutableRefObject<(() => void) | null>;
}

function TracerCanvas({
  target,
  inflows,
  outflows,
  chainColor,
  onZoomChange,
  triggerZoomReset
}: TracerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const viewRef = useRef({
    zoom: 1.0,
    panX: 0,
    panY: 0,
    targetZoom: 1.0,
    targetPanX: 0,
    targetPanY: 0,
    isPanning: false,
    lastMouseX: 0,
    lastMouseY: 0
  });

  // Reset viewport action
  useEffect(() => {
    triggerZoomReset.current = () => {
      viewRef.current.targetZoom = 1.0;
      viewRef.current.targetPanX = 0;
      viewRef.current.targetPanY = 0;
    };
  }, [triggerZoomReset]);

  // Main Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const handleResize = () => {
      const parent = canvas.parentElement;
      canvas.width = parent?.clientWidth || 700;
      canvas.height = parent?.clientHeight || 380;
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const render = () => {
      const view = viewRef.current;
      const w = canvas.width;
      const h = canvas.height;

      // LERP Zoom/Pan
      view.zoom += (view.targetZoom - view.zoom) * 0.1;
      view.panX += (view.targetPanX - view.panX) * 0.1;
      view.panY += (view.targetPanY - view.panY) * 0.1;
      onZoomChange(view.zoom);

      // Check if document has dark class (Next.js context)
      const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
      
      const canvasBg = isDark ? "#07070a" : "#ffffff";
      const gridColor = isDark ? "#16161e" : "#f1f5f9";
      const lineColor = isDark ? "#2b2b36" : "#cbd5e1";
      const labelColor = isDark ? "#ffb347" : "#b45309"; // Muted gold/amber
      const cardBg = isDark ? "#111116" : "#f8f9fa";
      const cardBorderDefault = isDark ? "#2b2b36" : "#cbd5e1";
      const textMain = isDark ? "#ffffff" : "#0f172a";
      const textMuted = isDark ? "#8a8a9e" : "#64748b";

      // Clear
      ctx.fillStyle = canvasBg;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2 + view.panX, h / 2 + view.panY);
      ctx.scale(view.zoom, view.zoom);

      // A. Draw dot grid in background
      ctx.fillStyle = gridColor;
      const gridGap = 24;
      const limitX = (w / 2 + Math.abs(view.panX)) / view.zoom + 100;
      const limitY = (h / 2 + Math.abs(view.panY)) / view.zoom + 100;
      
      for (let x = -limitX - (limitX % gridGap); x <= limitX; x += gridGap) {
        for (let y = -limitY - (limitY % gridGap); y <= limitY; y += gridGap) {
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }

      // Filter active trace nodes
      const activeInflows = inflows.filter(n => n.toggled);
      const activeOutflows = outflows.filter(n => n.toggled);

      // B. Dimensions for tree node cards
      const cardWidth = 190;
      const cardHeight = 65;
      
      // Node positions
      const centerX = -cardWidth / 2;
      const centerY = -cardHeight / 2;

      const leftX = -270 - cardWidth / 2;
      const rightX = 270 - cardWidth / 2;

      // Inflow positions
      const inflowYCoords = activeInflows.map((_, idx) => {
        if (activeInflows.length === 1) return centerY;
        const totalHeight = (activeInflows.length - 1) * 85;
        return centerY - totalHeight / 2 + idx * 85;
      });

      // Outflow positions
      const outflowYCoords = activeOutflows.map((_, idx) => {
        if (activeOutflows.length === 1) return centerY;
        const totalHeight = (activeOutflows.length - 1) * 85;
        return centerY - totalHeight / 2 + idx * 85;
      });

      // C. Draw connecting paths with arrowheads and value badges
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;

      // Draw inflow lines
      activeInflows.forEach((node, idx) => {
        const startX = leftX + cardWidth;
        const startY = inflowYCoords[idx] + cardHeight / 2;
        const endX = centerX;
        const endY = centerY + cardHeight / 2;

        // Draw bezier curved horizontal link line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(startX + 60, startY, endX - 60, endY, endX, endY);
        ctx.stroke();

        // Draw arrow indicator at midpoint
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        ctx.fillStyle = textMuted;
        ctx.beginPath();
        ctx.moveTo(midX + 5, midY);
        ctx.lineTo(midX - 3, midY - 4);
        ctx.lineTo(midX - 3, midY + 4);
        ctx.closePath();
        ctx.fill();

        // Draw text label on line
        const labelText = `$${(node.amountUsd / 1000000).toFixed(1)}M (${node.txCount})`;
        ctx.font = "9px Courier New";
        ctx.fillStyle = labelColor; // Muted gold
        ctx.textAlign = "center";
        ctx.fillText(labelText, midX, midY - 8);
      });

      // Draw outflow lines
      activeOutflows.forEach((node, idx) => {
        const startX = centerX + cardWidth;
        const startY = centerY + cardHeight / 2;
        const endX = rightX;
        const endY = outflowYCoords[idx] + cardHeight / 2;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(startX + 60, startY, endX - 60, endY, endX, endY);
        ctx.stroke();

        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        ctx.fillStyle = textMuted;
        ctx.beginPath();
        ctx.moveTo(midX + 5, midY);
        ctx.lineTo(midX - 3, midY - 4);
        ctx.lineTo(midX - 3, midY + 4);
        ctx.closePath();
        ctx.fill();

        const labelText = `$${(node.amountUsd / 1000000).toFixed(1)}M (${node.txCount})`;
        ctx.font = "9px Courier New";
        ctx.fillStyle = labelColor;
        ctx.textAlign = "center";
        ctx.fillText(labelText, midX, midY - 8);
      });

      // D. Draw rectangular node cards
      const drawNodeCard = (
        x: number,
        y: number,
        label: string,
        address: string,
        balanceText: string,
        isTarget: boolean
      ) => {
        const rad = 6;
        ctx.beginPath();
        ctx.moveTo(x + rad, y);
        ctx.lineTo(x + cardWidth - rad, y);
        ctx.quadraticCurveTo(x + cardWidth, y, x + cardWidth, y + rad);
        ctx.lineTo(x + cardWidth, y + cardHeight - rad);
        ctx.quadraticCurveTo(x + cardWidth, y + cardHeight, x + cardWidth - rad, y + cardHeight);
        ctx.lineTo(x + rad, y + cardHeight);
        ctx.quadraticCurveTo(x, y + cardHeight, x, y + cardHeight - rad);
        ctx.lineTo(x, y + rad);
        ctx.quadraticCurveTo(x, y, x + rad, y);
        ctx.closePath();

        ctx.fillStyle = cardBg;
        ctx.fill();

        ctx.strokeStyle = isTarget ? chainColor : cardBorderDefault;
        ctx.lineWidth = isTarget ? 2 : 1;
        ctx.stroke();

        // Labels
        ctx.fillStyle = textMain;
        ctx.font = "bold 10px Courier New";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(label.length > 22 ? label.substring(0, 20) + "..." : label, x + 10, y + 10);

        ctx.fillStyle = textMuted;
        ctx.font = "9px Courier New";
        ctx.fillText(sliceAddress(address), x + 10, y + 25);

        ctx.fillStyle = isTarget ? chainColor : textMain;
        ctx.font = "bold 10px Courier New";
        ctx.fillText(balanceText, x + 10, y + 40);
      };

      // Draw Inspected Center Card
      const priceText = `$${(target.netWorthUsd / 1000000).toFixed(1)}M USD (${target.balanceNative.toLocaleString(undefined, { maximumFractionDigits: 0 })} tokens)`;
      drawNodeCard(centerX, centerY, target.label, target.address, priceText, true);

      // Draw Inflows
      activeInflows.forEach((node, idx) => {
        const valText = `$${(node.amountUsd / 1000000).toFixed(1)}M`;
        drawNodeCard(leftX, inflowYCoords[idx], node.label, node.address, valText, false);
      });

      // Draw Outflows
      activeOutflows.forEach((node, idx) => {
        const valText = `$${(node.amountUsd / 1000000).toFixed(1)}M`;
        drawNodeCard(rightX, outflowYCoords[idx], node.label, node.address, valText, false);
      });

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [target, inflows, outflows, chainColor]);

  // Panning & Zoom event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const view = viewRef.current;
    view.isPanning = true;
    view.lastMouseX = e.clientX;
    view.lastMouseY = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const view = viewRef.current;
    if (!view.isPanning) return;
    const dx = e.clientX - view.lastMouseX;
    const dy = e.clientY - view.lastMouseY;
    
    view.targetPanX += dx;
    view.targetPanY += dy;
    
    view.lastMouseX = e.clientX;
    view.lastMouseY = e.clientY;
  };

  const handleMouseUp = () => {
    viewRef.current.isPanning = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const view = viewRef.current;
    const mult = 1.1;
    let nextZ = view.targetZoom;
    if (e.deltaY < 0) {
      nextZ *= mult;
    } else {
      nextZ /= mult;
    }
    view.targetZoom = Math.max(0.4, Math.min(2.5, nextZ));
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="absolute inset-0 w-full h-full block bg-background cursor-grab active:cursor-grabbing"
    />
  );
}
