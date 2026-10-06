"use client";

import React, { useState, useEffect, useRef } from "react";
import { NewsArticle } from "@/lib/newsApi";
import { 
  Newspaper, 
  TrendingUp, 
  Radio, 
  Play,
  Square,
  BookOpen
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

interface SSRecapCardProps {
  articles: NewsArticle[];
  onArticleClick: (article: NewsArticle) => void;
  onOpenDigest: () => void;
  className?: string;
  isDesktop?: boolean;
}

export function SSRecapCard({
  articles,
  onArticleClick,
  onOpenDigest,
  className = "",
  isDesktop = false,
}: SSRecapCardProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Compute top articles
  const topThree = articles.slice(0, 3);
  const remainingArticles = articles.slice(3, 6);

  // Calculate sentiment stats
  const positiveCount = articles.filter(a => a.sentiment === "Positive").length;
  const sentimentPct = articles.length > 0 ? Math.round((positiveCount / articles.length) * 100) : 75;

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleAudio = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Audio recap is not supported on this browser.");
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      toast("Audio recap paused", { icon: "⏸️" });
      return;
    }

    window.speechSynthesis.cancel();

    const script = [
      "Here is your 24-hour market recap.",
      ...topThree.map((art, idx) => `Number ${idx + 1}: ${art.title}. Published by ${art.source_name}.`),
      "Stay tuned for live updates."
    ].join(" ");

    const utterance = new SpeechSynthesisUtterance(script);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsPlayingAudio(false);
    };

    utterance.onerror = () => {
      setIsPlayingAudio(false);
    };

    speechRef.current = utterance;
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
    toast.success("Playing 24H Audio Briefing", { icon: "🎙️" });
  };

  // Formatted date string for today matching Ground News (e.g. "Sunday, October 4")
  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className={`flex flex-col w-full ${className}`}>
      {/* Date Header matching Ground News Image 1 */}
      {!isDesktop && (
        <div className="mb-2 px-1 text-sm font-bold text-muted-foreground font-sans tracking-tight">
          {todayFormatted}
        </div>
      )}

      {/* Main Recap Card styled with Staking Module aesthetic (Image 2) */}
      <div className="bg-gradient-to-br from-primary/10 via-card to-card dark:from-primary/20 dark:via-card/90 dark:to-card border border-primary/25 rounded-3xl p-5 sm:p-6 backdrop-blur-sm relative overflow-hidden shadow-xl flex flex-col justify-between">
        {/* Subtle Watermark Icon in background like Staking Droplets */}
        <div className="absolute -right-6 -top-6 opacity-10 pointer-events-none select-none text-primary z-0">
          <Newspaper className="w-44 h-44" />
        </div>

        <div className="relative z-10 flex flex-col justify-between h-full">
          {/* Header row: Badge + Live indicator */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-mono uppercase font-black tracking-wider bg-foreground/10 text-foreground dark:bg-muted dark:text-foreground border border-border/40">
              Recap
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              LIVE 24H
            </span>
          </div>

          {/* Big Impactful Title matching Ground News */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-foreground uppercase">
              The Last 24
            </h2>
            <div className="w-full h-px bg-border/60 my-3" />
          </div>

          {/* Numbered Top Headlines (Image 1 style with crisp display typography) */}
          <div className="space-y-3.5 my-2">
            {topThree.map((article, index) => (
              <div
                key={article.article_id}
                onClick={() => onArticleClick(article)}
                className="flex items-start gap-3.5 group cursor-pointer p-1.5 -mx-1.5 rounded-xl hover:bg-muted/50 transition-all active:scale-[0.99]"
              >
                <span className="text-xl sm:text-2xl font-display font-black text-foreground group-hover:text-primary transition-colors shrink-0 leading-none mt-0.5 w-4 text-center">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-muted-foreground">
                    <span className="font-semibold text-foreground/80">{article.source_name}</span>
                    <span>&bull;</span>
                    <span>{formatDistanceToNow(new Date(article.pubDate), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Sub-item plus row like Image 1: "+ FDA Lettuce Probe, NEOM Stadium..." */}
            {remainingArticles.length > 0 && (
              <div className="pt-2 border-t border-border/40 flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                <span className="font-black text-primary text-sm leading-none shrink-0">+</span>
                <span className="truncate">
                  {remainingArticles.map(a => a.tags[0] || a.source_name).filter(Boolean).slice(0, 3).join(", ")} & more
                </span>
              </div>
            )}
          </div>

          {/* Staking-inspired Metrics Strip (Image 2 style) */}
          <div className="grid grid-cols-2 gap-2 p-2.5 sm:p-3 rounded-2xl bg-muted/50 border border-border/60 my-3">
            <div className="flex flex-col">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono font-bold mb-0.5">
                Market Sentiment
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-500 font-mono flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Bullish ({sentimentPct}%)
              </span>
            </div>
            <div className="flex flex-col border-l border-border/60 pl-2.5">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono font-bold mb-0.5">
                Coverage
              </span>
              <span className="text-xs sm:text-sm font-black text-primary font-mono flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> {articles.length} Feeds
              </span>
            </div>
          </div>

          {/* Action Pills matching Ground News Image 1 */}
          <div className="flex items-center gap-2 pt-1">
            {/* Listen Pill */}
            <button
              onClick={handleToggleAudio}
              className={`flex-1 py-2.5 px-3 rounded-full border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm ${
                isPlayingAudio
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-foreground/5 hover:bg-foreground/10 dark:bg-muted dark:hover:bg-muted/80 border-border/70 text-foreground"
              }`}
            >
              {isPlayingAudio ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Audio</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-primary" />
                  <span>Listen <span className="opacity-70 font-normal">3 min</span></span>
                </>
              )}
            </button>

            {/* Read Pill */}
            <button
              onClick={onOpenDigest}
              className="flex-1 py-2.5 px-3 rounded-full bg-foreground/5 hover:bg-foreground/10 dark:bg-muted dark:hover:bg-muted/80 border border-border/70 text-foreground font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
            >
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span>Read <span className="opacity-70 font-normal">5 min</span></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ssRecapcard = SSRecapCard;
