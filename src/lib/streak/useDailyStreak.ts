"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { MEMO_PROGRAM_ID } from "@/lib/subscriptions/onChainSubscriptions";

export interface StreakLevelInfo {
  level: number;
  title: string;
  minDays: number;
  nextLevelDays: number | null;
  glowColor: string;
  badgeClass: string;
  solidBadgeClass: string;
}

export const STREAK_LEVELS: StreakLevelInfo[] = [
  {
    level: 1,
    title: "Rookie SS",
    minDays: 1,
    nextLevelDays: 3,
    glowColor: "#38bdf8",
    badgeClass:
      "bg-sky-500/15 text-sky-400 border-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.35)]",
    solidBadgeClass:
      "bg-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.45)]",
  },
  {
    level: 2,
    title: "SS Runner",
    minDays: 3,
    nextLevelDays: 7,
    glowColor: "#facc15",
    badgeClass:
      "bg-yellow-400/15 text-yellow-400 border-yellow-400/50 shadow-[0_0_14px_rgba(250,204,21,0.4)]",
    solidBadgeClass:
      "bg-yellow-400 text-slate-950 shadow-[0_0_14px_rgba(250,204,21,0.5)]",
  },
  {
    level: 3,
    title: "SS Grinder",
    minDays: 7,
    nextLevelDays: 14,
    glowColor: "#10b981",
    badgeClass:
      "bg-emerald-500/15 text-emerald-400 border-emerald-400/50 shadow-[0_0_14px_rgba(16,185,129,0.4)]",
    solidBadgeClass:
      "bg-emerald-500 text-white shadow-[0_0_14px_rgba(16,185,129,0.5)]",
  },
  {
    level: 4,
    title: "SS Whale",
    minDays: 14,
    nextLevelDays: 30,
    glowColor: "#a855f7",
    badgeClass:
      "bg-purple-500/15 text-purple-400 border-purple-400/50 shadow-[0_0_16px_rgba(168,85,247,0.45)]",
    solidBadgeClass:
      "bg-purple-500 text-white shadow-[0_0_16px_rgba(168,85,247,0.5)]",
  },
  {
    level: 5,
    title: "Apex SS",
    minDays: 30,
    nextLevelDays: null,
    glowColor: "#ff1801",
    badgeClass:
      "bg-red-500/20 text-red-400 border-red-500/60 shadow-[0_0_18px_rgba(255,24,1,0.5)]",
    solidBadgeClass:
      "bg-[#ff1801] text-white shadow-[0_0_18px_rgba(255,24,1,0.55)]",
  },
];

export function getLevelForStreak(streak: number): StreakLevelInfo {
  let current = STREAK_LEVELS[0];
  for (const tier of STREAK_LEVELS) {
    if (streak >= tier.minDays) {
      current = tier;
    }
  }
  return current;
}

function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function diffCalendarDays(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / (1000 * 60 * 60 * 24));
}

export type LevelEvent = "up" | "down" | "none";

interface StoredStreak {
  streak: number;
  lastLoginDate: string;
  lastLevel: number;
  levelEvent: LevelEvent;
  onChainDate?: string | null;
  onChainTx?: string | null;
}

export interface OnChainStreakOptions {
  connection?: Connection;
  publicKey?: PublicKey | null;
  sendTransaction?: (tx: Transaction, connection: Connection) => Promise<string>;
  autoSyncOnLogin?: boolean;
}

export interface DailyStreakState {
  streak: number;
  levelInfo: StreakLevelInfo;
  levelEvent: LevelEvent;
  progressPercent: number;
  daysToNextLevel: number;
  onChainSyncedToday: boolean;
  onChainTx: string | null;
  isSyncingOnChain: boolean;
  simulateNextDay: () => void;
  simulateMissedDay: () => void;
  recordStreakOnChain: () => Promise<boolean>;
}

