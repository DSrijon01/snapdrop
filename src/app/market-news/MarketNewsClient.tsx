"use client";

import { useState } from "react";
import { NewsArticle } from "@/lib/newsApi";
import { TopHeadlinesTimeline } from "@/components/features/market-news/TopHeadlinesTimeline";
import { NewsCard } from "@/components/features/market-news/NewsCard";
import { ArticleDetailView } from "@/components/features/market-news/ArticleDetailView";

interface MarketNewsClientProps {
  initialData: {
    headlines: NewsArticle[];
    global: NewsArticle[];
    crypto: NewsArticle[];
  };
}

export function MarketNewsClient({ initialData }: MarketNewsClientProps) {
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  if (selectedArticle) {
    return <ArticleDetailView article={selectedArticle} onBack={() => setSelectedArticle(null)} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Local Page Header Area */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
        <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight">
          Market News
        </h2>
        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-muted-foreground uppercase">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Live Feed Active
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-background scroll-smooth">
        <div className="flex flex-col min-h-max pb-12">
          {/* Top Half: Timeline */}
          <div className="h-[40vh] border-b border-primary/20 bg-background/50 backdrop-blur-sm min-h-[300px] relative shrink-0">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <span className="text-6xl font-black font-mono tracking-tighter">LIVE</span>
            </div>
            <TopHeadlinesTimeline articles={initialData.headlines} onArticleClick={setSelectedArticle} />
          </div>

          {/* Bottom Half: Split Columns */}
          <div className="flex flex-row flex-1 relative">
            {/* Global News Column */}
            <div className="w-1/2 border-r border-border/40 bg-muted/5 relative pb-8">
              <div className="px-6 py-3 border-b border-border/20 sticky top-0 bg-background/95 z-20 backdrop-blur-md shadow-sm">
                <h3 className="font-bold text-sm tracking-widest uppercase font-mono text-foreground/80 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Global Markets
                </h3>
              </div>
              <div className="px-4 py-4 space-y-4">
                {initialData.global.map((article) => (
                  <NewsCard key={article.article_id} article={article} onClick={setSelectedArticle} />
                ))}
              </div>
            </div>

            {/* Crypto News Column */}
            <div className="w-1/2 bg-muted/5 relative pb-8">
              <div className="px-6 py-3 border-b border-border/20 sticky top-0 bg-background/95 z-20 backdrop-blur-md shadow-sm">
                <h3 className="font-bold text-sm tracking-widest uppercase font-mono text-foreground/80 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Crypto Ecosystem
                </h3>
              </div>
              <div className="px-4 py-4 space-y-4">
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
