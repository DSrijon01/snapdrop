"use client";

import { useState, useEffect, useCallback } from "react";

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
}

export interface DailyStreakState {
  streak: number;
  levelInfo: StreakLevelInfo;
  levelEvent: LevelEvent;
  progressPercent: number;
  daysToNextLevel: number;
  simulateNextDay: () => void;
  simulateMissedDay: () => void;
}

export function useDailyStreak(walletAddress?: string | null): DailyStreakState {
  const storageKey = `streetsync_daily_streak_${walletAddress || "guest"}`;

  const [state, setState] = useState<StoredStreak>({
    streak: 1,
    lastLoginDate: getLocalDateKey(),
    lastLevel: 1,
    levelEvent: "none",
  });

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
      };
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setState(updated);
    } catch {
      // Keep default state on storage error
    }
  }, [storageKey]);

  const simulateNextDay = useCallback(() => {
    setState((prev) => {
      const nextStreak = prev.streak + 1;
      const prevLevel = getLevelForStreak(prev.streak).level;
      const nextLevel = getLevelForStreak(nextStreak).level;
      const updated: StoredStreak = {
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
    simulateNextDay,
    simulateMissedDay,
  };
}
