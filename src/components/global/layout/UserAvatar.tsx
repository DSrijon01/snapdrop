"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useDailyStreak } from "@/lib/streak/useDailyStreak";

export function UserAvatar() {
  const { publicKey, connected, sendTransaction, wallet } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);

  const walletAddress = publicKey ? publicKey.toBase58() : null;
  const isPhantomMobile = Boolean((wallet?.adapter as any)?.isPhantomMobileAdapter);
  const isDemo = wallet?.adapter.name === "Street Sync Demo";

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
    autoSyncOnLogin: connected && !isPhantomMobile && !isDemo,
  });

  useEffect(() => {
    if (!publicKey) return;

    connection
      .getBalance(publicKey)
      .then((lamports) => {
        setBalance(lamports / LAMPORTS_PER_SOL);
      })
      .catch(console.error);

    const id = connection.onAccountChange(publicKey, (acc) => {
      setBalance(acc.lamports / LAMPORTS_PER_SOL);
    });

    return () => {
      connection.removeAccountChangeListener(id);
    };
  }, [publicKey, connection]);

  const seed = publicKey ? publicKey.toString() : "guest";
  const displayId = publicKey ? publicKey.toString().substring(0, 4).toUpperCase() : "GUEST";

  return (
    <div className="flex items-center gap-3 w-full min-w-0">
      {/* Avatar Image Wrapper with subtle Level glow */}
      <div className="relative group/avatar cursor-pointer shrink-0">
        <img
          src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=transparent`}
          alt="User Avatar"
          style={{
            filter: `drop-shadow(0 0 12px ${levelInfo.glowColor}aa)`,
          }}
          className="w-10 h-10 object-contain animate-bounce group-hover/avatar:scale-110 transition-transform duration-300 pointer-events-auto"
        />
      </div>

      {/* Expanded Text & Level Progression Area */}
      <div className="md:hidden md:group-hover:flex flex-col justify-center whitespace-nowrap transition-opacity overflow-hidden flex flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5 w-full">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-bold text-foreground font-display tracking-tight truncate">
              User_{displayId}
            </span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse drop-shadow-[0_0_5px_rgba(34,197,94,0.8)] shrink-0" />
          </div>

          {/* Solid Level Tab only (no icons, no on-chain button) */}
          <span
            className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[9px] font-mono font-black uppercase tracking-wider shrink-0 ${levelInfo.solidBadgeClass}`}
            title={levelInfo.title}
          >
            Level {levelInfo.level}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
            {balance !== null ? `${balance.toFixed(4)} SOL` : "Loading..."}
          </span>
          <span className="text-[9px] font-mono font-bold text-foreground/80 uppercase">
            Day {streak}
          </span>
        </div>

        {/* Compact Level Progression Bar */}
        <div className="mt-1.5 space-y-1 w-full">
          <div className="h-1.5 w-full rounded-full bg-background/80 border border-border/60 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              style={{
                backgroundColor: levelInfo.glowColor,
                boxShadow: `0 0 8px ${levelInfo.glowColor}`,
              }}
              className="h-full rounded-full"
            />
          </div>

          <div className="flex items-center justify-between text-[8px] font-mono text-muted-foreground uppercase">
            <span className="font-bold text-foreground/85 truncate">
              {levelInfo.title}
              {levelEvent === "up" && (
                <span className="ml-1 text-emerald-500 font-black">• UP</span>
              )}
              {levelEvent === "down" && (
                <span className="ml-1 text-red-500 font-black">• DOWN</span>
              )}
            </span>
            <span className="shrink-0">
              {levelInfo.nextLevelDays
                ? `${daysToNextLevel}d to L${levelInfo.level + 1}`
                : "MAX"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
