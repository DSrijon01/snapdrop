"use client";

import React from "react";
import { Sparkles, Shield, ShieldAlert, ShieldCheck, ArrowRight } from "lucide-react";
import { useSubscription } from "@/context/SubscriptionContext";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";

interface ModuleSubscriptionWidgetProps {
  moduleId: string;
}

export const ModuleSubscriptionWidget: React.FC<ModuleSubscriptionWidgetProps> = ({ moduleId }) => {
  const { subscriptions, hasAccess, openSubscriptionModal } = useSubscription();
  const { connected } = useWallet();

  if (!connected) return null;

  const sub = subscriptions[moduleId];
  const active = hasAccess(moduleId);
  const isCancelled = sub?.isCancelled || false;

  // Determine pill appearance based on status
  let statusText = "Pro: Inactive";
  let pillClass = "bg-muted hover:bg-muted/80 text-muted-foreground border-border/80";
  let Icon = ShieldAlert;

  if (active) {
    if (isCancelled) {
      statusText = "Pro: Active (Cancelled)";
      pillClass = "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/20";
      Icon = Shield;
    } else {
      statusText = "Pro: Active";
      pillClass = "bg-primary/10 hover:bg-primary/20 text-primary border-primary/20";
      Icon = ShieldCheck;
    }
  }

  return (
    <div className="flex items-center gap-3 font-sans shrink-0">
      {/* Status Pill */}
      <button
        onClick={() => openSubscriptionModal(moduleId)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono font-bold tracking-wide uppercase transition-all duration-200 focus:outline-none ${pillClass}`}
        title="Manage Subscription"
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{statusText}</span>
      </button>

      {/* Action Button */}
      {active ? (
        <Link
          href={`/${moduleId}/${moduleId.replace(/-/g, "")}-pro`}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary hover:opacity-95 text-primary-foreground text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-md shadow-primary/10 group"
        >
          <span>Go to Pro</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      ) : (
        <button
          onClick={() => openSubscriptionModal(moduleId)}
          className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary text-xs font-black uppercase tracking-wider transition-all duration-200"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" />
          <span>Upgrade (1 SOL)</span>
        </button>
      )}
    </div>
  );
};
