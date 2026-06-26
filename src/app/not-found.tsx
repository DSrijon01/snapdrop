"use client";

import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Compass, Home, LogOut, ArrowLeft, Info } from "lucide-react";
import toast from "react-hot-toast";

export default function NotFoundPage() {
  const { disconnect, connected } = useWallet();
  const router = useRouter();

  const handleLogoutAndLogin = async () => {
    try {
      const toastId = toast.loading("Disconnecting session and returning home...");
      
      // Disconnect the active wallet
      if (connected) {
        await disconnect();
      }
      
      sessionStorage.clear();
      toast.success("Session cleared. Redirecting to Landing...", { id: toastId });
      
      router.push("/");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error("Logout recovery failed:", err);
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center p-6 bg-background relative overflow-hidden font-sans">
      {/* Background Neon Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-card/45 backdrop-blur-md border border-border/80 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden z-10"
      >
        {/* Glow Line Indicator */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

        {/* Compass Icon */}
        <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6 shadow-inner animate-spin-slow">
          <Compass size={36} />
        </div>

        <h2 className="text-3xl font-black font-display uppercase tracking-tight text-foreground mb-2">
          Route Lost
        </h2>
        <p className="text-muted-foreground text-xs font-mono uppercase tracking-widest mb-6">
          404 Page Not Found
        </p>

        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          The dashboard route you are attempting to visit does not exist or has been relocated. Return to safe streets.
        </p>

        {/* Quick Recovery Actions */}
        <div className="space-y-3">
          <button
            onClick={() => router.push("/")}
            className="w-full py-3.5 bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.99] transition-all rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Go Back Home</span>
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
          <span>Street Sync Routing System</span>
        </div>
      </motion.div>
    </div>
  );
}
