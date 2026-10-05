"use client";

import React, { useState, useEffect } from "react";
import { Download, Monitor, X, ShieldCheck } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useFirebaseAuth } from "@/lib/l2database/auth";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const SESSION_DISMISSED_KEY = "streetsync_pwa_dismissed_session";

export function InstallPromptModal() {
  const { connected, publicKey } = useWallet();
  const { isAuthenticated, user } = useFirebaseAuth();

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if dismissed previously in this session
    try {
      if (sessionStorage.getItem(SESSION_DISMISSED_KEY) === "true") {
        setDismissed(true);
      }
    } catch {}

    // Check if already in standalone mode (already installed)
    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isRunningStandalone);

    // Detect mobile device (UserAgent or screen width < 768px)
    const checkIsMobile = () => {
      const ua = window.navigator.userAgent.toLowerCase();
      const mobileRegex = /android|iphone|ipad|ipod|mobile|windows phone|iemobile|blackberry/i;
      return mobileRegex.test(ua) || window.innerWidth < 768;
    };

    setIsMobile(checkIsMobile());

    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };
    window.addEventListener("resize", handleResize);

    // Capture desktop Chrome / Edge beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setShowModal(false);
    try {
      sessionStorage.setItem(SESSION_DISMISSED_KEY, "true");
    } catch {}
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setDeferredPrompt(null);
        handleDismiss();
      }
    } else {
      setShowModal(true);
    }
  };

  if (!mounted) return null;

  // 1. Never show on mobile
  if (isMobile) return null;

  // 2. Don't render if already installed or dismissed in this session
  if (isStandalone || dismissed) return null;

  // 3. Desktop users: Only appear once the user logs in or connects their wallet
  const isUserLoggedIn = (connected && !!publicKey) || isAuthenticated || !!user;
  if (!isUserLoggedIn) return null;

  return (
    <>
      {/* Floating Bottom Quick Install Banner for Desktop Users */}
      <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center gap-2.5 p-2 px-3.5 bg-zinc-900/95 text-white border border-primary/40 backdrop-blur-md rounded-2xl shadow-2xl hover:border-primary transition-all">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shrink-0 shadow-sm">
            <Monitor className="w-4 h-4" />
          </div>
          <div className="text-left text-xs pr-1">
            <p className="font-bold tracking-tight">Street Sync Desktop</p>
            <p className="text-[10px] text-zinc-400">Install for full-screen app</p>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors ml-0.5 active:scale-90"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Desktop Info Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl text-card-foreground">
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-md">
                SS
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">Install Street Sync</h3>
                <p className="text-xs text-muted-foreground">Desktop Web Application</p>
              </div>
            </div>

            <div className="space-y-3 py-2 text-sm">
              <div className="text-xs text-muted-foreground leading-relaxed">
                Enjoy instantaneous loading, full-screen trading, and direct Solana wallet connectivity right on your desktop.
              </div>

              <div className="p-3 rounded-xl bg-muted/60 text-xs space-y-1.5">
                <p className="font-semibold text-foreground">How to install:</p>
                <p className="text-muted-foreground">
                  • In <strong>Chrome / Edge / Brave</strong>: Click the install icon in the address bar (top right).
                </p>
                <p className="text-muted-foreground">
                  • In <strong>Safari (macOS)</strong>: Click <em>File &rarr; Add to Dock</em>.
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 pt-1">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Zero store fees • 100% On-Chain • Instant updates</span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Install App
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-sm transition-colors"
                >
                  Got It
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
