"use client";

import React, { useEffect } from "react";
import { Zap, X, Wallet, RefreshCw, LogOut, Sparkles } from "lucide-react";

interface SIWSModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
  isSigning: boolean;
  isConnected: boolean;
  walletAddress?: string;
  isAuthenticated?: boolean;
  onSignIn: () => void;
  onConnectWallet: () => void;
  onContinueAsGuest?: () => void;
  onSignOut?: () => void;
}

export function SIWSModal({
  isOpen,
  onClose,
  reason,
  isSigning,
  isConnected,
  walletAddress,
  isAuthenticated,
  onSignIn,
  onConnectWallet,
  onContinueAsGuest,
  onSignOut,
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
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-primary/30 bg-card/95 shadow-2xl p-6 text-foreground space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Gradients */}
        <div className="absolute -top-24 -left-24 w-44 h-44 bg-[#9945FF]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-44 h-44 bg-[#14F195]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSigning}
          className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-40"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Minimalist Header */}
        <div className="space-y-1.5 text-center pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-xs font-mono font-bold text-foreground">
            <Zap size={13} className="text-primary fill-primary" />
            <span>Sign In with Solana</span>
          </div>

          <h3 className="text-xl font-black font-display uppercase tracking-tight text-foreground">
            {isAuthenticated ? "Session Active" : "Connect & Sign"}
          </h3>

          {reason && (
            <p className="text-xs text-muted-foreground font-medium leading-normal max-w-xs mx-auto">
              {reason}
            </p>
          )}
        </div>

        {/* Wallet Status & Actions */}
        <div className="space-y-2.5 pt-1">
          {isConnected ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-secondary/40 border border-border text-xs font-mono">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Wallet size={13} className="text-primary" />
                  Wallet:
                </span>
                <span className="font-bold text-foreground bg-secondary/80 px-2 py-0.5 rounded">
                  {shortAddress}
                </span>
              </div>

              <button
                type="button"
                onClick={onSignIn}
                disabled={isSigning}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#9945FF] via-primary to-[#14F195] hover:opacity-95 text-white font-display font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                {isSigning ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Waiting for Signature...</span>
                  </>
                ) : (
                  <>
                    <Zap size={15} className="fill-white" />
                    <span>Sign In With Solana</span>
                  </>
                )}
              </button>

              {isAuthenticated && onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    onSignOut();
                    onClose();
                  }}
                  disabled={isSigning}
                  className="w-full py-2 px-3 rounded-xl border border-red-500/25 hover:border-red-500/50 bg-red-500/10 hover:bg-red-500/15 text-red-400 font-mono font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onConnectWallet}
              className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-display font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-98"
            >
              <Wallet size={15} />
              <span>Connect Wallet to Sign In</span>
            </button>
          )}

          {onContinueAsGuest && !isAuthenticated && (
            <button
              type="button"
              onClick={onContinueAsGuest}
              disabled={isSigning}
              className="w-full py-2 px-3 rounded-xl border border-dashed border-border hover:border-primary/40 bg-secondary/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground font-mono font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Sparkles size={12} className="text-primary" />
              <span>Continue as Guest</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
