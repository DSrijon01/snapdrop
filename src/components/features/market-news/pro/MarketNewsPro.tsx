"use client";

import React, { useState, useEffect } from "react";
import { useSubscription } from "@/context/SubscriptionContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  ShieldAlert, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  TrendingUp, 
  Newspaper, 
  Info, 
  X,
  Share2,
  Calendar,
  Layers,
  ChevronRight,
  Flame,
  Activity
} from "lucide-react";
import Link from "next/link";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import toast from "react-hot-toast";
import { ProStatusBar } from "@/components/global/subscription/SubscriptionCountdown";
import { NewsEventVisualizer, STORYLINE_PRESETS } from "./NewsEventVisualizer";
import { mockHeadlines, mockCryptoNews, mockGlobalNews, NewsArticle } from "@/lib/newsApi";

// 7-day Sentiment scoring data
const SENTIMENT_CHART_DATA = [
  { day: "Mon", sentiment: 62 },
  { day: "Tue", sentiment: 65 },
  { day: "Wed", sentiment: 58 },
  { day: "Thu", sentiment: 70 },
  { day: "Fri", sentiment: 76 },
  { day: "Sat", sentiment: 82 },
  { day: "Sun", sentiment: 80 },
];

export function MarketNewsPro() {
  const { hasAccess, openSubscriptionModal, loading } = useSubscription();
  const [isMounted, setIsMounted] = useState(false);
  const [simulatedSubscribe, setSimulatedSubscribe] = useState(false);
  
  // Real live articles feed
  const [articles, setArticles] = useState<NewsArticle[]>(() => {
    return [...mockCryptoNews, ...mockHeadlines, ...mockGlobalNews];
  });

  // Modal states
  const [showSentimentModal, setShowSentimentModal] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Background fetch real-time news if endpoint is available
    fetch("/api/news")
      .then((res) => {
        if (!res.ok) throw new Error("Network fetch failed");
        return res.json();
      })
      .then((data) => {
        if (data?.crypto || data?.headlines) {
          const combined = [
            ...(data.crypto || []),
            ...(data.headlines || []),
            ...(data.global || []),
          ];
          if (combined.length > 0) {
            setArticles(combined);
          }
        }
      })
      .catch(() => {
        // Fallback to initial mock articles
      });
  }, []);

  if (!isMounted || loading) {
    return (
      <div className="flex h-screen w-full bg-background items-center justify-center text-muted-foreground animate-pulse font-mono uppercase tracking-widest text-xs">
        Initializing Market News Pro Environment...
      </div>
    );
  }

  const access = hasAccess("market-news");
  const isUnlocked = access || simulatedSubscribe;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 relative overflow-x-hidden flex flex-col items-center">
      {/* Background Neon glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-[28rem] h-[28rem] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ----------------------------------------------------
          PRO LOCAL NAVBAR (Mobile-Optimized & Scaled)
          ---------------------------------------------------- */}
      <nav className="w-full h-14 border-b border-border bg-card/70 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 z-30 sticky top-0">
        
        {/* Left: Back Link & Brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href="/market-news"
            className="flex items-center gap-1 text-xs font-mono uppercase text-muted-foreground hover:text-primary transition-colors py-1 px-2 rounded-lg hover:bg-muted shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <div className="flex items-center gap-1.5 truncate">
            <span className="hidden sm:inline-block text-xs font-black font-display tracking-widest uppercase italic transform -skew-x-6 text-foreground select-none">
              STREET SYNC
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono text-primary font-black uppercase tracking-wider bg-primary/10 px-1.5 sm:px-2 py-0.5 rounded truncate flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 fill-primary" />
              <span>MARKET NEWS PRO</span>
            </span>
          </div>
        </div>

        {/* Right: Quick Sentiment trigger & Plan Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSentimentModal(true)}
            className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-secondary/80 hover:bg-secondary border border-border text-[11px] font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            title="7-Day NLP Sentiment Breakdown"
          >
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="hidden xs:inline">7D NLP</span>
          </button>

          {!access && (
            <button
              onClick={() => openSubscriptionModal("market-news")}
              className="py-1 px-3 bg-primary hover:opacity-90 text-primary-foreground font-mono text-[11px] font-bold uppercase rounded-lg shadow-sm transition-all"
            >
              Unlock Pro
            </button>
          )}
        </div>
      </nav>

      {/* Main Container */}
      <main className="w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6 flex-1 relative z-10 flex flex-col space-y-6">
        
        {/* Pro Active Status Bar Countdown */}
        <ProStatusBar moduleId="market-news" />

        <AnimatePresence mode="wait">
          {!isUnlocked ? (
            /* ====================================================
               LOCKED PAYWALL SCREEN (Mobile & Android Optimized)
               ==================================================== */
            <motion.div
              key="locked"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="max-w-lg w-full mx-auto my-6 bg-card/60 backdrop-blur-xl border border-border/90 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-4">
                <ShieldAlert size={28} />
              </div>

              <h2 className="text-xl sm:text-2xl font-black font-display uppercase tracking-tight text-foreground mb-1.5">
                Market News Pro Required
              </h2>
              <p className="text-muted-foreground text-xs font-mono uppercase tracking-wide mb-5">
                Interactive Event Visualizer & Correlation Engine
              </p>

              <div className="bg-muted/30 border border-border/60 rounded-2xl p-4 mb-5 text-left space-y-3 font-sans">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Subscribe to Market News Pro starting from <strong>0.1 SOL</strong> (1 Day, 7 Days, or 30 Days) to unlock:
                </p>
                <ul className="space-y-2 text-xs font-mono uppercase text-foreground/90">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Interactive node correlation visualizer</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Custom drag, connect, and reset flows</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>7-Day weighted NLP sentiment analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Live headline pin-to-canvas engine</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => openSubscriptionModal("market-news")}
                  className="w-full py-3.5 bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.99] transition-all rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary/20 cursor-pointer"
                >
                  Choose Plan & Unlock Pro
                </button>

                {/* Developer / Tester Preview Simulation Button */}
                <button
                  onClick={() => {
                    setSimulatedSubscribe(true);
                    toast.success("Developer Preview: Pro Visualizer unlocked");
                  }}
                  className="w-full py-2 bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-xl font-bold uppercase tracking-wider text-[10px] cursor-pointer"
                >
                  Simulate Unlock (Dev Preview)
                </button>

                <Link
                  href="/market-news"
                  className="w-full py-2.5 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-all rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  Back to Market News Home
                </Link>
              </div>
            </motion.div>
          ) : (
            /* ====================================================
               PRO UNLOCKED: INTERACTIVE NEWS EVENT VISUALIZER
               ==================================================== */
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* PRIMARY INTERACTIVE EVENT VISUALIZER */}
              <NewsEventVisualizer
                liveArticles={articles}
                onOpenSentimentModal={() => setShowSentimentModal(true)}
              />

              {/* CURATED STORYLINE NARRATIVES EXPLORER (Below Visualizer) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-black text-sm uppercase tracking-tight text-foreground flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-primary" />
                      <span>Tracked Macro Storylines</span>
                    </h3>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      Explore active narratives and milestones mapped in the visualizer
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {STORYLINE_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      className="bg-card/40 border border-border/70 hover:border-border rounded-2xl p-4 transition-all hover:bg-muted/20 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {preset.nodes.length} Milestones
                          </span>
                          <span className="text-[9px] font-mono uppercase text-muted-foreground">
                            {preset.edges.length} Connections
                          </span>
                        </div>
                        <h4 className="font-display font-bold text-xs uppercase text-foreground leading-snug">
                          {preset.name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 font-sans">
                          {preset.subtitle}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-emerald-400 font-bold">
                          ● Verified Flow
                        </span>
                        <span className="text-muted-foreground">
                          {preset.nodes[0]?.date || "2026-06"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ----------------------------------------------------
          7-DAY NLP SENTIMENT SCORING MODAL
          ---------------------------------------------------- */}
      <AnimatePresence>
        {showSentimentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121216] border border-border max-w-lg w-full rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-sm uppercase tracking-tight text-foreground">
                      7-Day NLP Sentiment Breakdown
                    </h3>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      Weighted natural language model sentiment index
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowSentimentModal(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chart */}
              <div className="h-52 w-full font-mono text-xs pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={SENTIMENT_CHART_DATA}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(255,255,255,0.06)"
                    />
                    <XAxis
                      dataKey="day"
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: "#27272a" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: "#27272a" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(18, 18, 22, 0.95)",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        fontFamily: "monospace",
                        fontSize: "10px",
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="sentiment" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40">
                  <span className="text-[9px] text-muted-foreground block uppercase">Avg Score</span>
                  <span className="text-sm font-black text-foreground">70.4%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40">
                  <span className="text-[9px] text-muted-foreground block uppercase">Bias</span>
                  <span className="text-sm font-black text-emerald-400">Bullish</span>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40">
                  <span className="text-[9px] text-muted-foreground block uppercase">Confidence</span>
                  <span className="text-sm font-black text-primary">High</span>
                </div>
              </div>

              <button
                onClick={() => setShowSentimentModal(false)}
                className="w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl font-mono text-xs font-bold uppercase transition-colors"
              >
                Close Breakdown
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
