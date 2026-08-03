"use client";

import React, { useState, useEffect } from "react";
import { useSubscription } from "@/context/SubscriptionContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  ShieldAlert, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  BookOpen, 
  Search, 
  ChevronDown, 
  BarChart2, 
  Layout,
  RefreshCw
} from "lucide-react";
import Link from "next/link";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

import { 
  SubstackPost, 
  INITIAL_SUBSTACK_POSTS, 
  INITIAL_SUBSTACK_SUBSCRIPTIONS, 
  INITIAL_RECOMMENDED_CREATORS,
  SubstackSubscription,
  RecommendedCreator
} from "./SubstackMockData";
import { SubstackNav } from "./SubstackNav";
import { SubstackPostCard } from "./SubstackPostCard";
import { SubstackSidebar } from "./SubstackSidebar";
import { SubstackComposerModal } from "./SubstackComposerModal";
import toast from "react-hot-toast";

// Mock live sessions data for network metrics tab
const MOCK_PRO_SESSIONS_DATA = [
  { region: "US-East", activeTraders: 340 },
  { region: "US-West", activeTraders: 210 },
  { region: "EU-West", activeTraders: 580 },
  { region: "AP-East", activeTraders: 790 },
  { region: "AP-South", activeTraders: 430 },
  { region: "SA-East", activeTraders: 150 },
];

