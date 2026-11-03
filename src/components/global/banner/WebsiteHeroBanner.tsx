"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Sparkles, Share2, ChevronRight, X, Eye } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";

export function WebsiteHeroBanner() {
  const { connected } = useWallet();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem("streetsync_hero_banner_dismissed");
      if (isDismissed === "true") {
        setDismissed(true);
      }
    } catch {}
  }, []);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem("streetsync_hero_banner_dismissed", "true");
    } catch {}
    setDismissed(true);
  };

  const handleOpenPromoModal = (platform: "x" | "facebook" | "instagram" | "hero" = "hero") => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("streetsync_open_promo_modal", {
          detail: { platform },
        })
      );
    }
  };

  if (dismissed) return null;

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-primary/30 bg-card shadow-xl transition-all duration-300 mb-6">
      {/* Top Banner Bar */}
      <div className="bg-primary/10 border-b border-primary/20 px-3 sm:px-5 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
          <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-primary">
            Official Launch Preview
          </span>
          <span className="hidden md:inline-block text-[11px] font-mono text-muted-foreground">
            • Coming Soon on Solana Mainnet
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOpenPromoModal("hero")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background hover:bg-muted text-[11px] font-bold font-display uppercase tracking-wider border border-border text-foreground transition-colors"
          >
            <Eye className="w-3 h-3 text-primary" />
            <span>Social Banners</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Dismiss hero banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Banner Graphic & Interactive Area */}
      <div className="p-3 sm:p-5 flex flex-col lg:flex-row items-center gap-4 sm:gap-6">
        {/* Banner Graphic with Hover Zoom */}
        <div
          onClick={() => handleOpenPromoModal("hero")}
          className="relative w-full lg:w-3/5 aspect-[1024/576] rounded-xl sm:rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-md cursor-pointer group bg-black/5"
        >
          <Image
            src="/banners/banner-hero.png"
            alt="Street Sync - Official Website Hero Banner"
            fill
            className="object-contain group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority
          />
          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors flex items-center justify-center pointer-events-none">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white font-mono text-xs uppercase px-3 py-1.5 rounded-full shadow-lg">
              Click to view all social formats
            </span>
          </div>
        </div>

        {/* Text & Social Triggers */}
        <div className="w-full lg:w-2/5 flex flex-col justify-between space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="inline-block bg-yellow-400 text-black font-black text-[10px] sm:text-xs uppercase px-2 py-0.5 rounded shadow transform -rotate-1">
              PREDICT • TRADE • SWAP • STAKE
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-display uppercase tracking-tight text-foreground">
              Street Sync Super App
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Real-time market intelligence, ultra-low latency token swaps, and exclusive Solana digital collectibles.
            </p>
          </div>

          {/* Social Platform Shortcut Pills */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono font-bold uppercase text-muted-foreground block">
              Promotion Formats:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleOpenPromoModal("x")}
                className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-mono font-bold border border-border flex items-center gap-1 transition-colors"
              >
                <span>𝕏 X Card</span>
              </button>
              <button
                onClick={() => handleOpenPromoModal("facebook")}
                className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-mono font-bold border border-border flex items-center gap-1 transition-colors"
              >
                <span>📘 Facebook</span>
              </button>
              <button
                onClick={() => handleOpenPromoModal("instagram")}
                className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-mono font-bold border border-border flex items-center gap-1 transition-colors"
              >
                <span>📸 Instagram</span>
              </button>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-1">
            <button
              onClick={() => handleOpenPromoModal("hero")}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold uppercase text-xs sm:text-sm tracking-wider shadow-md hover:shadow-lg transition-all"
            >
              <span>Explore Campaign Banners</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
