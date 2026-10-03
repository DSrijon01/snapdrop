"use client";

import { NewsArticle } from "@/lib/newsApi";
import { format } from "date-fns";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";

export function ArticleDetailView({ article, onBack }: { article: NewsArticle, onBack: () => void }) {
  const isPositive = article.sentiment === 'Positive';
  const isNegative = article.sentiment === 'Negative';

  const sentimentColor = isPositive 
    ? 'text-emerald-500 bg-emerald-500/5 border-emerald-500/30' 
    : isNegative 
    ? 'text-rose-500 bg-rose-500/5 border-rose-500/30'
    : 'text-slate-400 bg-slate-500/5 border-slate-500/30';

  const sentimentIcon = isPositive ? (
    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
  ) : isNegative ? (
    <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
  ) : (
    <Minus className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
  );

  // Safe date parsing to prevent format crashes
  const parseSafeDate = (dateStr: string) => {
    try {
      if (!dateStr) return new Date();
      const normalized = dateStr.includes(' ') && !dateStr.includes('T') ? dateStr.replace(' ', 'T') : dateStr;
      const parsed = new Date(normalized);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    } catch {
      return new Date();
    }
  };

  const formattedDate = format(parseSafeDate(article.pubDate), "MMMM d, yyyy • h:mm a");

  return (
    <div className="h-full w-full max-w-full bg-background flex flex-col overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/40 px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 shrink-0">
        <button 
          onClick={onBack}
          className="flex items-center text-xs sm:text-sm font-mono font-bold tracking-wider hover:text-brand-primary transition-colors group shrink-0"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-1 transition-transform" />
          BACK TO GRID
        </button>
        <div className="text-[11px] sm:text-xs font-mono uppercase tracking-widest text-muted-foreground border border-border/50 px-2.5 py-1 rounded-full truncate max-w-[160px] shrink-0">
          {article.source_name}
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-8 md:py-10">
        {/* Header Metadata & Tags */}
        <div className="flex flex-col gap-2 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-mono uppercase tracking-wider text-muted-foreground">
            <span>{formattedDate}</span>
          </div>

          {/* Tags Pills: Wrap cleanly, truncate individual tags, limit to top 6 */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {article.tags.slice(0, 6).map((tag, i) => (
                <span 
                  key={i} 
                  className="bg-muted/80 text-muted-foreground border border-border/40 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-mono font-medium truncate max-w-[160px]"
                >
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Title (Prevents horizontal overflow on long words) */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black mb-6 leading-tight tracking-tight break-words">
          {article.title}
        </h1>

        {/* Sentiment Analysis Callout block */}
        <div className={`flex items-center justify-between p-3.5 sm:p-5 rounded-2xl border mb-6 sm:mb-8 ${sentimentColor}`}>
          <div>
            <div className="text-[10px] sm:text-xs font-mono uppercase font-bold tracking-widest mb-1 opacity-70">
              AI Sentiment Analysis
            </div>
            <div className="text-base sm:text-lg md:text-xl font-bold flex items-center">
              {sentimentIcon}
              <span>{article.sentiment}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] sm:text-xs font-mono uppercase font-bold tracking-widest mb-1 opacity-70">
              Score
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono">
              {article.sentiment_score > 0 ? '+' : ''}{article.sentiment_score.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Hero Image */}
        {article.image_url && (
          <div className="w-full max-w-full h-48 sm:h-72 md:h-96 rounded-2xl overflow-hidden mb-6 sm:mb-10 shadow-lg relative bg-muted">
            <img 
              src={article.image_url} 
              alt={article.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // If remote image fails or blocks hotlinking, gracefully hide container
                const parent = (e.target as HTMLElement).parentElement;
                if (parent) parent.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Article Content */}
        <div className="prose prose-base sm:prose-lg dark:prose-invert prose-brand max-w-none mb-10 sm:mb-16 break-words">
          <p className="text-base sm:text-xl md:text-2xl font-medium leading-relaxed mb-4 sm:mb-6 text-foreground/90 break-words">
            {article.description}
          </p>
          <div className="text-sm sm:text-base md:text-lg leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
            {article.content}
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-border pt-6 pb-32 md:pb-8 flex justify-between items-center gap-3">
          <button 
            onClick={onBack}
            className="flex items-center text-xs sm:text-sm font-mono tracking-wider hover:text-brand-primary transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> BACK
          </button>
          
          <a 
            href={article.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-brand-primary text-primary-foreground font-bold text-xs sm:text-sm tracking-wider uppercase hover:bg-brand-primary/90 transition-colors rounded-xl shadow-lg shadow-brand-primary/20 shrink-0"
          >
            Read Original Source
            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
