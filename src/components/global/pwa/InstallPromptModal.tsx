"use client";

import React, { useState, useEffect } from "react";
import { Download, Smartphone, Share, PlusSquare, X, ShieldCheck } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPromptModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (already installed)
    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isRunningStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Capture Android / Chrome beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setDeferredPrompt(null);
        setShowModal(false);
      }
    } else if (isIOS) {
      setShowModal(true);
    }
  };

  // Don't render if already installed or dismissed
  if (isStandalone || dismissed) return null;

  // Render floating install pill on mobile or when prompt available
  const canShowPrompt = deferredPrompt !== null || isIOS;

  if (!canShowPrompt) return null;

  return (
    <>
      {/* Floating Bottom Quick Install Banner */}
      <div className="fixed bottom-14 md:bottom-6 right-4 z-40 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center gap-2 p-2 px-3 bg-zinc-900/90 dark:bg-zinc-900/90 text-white border border-primary/40 backdrop-blur-md rounded-full shadow-2xl hover:border-primary transition-all">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="text-left text-xs pr-1">
            <p className="font-bold tracking-tight">Street Sync Mobile</p>
            <p className="text-[10px] text-zinc-400">Install for full-screen app</p>
          </div>
          <button
            onClick={() => (deferredPrompt ? handleInstallClick() : setShowModal(true))}
            className="px-3 py-1 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-full transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-zinc-400 hover:text-white rounded-full transition-colors ml-0.5"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* iOS or Info Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl text-card-foreground">
            <button
              onClick={() => setShowModal(false)}
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
                <p className="text-xs text-muted-foreground">Add to your Home Screen</p>
              </div>
            </div>

            <div className="space-y-3 py-2 text-sm">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/60">
                    <div className="w-7 h-7 rounded-md bg-background flex items-center justify-center shrink-0 border border-border">
                      <Share className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs">1. Tap the Share button</p>
                      <p className="text-[11px] text-muted-foreground">In the Safari browser bottom menu</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/60">
                    <div className="w-7 h-7 rounded-md bg-background flex items-center justify-center shrink-0 border border-border">
                      <PlusSquare className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs">2. Tap &quot;Add to Home Screen&quot;</p>
                      <p className="text-[11px] text-muted-foreground">Scroll down and select Add to Home Screen</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Enjoy instantaneous loading, full-screen trading, and direct Solana wallet connectivity right from your home screen.
                </div>
              )}

              <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 pt-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero store fees • 100% On-Chain • Instant updates</span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              {deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Install App
                </button>
              ) : (
                <button
                  onClick={() => setShowModal(false)}
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
