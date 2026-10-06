"use client";

import { useState, useMemo } from "react";
import { NewsArticle } from "@/lib/newsApi";
import { TopHeadlinesTimeline } from "@/components/features/market-news/TopHeadlinesTimeline";
import { NewsCard } from "@/components/features/market-news/NewsCard";
import { ArticleDetailView } from "@/components/features/market-news/ArticleDetailView";
import { ModuleSubscriptionWidget } from "@/components/global/subscription/ModuleSubscriptionWidget";
import { SSRecapCard } from "@/components/features/market-news/SSRecapCard";
import { MarketDigestModal } from "@/components/features/market-news/MarketDigestModal";

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
  const [showDigestModal, setShowDigestModal] = useState(false);

  // Combine and deduplicate articles for feeds
  const allArticles = useMemo(() => {
    const map = new Map<string, NewsArticle>();
    [...initialData.headlines, ...initialData.crypto, ...initialData.global].forEach((item) => {
      if (!map.has(item.article_id)) {
        map.set(item.article_id, item);
      }
    });
    return Array.from(map.values());
  }, [initialData]);

  // Mobile filtered feed
  const mobileFeedArticles = useMemo(() => {
    if (mobileCategory === 'global') return initialData.global;
    if (mobileCategory === 'crypto') return initialData.crypto;
    return allArticles;
  }, [mobileCategory, initialData, allArticles]);

  if (selectedArticle) {
    return <ArticleDetailView article={selectedArticle} onBack={() => setSelectedArticle(null)} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* 5-Min Read Executive Digest Modal */}
      <MarketDigestModal
        isOpen={showDigestModal}
        onClose={() => setShowDigestModal(false)}
        articles={initialData.headlines.length > 0 ? initialData.headlines : allArticles}
        onSelectArticle={setSelectedArticle}
      />

      {/* Local Page Header Area */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-border/40 shrink-0 gap-2 bg-background/95 backdrop-blur-md z-20">
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-background scroll-smooth">
        
        {/* ==================== MOBILE VIEW (SSRecapCard + Street Sync Staking Theme) ==================== */}
        <div className="md:hidden px-3.5 py-4 space-y-5 pb-36">
          {/* SSRecapCard: 24H Market Recap Card */}
          <SSRecapCard
            articles={initialData.headlines}
            onArticleClick={setSelectedArticle}
            onOpenDigest={() => setShowDigestModal(true)}
            isDesktop={false}
          />

          {/* Latest Headlines Section Header matching Ground News Image 1 */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xl font-display font-black tracking-tight text-foreground uppercase">
                  Latest Headlines
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Real-time market stream
                </p>
              </div>

              {/* Feed Category Toggle */}
              <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/50">
                <button
                  onClick={() => setMobileCategory('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                    mobileCategory === 'all'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setMobileCategory('global')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                    mobileCategory === 'global'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Global
                </button>
                <button
                  onClick={() => setMobileCategory('crypto')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                    mobileCategory === 'crypto'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Crypto
                </button>
              </div>
            </div>

            {/* List of News Cards */}
            <div className="space-y-3">
              {mobileFeedArticles.map((article) => (
                <NewsCard
                  key={article.article_id}
                  article={article}
                  onClick={setSelectedArticle}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ==================== DESKTOP VIEW (Kept Familiar + Enhanced with 24H Briefing & Timeline) ==================== */}
        <div className="hidden md:flex flex-col min-h-max pb-16">
          {/* Top Section: Side-by-side Ground News 24H Recap + Live Headlines Timeline */}
          <div className="border-b border-border/40 bg-muted/5 p-6">
            <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6 items-stretch">
              
              {/* Left Column: 24H Executive Recap Card */}
              <div className="col-span-5 flex flex-col justify-between">
                <SSRecapCard
                  articles={initialData.headlines}
                  onArticleClick={setSelectedArticle}
                  onOpenDigest={() => setShowDigestModal(true)}
                  isDesktop={true}
                  className="h-full"
                />
              </div>

              {/* Right Column: Live Headlines Timeline with refined container */}
              <div className="col-span-7 bg-card/60 border border-border/60 rounded-3xl overflow-hidden backdrop-blur-sm relative flex flex-col h-[460px] shadow-sm">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <span className="text-5xl font-black font-mono tracking-tighter">FEED</span>
                </div>
                <TopHeadlinesTimeline
                  articles={initialData.headlines}
                  onArticleClick={setSelectedArticle}
                />
              </div>

            </div>
          </div>

          {/* Bottom Section: Split Columns (Global Markets & Crypto Ecosystem) */}
          <div className="max-w-7xl mx-auto w-full px-6 py-6">
            <div className="flex flex-row gap-6">
              
              {/* Global News Column */}
              <div className="w-1/2 bg-card/30 border border-border/50 rounded-3xl overflow-hidden shadow-sm flex flex-col">
                <div className="px-6 py-4 border-b border-border/40 bg-muted/30 backdrop-blur-md flex items-center justify-between">
                  <h3 className="font-bold text-sm tracking-widest uppercase font-mono text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Global Markets
                  </h3>
                  <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/40">
                    {initialData.global.length} articles
                  </span>
                </div>
                <div className="p-4 space-y-3.5 flex-1">
                  {initialData.global.map((article) => (
                    <NewsCard key={article.article_id} article={article} onClick={setSelectedArticle} />
                  ))}
                </div>
              </div>

              {/* Crypto News Column */}
              <div className="w-1/2 bg-card/30 border border-border/50 rounded-3xl overflow-hidden shadow-sm flex flex-col">
                <div className="px-6 py-4 border-b border-border/40 bg-muted/30 backdrop-blur-md flex items-center justify-between">
                  <h3 className="font-bold text-sm tracking-widest uppercase font-mono text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Crypto Ecosystem
                  </h3>
                  <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/40">
                    {initialData.crypto.length} articles
                  </span>
                </div>
                <div className="p-4 space-y-3.5 flex-1">
                  {initialData.crypto.map((article) => (
                    <NewsCard key={article.article_id} article={article} onClick={setSelectedArticle} />
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
