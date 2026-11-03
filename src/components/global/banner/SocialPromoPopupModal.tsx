"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Copy, Check, Share2, Sparkles, Globe } from "lucide-react";
import toast from "react-hot-toast";

export type SocialPlatform = "x" | "facebook" | "instagram" | "hero";

interface PlatformConfig {
  id: SocialPlatform;
  label: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  aspectClass: string;
  primaryActionLabel: string;
  primaryActionUrl?: string;
  accentColor: string;
  promoParam: string;
}

const PLATFORMS: Record<SocialPlatform, PlatformConfig> = {
  x: {
    id: "x",
    label: "𝕏 (Twitter)",
    badge: "𝕏 Platform Detected",
    title: "Street Sync on 𝕏",
    subtitle: "Follow On 𝕏 For Real-Time Solana Alpha",
    description:
      "Join the official Street Sync community on 𝕏. Get exclusive pre-launch drops, market intelligence signals, and Solana super app announcements.",
    imageSrc: "/banners/banner-x.png",
    imageAlt: "Street Sync - Follow On 𝕏 Coming Soon Banner",
    aspectClass: "aspect-[1024/480]",
    primaryActionLabel: "Follow @streetsyncss on 𝕏",
    primaryActionUrl: "https://x.com/streetsyncss",
    accentColor: "#000000",
    promoParam: "ref=x",
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    badge: "Facebook Detected",
    title: "Street Sync on Facebook",
    subtitle: "The Solana Super App For Everyday Web3",
    description:
      "Experience high-throughput crypto trading, NFT collections, and real-time market data in one unified Solana app.",
    imageSrc: "/banners/banner-facebook.png",
    imageAlt: "Street Sync - Facebook Community Banner",
    aspectClass: "aspect-[1024/576]",
    primaryActionLabel: "Share on Facebook",
    primaryActionUrl:
      "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fstreetsync-ss.com%2F%3Fref%3Dfacebook",
    accentColor: "#1877F2",
    promoParam: "ref=facebook",
  },
  instagram: {
    id: "instagram",
    label: "Instagram",
    badge: "Instagram Detected",
    title: "Street Sync on Instagram",
    subtitle: "Visual Web3 & Street Culture on Solana",
    description:
      "Discover the intersection of high-frequency Solana DeFi, collectible NFT streetwear, and live market intelligence.",
    imageSrc: "/banners/banner-instagram.png",
    imageAlt: "Street Sync - Instagram Square Edition Banner",
    aspectClass: "aspect-square max-h-[300px] sm:max-h-[360px] mx-auto",
    primaryActionLabel: "Follow on Instagram",
    primaryActionUrl: "https://instagram.com",
    accentColor: "#E1306C",
    promoParam: "ref=instagram",
  },
  hero: {
    id: "hero",
    label: "Website Hero",
    badge: "Official Launch Banner",
    title: "Coming Soon to Solana",
    subtitle: "Predict • Trade • Swap • Stake • Connect",
    description:
      "Street Sync is the premier Solana-native super app designed for high-performance everyday crypto traders and collectors.",
    imageSrc: "/banners/banner-hero.png",
    imageAlt: "Street Sync - Official Website Hero Banner",
    aspectClass: "aspect-[1024/576]",
    primaryActionLabel: "Explore Street Sync",
    accentColor: "#DA291C",
    promoParam: "ref=hero",
  },
};

