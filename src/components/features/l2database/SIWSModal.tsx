"use client";

import React, { useEffect } from "react";
import { Zap, ShieldCheck, Clock, X, Wallet, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";

interface SIWSModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: string;
  isSigning: boolean;
  isConnected: boolean;
  walletAddress?: string;
  onSignIn: () => void;
  onConnectWallet: () => void;
}

export function SIWSModal({
  isOpen,
  onClose,
  reason,
  isSigning,
  isConnected,
  walletAddress,
  onSignIn,
  onConnectWallet,
}: SIWSModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSigning) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSigning, onClose]);

  if (!isOpen) return null;

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 4)}..${walletAddress.slice(-4)}`
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-primary/30 bg-card/95 shadow-2xl p-6 sm:p-7 text-foreground space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Gradients */}
        <div className="absolute -top-24 -left-24 w-52 h-52 bg-[#9945FF]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-[#14F195]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSigning}
          className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-40"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="space-y-2 text-center pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#9945FF]/15 via-primary/10 to-[#14F195]/15 border border-[#9945FF]/30 text-xs font-mono font-bold text-foreground">
            <span className="w-2 h-2 rounded-full bg-[#14F195] animate-ping" />
            <Zap size={13} className="text-[#14F195]" />
            <span>SIWS • Sign In With Solana</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black font-display uppercase tracking-tight text-foreground">
            Authenticate Identity
          </h3>

          <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed max-w-sm mx-auto">
            {reason}
          </p>
        </div>

        {/* Features / Benefits Grid */}
        <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 space-y-2.5 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#14F195]/10 border border-[#14F195]/30 text-[#14F195] flex items-center justify-center shrink-0">
              <Zap size={13} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground">Zero Gas Fees</p>
              <p className="text-[11px] text-muted-foreground">Off-chain cryptographic signature. Costs 0 SOL.</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#9945FF]/10 border border-[#9945FF]/30 text-[#9945FF] flex items-center justify-center shrink-0">
              <Sparkles size={13} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground">Instant Real-Time Sync</p>
              <p className="text-[11px] text-muted-foreground">Sub-second updates powered by our L2 Database.</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/30 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck size={13} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground">Wallet-Bound Identity</p>
              <p className="text-[11px] text-muted-foreground">No passwords or emails. Posts belong to your public key.</p>
            </div>
          </div>
        </div>

        {/* Wallet Status & Action */}
        <div className="space-y-3 pt-1">
          {isConnected ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-card border border-border/80 text-xs font-mono">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Wallet size={13} className="text-primary" />
                  Connected Wallet:
                </span>
                <span className="font-bold text-foreground bg-secondary/60 px-2 py-0.5 rounded">
                  {shortAddress}
                </span>
              </div>

              <button
                type="button"
                onClick={onSignIn}
                disabled={isSigning}
                className="w-full py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#9945FF] via-primary to-[#14F195] hover:opacity-95 text-white font-display font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                {isSigning ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Awaiting Signature in Wallet...</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} className="fill-white" />
                    <span>Sign In With Solana (SIWS)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onConnectWallet}
              className="w-full py-3 sm:py-3.5 px-4 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground font-display font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-98"
            >
              <Wallet size={16} />
              <span>Connect Wallet to Sign In</span>
            </button>
          )}

          <p className="text-[11px] text-center text-muted-foreground font-mono">
            You can still browse and read all posts & chats without signing in.
          </p>
        </div>
      </div>
    </div>
  );
}
