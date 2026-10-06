"use client";

import { NewsArticle } from "@/lib/newsApi";
import { X, Sparkles, TrendingUp, TrendingDown, ArrowRight, ShieldCheck, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MarketDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: NewsArticle[];
  onSelectArticle: (article: NewsArticle) => void;
}

export function MarketDigestModal({
  isOpen,
  onClose,
  articles,
  onSelectArticle,
}: MarketDigestModalProps) {
  if (!isOpen) return null;

  const topArticles = articles.slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/40 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-primary">
                  Executive Briefing
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">5 Min Read</span>
              </div>
              <h3 className="text-lg font-display font-black uppercase tracking-tight text-foreground">
                24H Market Digest
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3 text-xs">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-relaxed">
              Curated snapshot of the most impactful developments across crypto ecosystems and global macro policy in the last 24 hours.
            </p>
          </div>

          <div className="space-y-3">
            {topArticles.map((article, idx) => {
              const isPositive = article.sentiment === "Positive";
              const isNegative = article.sentiment === "Negative";

              return (
                <div
                  key={article.article_id}
                  onClick={() => {
                    onClose();
                    onSelectArticle(article);
                  }}
                  className="p-3.5 rounded-2xl border border-border/60 hover:border-primary/40 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-mono font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {article.source_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 ${
                        isPositive 
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : isNegative
                          ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      }`}>
                        {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : isNegative ? <TrendingDown className="w-2.5 h-2.5" /> : null}
                        {article.sentiment}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(article.pubDate), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug mb-1.5">
                    {article.title}
                  </h4>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {article.description}
                  </p>

                  <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-primary pt-2 group-hover:translate-x-1 transition-transform">
                    <span>Read full coverage</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border/40 bg-muted/20 flex items-center justify-between">
          <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-primary" /> Synchronized with live feeds
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-mono font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-all active:scale-95"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
