"use client";

import React, { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldAlert, RefreshCw, LogOut, Info, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorPage({ error, reset }: ErrorPageProps) {
  const { disconnect, connected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    // Log the error to an analytics service
    console.error("Client Exception Caught by Global Boundary:", error);
  }, [error]);

  const handleLogoutAndLogin = async () => {
    try {
      const toastId = toast.loading("Disconnecting session and returning home...");
      
      // Disconnect the active wallet to log the user out
      if (connected) {
        await disconnect();
      }
      
      // Clear local storage fields that might store corrupted states
      sessionStorage.clear();
      
      toast.success("Disconnected. Redirecting to Landing...", { id: toastId });
      
      // Redirect to the main landing page and trigger a reload to reset the client state cleanly
      router.push("/");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error("Logout recovery failed:", err);
      window.location.href = "/snapdrop/";
    }
  };

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center p-6 bg-background relative overflow-hidden font-sans">
      {/* Abstract Background Neon Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-destructive/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-card/45 backdrop-blur-md border border-destructive/20 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden z-10"
      >
        {/* Glow Line Indicator */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-destructive/40 via-destructive to-destructive/40" />

        {/* Warning Icon */}
        <div className="w-16 h-16 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center justify-center text-destructive mx-auto mb-6 shadow-inner animate-pulse">
          <ShieldAlert size={36} />
        </div>

        <h2 className="text-2xl font-black font-display uppercase tracking-tight text-foreground mb-2">
          System Interrupted
        </h2>
        <p className="text-muted-foreground text-xs font-mono uppercase tracking-widest mb-6">
          Client Exception Occurred
        </p>

        <div className="bg-muted/30 border border-border/60 rounded-2xl p-4 mb-6 text-left space-y-2.5 max-h-40 overflow-y-auto scrollbar-thin">
          <div className="flex items-center gap-2 text-destructive font-semibold text-xs font-mono">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>CRITICAL_CLIENT_ERROR</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed break-words font-mono">
            {error?.message || "An unexpected error disrupted your browser session. This can happen after long periods of inactivity or network state shifts."}
          </p>
          {error?.digest && (
            <div className="text-[10px] text-muted-foreground/60 font-mono mt-1 pt-1.5 border-t border-border/20">
              Digest: {error.digest}
            </div>
          )}
        </div>

        {/* Quick Recovery Actions */}
        <div className="space-y-3">
          <button
            onClick={() => {
              toast.loading("Reloading session environment...");
              reset();
            }}
            className="w-full py-3.5 bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.99] transition-all rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            <span>Reset Session</span>
          </button>
          
          <button
            onClick={handleLogoutAndLogin}
            className="w-full py-3.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/80 transition-all rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Re-authenticate (Logout & Login)</span>
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] font-mono text-muted-foreground/60 uppercase">
          <Info className="w-3.5 h-3.5" />
          <span>Automatic error tracking active</span>
        </div>
      </motion.div>
    </div>
  );
}
