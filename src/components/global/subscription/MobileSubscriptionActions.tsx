"use client";

import React, { useState } from "react";
import { Zap, RefreshCw, Smartphone, ExternalLink, ShieldAlert, Sparkles, Check } from "lucide-react";
import { openInPhantomBrowser } from "@/lib/wallet/phantomDeeplink";
import { MODULE_NAMES } from "@/context/SubscriptionContext";

interface MobileSubscriptionActionsProps {
  moduleId: string;
  planName: string;
  priceSol: number;
  durationDays: number;
  submitting: boolean;
  isSubscribed: boolean;
  onSubscribe: () => Promise<void>;
  onClose: () => void;
  onEnterPro?: () => void;
  onCancelClick?: () => void;
}

export const MobileSubscriptionActions: React.FC<MobileSubscriptionActionsProps> = ({
  moduleId,
  planName,
  priceSol,
  durationDays,
  submitting,
  isSubscribed,
  onSubscribe,
  onClose,
  onEnterPro,
  onCancelClick,
}) => {
  const [openingPhantom, setOpeningPhantom] = useState(false);
  const moduleTitle = MODULE_NAMES[moduleId] || moduleId;
  const targetProRoute = `/${moduleId}/${moduleId.replace(/-/g, "")}-pro`;

  const handleLaunchPhantomBrowser = () => {
    setOpeningPhantom(true);
    try {
      const fullTargetUrl = typeof window !== "undefined"
        ? `${window.location.origin}${targetProRoute}`
        : `https://streetsync-ss.com${targetProRoute}`;
      openInPhantomBrowser(fullTargetUrl);
    } finally {
      setTimeout(() => setOpeningPhantom(false), 2000);
    }
  };

  if (isSubscribed) {
    return (
      <div className="space-y-2 pt-2">
        <button
          onClick={onEnterPro}
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs transition-all shadow-lg shadow-emerald-500/25 font-display"
        >
          <Zap className="w-4 h-4 fill-white" />
          <span>Enter {moduleTitle} Pro</span>
        </button>

        <button
          onClick={onSubscribe}
          disabled={submitting}
          className="w-full py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs transition-all font-display"
        >
          {submitting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>Extend by {durationDays} {durationDays === 1 ? "Day" : "Days"} ({priceSol} SOL)</span>
        </button>

        {onCancelClick && (
          <button
            onClick={onCancelClick}
            className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider text-[11px] border border-red-500/20"
          >
            Unsubscribe from Plan
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      {/* Devnet Network Tag */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono text-purple-400">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          Solana Devnet
        </span>
        <span className="text-[9px] text-muted-foreground uppercase">
          {priceSol} SOL / {durationDays} {durationDays === 1 ? "Day" : "Days"}
        </span>
      </div>

      {/* Primary Action: Deep Link Subscribe */}
      <button
        onClick={onSubscribe}
        disabled={submitting}
        className="w-full py-3.5 bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.99] rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs transition-all shadow-lg shadow-primary/20 font-display disabled:opacity-60 cursor-pointer"
      >
        {submitting ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Opening Phantom Wallet...</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 fill-primary-foreground" />
            <span>Pay & Unlock ({priceSol} SOL)</span>
          </>
        )}
      </button>

      {/* Alternative Action: Open Directly in Phantom App Web3 Browser */}
      <button
        type="button"
        onClick={handleLaunchPhantomBrowser}
        disabled={openingPhantom}
        className="w-full py-3 bg-[#AB9FF2]/15 hover:bg-[#AB9FF2]/25 active:scale-[0.99] text-[#AB9FF2] border border-[#AB9FF2]/30 rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs transition-all font-display cursor-pointer"
      >
        <Smartphone className="w-4 h-4" />
        <span>{openingPhantom ? "Opening Phantom App..." : "Open in Phantom App (Direct)"}</span>
        <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {/* Helpful Mobile Developer Instructions */}
      <p className="text-[10px] text-muted-foreground font-mono text-center leading-tight">
        Make sure Phantom is set to <strong className="text-foreground">Solana Devnet</strong> (Phantom ⚙️ ➔ Developer Settings ➔ Solana Devnet).
      </p>
    </div>
  );
};
