"use client";

import { FC, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, ExternalLink, ShieldCheck, CheckCircle2, ArrowRight, Smartphone, Sparkles } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
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
  const { wallets, select } = useWallet();
  const [installStarted, setInstallStarted] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      setIsMobile(/Android|iPhone|iPad|iPod/i.test(ua));
      setIsIOS(/iPhone|iPad|iPod/i.test(ua));

      const isPending = sessionStorage.getItem("street_sync_install_pending");
      if (isPending) {
        setInstallStarted(true);
      }
    }
  }, [isOpen]);

  const handleOpenPhantomApp = () => {
    if (typeof window === "undefined") return;
    const url = encodeURIComponent(window.location.href);
    const ref = encodeURIComponent(window.location.origin);
    // Universal link to open Phantom mobile app directly to this dApp
    window.location.href = `https://phantom.app/ul/browse/${url}?ref=${ref}`;
  };

  const handleConnectMwa = () => {
    const mwaWallet = wallets.find(
      (w) => w.adapter.name === "Mobile Wallet Adapter"
    );
    if (mwaWallet) {
      select(mwaWallet.adapter.name);
      onClose();
    } else {
      onOpenStandardModal();
    }
  };

  const handleInstallClick = () => {
    if (typeof window === "undefined") return;

    if (isMobile) {
      handleOpenPhantomApp();
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
            className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors z-20"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {!installStarted ? (
            /* STEP 1: Main Connect Guide */
            <div className="space-y-5">
              {/* Header with Street Sync Bot Avatar */}
              <div className="flex items-center gap-3.5 pr-8">
                <div className="w-12 h-12 rounded-2xl bg-secondary/80 border border-border shadow-sm flex items-center justify-center shrink-0 p-1.5 relative">
                  <img
                    src="https://api.dicebear.com/7.x/bottts/svg?seed=EW9U&backgroundColor=transparent"
                    alt="Street Sync Bot"
                    className="w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(255,24,1,0.5)]"
                  />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-black font-display tracking-tight text-foreground uppercase truncate">
                    Connect Solana Wallet
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    Required to buy, sell, and trade on Street Sync
                  </p>
                </div>
              </div>

              {/* Status Info Box */}
              {isMobile ? (
                <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <Smartphone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-foreground">Mobile Solana Wallet</p>
                      <p className="text-muted-foreground leading-relaxed mt-0.5">
                        Have Phantom or a Solana wallet installed? Open directly in Phantom app for 1-tap connection or connect using Mobile Wallet Adapter.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
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
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {isMobile ? (
                  <>
                    <button
                      onClick={handleOpenPhantomApp}
                      className="w-full py-3.5 px-4 bg-primary text-primary-foreground font-display uppercase tracking-wider font-black text-sm rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                    >
                      <span>Open in Phantom App</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    <button
                      onClick={handleConnectMwa}
                      className="w-full py-3 px-4 bg-secondary text-secondary-foreground font-display uppercase tracking-wider font-bold text-xs rounded-xl hover:bg-secondary/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-border shadow-sm"
                    >
                      <Smartphone className="w-4 h-4 text-primary" />
                      <span>Connect with Mobile Wallet Adapter</span>
                    </button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>

              {/* Secondary Options */}
              <div className="space-y-2 text-center pt-1">
                <button
                  onClick={() => {
                    onClose();
                    onOpenStandardModal();
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
                >
                  View all supported wallets & options ➔
                </button>

                {isMobile && (
                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Don&apos;t have Phantom yet?</span>
                    <a
                      href={isIOS ? "https://apps.apple.com/app/phantom-solana-wallet/id1598432977" : "https://phantom.app/download"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-primary hover:underline"
                    >
                      Get on {isIOS ? "App Store" : "Google Play"}
                    </a>
                  </div>
                )}
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
