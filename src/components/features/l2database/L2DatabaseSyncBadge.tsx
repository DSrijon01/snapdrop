"use client";

import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useSIWS } from "./SIWSContext";
import { Zap, RefreshCw, ShieldCheck, LogOut } from "lucide-react";
import toast from "react-hot-toast";

interface L2DatabaseSyncBadgeProps {
  className?: string;
  compact?: boolean;
  onOpenModal?: () => void;
}

/**
 * Reusable UI component displaying the Sign In With Solana (SIWS) + L2 Database status.
 * Provides a 1-click cryptographic signature challenge flow to authenticate the user's Solana wallet,
 * along with a direct Sign Out action.
 */
export function L2DatabaseSyncBadge({
  className = "",
  compact = false,
  onOpenModal,
}: L2DatabaseSyncBadgeProps) {
  const { publicKey } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const {
    user,
    isAuthenticated,
    isGuest,
    loading,
    logout,
    openSIWSModal,
    authenticatedWallet,
  } = useSIWS();

  const handleSyncWithSolana = () => {
    if (onOpenModal) {
      onOpenModal();
      return;
    }

    if (!publicKey) {
      setWalletModalVisible(true);
      return;
    }

    openSIWSModal();
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await logout();
      toast.success("Signed out of SIWS successfully", {
        icon: "👋",
      });
    } catch (err: any) {
      console.error("[L2DatabaseSyncBadge] Logout error:", err);
      toast.error("Failed to sign out of SIWS.");
    }
  };

  if (isAuthenticated) {
    const rawId = authenticatedWallet || user?.displayName || user?.uid || "";
    const shortUid = rawId.length > 8
      ? `${rawId.substring(0, 4)}..${rawId.substring(rawId.length - 4)}`
      : rawId;

    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <div
          className={`px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/15 to-[#14F195]/10 border border-emerald-500/30 text-emerald-500 text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs transition-all ${className}`}
          title={`SIWS Authenticated (${rawId})`}
        >
          <span className="w-2 h-2 rounded-full bg-[#14F195] animate-pulse" />
          <ShieldCheck size={14} className="shrink-0 text-[#14F195]" />
          <span>{isGuest ? "Guest Synced" : "SIWS Synced"}</span>
          {shortUid && <span className="text-[10px] opacity-80 hidden sm:inline">({shortUid})</span>}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          title="Sign out of SIWS session"
          className="px-2.5 py-1.5 text-[10px] sm:text-xs font-mono font-bold uppercase border border-border/80 hover:border-red-500/40 bg-card/60 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
        >
          <LogOut size={12} className="shrink-0" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSyncWithSolana}
      disabled={loading}
      className={`relative group px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-[#9945FF]/15 via-primary/20 to-[#14F195]/15 hover:from-[#9945FF]/25 hover:via-primary/30 hover:to-[#14F195]/25 border border-[#9945FF]/40 text-foreground hover:text-white text-xs font-mono font-bold transition-all shadow-md flex items-center gap-2 active:scale-95 ${className}`}
      title={
        publicKey
          ? "Sign cryptographic challenge to authenticate with Solana (SIWS)"
          : "Connect Solana wallet to sign in (SIWS)"
      }
    >
      <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[#9945FF] to-[#14F195] opacity-20 group-hover:opacity-40 blur transition duration-300 pointer-events-none" />
      {loading ? (
        <RefreshCw size={13} className="animate-spin shrink-0 text-primary" />
      ) : (
        <Zap size={14} className="text-[#14F195] fill-[#14F195]/20 shrink-0 group-hover:scale-110 transition-transform" />
      )}
      <span className="relative z-10">
        {loading
          ? "Authenticating..."
          : compact
          ? "SIWS Sign-In"
          : "Sign In with Solana (SIWS)"}
      </span>
    </button>
  );
}

