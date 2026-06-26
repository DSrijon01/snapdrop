"use client";

import React, { useState, useEffect } from "react";
import { useSubscription } from "@/context/SubscriptionContext";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShieldAlert, Sparkles, Zap, CheckCircle2, Terminal, Database, Activity } from "lucide-react";
import Link from "next/link";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// Mock live mempool activity data for SS Scan Pro
const MOCK_PRO_SCAN_DATA = [
  { time: "10:00", tps: 1850, gas: 15 },
  { time: "10:05", tps: 2200, gas: 18 },
  { time: "10:10", tps: 2100, gas: 17 },
  { time: "10:15", tps: 2600, gas: 22 },
  { time: "10:20", tps: 2950, gas: 28 },
  { time: "10:25", tps: 3400, gas: 35 },
  { time: "10:30", tps: 3120, gas: 31 },
];

export default function SSScanProPage() {
  const { hasAccess, openSubscriptionModal, loading } = useSubscription();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      {/* Background Neon glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[30rem] h-[30rem] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl px-6 pt-12 pb-8 flex items-center justify-between border-b border-border/40 relative z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/ss-scan"
            className="flex items-center gap-2 text-sm font-mono tracking-widest font-bold uppercase text-muted-foreground hover:text-primary transition-colors group px-3 py-2 -ml-3 rounded-lg hover:bg-muted/50"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Go Back</span>
          </Link>
          <div>
            <h1 className="text-3xl font-black font-display uppercase tracking-tight flex items-center gap-2">
              <Zap className="w-7 h-7 text-primary animate-pulse" />
              SS Scan Pro
            </h1>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mt-0.5">
              Premium Solana Mempool Monitor & Advanced Telemetry
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-7xl px-6 py-8 flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {!access ? (
            /* LOCKED SCREEN */
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
                    <span>Real-time pending transaction mempool logs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Advanced transaction type priority indexes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Unlimited Devnet indexing history searches</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => openSubscriptionModal("ss-scan")}
                  className="w-full py-4 bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg shadow-primary/20"
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
            /* PRO CONTENT */
            <motion.div
              key="authorized"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Top Banner */}
              <div className="bg-card/45 backdrop-blur-md border border-border rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/15 rounded-2xl flex items-center justify-center text-primary shrink-0">
                    <Activity size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black font-display uppercase tracking-tight">
                      Mempool Telemetry Hub
                    </h2>
                    <p className="text-muted-foreground text-xs font-mono max-w-xl uppercase mt-0.5">
                      Explore live Devnet network throughput, pending fee metrics, and advanced indexer states.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 relative z-10">
                  <div className="bg-card/65 border border-border px-4 py-2.5 rounded-xl text-center">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">Avg TPS</span>
                    <span className="text-lg font-black text-emerald-500 font-display">2,850/s</span>
                  </div>
                  <div className="bg-card/65 border border-border px-4 py-2.5 rounded-xl text-center">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">Sync Latency</span>
                    <span className="text-lg font-black text-primary font-display">&lt; 14ms</span>
                  </div>
                </div>
              </div>

              {/* Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Mempool activity chart */}
                <div className="lg:col-span-2 bg-card/35 backdrop-blur-md border border-border rounded-3xl p-6 space-y-6">
                  <div>
                    <h3 className="font-black font-display uppercase tracking-tight text-lg">
                      Mempool Transaction Velocity
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">Active Devnet transaction pipelines</p>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={MOCK_PRO_SCAN_DATA}>
                        <defs>
                          <linearGradient id="colorTps" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="time" stroke="#6b7280" fontSize={10} tickLine={false} />
                        <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(18, 18, 18, 0.9)",
                            borderColor: "rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                            fontFamily: "monospace",
                            fontSize: "12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="tps"
                          stroke="var(--primary)"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorTps)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Live Terminal Log */}
                <div className="bg-card/35 backdrop-blur-md border border-border rounded-3xl p-6 space-y-6 flex flex-col">
                  <div>
                    <h3 className="font-black font-display uppercase tracking-tight text-lg">
                      Priority Mempool Streams
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">Incoming transactions via websocket</p>
                  </div>

                  <div className="flex-1 bg-black/50 border border-border/80 rounded-2xl p-4 font-mono text-[10px] space-y-2.5 overflow-y-auto leading-relaxed text-muted-foreground max-h-64">
                    <div className="text-emerald-500 flex justify-between">
                      <span>[OK] Block 184,902,109 indexed</span>
                      <span>1s ago</span>
                    </div>
                    <div className="text-foreground">
                      <span>TX 4a7c...81f: transfer 45.0 SOL</span>
                    </div>
                    <div className="text-foreground">
                      <span>TX 82ab...92b: mint NFT "Street Sync #401"</span>
                    </div>
                    <div className="text-primary/80">
                      <span>[MEMPOOL] prioritised gas fee detected for 2x SOL tx</span>
                    </div>
                    <div className="text-amber-500/80">
                      <span>[WARN] indexer node latency increased to 22ms</span>
                    </div>
                    <div className="text-foreground">
                      <span>TX 1cc4...78e: swap 1.0 SOL → SSDS</span>
                    </div>
                    <div className="text-emerald-500 flex justify-between mt-2">
                      <span>[OK] Block 184,902,110 indexed</span>
                      <span>Just now</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
