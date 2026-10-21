"use client";

import React, { useState, useEffect } from "react";
import { ProEvent } from "./types";
import { motion } from "framer-motion";
import {
  Clock,
  Flame,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

interface EventBannerProps {
  events: ProEvent[];
  selectedEvent: ProEvent;
  onSelectEvent: (event: ProEvent) => void;
  onCreateNew24hEvent: (title: string, category: string) => Promise<void>;
}

export function EventBanner({
  events,
  selectedEvent,
  onSelectEvent,
  onCreateNew24hEvent,
}: EventBannerProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    hours: 24,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Solana Ecosystem");
  const [isCreating, setIsCreating] = useState(false);

  // Live countdown timer ticking down every second
  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = selectedEvent.expiryTs - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
      } else {
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setTimeLeft({ hours, minutes, seconds, isExpired: false });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [selectedEvent.expiryTs]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setIsCreating(true);
      await onCreateNew24hEvent(newTitle.trim(), newCategory);
      setNewTitle("");
      setShowCreateModal(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Event Selection Pills & "Launch 24H Event" Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {events.map((ev) => {
            const isSelected = ev.id === selectedEvent.id;
            return (
              <button
                key={ev.id}
                onClick={() => onSelectEvent(ev)}
                className={`px-4 py-2 rounded-2xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                    : "bg-card/60 hover:bg-card border-border/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${isSelected ? "text-primary-foreground" : "text-amber-500"}`} />
                <span className="truncate max-w-[200px]">{ev.title}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-2xl bg-muted/80 hover:bg-muted text-foreground border border-border/80 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 shadow-sm hover:scale-[1.02]"
        >
          <PlusCircle className="w-3.5 h-3.5 text-primary" />
          Create 24H Event
        </button>
      </div>

      {/* Hero Banner with 24H Expiry Timer & Implied Probabilities */}
      <div className="bg-gradient-to-r from-card/80 via-card/50 to-primary/5 border border-primary/20 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          {/* Title & Category */}
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                24H Real-Time Market
              </span>
              <span className="px-3 py-1 rounded-full bg-muted/80 border border-border text-muted-foreground text-[10px] font-mono uppercase">
                {selectedEvent.category}
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-foreground">
              {selectedEvent.title}
            </h2>

            <p className="text-xs font-mono text-muted-foreground">
              Real-time Market Maker / Taker orderbook & AMM trading enabled for this 24-hour cycle.
            </p>
          </div>

          {/* 24-Hour Countdown Clock & Live Trading Indicator */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Clock Widget */}
            <div className="bg-card/80 border border-border/80 rounded-2xl p-4 text-center min-w-[170px] shadow-lg">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-[10px] font-mono uppercase pb-1">
                <Clock className="w-3 h-3 text-primary animate-spin" />
                <span>24H Expiration Span</span>
              </div>
              <div className="font-mono text-2xl font-black text-foreground tracking-widest">
                {String(timeLeft.hours).padStart(2, "0")}:
                {String(timeLeft.minutes).padStart(2, "0")}:
                {String(timeLeft.seconds).padStart(2, "0")}
              </div>
              <div className="pt-1.5">
                {!timeLeft.isExpired ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE MM/TAKER
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    TRADING CLOSED
                  </span>
                )}
              </div>
            </div>

            {/* Implied Probabilities Pill */}
            <div className="bg-card/80 border border-border/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <span className="text-[10px] font-mono uppercase text-muted-foreground block text-center pb-2">
                Implied Probability
              </span>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <span className="text-[10px] font-mono text-emerald-400 block font-bold">YES</span>
                  <span className="text-lg font-black font-mono text-emerald-400">
                    {Math.round(selectedEvent.yesPrice * 100)}%
                  </span>
                </div>
                <div className="h-7 w-[1px] bg-border" />
                <div className="text-center">
                  <span className="text-[10px] font-mono text-rose-400 block font-bold">NO</span>
                  <span className="text-lg font-black font-mono text-rose-400">
                    {Math.round(selectedEvent.noPrice * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Creating New 24H Event */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border/80 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-5 shadow-2xl relative"
          >
            <div className="space-y-1">
              <h3 className="text-xl font-black font-display uppercase tracking-tight">
                Launch 24-Hour Trading Event
              </h3>
              <p className="text-xs font-mono text-muted-foreground">
                Creates an on-chain binary prediction event with a strict 24-hour expiration window.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                  Event Question / Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Will Solana reach $220 in 24 hours?"
                  required
                  className="w-full bg-muted/30 border border-border/80 rounded-xl px-4 py-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-muted-foreground block mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-muted/30 border border-border/80 rounded-xl px-4 py-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="Solana Ecosystem">Solana Ecosystem</option>
                  <option value="DeFi Protocol">DeFi Protocol</option>
                  <option value="Crypto Macro">Crypto Macro</option>
                  <option value="Trading Volume">Trading Volume</option>
                </select>
              </div>

              <div className="p-3 bg-muted/20 border border-border/60 rounded-xl text-[11px] font-mono text-muted-foreground">
                Expiration timestamp is automatically set to exactly <strong className="text-foreground">24 hours from creation</strong>.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-mono font-bold uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTitle.trim()}
                  className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-lg shadow-primary/20"
                >
                  {isCreating ? "Launching..." : "Launch 24H Event"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