export function SocialPromoPopupModal() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<SocialPlatform>("hero");
  const [detectionSource, setDetectionSource] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window === "undefined") return;

    // Detection logic
    const urlParams = new URLSearchParams(window.location.search);
    const paramVal = (
      urlParams.get("ref") ||
      urlParams.get("source") ||
      urlParams.get("utm_source") ||
      urlParams.get("platform") ||
      urlParams.get("promo") ||
      urlParams.get("campaign") ||
      ""
    ).toLowerCase();

    const referrer = (document.referrer || "").toLowerCase();
    const ua = (navigator.userAgent || "").toLowerCase();

    let detected: SocialPlatform | null = null;
    let sourceText = "";

    // 1. Check explicit URL query param
    if (paramVal.includes("x") || paramVal.includes("twitter") || paramVal.includes("t.co")) {
      detected = "x";
      sourceText = "Campaign Link (X / Twitter)";
    } else if (
      paramVal.includes("facebook") ||
      paramVal.includes("fb") ||
      paramVal.includes("meta") ||
      urlParams.has("fbclid")
    ) {
      detected = "facebook";
      sourceText = "Campaign Link (Facebook)";
    } else if (
      paramVal.includes("instagram") ||
      paramVal.includes("ig") ||
      paramVal.includes("insta")
    ) {
      detected = "instagram";
      sourceText = "Campaign Link (Instagram)";
    } else if (
      paramVal.includes("hero") ||
      paramVal.includes("web") ||
      paramVal.includes("website") ||
      paramVal.includes("direct")
    ) {
      detected = "hero";
      sourceText = "Direct / Website Campaign";
    }

    // 2. Check Referrer
    if (!detected && referrer) {
      if (referrer.includes("twitter.com") || referrer.includes("t.co") || referrer.includes("x.com")) {
        detected = "x";
        sourceText = "Referral (x.com)";
      } else if (
        referrer.includes("facebook.com") ||
        referrer.includes("fb.com") ||
        referrer.includes("l.facebook.com") ||
        referrer.includes("lm.facebook.com")
      ) {
        detected = "facebook";
        sourceText = "Referral (facebook.com)";
      } else if (referrer.includes("instagram.com") || referrer.includes("l.instagram.com")) {
        detected = "instagram";
        sourceText = "Referral (instagram.com)";
      }
    }

    // 3. Check In-App Browser User Agent
    if (!detected) {
      if (ua.includes("instagram")) {
        detected = "instagram";
        sourceText = "Instagram In-App Browser";
      } else if (ua.includes("fban") || ua.includes("fbav")) {
        detected = "facebook";
        sourceText = "Facebook In-App Browser";
      } else if (ua.includes("twitter")) {
        detected = "x";
        sourceText = "X In-App Browser";
      }
    }

    // If an explicit social link or campaign was detected:
    if (detected) {
      const dismissedKey = `streetsync_promo_dismissed_${detected}`;
      const isDismissed = sessionStorage.getItem(dismissedKey);

      setActivePlatform(detected);
      setDetectionSource(sourceText);

      // Open automatically if not already dismissed in this session
      if (!isDismissed) {
        setIsOpen(true);
      }
    }

    // Allow opening via global custom event (e.g. "streetsync_open_promo_modal")
    const handleOpenCustom = (e: any) => {
      const targetPlatform = e?.detail?.platform;
      if (targetPlatform && PLATFORMS[targetPlatform as SocialPlatform]) {
        setActivePlatform(targetPlatform as SocialPlatform);
        setDetectionSource("Manual Preview");
      }
      setIsOpen(true);
    };

    window.addEventListener("streetsync_open_promo_modal", handleOpenCustom);
    return () => {
      window.removeEventListener("streetsync_open_promo_modal", handleOpenCustom);
    };
  }, []);

  const handleClose = () => {
    try {
      sessionStorage.setItem(`streetsync_promo_dismissed_${activePlatform}`, "true");
    } catch {}
    setIsOpen(false);
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    const current = PLATFORMS[activePlatform];
    const link = `https://streetsync-ss.com/?${current.promoParam}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success(`Copied ${current.label} promo link to clipboard!`);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (!mounted || !isOpen) return null;

  const current = PLATFORMS[activePlatform];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-2xl bg-card border-2 border-primary/40 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]"
        >
          {/* Header Bar */}
          <div className="bg-muted/90 border-b border-border px-4 py-3 sm:px-6 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
                {current.badge}
              </span>
              {detectionSource && (
                <span className="hidden sm:inline-block text-[11px] font-mono text-muted-foreground bg-background/60 px-2 py-0.5 rounded border border-border">
                  {detectionSource}
                </span>
              )}
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close promotion modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Platform Switcher Tabs */}
          <div className="px-3 sm:px-6 py-2.5 bg-muted/30 border-b border-border flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
            {(Object.keys(PLATFORMS) as SocialPlatform[]).map((platformKey) => {
              const p = PLATFORMS[platformKey];
              const isActive = activePlatform === platformKey;
              return (
                <button
                  key={platformKey}
                  onClick={() => setActivePlatform(platformKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md scale-100"
                      : "bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border/60"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Modal Scrollable Content */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Banner Artwork Container with Comic Frame */}
            <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border-2 border-black/10 dark:border-white/10 shadow-lg bg-black/5 dark:bg-black/30">
              <div className={`relative w-full ${current.aspectClass} flex items-center justify-center`}>
                <Image
                  src={current.imageSrc}
                  alt={current.imageAlt}
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 768px) 100vw, 672px"
                />
              </div>

              {/* Comic-style Tag */}
              <div className="absolute top-2.5 left-2.5 bg-yellow-400 text-black font-black text-[10px] sm:text-xs uppercase px-2.5 py-0.5 rounded-md shadow-md border border-black transform -rotate-1">
                SOLANA NATIVE
              </div>
            </div>

            {/* Platform Description & Details */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h3 className="text-lg sm:text-xl font-black font-display uppercase tracking-tight text-foreground">
                  {current.title}
                </h3>
                <span className="text-xs font-mono font-bold text-primary uppercase">
                  {current.subtitle}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {current.description}
              </p>
            </div>

            {/* Quick Share / Link Helper */}
            <div className="bg-muted/40 border border-border rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <Share2 className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[11px] sm:text-xs font-mono text-muted-foreground truncate">
                  Target Link: <code className="text-foreground font-bold">streetsync-ss.com/?{current.promoParam}</code>
                </span>
              </div>

              <button
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-background hover:bg-muted text-xs font-bold font-display uppercase tracking-wider border border-border transition-colors shrink-0 text-foreground"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Official Community Channels */}
            <div className="pt-1 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
              <span className="text-muted-foreground font-bold uppercase text-[11px]">
                Official Channels:
              </span>
              <div className="flex items-center gap-2">
                <a
                  href="https://x.com/streetsyncss"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-[11px] font-bold border border-border flex items-center gap-1 transition-colors"
                >
                  <span>𝕏 @streetsyncss</span>
                </a>
                <a
                  href="https://t.me/streetsync"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-[11px] font-bold border border-border flex items-center gap-1 transition-colors"
                >
                  <span>✈ Telegram</span>
                </a>
                <a
                  href="https://discord.gg/gTz6DDmFq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-[11px] font-bold border border-border flex items-center gap-1 transition-colors"
                >
                  <span>💬 Discord</span>
                </a>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-muted/70 border-t border-border px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <button
              onClick={handleClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-center"
            >
              Dismiss
            </button>

            <div className="w-full sm:w-auto flex items-center gap-2">
              {current.primaryActionUrl ? (
                <a
                  href={current.primaryActionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold font-display uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
                >
                  <span>{current.primaryActionLabel}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <button
                  onClick={handleClose}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold font-display uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
                >
                  <span>{current.primaryActionLabel}</span>
                  <Sparkles className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

