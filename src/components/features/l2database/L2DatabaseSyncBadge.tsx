"use client";

import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useFirebaseAuth } from "@/lib/l2database/auth";
import { Zap, RefreshCw, Database, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

interface L2DatabaseSyncBadgeProps {
  className?: string;
  compact?: boolean;
}

/**
 * Reusable UI component displaying the L2 Database (Firebase + Solana Auth) connection status.
 * Provides a 1-click cryptographic signature challenge flow to authenticate the user's Solana wallet.
 */
export function L2DatabaseSyncBadge({
  className = "",
  compact = false,
}: L2DatabaseSyncBadgeProps) {
  const { publicKey, signMessage } = useWallet();
  const {
    user: firebaseUser,
    isAuthenticated: isFirebaseAuthed,
    loading: isAuthLoading,
    loginWithWallet,
  } = useFirebaseAuth();

  const handleSyncWithSolana = async () => {
    if (!publicKey) {
      toast.error("Please connect your Solana wallet first.");
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
      toast.success("Authenticated with L2 Database via Solana wallet!");
    } catch (err: any) {
      console.error("[L2DatabaseSyncBadge] Auth error:", err);
      toast.error(err?.message || "Failed to authenticate with L2 Database.");
    }
  };

  if (isFirebaseAuthed) {
    const shortUid = firebaseUser?.uid
      ? `${firebaseUser.uid.substring(0, 4)}..${firebaseUser.uid.substring(
          firebaseUser.uid.length - 4
        )}`
      : "";

    return (
      <div
        className={`px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs transition-all ${className}`}
        title={`Connected to L2 Database (UID: ${firebaseUser?.uid})`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <Database size={13} className="shrink-0" />
        <span>{compact ? "Synced" : "L2 Database Synced"}</span>
        {shortUid && <span className="text-[10px] opacity-75 hidden sm:inline">({shortUid})</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSyncWithSolana}
      disabled={isAuthLoading || !publicKey}
      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary hover:text-primary-hover text-xs font-mono font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 active:scale-95 ${className}`}
      title={
        publicKey
          ? "Sign cryptographic challenge to authenticate with L2 Database"
          : "Connect Solana wallet to sync with L2 Database"
      }
    >
      {isAuthLoading ? (
        <RefreshCw size={13} className="animate-spin shrink-0" />
      ) : (
        <Zap size={13} className="fill-primary/20 shrink-0" />
      )}
      <span>{isAuthLoading ? "Authenticating..." : compact ? "Sync L2" : "Sync Solana to L2 DB"}</span>
    </button>
  );
}
