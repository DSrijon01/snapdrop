"use client";

import React, { useState, useEffect } from "react";
import { Clock, Sparkles, ShieldCheck, ShieldAlert, ArrowUpRight } from "lucide-react";
import { useSubscription, MODULE_NAMES } from "@/context/SubscriptionContext";

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  formattedCompact: string;
}

export function calculateTimeRemaining(expiresAt: number | null): TimeRemaining {
  if (!expiresAt) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isExpired: true,
      formattedCompact: "Expired",
    };
  }

  const now = Date.now();
  const diffMs = expiresAt - now;

  if (diffMs <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isExpired: true,
      formattedCompact: "Expired",
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let formattedCompact = "";
  if (days > 0) {
    formattedCompact = `${days}d ${hours}h left`;
  } else if (hours > 0) {
    formattedCompact = `${hours}h ${minutes}m left`;
  } else {
    formattedCompact = `${minutes}m ${seconds}s left`;
  }

  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds,
    isExpired: false,
    formattedCompact,
  };
}

export function useSubscriptionTimer(expiresAt: number | null): TimeRemaining {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(expiresAt)
  );

  useEffect(() => {
    setTimeRemaining(calculateTimeRemaining(expiresAt));

    if (!expiresAt || expiresAt <= Date.now()) return;

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(expiresAt);
      setTimeRemaining(remaining);
      if (remaining.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return timeRemaining;
}

/**
 * Compact countdown badge for widgets and tabs
 */
export const SubscriptionBadge: React.FC<{
  expiresAt: number | null;
  isCancelled?: boolean;
  onClick?: () => void;
  className?: string;
}> = ({ expiresAt, isCancelled, onClick, className = "" }) => {
  const timer = useSubscriptionTimer(expiresAt);

  if (timer.isExpired) {
    return (
      <span
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-muted text-muted-foreground border border-border/80 ${
          onClick ? "cursor-pointer hover:bg-muted/80" : ""
        } ${className}`}
      >
        <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />
        <span>Pro Inactive</span>
      </span>
    );
  }

  return (
    <button
      onClick={onClick}
      type="button"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-bold tracking-wide transition-all duration-200 border ${
        isCancelled
          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
          : "bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 shadow-[0_0_12px_rgba(var(--primary),0.15)]"
      } ${className}`}
      title={expiresAt ? `Expires: ${new Date(expiresAt).toLocaleString()}` : undefined}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isCancelled ? "bg-amber-400" : "bg-primary"
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isCancelled ? "bg-amber-500" : "bg-primary"
          }`}
        />
      </span>
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>Pro: {timer.formattedCompact}</span>
    </button>
  );
};

/**
 * Modern matrix display showing Days, Hours, Minutes, Seconds
 */
export const SubscriptionCountdownCards: React.FC<{
  expiresAt: number | null;
  className?: string;
}> = ({ expiresAt, className = "" }) => {
  const timer = useSubscriptionTimer(expiresAt);

  const units = [
    { label: "DAYS", value: timer.days },
    { label: "HOURS", value: timer.hours },
    { label: "MINS", value: timer.minutes },
    { label: "SECS", value: timer.seconds },
  ];

  return (
    <div className={`grid grid-cols-4 gap-2 sm:gap-3 ${className}`}>
      {units.map((unit) => (
        <div
          key={unit.label}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3.5 bg-background/60 backdrop-blur-md border border-primary/20 rounded-2xl shadow-inner text-center"
        >
          <span className="text-xl sm:text-2xl font-black font-display text-primary tracking-tight tabular-nums">
            {String(unit.value).padStart(2, "0")}
          </span>
          <span className="text-[9px] sm:text-[10px] font-mono uppercase font-bold text-muted-foreground tracking-widest mt-0.5">
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Top Status Bar embedded in Pro App pages
 */
export const ProStatusBar: React.FC<{
  moduleId: string;
  className?: string;
}> = ({ moduleId, className = "" }) => {
  const { subscriptions, hasAccess, openSubscriptionModal } = useSubscription();
  const sub = subscriptions[moduleId];
  const active = hasAccess(moduleId);
  const timer = useSubscriptionTimer(sub?.expiresAt || null);

  if (!active || !sub?.expiresAt) return null;

  return (
    <div
      className={`w-full max-w-7xl mx-auto mb-6 px-4 py-3 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${className}`}
    >
      <div className="flex items-center gap-2.5 text-foreground">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
          <ShieldCheck className="w-4 h-4" />
          {MODULE_NAMES[moduleId] || "Pro"} Active
        </span>
        <span className="text-muted-foreground hidden sm:inline">•</span>
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <strong className="text-foreground">{timer.formattedCompact}</strong>
          <span className="hidden md:inline">
            ({new Date(sub.expiresAt).toLocaleDateString()} {new Date(sub.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
          </span>
        </span>
      </div>

      <button
        onClick={() => openSubscriptionModal(moduleId)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary font-bold uppercase tracking-wider text-[11px] transition-all hover:scale-105 active:scale-95"
      >
        <span>Extend / Manage</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
