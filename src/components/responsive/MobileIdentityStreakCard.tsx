"use client";

import React from "react";
import { Copy, Check, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useDailyStreak } from "@/lib/streak/useDailyStreak";

interface MobileIdentityStreakCardProps {
  walletAddress: string;
  balance: number | null;
  copied: boolean;
  onCopyAddress: () => void;
}

/**
 * Mobile-only User Identity + Daily Login Streak & Level Progression Card.
 * Lives inside the MobileNavDock drawer right under "STREET SYNC MODULES".
 */
export function MobileIdentityStreakCard({
  walletAddress,
  balance,
  copied,
  onCopyAddress,
}: MobileIdentityStreakCardProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const {
    streak,
    levelInfo,
    levelEvent,
    progressPercent,
    daysToNextLevel,
  } = useDailyStreak(walletAddress, {
    connection,
    publicKey,
    sendTransaction,
  });

  return (
    <div
      style={{
        boxShadow: `0 0 16px ${levelInfo.glowColor}1F`,
      }}
      className="md:hidden p-3.5 rounded-2xl bg-secondary/45 border border-border/90 space-y-3 relative overflow-hidden"
    >
      {/* Subtle ambient glow matching user's current level */}
      <div
        style={{ backgroundColor: levelInfo.glowColor }}
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-15 blur-2xl pointer-events-none"
      />

      {/* Top Row: Robot Avatar + Wallet Address + SOL Balance + Solid Level Tab + Copy */}
      <div className="flex items-center justify-between gap-2.5 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div
            style={{
              boxShadow: `0 0 12px ${levelInfo.glowColor}45`,
              borderColor: `${levelInfo.glowColor}88`,
            }}
            className="relative w-10 h-10 rounded-full bg-background border p-1 shrink-0"
          >
            <img
              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${walletAddress}&backgroundColor=transparent`}
              alt="Avatar"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-foreground truncate">
                {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
              </span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </div>
            <p className="text-[11px] font-mono text-muted-foreground">
              {balance !== null ? `${balance.toFixed(4)} SOL` : "Loading..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Solid Level Tab (no icons) */}
          <span
            className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider ${levelInfo.solidBadgeClass}`}
            title={levelInfo.title}
          >
            Level {levelInfo.level}
          </span>

          <button
            onClick={onCopyAddress}
            className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
            title="Copy Address"
            aria-label="Copy Address"
          >
            {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
          </button>
        </div>
      </div>

      {/* Bottom Row: Level Progression Bar with Day Count */}
      <div className="space-y-1.5 pt-2 border-t border-border/50 relative z-10">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground uppercase tracking-wide">
              {levelInfo.title} • Day {streak}
            </span>
            {levelEvent === "up" && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/50 text-[8px] font-black uppercase">
                <TrendingUp size={9} /> Level Up
              </span>
            )}
            {levelEvent === "down" && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-400/50 text-[8px] font-black uppercase">
                <TrendingDown size={9} /> Level Down
              </span>
            )}
          </div>

          <span className="text-muted-foreground">
            {levelInfo.nextLevelDays
              ? `${daysToNextLevel}d to LVL ${levelInfo.level + 1}`
              : "Max Level"}
          </span>
        </div>

        {/* Animated Glowing Progress Track */}
        <div className="h-2 w-full rounded-full bg-background/80 border border-border/60 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            style={{
              backgroundColor: levelInfo.glowColor,
              boxShadow: `0 0 10px ${levelInfo.glowColor}`,
            }}
            className="h-full rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
