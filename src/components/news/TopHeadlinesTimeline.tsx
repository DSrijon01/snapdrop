"use client";

import { NewsArticle } from "@/lib/newsApi";
import { formatDistanceToNow } from "date-fns";

export function TopHeadlinesTimeline({ articles, onArticleClick }: { articles: NewsArticle[], onArticleClick: (article: NewsArticle) => void }) {
  return (
    <div className="h-full w-full overflow-y-auto scrollbar-hide flex flex-col p-6 border-b border-border/40 bg-background/50 backdrop-blur-sm relative">
      <div className="sticky top-0 z-10 flex items-center mb-6 pb-2 border-b border-border/10 bg-background/95 backdrop-blur-md">
        <h2 className="text-xl font-bold uppercase tracking-wider text-foreground m-0 flex items-center">
          <span className="w-2 h-2 rounded-full bg-primary mr-3 animate-pulse shadow-[0_0_8px_var(--color-primary)]"></span>
          Live Headlines
        </h2>
      </div>

      <div className="relative pl-6 space-y-8 pb-12">
        <div className="absolute top-2 bottom-0 left-[11px] w-[2px] bg-gradient-to-b from-border/80 to-transparent"></div>
        
        {articles.map((article, idx) => {
          const formattedTime = formatDistanceToNow(new Date(article.pubDate), { addSuffix: true });
          
          return (
            <div 
              key={article.article_id} 
              className="relative group cursor-pointer"
              onClick={() => onArticleClick(article)}
            >
              {/* Timeline Dot */}
              <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-background bg-border group-hover:bg-primary transition-colors duration-300 z-10 shadow-sm"></div>
              
              <div className="flex flex-col md:flex-row gap-4 border border-transparent p-3 -m-3 rounded-md transition-colors duration-200 hover:bg-muted/30">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5 opacity-70 text-xs font-mono uppercase tracking-wider">
                    <span className="font-bold text-foreground">{article.source_name}</span>
                    <span>&bull;</span>
                    <span>{formattedTime}</span>
                  </div>
                  <h3 className="text-lg font-semibold leading-tight mb-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {article.description}
                  </p>
                </div>
                {article.image_url && (
                  <div className="w-full md:w-48 h-24 shrink-0 rounded overflow-hidden mt-3 md:mt-0 opacity-90 group-hover:opacity-100 transition-opacity">
                    <img 
                      src={article.image_url} 
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
