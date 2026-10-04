"use client";

import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useFirebaseAuth } from "@/lib/l2database/auth";
import { Zap, RefreshCw, Database, ShieldCheck, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

interface L2DatabaseSyncBadgeProps {
  className?: string;
  compact?: boolean;
  onOpenModal?: () => void;
}

/**
 * Reusable UI component displaying the Sign In With Solana (SIWS) + L2 Database status.
 * Provides a 1-click cryptographic signature challenge flow to authenticate the user's Solana wallet.
 */
export function L2DatabaseSyncBadge({
  className = "",
  compact = false,
  onOpenModal,
}: L2DatabaseSyncBadgeProps) {
  const { publicKey, signMessage } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const {
    user: firebaseUser,
    isAuthenticated: isFirebaseAuthed,
    loading: isAuthLoading,
    loginWithWallet,
  } = useFirebaseAuth();

  const handleSyncWithSolana = async () => {
    if (onOpenModal) {
      onOpenModal();
      return;
    }

    if (!publicKey) {
      setWalletModalVisible(true);
      return;
    }

    if (!signMessage) {
      toast.error(
        "Current wallet does not support message signing. Please use Phantom, Solflare, or Solana Mobile."
      );
      return;
    }

    try {
      await loginWithWallet(publicKey, signMessage);
      toast.success("Authenticated with Solana (SIWS) successfully!", {
        icon: "⚡",
      });
    } catch (err: any) {
      console.error("[L2DatabaseSyncBadge] Auth error:", err);
      toast.error(err?.message || "Failed to authenticate with L2 Database.");
    }
  };

  if (isFirebaseAuthed) {
    const rawId = firebaseUser?.displayName || firebaseUser?.uid || "";
    const shortUid = rawId.length > 8
      ? `${rawId.substring(0, 4)}..${rawId.substring(rawId.length - 4)}`
      : rawId;

    return (
      <div
        className={`px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/15 to-[#14F195]/10 border border-emerald-500/30 text-emerald-500 text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs transition-all ${className}`}
        title={`SIWS Authenticated (UID: ${firebaseUser?.uid})`}
      >
        <span className="w-2 h-2 rounded-full bg-[#14F195] animate-pulse" />
        <ShieldCheck size={14} className="shrink-0 text-[#14F195]" />
        <span>{compact ? "SIWS Synced" : "SIWS Synced"}</span>
        {shortUid && <span className="text-[10px] opacity-80 hidden sm:inline">({shortUid})</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSyncWithSolana}
      disabled={isAuthLoading}
      className={`relative group px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-[#9945FF]/15 via-primary/20 to-[#14F195]/15 hover:from-[#9945FF]/25 hover:via-primary/30 hover:to-[#14F195]/25 border border-[#9945FF]/40 text-foreground hover:text-white text-xs font-mono font-bold transition-all shadow-md flex items-center gap-2 active:scale-95 ${className}`}
      title={
        publicKey
          ? "Sign cryptographic challenge to authenticate with Solana (SIWS)"
          : "Connect Solana wallet to sign in (SIWS)"
      }
    >
      <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[#9945FF] to-[#14F195] opacity-20 group-hover:opacity-40 blur transition duration-300 pointer-events-none" />
      {isAuthLoading ? (
        <RefreshCw size={13} className="animate-spin shrink-0 text-primary" />
      ) : (
        <Zap size={14} className="text-[#14F195] fill-[#14F195]/20 shrink-0 group-hover:scale-110 transition-transform" />
      )}
      <span className="relative z-10">
        {isAuthLoading
          ? "Authenticating..."
          : compact
          ? "SIWS Sign-In"
          : "Sign In with Solana (SIWS)"}
      </span>
    </button>
  );
}
