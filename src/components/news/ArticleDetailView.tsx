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
    <TrendingUp className="w-5 h-5 mr-2" />
  ) : isNegative ? (
    <TrendingDown className="w-5 h-5 mr-2" />
  ) : (
    <Minus className="w-5 h-5 mr-2" />
  );

  return (
    <div className="h-full w-full bg-background flex flex-col overflow-y-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center text-sm font-mono tracking-wider hover:text-brand-primary transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          BACK TO GRID
        </button>
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground border border-border/50 px-3 py-1 rounded-full">
          {article.source_name}
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-6 py-8 md:py-12">
        {/* Header Metadata */}
        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm font-mono uppercase tracking-wider text-muted-foreground">
          <span>{format(new Date(article.pubDate), "MMMM d, yyyy • h:mm a")}</span>
          <span className="hidden md:inline">&bull;</span>
          <div className="flex gap-2">
            {article.tags.map((tag, i) => (
              <span key={i} className="bg-muted px-2 py-0.5 rounded text-xs">{tag}</span>
            ))}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-black mb-8 leading-tight tracking-tight">
          {article.title}
        </h1>

        {/* Sentiment Analysis Callout block */}
        <div className={`flex items-center justify-between p-4 md:p-6 rounded-xl border mb-10 ${sentimentColor}`}>
          <div>
            <div className="text-xs font-mono uppercase font-bold tracking-widest mb-1 opacity-70">
              AI Sentiment Analysis
            </div>
            <div className="text-lg md:text-xl font-bold flex items-center">
              {sentimentIcon}
              <span>{article.sentiment}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono uppercase font-bold tracking-widest mb-1 opacity-70">
              Score
            </div>
            <div className="text-2xl md:text-3xl font-black font-mono">
              {article.sentiment_score > 0 ? '+' : ''}{article.sentiment_score.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Hero Image */}
        {article.image_url && (
          <div className="w-full h-64 md:h-96 rounded-xl overflow-hidden mb-12 shadow-2xl relative">
            <img 
              src={article.image_url} 
              alt={article.title}
              className="w-full h-full object-cover"
            />
            {/* Subtle gradient overlay at the bottom so text doesn't clash */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent"></div>
          </div>
        )}

        {/* Article Content */}
        <div className="prose prose-lg dark:prose-invert prose-brand max-w-none mb-16">
          <p className="text-xl md:text-2xl font-medium leading-relaxed mb-6 text-foreground/90">
            {article.description}
          </p>
          <div className="text-base md:text-lg leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {article.content}
            <br/><br/>
            [This is an internal content viewer. Data provided by NewsData.io integration.]
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-border pt-8 flex justify-between items-center">
          <button 
            onClick={onBack}
            className="flex items-center text-sm font-mono tracking-wider hover:text-brand-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> BACK
          </button>
          
          <a 
            href={article.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center px-6 py-3 bg-brand-primary text-primary-foreground font-bold text-sm tracking-wider uppercase hover:bg-brand-primary/90 transition-colors rounded-sm shadow-lg shadow-brand-primary/20"
          >
            Read Original Source
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </div>
      </div>
    </div>
  );
}