export function SessionsPro() {
  const { hasAccess, openSubscriptionModal, loading } = useSubscription();
  const [isMounted, setIsMounted] = useState(false);

  // View state: 'substack' | 'metrics'
  const [activeViewMode, setActiveViewMode] = useState<"substack" | "metrics">("substack");

  // Substack State
  const [navTab, setNavTab] = useState("home");
  const [posts, setPosts] = useState<SubstackPost[]>(INITIAL_SUBSTACK_POSTS);
  const [subscriptions, setSubscriptions] = useState<SubstackSubscription[]>(INITIAL_SUBSTACK_SUBSCRIPTIONS);
  const [recommendedCreators, setRecommendedCreators] = useState<RecommendedCreator[]>(INITIAL_RECOMMENDED_CREATORS);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [feedCategory, setFeedCategory] = useState("For you");
  const [activeFilterHandle, setActiveFilterHandle] = useState<string | null>(null);

  const [isComposerOpen, setIsComposerOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Load persisted Substack posts if available
    try {
      const stored = localStorage.getItem("substack_pro_posts");
      if (stored) {
        setPosts(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to load substack_pro_posts from localStorage:", e);
    }
  }, []);

  const savePosts = (updated: SubstackPost[]) => {
    setPosts(updated);
    try {
      localStorage.setItem("substack_pro_posts", JSON.stringify(updated.slice(0, 50)));
    } catch (e) {
      console.error("Failed to write substack_pro_posts to localStorage:", e);
    }
  };

  // Actions
  const handleToggleLike = (postId: string) => {
    const updated = posts.map((p) => {
      if (p.id !== postId) return p;
      const userLiked = !p.userLiked;
      return {
        ...p,
        userLiked,
        likes: userLiked ? p.likes + 1 : p.likes - 1,
      };
    });
    savePosts(updated);
  };

  const handleToggleRestack = (postId: string) => {
    const updated = posts.map((p) => {
      if (p.id !== postId) return p;
      const userRestacked = !p.userRestacked;
      return {
        ...p,
        userRestacked,
        restacks: userRestacked ? p.restacks + 1 : p.restacks - 1,
      };
    });
    savePosts(updated);
  };

  const handleAddComment = (postId: string, text: string) => {
    const updated = posts.map((p) => {
      if (p.id !== postId) return p;
      const newComment = {
        id: `c-${Date.now()}`,
        author: "Pro Subscriber",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
        text,
        time: "Just now",
      };
      return {
        ...p,
        commentsCount: p.commentsCount + 1,
        commentsList: [...(p.commentsList || []), newComment],
      };
    });
    savePosts(updated);
  };

  const handleToggleSubscribeCreator = (creatorIdOrAuthor: string) => {
    // Check if matching recommended creator ID
    setRecommendedCreators((prev) =>
      prev.map((c) => {
        if (c.id === creatorIdOrAuthor || c.name === creatorIdOrAuthor) {
          const isSubscribed = !c.isSubscribed;
          toast.success(isSubscribed ? `Subscribed to ${c.name}!` : `Unsubscribed from ${c.name}`);
          return { ...c, isSubscribed };
        }
        return c;
      })
    );

    // Also update post cards author subscription status
    setPosts((prev) =>
      prev.map((p) => {
        if (p.author === creatorIdOrAuthor || p.authorHandle === creatorIdOrAuthor) {
          return { ...p, isSubscribed: !p.isSubscribed };
        }
        return p;
      })
    );
  };

  const handleFilterBySubscription = (handle: string) => {
    if (activeFilterHandle === handle) {
      setActiveFilterHandle(null);
    } else {
      setActiveFilterHandle(handle);
      toast(`Filtering feed for @${handle}`);
    }
  };

  const handlePublishNewPost = (postData: { title: string; content: string; topic: string; mediaUrl?: string }) => {
    const newPost: SubstackPost = {
      id: `sub-post-user-${Date.now()}`,
      author: "You (Pro Publisher)",
      authorHandle: "you_pro",
      authorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      isVerified: true,
      timeAgo: "Just now",
      isSubscribed: true,
      title: postData.title || undefined,
      content: postData.content,
      topic: postData.topic,
      mediaType: postData.mediaUrl ? "chart" : undefined,
      mediaUrl1: postData.mediaUrl,
      likes: 1,
      commentsCount: 0,
      restacks: 0,
      userLiked: true,
    };

    savePosts([newPost, ...posts]);
  };

  // Filtered Substack Posts
  const filteredPosts = React.useMemo(() => {
    return posts.filter((p) => {
      // Search query
      const matchesSearch =
        searchQuery === "" ||
        p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.title && p.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.topic && p.topic.toLowerCase().includes(searchQuery.toLowerCase()));

      // Subscription handle filter
      const matchesHandle =
        !activeFilterHandle ||
        p.authorHandle.toLowerCase().includes(activeFilterHandle.toLowerCase()) ||
        p.author.toLowerCase().includes(activeFilterHandle.toLowerCase());

      // Category tab filter
      let matchesCategory = true;
      if (feedCategory === "Following") matchesCategory = p.isSubscribed === true;
      else if (feedCategory === "Quantitative Trading") matchesCategory = p.topic === "Quantitative Trading";
      else if (feedCategory === "Solana Tech") matchesCategory = p.topic === "Solana Tech";

      return matchesSearch && matchesHandle && matchesCategory;
    });
  }, [posts, searchQuery, activeFilterHandle, feedCategory]);

  if (!isMounted || loading) {
    return (
      <div className="flex h-screen w-full bg-background items-center justify-center text-muted-foreground animate-pulse font-mono uppercase tracking-widest text-xs gap-2">
        <RefreshCw className="animate-spin text-orange-500" size={18} />
        <span>Loading Substack Pro Environment...</span>
      </div>
    );
  }

  const access = hasAccess("sessions");

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative overflow-hidden flex flex-col items-center">
      {/* Background Neon glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[30rem] h-[30rem] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl px-4 md:px-6 pt-8 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 relative z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/sessions"
            className="flex items-center gap-2 text-xs font-mono tracking-widest font-bold uppercase text-muted-foreground hover:text-orange-500 transition-colors group px-3 py-2 -ml-3 rounded-lg hover:bg-muted/50"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Go Back</span>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-orange-500 animate-pulse" />
              Sessions Pro <span className="text-orange-500">Substack Hub</span>
            </h1>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mt-0.5">
              Exclusive research publication & subscriber network
            </p>
          </div>
        </div>

        {/* View Switcher Tabs (Substack Feed vs Network Metrics) */}
        {access && (
          <div className="flex items-center gap-1 bg-secondary/50 p-1.5 rounded-2xl border border-border/60 shrink-0">
            <button
              onClick={() => setActiveViewMode("substack")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-display uppercase transition-all ${
                activeViewMode === "substack"
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Layout size={14} />
              <span>Substack Feed</span>
            </button>
            <button
              onClick={() => setActiveViewMode("metrics")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-display uppercase transition-all ${
                activeViewMode === "metrics"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <BarChart2 size={14} />
              <span>Network Analytics</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-7xl px-4 md:px-6 py-6 flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {!access ? (
            /* LOCKED GATEWAY SCREEN */
            <motion.div
              key="locked"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto mt-12 bg-card/45 backdrop-blur-md border border-border/80 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />

              <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center text-orange-500 mx-auto mb-6">
                <ShieldAlert size={32} />
              </div>

              <h2 className="text-2xl font-black font-display uppercase tracking-tight text-foreground mb-2">
                Substack Pro Locked
              </h2>
              <p className="text-muted-foreground text-xs font-mono uppercase tracking-wide mb-6">
                Subscription Required to Access Research Feed
              </p>

              <div className="bg-muted/40 border border-border/60 rounded-2xl p-4 mb-6 text-left space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Subscribe to the Sessions Pro tier for <strong>1 SOL per 30 days</strong> to unlock:
                </p>
                <ul className="space-y-2 text-xs font-mono uppercase text-foreground/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span>Full Substack Pro quantitative research feed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span>Exclusive publication & subscriber channel access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span>Live cross-DEX arbitrage & geographic density metrics</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => openSubscriptionModal("sessions")}
                  className="w-full py-4 bg-orange-500 text-white hover:bg-orange-600 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl font-bold uppercase tracking-wider text-xs font-mono shadow-lg shadow-orange-500/20"
                >
                  Subscribe for 1 SOL / 30 Days
                </button>
                <Link
                  href="/sessions"
                  className="w-full py-3.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-all rounded-xl font-bold uppercase tracking-wider text-xs font-mono flex items-center justify-center gap-2"
                >
                  Back to Sessions Home
                </Link>
              </div>
            </motion.div>
          ) : activeViewMode === "substack" ? (
            /* SUBSTACK PRO PLATFORM ENVIRONMENT (MATCHING SCREENSHOT) */
            <motion.div
              key="substack-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row gap-6 items-start"
            >
              {/* Left Column - Substack Navigation Sidebar */}
              <SubstackNav
                activeTab={navTab}
                setActiveTab={setNavTab}
                onOpenComposer={() => setIsComposerOpen(true)}
              />

              {/* Center Column - Main Feed */}
              <div className="flex-1 space-y-6 w-full min-w-0">
                {/* Composer Trigger Box ("What's on your mind?") */}
                <div
                  onClick={() => setIsComposerOpen(true)}
                  className="bg-card/45 backdrop-blur-md border border-border/80 rounded-2xl p-4 flex items-center gap-3.5 cursor-pointer hover:border-orange-500/50 transition-all shadow-md group"
                >
                  <img
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
                    alt="User Avatar"
                    className="w-10 h-10 rounded-full border border-border/80 shrink-0"
                  />
                  <div className="flex-1 bg-secondary/50 border border-border/60 rounded-xl px-4 py-2.5 text-xs text-muted-foreground font-sans group-hover:text-foreground transition-colors">
                    What&apos;s on your mind?
                  </div>
                </div>

                {/* Feed Selector & Topics Filter Bar */}
                <div className="flex items-center justify-between border-b border-border/40 pb-3 gap-4">
                  <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                    {["For you", "Following", "Quantitative Trading", "Solana Tech"].map((category) => {
                      const isActive = feedCategory === category;
                      return (
                        <button
                          key={category}
                          onClick={() => setFeedCategory(category)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold font-display uppercase whitespace-nowrap transition-all flex items-center gap-1 ${
                            isActive
                              ? "bg-orange-500/15 text-orange-500 border border-orange-500/30"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                          }`}
                        >
                          <span>{category}</span>
                          {category === "For you" && <ChevronDown size={14} />}
                        </button>
                      );
                    })}
                  </div>

                  {activeFilterHandle && (
                    <button
                      onClick={() => setActiveFilterHandle(null)}
                      className="text-xs font-mono font-bold text-orange-500 hover:underline uppercase shrink-0"
                    >
                      Reset Filter (@{activeFilterHandle})
                    </button>
                  )}
                </div>

                {/* Substack Feed Items Stream */}
                <div className="space-y-6">
                  {filteredPosts.length === 0 ? (
                    <div className="bg-card/45 border border-border rounded-2xl p-12 text-center space-y-3">
                      <BookOpen size={36} className="mx-auto text-orange-500 opacity-60" />
                      <p className="font-display font-bold text-sm text-muted-foreground uppercase tracking-wide">
                        No Substack articles found matching this filter.
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setActiveFilterHandle(null);
                          setFeedCategory("For you");
                        }}
                        className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-mono font-bold uppercase"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : (
                    filteredPosts.map((post) => (
                      <SubstackPostCard
                        key={post.id}
                        post={post}
                        onToggleLike={handleToggleLike}
                        onToggleRestack={handleToggleRestack}
                        onAddComment={handleAddComment}
                        onToggleSubscribeCreator={handleToggleSubscribeCreator}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Right Column - Substack Sidebar (Search, Subscriptions Grid, Recommended Creators) */}
              <SubstackSidebar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                subscriptions={subscriptions}
                recommendedCreators={recommendedCreators}
                onToggleSubscribeCreator={handleToggleSubscribeCreator}
                onFilterBySubscription={handleFilterBySubscription}
                activeFilterHandle={activeFilterHandle}
              />
            </motion.div>
          ) : (
            /* LEGACY SESSIONS PRO METRICS ENVIRONMENT */
            <motion.div
              key="metrics-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Top Banner */}
              <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 bg-primary/15 rounded-2xl flex items-center justify-center text-primary shrink-0">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-foreground">
                      Sessions Pro Analytics
                    </h2>
                    <p className="text-muted-foreground text-xs md:text-sm mt-1 max-w-xl">
                      Monitor global connection points, explore current cross-exchange spreads, and inspect high-throughput network nodes.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 relative z-10">
                  <div className="bg-card/65 border border-border px-4 py-2.5 rounded-xl text-center">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">Active Traders</span>
                    <span className="text-lg font-black text-emerald-500 font-display">2.5k Live</span>
                  </div>
                  <div className="bg-card/65 border border-border px-4 py-2.5 rounded-xl text-center">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase block">Latency Index</span>
                    <span className="text-lg font-black text-primary font-display">1.8 ms</span>
                  </div>
                </div>
              </div>

              {/* Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Session Load Chart */}
                <div className="lg:col-span-2 bg-card/35 backdrop-blur-md border border-border rounded-3xl p-6 space-y-6">
                  <div>
                    <h3 className="font-black font-display uppercase tracking-tight text-lg">
                      Geographic Session Loads
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">Live Connection Density Map Index</p>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={MOCK_PRO_SESSIONS_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="region" stroke="#6b7280" fontSize={10} tickLine={false} />
                        <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(18, 18, 18, 0.9)",
                            borderColor: "rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                            fontFamily: "monospace",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="activeTraders" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Arbitrage Scanner */}
                <div className="bg-card/35 backdrop-blur-md border border-border rounded-3xl p-6 space-y-6">
                  <div>
                    <h3 className="font-black font-display uppercase tracking-tight text-lg">
                      Arbitrage Opportunities
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">Live cross-dex price spreads</p>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-border/80 rounded-2xl p-4 bg-muted/20 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono font-bold text-foreground">Jupiter / Raydium</span>
                        <span className="text-emerald-500 text-xs font-bold font-mono">+1.24% Spread</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Optimal Asset Path: SOL → USDC → SOL. Potential yield on 10 SOL capital.</p>
                    </div>

                    <div className="border border-border/80 rounded-2xl p-4 bg-muted/20 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono font-bold text-foreground">Orca / Meteora</span>
                        <span className="text-emerald-500 text-xs font-bold font-mono">+0.88% Spread</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Optimal Asset Path: bonk → SOL → bonk. High volume pool arbitrage detected.</p>
                    </div>

                    <div className="border border-border/80 rounded-2xl p-4 bg-muted/20 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono font-bold text-foreground">Raydium / Phoenix</span>
                        <span className="text-emerald-500 text-xs font-bold font-mono">+0.65% Spread</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Optimal Asset Path: USDC → pyth → USDC. Moderate priority speed execution suggested.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Substack Composer Modal */}
      <SubstackComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onPublishPost={handlePublishNewPost}
      />
    </div>
  );
}
