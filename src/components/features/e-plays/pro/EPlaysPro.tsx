"use client";

import React, { useState, useEffect } from "react";
import { useSubscription } from "@/context/SubscriptionContext";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShieldAlert, Sparkles, Zap, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// Mock premium pro data for prediction volume trends
const MOCK_PRO_CHART_DATA = [
  { date: "06/18", volume: 1450, accuracy: 68 },
  { date: "06/19", volume: 1820, accuracy: 72 },
  { date: "06/20", volume: 2200, accuracy: 70 },
  { date: "06/21", volume: 2100, accuracy: 75 },
  { date: "06/22", volume: 2850, accuracy: 81 },
  { date: "06/23", volume: 3400, accuracy: 83 },
  { date: "06/24", volume: 4120, accuracy: 85 },
];

export function EPlaysPro() {
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

  const access = hasAccess("e-plays");

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative overflow-hidden flex flex-col items-center">
      {/* Background Neon glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[30rem] h-[30rem] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl px-6 pt-12 pb-8 flex items-center justify-between border-b border-border/40 relative z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/e-plays"
            className="flex items-center gap-2 text-sm font-mono tracking-widest font-bold uppercase text-muted-foreground hover:text-primary transition-colors group px-3 py-2 -ml-3 rounded-lg hover:bg-muted/50"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Go Back</span>
          </Link>
          <div>
            <h1 className="text-3xl font-black font-display uppercase tracking-tight flex items-center gap-2">
              <Zap className="w-7 h-7 text-primary animate-pulse" />
              E-Play Pro
            </h1>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mt-0.5">
              Premium Predictions & Sentiment Analysis
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-7xl px-6 py-8 flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {!access ? (
            /* LOCKED SCREEN (Unauthorized) */
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
                  Subscribe to the E-Plays Pro tier for <strong>1 SOL per 30 days</strong> to unlock:
                </p>
                <ul className="space-y-2 text-xs font-mono uppercase text-foreground/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Real-time volume heatmaps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>AI-powered market sentiment logs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>85%+ Accuracy prediction trends</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => openSubscriptionModal("e-plays")}
                  className="w-full py-4 bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg shadow-primary/20"
                >
                  Subscribe for 1 SOL / 30 Days
                </button>
                <Link
                  href="/e-plays"
                  className="w-full py-4 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-all rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                >
                  Back to E-Plays Home
                </Link>
              </div>
            </motion.div>
          ) : (
            /* PRO CONTENT (Authorized) */
            <motion.div
              key="authorized"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Top Banner */}
              <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 bg-primary/15 rounded-2xl flex items-center justify-center text-primary shrink-0">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-foreground">
                      Welcome to E-Play Pro Dashboard
                    </h2>
                    <p className="text-muted-foreground text-xs md:text-sm mt-1 max-w-xl">
                      You have full access to high-accuracy tools, deep liquidity analytics, and automated machine learning market sentiment signals.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 relative z-10">
                  <div className="bg-card/65 border border-border px-4 py-2.5 rounded-xl text-center">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">Accuracy Rating</span>
                    <span className="text-lg font-black text-emerald-500 font-display">85.4%</span>
                  </div>
                  <div className="bg-card/65 border border-border px-4 py-2.5 rounded-xl text-center">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">Signal Speed</span>
                    <span className="text-lg font-black text-primary font-display">&lt; 12ms</span>
                  </div>
                </div>
              </div>

              {/* Grid Layout for Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Column */}
                <div className="lg:col-span-2 bg-card/35 backdrop-blur-md border border-border rounded-3xl p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black font-display uppercase tracking-tight text-lg">
                        Pro Volume & Accuracy Signals
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">Historical 7-Day Performance Log</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-mono font-bold uppercase tracking-wider">
                      Optimal Signal State
                    </span>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={MOCK_PRO_CHART_DATA}>
                        <defs>
                          <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} />
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
                          dataKey="volume"
                          stroke="var(--primary)"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorVolume)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Signals Column */}
                <div className="bg-card/35 backdrop-blur-md border border-border rounded-3xl p-6 space-y-6">
                  <div>
                    <h3 className="font-black font-display uppercase tracking-tight text-lg">
                      Active Sentiment Feeds
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">Updated Live via NLP AI Node</p>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-border/80 rounded-2xl p-4 bg-muted/20 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded">
                          STRONG BUY
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">1m ago</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">Solana prediction volume increases +24%</p>
                      <p className="text-xs text-muted-foreground">Derivatives data shows active support of YES outcomes across major modules.</p>
                    </div>

                    <div className="border border-border/80 rounded-2xl p-4 bg-muted/20 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-primary/10 text-primary rounded">
                          NEUTRAL
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">15m ago</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">NFT standard SPL-x discussion spikes</p>
                      <p className="text-xs text-muted-foreground">Social sentiment leans bullish but volume is concentrated in short-term options.</p>
                    </div>

                    <div className="border border-border/80 rounded-2xl p-4 bg-muted/20 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-red-500/10 text-red-500 rounded">
                          OVERBOUGHT
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">1h ago</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">Street Sync Series A market resolution nears</p>
                      <p className="text-xs text-muted-foreground">Arbitrage opportunities decreasing. YES price expected to consolidate around 0.88.</p>
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
