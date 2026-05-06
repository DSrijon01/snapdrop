"use client";

import { NewsArticle } from "@/lib/newsApi";
import { formatDistanceToNow } from "date-fns";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function NewsCard({ article, onClick }: { article: NewsArticle, onClick: (article: NewsArticle) => void }) {
  const isPositive = article.sentiment === 'Positive';
  const isNegative = article.sentiment === 'Negative';
  const isNeutral = article.sentiment === 'Neutral';

  // Sentiment conditional styling
  const sentimentColor = isPositive 
    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)] glow-emerald-500/20' 
    : isNegative 
    ? 'text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.15)] glow-rose-500/20'
    : 'text-slate-400 bg-slate-500/10 border-slate-500/20 shadow-[0_0_10px_rgba(148,163,184,0.15)]';

  const sentimentIcon = isPositive ? (
    <TrendingUp className="w-3 h-3 mr-1" />
  ) : isNegative ? (
    <TrendingDown className="w-3 h-3 mr-1" />
  ) : (
    <Minus className="w-3 h-3 mr-1" />
  );

  return (
    <div 
      className={`relative group cursor-pointer overflow-hidden rounded-2xl border border-border/50 bg-card hover:bg-muted/10 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${
        isPositive ? 'hover:border-emerald-500/40' : 
        isNegative ? 'hover:border-rose-500/40' : 
        'hover:border-slate-500/40'
      }`}
      onClick={() => onClick(article)}
    >
      <div className="flex flex-row p-4 gap-4 h-full items-center">
        
        {/* Content Section (Left) */}
        <div className="flex flex-col flex-grow min-w-0 justify-between h-full py-1">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-[11px] md:text-xs font-mono uppercase text-foreground/80 tracking-widest truncate max-w-[120px]">
                {article.source_name}
              </span>
              {/* Sentiment Badge Inline */}
              <div className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wider flex items-center border ${sentimentColor}`}>
                {sentimentIcon}
                <span>{article.sentiment_score > 0 ? '+' : ''}{article.sentiment_score.toFixed(2)}</span>
              </div>
            </div>
            
            <h4 className="text-sm md:text-base font-bold leading-snug group-hover:text-primary transition-colors line-clamp-3">
              {article.title}
            </h4>
          </div>
          
          <div className="flex items-center gap-2 mt-3 text-[10px] md:text-xs font-mono text-muted-foreground opacity-80">
             <span>{formatDistanceToNow(new Date(article.pubDate), { addSuffix: true })}</span>
             {article.tags.length > 0 && (
               <>
                 <span>&bull;</span>
                 <span className="truncate max-w-[100px]">{article.tags[0]}</span>
               </>
             )}
          </div>
        </div>

        {/* Image Section (Right) */}
        {article.image_url && (
          <div className="w-24 h-24 md:w-28 md:h-28 shrink-0 relative rounded-xl overflow-hidden border border-border/10 shadow-sm ml-1">
            <img 
              src={article.image_url} 
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        )}
      </div>
    </div>
  );
}
