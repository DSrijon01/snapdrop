"use client";

import { useState } from "react";
import { NewsArticle } from "@/lib/newsApi";
import { TopHeadlinesTimeline } from "@/components/features/market-news/TopHeadlinesTimeline";
import { NewsCard } from "@/components/features/market-news/NewsCard";
import { ArticleDetailView } from "@/components/features/market-news/ArticleDetailView";
import { ModuleSubscriptionWidget } from "@/components/global/subscription/ModuleSubscriptionWidget";
import { Globe, Coins, Layers } from "lucide-react";

interface MarketNewsClientProps {
  initialData: {
    headlines: NewsArticle[];
    global: NewsArticle[];
    crypto: NewsArticle[];
  };
}

export function MarketNewsClient({ initialData }: MarketNewsClientProps) {
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [mobileCategory, setMobileCategory] = useState<'all' | 'global' | 'crypto'>('all');

  if (selectedArticle) {
    return <ArticleDetailView article={selectedArticle} onBack={() => setSelectedArticle(null)} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Local Page Header Area */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-border/40 shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-lg sm:text-2xl font-black font-display uppercase tracking-tight whitespace-nowrap">
            Market News
          </h2>
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono tracking-widest text-muted-foreground uppercase ml-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Feed Active
          </div>
        </div>
        <div className="shrink-0 scale-90 sm:scale-100 origin-right">
          <ModuleSubscriptionWidget moduleId="market-news" />
        </div>
      </div>

      {/* Mobile Category Filter Bar */}
      <div className="md:hidden px-3 py-2 border-b border-border/30 bg-muted/20 shrink-0">
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-xl">
          <button
            onClick={() => setMobileCategory('all')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
              mobileCategory === 'all'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">All Feeds</span>
          </button>
          <button
            onClick={() => setMobileCategory('global')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
              mobileCategory === 'global'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate">Global</span>
          </button>
          <button
            onClick={() => setMobileCategory('crypto')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
              mobileCategory === 'crypto'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">Crypto</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-background scroll-smooth">
        <div className="flex flex-col min-h-max pb-32 md:pb-12">
          {/* Top Half: Timeline */}
          <div className="h-[36vh] sm:h-[40vh] border-b border-primary/20 bg-background/50 backdrop-blur-sm min-h-[260px] sm:min-h-[300px] relative shrink-0">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <span className="text-6xl font-black font-mono tracking-tighter">LIVE</span>
            </div>
            <TopHeadlinesTimeline articles={initialData.headlines} onArticleClick={setSelectedArticle} />
          </div>

          {/* Bottom Half: Split Columns */}
          <div className="flex flex-col md:flex-row flex-1 relative">
            {/* Global News Column */}
            <div className={`w-full md:w-1/2 border-b md:border-b-0 md:border-r border-border/40 bg-muted/5 relative pb-8 ${
              mobileCategory === 'crypto' ? 'hidden md:block' : 'block'
            }`}>
              <div className="px-4 sm:px-6 py-3 border-b border-border/20 sticky top-0 bg-background/95 z-20 backdrop-blur-md shadow-sm">
                <h3 className="font-bold text-sm tracking-widest uppercase font-mono text-foreground/80 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Global Markets ({initialData.global.length})
                </h3>
              </div>
              <div className="px-3 sm:px-4 py-4 space-y-3 sm:space-y-4">
                {initialData.global.map((article) => (
                  <NewsCard key={article.article_id} article={article} onClick={setSelectedArticle} />
                ))}
              </div>
            </div>

            {/* Crypto News Column */}
            <div className={`w-full md:w-1/2 bg-muted/5 relative pb-8 ${
              mobileCategory === 'global' ? 'hidden md:block' : 'block'
            }`}>
              <div className="px-4 sm:px-6 py-3 border-b border-border/20 sticky top-0 bg-background/95 z-20 backdrop-blur-md shadow-sm">
                <h3 className="font-bold text-sm tracking-widest uppercase font-mono text-foreground/80 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Crypto Ecosystem ({initialData.crypto.length})
                </h3>
              </div>
              <div className="px-3 sm:px-4 py-4 space-y-3 sm:space-y-4">
                {initialData.crypto.map((article) => (
                  <NewsCard key={article.article_id} article={article} onClick={setSelectedArticle} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