export function useDailyStreak(
  walletAddress?: string | null,
  chainOptions?: OnChainStreakOptions
): DailyStreakState {
  const storageKey = `streetsync_daily_streak_${walletAddress || "guest"}`;
  const todayKey = getLocalDateKey();
  const chainCheckedRef = useRef<string | null>(null);

  const [state, setState] = useState<StoredStreak>({
    streak: 1,
    lastLoginDate: todayKey,
    lastLevel: 1,
    levelEvent: "none",
    onChainDate: null,
    onChainTx: null,
  });
  const [isSyncingOnChain, setIsSyncingOnChain] = useState(false);

  // 1. Local daily check-in (instant, never blocks or throws)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = getLocalDateKey();

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        const initial: StoredStreak = {
          streak: 1,
          lastLoginDate: today,
          lastLevel: 1,
          levelEvent: "none",
          onChainDate: null,
          onChainTx: null,
        };
        localStorage.setItem(storageKey, JSON.stringify(initial));
        setState(initial);
        return;
      }

      const parsed: StoredStreak = JSON.parse(raw);
      const daysSince = diffCalendarDays(parsed.lastLoginDate, today);

      if (daysSince <= 0) {
        setState(parsed);
        return;
      }

      let nextStreak = 1;
      let event: LevelEvent = "none";
      const prevLevel = parsed.lastLevel || getLevelForStreak(parsed.streak).level;

      if (daysSince === 1) {
        nextStreak = parsed.streak + 1;
        const nextLevel = getLevelForStreak(nextStreak).level;
        if (nextLevel > prevLevel) event = "up";
      } else {
        nextStreak = 1;
        const nextLevel = getLevelForStreak(nextStreak).level;
        if (nextLevel < prevLevel) event = "down";
      }

      const updated: StoredStreak = {
        streak: nextStreak,
        lastLoginDate: today,
        lastLevel: getLevelForStreak(nextStreak).level,
        levelEvent: event,
        onChainDate: parsed.onChainDate || null,
        onChainTx: parsed.onChainTx || null,
      };
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setState(updated);
    } catch {
      // Fail-safe: keep default state
    }
  }, [storageKey]);

  // 2. Non-blocking fail-safe on-chain Memo recovery (SS_STREAK:<date>:<streak>:<level>)
  useEffect(() => {
    const conn = chainOptions?.connection;
    const pubkey = chainOptions?.publicKey;
    if (!conn || !pubkey || !walletAddress) return;

    const checkKey = `${walletAddress}_${todayKey}`;
    if (chainCheckedRef.current === checkKey) return;
    chainCheckedRef.current = checkKey;

    let cancelled = false;
    const recoverFromChain = async () => {
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Streak RPC timeout")), 3000)
        );
        const sigs = await Promise.race([
          conn.getSignaturesForAddress(pubkey, { limit: 20 }),
          timeout,
        ]);
        if (cancelled || !Array.isArray(sigs)) return;

        for (const sigInfo of sigs) {
          if (sigInfo.err || !sigInfo.memo || typeof sigInfo.memo !== "string") continue;
          const cleanMemo = sigInfo.memo.replace(/^\[\d+\]\s*/, "").trim();
          if (!cleanMemo.startsWith("SS_STREAK:")) continue;

          const parts = cleanMemo.split(":");
          if (parts.length < 4) continue;
          const memoDate = parts[1];
          const memoStreak = Number(parts[2]);
          if (!memoDate || !Number.isFinite(memoStreak) || memoStreak < 1) continue;

          const gap = diffCalendarDays(memoDate, todayKey);
          setState((prev) => {
            // Only adopt on-chain streak if it's from today or yesterday and >= local
            let resolvedStreak = prev.streak;
            let resolvedDate = prev.lastLoginDate;
            let resolvedEvent = prev.levelEvent;

            if (gap === 0 && memoStreak > prev.streak) {
              resolvedStreak = memoStreak;
              resolvedDate = todayKey;
            } else if (gap === 1 && memoStreak + 1 > prev.streak) {
              resolvedStreak = memoStreak + 1;
              resolvedDate = todayKey;
              if (getLevelForStreak(resolvedStreak).level > getLevelForStreak(prev.streak).level) {
                resolvedEvent = "up";
              }
            }

            const updated: StoredStreak = {
              streak: resolvedStreak,
              lastLoginDate: resolvedDate,
              lastLevel: getLevelForStreak(resolvedStreak).level,
              levelEvent: resolvedEvent,
              onChainDate: gap === 0 ? todayKey : prev.onChainDate || null,
              onChainTx: gap === 0 ? sigInfo.signature : prev.onChainTx || null,
            };
            try {
              localStorage.setItem(storageKey, JSON.stringify(updated));
            } catch {}
            return updated;
          });
          break;
        }
      } catch {
        // Fail-safe: silently fall back to local streak if RPC is unavailable
      }
    };

    recoverFromChain();
    return () => {
      cancelled = true;
    };
  }, [chainOptions?.connection, chainOptions?.publicKey, walletAddress, todayKey, storageKey]);

  // 3. Optional / Auto-on-login on-chain check-in via Solana Memo Program (strictly fail-safe, max once per day)
  const recordStreakOnChain = useCallback(async (): Promise<boolean> => {
    const conn = chainOptions?.connection;
    const pubkey = chainOptions?.publicKey;
    const sendTx = chainOptions?.sendTransaction;
    if (!conn || !pubkey || !sendTx || isSyncingOnChain) return false;

    setIsSyncingOnChain(true);
    try {
      const level = getLevelForStreak(state.streak).level;
      const memoText = `SS_STREAK:${todayKey}:${state.streak}:${level}`;
      const ix = new TransactionInstruction({
        keys: [{ pubkey, isSigner: true, isWritable: true }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memoText, "utf-8"),
      });

      const tx = new Transaction().add(ix);
      const { blockhash } = await conn.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = pubkey;

      const sig = await sendTx(tx, conn);
      setState((prev) => {
        const updated: StoredStreak = {
          ...prev,
          onChainDate: todayKey,
          onChainTx: sig,
        };
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      return true;
    } catch {
      // Fail-safe: user rejected or insufficient fee SOL — local streak remains intact
      return false;
    } finally {
      setIsSyncingOnChain(false);
    }
  }, [chainOptions?.connection, chainOptions?.publicKey, chainOptions?.sendTransaction, isSyncingOnChain, state.streak, todayKey, storageKey]);

  useEffect(() => {
    if (!chainOptions?.autoSyncOnLogin || !walletAddress || !chainOptions?.publicKey) return;
    if (state.onChainDate === todayKey || isSyncingOnChain) return;

    const attemptKey = `streetsync_streak_tx_attempted_${walletAddress}_${todayKey}`;
    try {
      if (localStorage.getItem(attemptKey)) return;
      localStorage.setItem(attemptKey, "1");
    } catch {
      return;
    }

    // Small delay after login so wallet adapter settles cleanly
    const timer = setTimeout(() => {
      recordStreakOnChain().catch(() => {});
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    chainOptions?.autoSyncOnLogin,
    chainOptions?.publicKey,
    walletAddress,
    todayKey,
    state.onChainDate,
    isSyncingOnChain,
    recordStreakOnChain,
  ]);

  const simulateNextDay = useCallback(() => {
    setState((prev) => {
      const nextStreak = prev.streak + 1;
      const prevLevel = getLevelForStreak(prev.streak).level;
      const nextLevel = getLevelForStreak(nextStreak).level;
      const updated: StoredStreak = {
        ...prev,
        streak: nextStreak,
        lastLoginDate: getLocalDateKey(),
        lastLevel: nextLevel,
        levelEvent: nextLevel > prevLevel ? "up" : "none",
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [storageKey]);

  const simulateMissedDay = useCallback(() => {
    setState((prev) => {
      const prevLevel = getLevelForStreak(prev.streak).level;
      const nextStreak = 1;
      const nextLevel = getLevelForStreak(nextStreak).level;
      const updated: StoredStreak = {
        ...prev,
        streak: nextStreak,
        lastLoginDate: getLocalDateKey(),
        lastLevel: nextLevel,
        levelEvent: nextLevel < prevLevel ? "down" : "none",
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [storageKey]);

  const levelInfo = getLevelForStreak(state.streak);
  const nextMin = levelInfo.nextLevelDays;
  const progressPercent = nextMin
    ? Math.min(
        100,
        Math.max(
          8,
          Math.round(
            ((state.streak - levelInfo.minDays + 1) / (nextMin - levelInfo.minDays + 1)) * 100
          )
        )
      )
    : 100;

  const daysToNextLevel = nextMin ? Math.max(0, nextMin - state.streak) : 0;

  return {
    streak: state.streak,
    levelInfo,
    levelEvent: state.levelEvent,
    progressPercent,
    daysToNextLevel,
    onChainSyncedToday: state.onChainDate === todayKey,
    onChainTx: state.onChainTx || null,
    isSyncingOnChain,
    simulateNextDay,
    simulateMissedDay,
    recordStreakOnChain,
  };
}
