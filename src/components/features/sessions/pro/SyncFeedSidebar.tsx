"use client";

import React from "react";
import { 
  Search, 
  Check, 
  X, 
  ShieldCheck
} from "lucide-react";
import { SyncFeedSubscription, RecommendedCreator } from "./SyncFeedMockData";
import toast from "react-hot-toast";

interface SyncFeedSidebarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  subscriptions: SyncFeedSubscription[];
  recommendedCreators: RecommendedCreator[];
  onToggleSubscribeCreator: (creatorId: string) => void;
  onFilterBySubscription: (handle: string) => void;
  activeFilterHandle: string | null;
}

export const SyncFeedSidebar: React.FC<SyncFeedSidebarProps> = ({
  searchQuery,
  setSearchQuery,
  subscriptions,
  recommendedCreators,
  onToggleSubscribeCreator,
  onFilterBySubscription,
  activeFilterHandle,
}) => {
  return (
    <aside className="w-full lg:w-80 shrink-0 space-y-6">
      {/* Search Input Box */}
      <div className="relative w-full">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Sync Feed..."
          className="w-full bg-card/60 backdrop-blur-md border border-border/80 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {/* Subscriptions Panel */}
      <div className="bg-card/45 backdrop-blur-md border border-border/80 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-black font-display text-sm tracking-tight text-foreground uppercase">
            Subscriptions
          </h3>
          <button
            onClick={() => toast("Showing all active Sync Feed newsletters")}
            className="text-xs font-mono font-bold text-muted-foreground hover:text-orange-500 transition-colors"
          >
            See all
          </button>
        </div>

        {/* Circular Subscriptions Grid with Orange Badges */}
        <div className="grid grid-cols-4 gap-3 pt-1">
          {subscriptions.map((sub) => {
            const isSelected = activeFilterHandle === sub.handle;
            return (
              <button
                key={sub.id}
                onClick={() => onFilterBySubscription(sub.handle)}
                className={`flex flex-col items-center gap-1.5 group relative p-1 rounded-xl transition-all ${
                  isSelected ? "bg-orange-500/10 ring-1 ring-orange-500/40" : ""
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-secondary/80 border border-border/80 flex items-center justify-center text-xl group-hover:scale-105 transition-transform shadow-md">
                    {sub.avatar}
                  </div>
                  {/* Orange Unread Badge Dot */}
                  {sub.hasUnread && (
                    <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-card shadow-sm animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] font-mono font-bold text-muted-foreground group-hover:text-foreground line-clamp-1 text-center w-full">
                  {sub.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recommended For You Panel */}
      <div className="bg-card/45 backdrop-blur-md border border-border/80 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-black font-display text-sm tracking-tight text-foreground uppercase">
            Recommended for you
          </h3>
          <button
            onClick={() => toast("Discovering new Sync Feed publications...")}
            className="text-xs font-mono font-bold text-muted-foreground hover:text-orange-500 transition-colors"
          >
            See all
          </button>
        </div>

        <div className="space-y-3.5 pt-1">
          {recommendedCreators.map((creator) => (
            <div
              key={creator.id}
              className="flex items-center justify-between gap-3 group hover:bg-muted/30 p-2 rounded-xl transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-secondary border border-border/60 flex items-center justify-center text-base shrink-0">
                  {creator.avatar}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-foreground truncate">
                      {creator.name}
                    </span>
                    {creator.isVerified && (
                      <ShieldCheck size={13} className="text-orange-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate font-mono">
                    {creator.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onToggleSubscribeCreator(creator.id)}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase transition-all flex items-center gap-1 ${
                    creator.isSubscribed
                      ? "bg-secondary text-muted-foreground border border-border/80"
                      : "bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white border border-orange-500/30"
                  }`}
                >
                  {creator.isSubscribed ? (
                    <>
                      <Check size={11} />
                      <span>Subscribed</span>
                    </>
                  ) : (
                    <span>Subscribe</span>
                  )}
                </button>

                <button className="text-muted-foreground/60 hover:text-foreground p-1">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
