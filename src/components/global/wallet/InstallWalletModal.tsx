"use client";

import { FC, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, ExternalLink, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

interface InstallWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStandardModal: () => void;
}

export const InstallWalletModal: FC<InstallWalletModalProps> = ({
  isOpen,
  onClose,
  onOpenStandardModal,
}) => {
  const [installStarted, setInstallStarted] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isPending = sessionStorage.getItem("street_sync_install_pending");
      if (isPending) {
        setInstallStarted(true);
      }
    }
  }, [isOpen]);

  const handleInstallClick = () => {
    if (typeof window === "undefined") return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      const url = encodeURIComponent(window.location.href);
      const ref = encodeURIComponent(window.location.origin);
      window.location.href = `https://phantom.app/ul/browse/${url}?ref=${ref}`;
      return;
    }

    // Set pending installation flag
    sessionStorage.setItem("street_sync_install_pending", "true");
    setInstallStarted(true);

    // Open Phantom website in a new tab
    window.open("https://phantom.app/", "_blank", "noopener,noreferrer");

    toast.success("Phantom opened in new tab. Return here after installing!", {
      duration: 5000,
      icon: "🦊",
    });
  };

  const handleReloadAndConnect = () => {
    if (typeof window === "undefined") return;
    setIsReloading(true);
    sessionStorage.setItem("street_sync_auto_open_modal", "true");
    sessionStorage.removeItem("street_sync_install_pending");
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-6 z-10"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {!installStarted ? (
            /* STEP 1: Initial Install Guide */
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl">
                  👻
                </div>
                <div>
                  <h3 className="text-xl font-black font-display tracking-tight text-foreground uppercase">
                    Connect Solana Wallet
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Required to buy, sell, and trade on Street Sync
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-foreground">Phantom Wallet (Recommended)</p>
                    <p className="text-muted-foreground leading-relaxed mt-0.5">
                      The most popular and secure self-custodial wallet on Solana. Free extension for Chrome, Brave, and Edge.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 px-4 bg-primary text-primary-foreground font-display uppercase tracking-wider font-black text-sm rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/25"
                >
                  <span>Download Phantom</span>
                  <ExternalLink className="w-4 h-4" />
                </button>

                <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Already have a wallet?</span>
                  <button
                    onClick={handleReloadAndConnect}
                    className="font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reload to Detect</span>
                  </button>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => {
                    onClose();
                    onOpenStandardModal();
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
                >
                  View all supported wallets & options ➔
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: Waiting for Installation & 1-Click Detect */
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
                  <span className="animate-pulse">⏳</span>
                </div>
                <div>
                  <h3 className="text-xl font-black font-display tracking-tight text-foreground uppercase">
                    Finishing Setup
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Link your newly installed wallet
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs bg-muted/40 border border-border p-4 rounded-xl">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground">Step 1: </span>
                    <span className="text-muted-foreground">Install the extension and set up your wallet in the new tab.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <span className="font-bold text-foreground">Step 2: </span>
                    <span className="text-foreground font-semibold">Click the button below to connect instantly without retyping the URL!</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleReloadAndConnect}
                  disabled={isReloading}
                  className="w-full py-4 px-4 bg-primary text-primary-foreground font-display uppercase tracking-wider font-black text-sm rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/25 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isReloading ? "animate-spin" : ""}`} />
                  <span>{isReloading ? "Activating Extension..." : "Detect & Connect Wallet"}</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenStandardModal();
                  }}
                  className="w-full py-2.5 px-4 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-colors"
                >
                  Open Wallet List
                </button>
              </div>

              <p className="text-[11px] text-center text-muted-foreground/80 leading-snug">
                💡 Chrome requires an instant reload to inject extension permissions into pre-existing tabs.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
