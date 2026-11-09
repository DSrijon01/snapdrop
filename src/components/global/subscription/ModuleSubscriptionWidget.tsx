"use client";

import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { useSubscription } from "@/context/SubscriptionContext";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { SubscriptionBadge } from "@/components/global/subscription/SubscriptionCountdown";
import { getStoredPhantomSession } from "@/lib/wallet/phantomDeeplink";

interface ModuleSubscriptionWidgetProps {
  moduleId: string;
}

export const ModuleSubscriptionWidget: React.FC<ModuleSubscriptionWidgetProps> = ({ moduleId }) => {
  const { subscriptions, hasAccess, openSubscriptionModal } = useSubscription();
  const { connected } = useWallet();

  const isWalletConnected = connected || (typeof window !== "undefined" && (Boolean(getStoredPhantomSession()) || Boolean(localStorage.getItem("streetsync_solana_auth_user"))));

  if (!isWalletConnected) return null;

  const sub = subscriptions[moduleId];
  const active = hasAccess(moduleId);
  const isCancelled = sub?.isCancelled || false;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2.5 font-sans shrink-0">
      {/* Mobile compact view (< sm) */}
      <div className="flex items-center gap-1.5 sm:hidden">
        <SubscriptionBadge
          expiresAt={sub?.expiresAt || null}
          isCancelled={isCancelled}
          onClick={() => openSubscriptionModal(moduleId)}
          compact
        />

        {active ? (
          <Link
            href={`/${moduleId}/${moduleId.replace(/-/g, "")}-pro`}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary hover:opacity-95 text-primary-foreground text-[11px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0"
          >
            <span>Pro</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        ) : (
          <button
            onClick={() => openSubscriptionModal(moduleId)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 shrink-0"
          >
            <Sparkles className="w-3 h-3 text-primary shrink-0 animate-pulse" />
            <span>Pro</span>
          </button>
        )}
      </div>

      {/* Desktop standard view (>= sm) */}
      <div className="hidden sm:flex items-center gap-2.5">
        <SubscriptionBadge
          expiresAt={sub?.expiresAt || null}
          isCancelled={isCancelled}
          onClick={() => openSubscriptionModal(moduleId)}
        />

        {active ? (
          <Link
            href={`/${moduleId}/${moduleId.replace(/-/g, "")}-pro`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary hover:opacity-95 text-primary-foreground text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-md shadow-primary/15 group hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Go to Pro</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ) : (
          <button
            onClick={() => openSubscriptionModal(moduleId)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 text-primary text-xs font-black uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" />
            <span>Unlock Pro</span>
          </button>
        )}
      </div>
    </div>
  );
};

