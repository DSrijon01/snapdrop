"use client";

import React, { useState, useEffect } from "react";
import { useSubscription } from "@/context/SubscriptionContext";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShieldAlert, Sparkles, TrendingUp, Zap, CheckCircle2, DollarSign, Activity, Percent } from "lucide-react";
import Link from "next/link";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// Mock technical signals data
const MOCK_PRO_MARKET_DATA = [
  { time: "10:00", solPrice: 138.2, rsi: 48 },
  { time: "10:05", solPrice: 139.1, rsi: 54 },
  { time: "10:10", solPrice: 140.5, rsi: 62 },
  { time: "10:15", solPrice: 139.8, rsi: 58 },
  { time: "10:20", solPrice: 141.2, rsi: 67 },
  { time: "10:25", solPrice: 143.0, rsi: 73 },
  { time: "10:30", solPrice: 142.5, rsi: 69 },
];

export default function MarketDataProPage() {
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

  const access = hasAccess("market-data");

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative overflow-hidden flex flex-col items-center">
      {/* Background Neon glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[30rem] h-[30rem] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl px-6 pt-12 pb-8 flex items-center justify-between border-b border-border/40 relative z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/market-data"
            className="flex items-center gap-2 text-sm font-mono tracking-widest font-bold uppercase text-muted-foreground hover:text-primary transition-colors group px-3 py-2 -ml-3 rounded-lg hover:bg-muted/50"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Go Back</span>
          </Link>
          <div>
            <h1 className="text-3xl font-black font-display uppercase tracking-tight flex items-center gap-2">
              <Zap className="w-7 h-7 text-primary animate-pulse" />
              Market Data Pro
            </h1>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mt-0.5">
              Advanced technical signals & spread analysis
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
                  Subscribe to the Market Data Pro tier for <strong>1 SOL per 30 days</strong> to unlock:
                </p>
                <ul className="space-y-2 text-xs font-mono uppercase text-foreground/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Live RSI & MACD Overlays</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Microsecond order-book delta metrics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Solana Devnet block-by-block spreads</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => openSubscriptionModal("market-data")}
                  className="w-full py-4 bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg shadow-primary/20"
                >
                  Subscribe for 1 SOL / 30 Days
                </button>
                <Link
                  href="/market-data"
                  className="w-full py-4 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-all rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                >
                  Back to Market Data
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
              <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 bg-primary/15 rounded-2xl flex items-center justify-center text-primary shrink-0">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-foreground">
                      Market Data Pro Dashboard
                    </h2>
                    <p className="text-muted-foreground text-xs md:text-sm mt-1 max-w-xl">
                      Access high-frequency indicator overlays, real-time volume weights, and microsecond spread trackers on Solana Devnet.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 relative z-10">
                  <div className="bg-card/65 border border-border px-4 py-2.5 rounded-xl text-center">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">Order Spreads</span>
                    <span className="text-lg font-black text-emerald-500 font-display">0.02%</span>
                  </div>
                  <div className="bg-card/65 border border-border px-4 py-2.5 rounded-xl text-center">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">Data Feed</span>
                    <span className="text-lg font-black text-primary font-display">120 Hz</span>
                  </div>
                </div>
              </div>

              {/* Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Technical Chart */}
                <div className="lg:col-span-2 bg-card/35 backdrop-blur-md border border-border rounded-3xl p-6 space-y-6">
                  <div>
                    <h3 className="font-black font-display uppercase tracking-tight text-lg">
                      Solana Technical Overlay
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">Live RSI & Price Momentum Indicator</p>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={MOCK_PRO_MARKET_DATA}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
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
                          dataKey="solPrice"
                          stroke="var(--primary)"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorPrice)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Spreads & Stats */}
                <div className="bg-card/35 backdrop-blur-md border border-border rounded-3xl p-6 space-y-6">
                  <div>
                    <h3 className="font-black font-display uppercase tracking-tight text-lg">
                      Order Book Spreads
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">Verified via Devnet RPC</p>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-border/80 rounded-2xl p-4 bg-muted/20 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Solana / USD</p>
                          <p className="text-xs text-muted-foreground">Spread Delta</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">$142.50</p>
                        <p className="text-xs text-emerald-500 font-bold">+0.012%</p>
                      </div>
                    </div>

                    <div className="border border-border/80 rounded-2xl p-4 bg-muted/20 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">RSI (14)</p>
                          <p className="text-xs text-muted-foreground">Momentum State</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">69.2</p>
                        <p className="text-xs text-amber-500 font-bold">Neutral-Bull</p>
                      </div>
                    </div>

                    <div className="border border-border/80 rounded-2xl p-4 bg-muted/20 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Percent className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Volume Weight</p>
                          <p className="text-xs text-muted-foreground">Devnet Node Ratio</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">78.5%</p>
                        <p className="text-xs text-emerald-500 font-bold">Strong Buy</p>
                      </div>
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
