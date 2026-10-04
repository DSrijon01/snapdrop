"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Search, Flame, Award, Clock, DollarSign, BookOpen, AlertCircle, RefreshCw, MessageSquare, Activity, Zap } from "lucide-react";
import { 
  Post, 
  BoardComment,
  ChatMessage, 
  INITIAL_POSTS, 
  INITIAL_CHAT, 
  SIMULATED_CHAT_POOL, 
  SIMULATED_POST_POOL, 
  MOCK_BOT_AUTHORS 
} from "./mockData";
import { PostCreator } from "./PostCreator";
import { PostCard } from "./PostCard";
import { LiveChatWall } from "./LiveChatWall";
import { TrendingTickers } from "./TrendingTickers";
import {
  subscribeToFirestorePosts,
  addPostToFirestore,
  voteFirestorePost,
  addCommentToFirestorePost,
} from "@/lib/l2database/posts";
import { L2DatabaseSyncBadge } from "@/components/features/l2database/L2DatabaseSyncBadge";
import toast from "react-hot-toast";

export function SessionsBoard() {
  const { publicKey } = useWallet();

  const [mounted, setMounted] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTicker, setActiveTicker] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState<"hot" | "new" | "top" | "yolo" | "porn">("hot");
  const [mobileTab, setMobileTab] = useState<"feed" | "chat" | "trending">("feed");

  // Prevent hydration mismatch & load initial
  useEffect(() => {
    setMounted(true);
    
    // Load from localStorage or set initial
    try {
      const storedPosts = localStorage.getItem("sessions_posts");
      if (storedPosts) {
        setPosts(JSON.parse(storedPosts).slice(0, 100));
      } else {
        setPosts(INITIAL_POSTS);
        localStorage.setItem("sessions_posts", JSON.stringify(INITIAL_POSTS));
      }
    } catch (e) {
      console.warn("Failed to load/initialize posts from localStorage:", e);
      setPosts(INITIAL_POSTS);
    }

    try {
      const storedChat = localStorage.getItem("sessions_chat");
      if (storedChat) {
        setChatMessages(JSON.parse(storedChat).slice(-50));
      } else {
        setChatMessages(INITIAL_CHAT);
        localStorage.setItem("sessions_chat", JSON.stringify(INITIAL_CHAT));
      }
    } catch (e) {
      console.warn("Failed to load/initialize chat from localStorage:", e);
      setChatMessages(INITIAL_CHAT);
    }
  }, []);

  // Real-time Cloud Firestore listener for posts
  useEffect(() => {
    if (!mounted) return;

    const unsub = subscribeToFirestorePosts(
      (firestorePosts) => {
        if (firestorePosts && firestorePosts.length > 0) {
          setPosts((current) => {
            const map = new Map<string, Post>();
            firestorePosts.forEach((p) => map.set(p.id, p));
            current.forEach((p) => {
              if (!map.has(p.id) && p.id.startsWith("post-user-")) {
                map.set(p.id, p);
              }
            });
            const merged = Array.from(map.values())
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 100);

            try {
              localStorage.setItem("sessions_posts", JSON.stringify(merged));
            } catch (err) {
              console.warn("Storage warning:", err);
            }
            return merged;
          });
        }
      },
      60,
      INITIAL_POSTS
    );

    return () => unsub();
  }, [mounted]);

  // Helper to save state with safety boundaries
  const savePosts = (updatedPosts: Post[]) => {
    const limited = updatedPosts.slice(0, 100); // Keep max 100 posts
    setPosts(limited);
    try {
      localStorage.setItem("sessions_posts", JSON.stringify(limited));
    } catch (e) {
      console.error("Failed to write sessions_posts to localStorage:", e);
    }
  };

  const saveChat = (updatedChat: ChatMessage[]) => {
    const limited = updatedChat.slice(-50); // Keep max 50 chat messages
    setChatMessages(limited);
    try {
      localStorage.setItem("sessions_chat", JSON.stringify(limited));
    } catch (e) {
      console.error("Failed to write sessions_chat to localStorage:", e);
    }
  };

  // Real-time Chat Simulator & Post Simulator
  useEffect(() => {
    if (!mounted) return;

    // Simulate incoming chat messages
    const chatInterval = setInterval(() => {
      const randomMsg = SIMULATED_CHAT_POOL[Math.floor(Math.random() * SIMULATED_CHAT_POOL.length)];
      const randomAuthor = MOCK_BOT_AUTHORS[Math.floor(Math.random() * MOCK_BOT_AUTHORS.length)];
      
      const newChat: ChatMessage = {
        id: `chat-sim-${Date.now()}-${Math.random()}`,
        author: randomAuthor,
        avatarSeed: randomAuthor,
        content: randomMsg,
        createdAt: new Date().toISOString()
      };

      setChatMessages((prev) => {
        const updated = [...prev, newChat].slice(-50); // Keep last 50
        try {
          localStorage.setItem("sessions_chat", JSON.stringify(updated));
        } catch (e) {
          console.error("Failed to save simulated chat to localStorage:", e);
        }
        return updated;
      });
    }, 4500 + Math.random() * 2000); // Every 4.5 to 6.5s

    // Simulate incoming posts
    const postInterval = setInterval(() => {
      const randomPostTemplate = SIMULATED_POST_POOL[Math.floor(Math.random() * SIMULATED_POST_POOL.length)];
      const randomAuthor = MOCK_BOT_AUTHORS[Math.floor(Math.random() * MOCK_BOT_AUTHORS.length)];

      const newPost: Post = {
        id: `post-sim-${Date.now()}-${Math.random()}`,
        title: randomPostTemplate.title,
        content: randomPostTemplate.content,
        author: randomAuthor,
        avatarSeed: randomAuthor,
        createdAt: new Date().toISOString(),
        flair: randomPostTemplate.flair as any,
        sentiment: randomPostTemplate.sentiment as any,
        ticker: randomPostTemplate.ticker,
        position: randomPostTemplate.position ? {
          ...randomPostTemplate.position,
          type: randomPostTemplate.position.type as "BUY" | "SELL",
          // Randomize current price slightly
          currentPrice: randomPostTemplate.position.currentPrice * (1 + (Math.random() * 0.1 - 0.05))
        } : undefined,
        upvotes: Math.floor(Math.random() * 80) + 10,
        comments: []
      };

      setPosts((prev) => {
        const updated = [newPost, ...prev].slice(0, 100); // Limit background post growth to 100 items
        try {
          localStorage.setItem("sessions_posts", JSON.stringify(updated));
        } catch (e) {
          console.error("Failed to save simulated posts to localStorage:", e);
        }
        return updated;
      });
    }, 28000 + Math.random() * 7000); // Every 28 to 35s

    return () => {
      clearInterval(chatInterval);
      clearInterval(postInterval);
    };
  }, [mounted]);

  // Actions
  const handleAddPost = (newPostData: Omit<Post, "id" | "author" | "avatarSeed" | "createdAt" | "upvotes" | "comments">) => {
    const seed = publicKey ? publicKey.toString() : "degen-guest";
    const authorName = publicKey 
      ? `User_${publicKey.toString().substring(0, 4).toUpperCase()}`
      : "Guest_Degen";

    const newPost: Post = {
      id: `post-user-${Date.now()}`,
      title: newPostData.title,
      content: newPostData.content,
      author: authorName,
      avatarSeed: seed,
      createdAt: new Date().toISOString(),
      flair: newPostData.flair,
      sentiment: newPostData.sentiment,
      ticker: newPostData.ticker,
      position: newPostData.position,
      upvotes: 1, // Start with self upvote
      userVote: "up",
      comments: []
    };

    savePosts([newPost, ...posts]);

    // Asynchronously push to Cloud Firestore
    addPostToFirestore({
      title: newPostData.title,
      content: newPostData.content,
      author: authorName,
      avatarSeed: seed,
      flair: newPostData.flair,
      sentiment: newPostData.sentiment,
      ticker: newPostData.ticker,
      position: newPostData.position,
      walletAddress: publicKey?.toBase58(),
    }).catch((err) => {
      console.warn("[SessionsBoard] Firestore addPost fallback:", err);
    });
  };

  const handleVote = (postId: string, voteType: "up" | "down") => {
    let diffToRecord = 0;

    const updated = posts.map((post) => {
      if (post.id !== postId) return post;

      let upvoteDiff = 0;
      let newVoteState: Post["userVote"] = undefined;

      if (voteType === "up") {
        if (post.userVote === "up") {
          upvoteDiff = -1; // Undo upvote
        } else if (post.userVote === "down") {
          upvoteDiff = 2; // Flip downvote to upvote
          newVoteState = "up";
        } else {
          upvoteDiff = 1; // New upvote
          newVoteState = "up";
        }
      } else {
        if (post.userVote === "down") {
          upvoteDiff = 1; // Undo downvote
        } else if (post.userVote === "up") {
          upvoteDiff = -2; // Flip upvote to downvote
          newVoteState = "down";
        } else {
          upvoteDiff = -1; // New downvote
          newVoteState = "down";
        }
      }

      diffToRecord = upvoteDiff;

      return {
        ...post,
        upvotes: post.upvotes + upvoteDiff,
        userVote: newVoteState
      };
    });

    savePosts(updated);

    if (diffToRecord !== 0) {
      voteFirestorePost(postId, diffToRecord).catch((err) => {
        console.warn("[SessionsBoard] Firestore vote fallback:", err);
      });
    }
  };

  const handleAddComment = (postId: string, content: string) => {
    const seed = publicKey ? publicKey.toString() : "degen-guest";
    const authorName = publicKey 
      ? `User_${publicKey.toString().substring(0, 4).toUpperCase()}`
      : "Guest_Degen";

    const newComment: BoardComment = {
      id: `comment-user-${Date.now()}-${Math.random()}`,
      author: authorName,
      avatarSeed: seed,
      content,
      createdAt: new Date().toISOString(),
      upvotes: 0
    };

    const updated = posts.map((post) => {
      if (post.id !== postId) return post;
      return {
        ...post,
        comments: [...post.comments, newComment]
      };
    });

    savePosts(updated);

    addCommentToFirestorePost(postId, {
      author: authorName,
      avatarSeed: seed,
      content,
    }).catch((err) => {
      console.warn("[SessionsBoard] Firestore addComment fallback:", err);
    });
  };

  const handleSendChatMessage = (content: string) => {
    const seed = publicKey ? publicKey.toString() : "degen-guest";
    const authorName = publicKey 
      ? `User_${publicKey.toString().substring(0, 4).toUpperCase()}`
      : "Guest_Degen";

    const newChat: ChatMessage = {
      id: `chat-user-${Date.now()}`,
      author: authorName,
      avatarSeed: seed,
      content,
      createdAt: new Date().toISOString()
    };

    saveChat([...chatMessages, newChat]);
  };

  const handleResetBoard = () => {
    localStorage.removeItem("sessions_posts");
    localStorage.removeItem("sessions_chat");
    setPosts(INITIAL_POSTS);
    setChatMessages(INITIAL_CHAT);
    toast.success("Board reset to default");
  };

  // Sorting and Filtering
  const filteredPosts = React.useMemo(() => {
    return posts
      .filter((post) => {
        // Search filter
        const matchesSearch = 
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (post.ticker && post.ticker.toLowerCase().includes(searchQuery.toLowerCase()));
        
        // Ticker filter
        const matchesTicker = activeTicker 
          ? post.ticker?.toUpperCase() === activeTicker.toUpperCase() 
          : true;

        return matchesSearch && matchesTicker;
      })
      .filter((post) => {
        // Flair categories for filters
        if (activeSort === "yolo") return post.flair === "YOLO";
        if (activeSort === "porn") return post.flair === "GAIN PORN" || post.flair === "LOSS PORN";
        return true;
      })
      .sort((a, b) => {
        if (activeSort === "new") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (activeSort === "top") {
          return b.upvotes - a.upvotes;
        }
        // "hot" sort (Default): combines upvotes and recency
        const aAgeHours = (Date.now() - new Date(a.createdAt).getTime()) / 3600000;
        const bAgeHours = (Date.now() - new Date(b.createdAt).getTime()) / 3600000;
        
        const aScore = a.upvotes / Math.pow(aAgeHours + 2, 1.5);
        const bScore = b.upvotes / Math.pow(bAgeHours + 2, 1.5);
        
        return bScore - aScore;
      });
  }, [posts, searchQuery, activeTicker, activeSort]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[calc(100vh-100px)]">
        <div className="text-center space-y-4">
          <RefreshCw className="animate-spin text-primary mx-auto" size={40} />
          <p className="font-mono text-muted-foreground uppercase tracking-widest text-sm">Loading Street Sync Feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-6xl mx-auto space-y-3 sm:space-y-6 ${mobileTab === 'chat' ? 'pb-2 sm:pb-12' : 'pb-28 sm:pb-12'}`}>
      {/* Board Header Banner */}
      <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border p-4 sm:p-6 md:p-8 bg-gradient-to-r from-background via-secondary/10 to-primary/5 shadow-xl flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 ${
        mobileTab === 'chat' ? 'hidden lg:flex' : 'flex'
      }`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-green-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="space-y-1.5 sm:space-y-2 relative z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="bg-primary text-primary-foreground font-black font-display text-[9px] sm:text-[10px] tracking-widest uppercase px-2.5 py-0.5 sm:py-1 rounded-full shadow-md shadow-primary/20">
              StreetSync
            </span>
            <span className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono font-bold text-green-500 bg-green-500/10 border border-green-500/20 px-2 sm:px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
              142k Online
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black font-display uppercase tracking-tight text-foreground">
            Street Sync <span className="text-primary">Posting Board</span>
          </h2>
          <p className="text-muted-foreground max-w-xl text-xs sm:text-sm md:text-base font-medium">
            Sync your trades, Due Diligence, gains, and losses with the street. Not financial advice. Positions or ban!
          </p>
        </div>

        {/* L2 Database Connection & Sync Controls */}
        <div className="relative z-10 shrink-0 flex flex-wrap items-center gap-2">
          <L2DatabaseSyncBadge />

          <button 
            onClick={handleResetBoard}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-mono font-bold uppercase border border-border hover:bg-secondary/40 rounded-xl transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher (Visible on < lg screens) */}
      <div className="flex lg:hidden items-center p-1 bg-secondary/30 rounded-xl border border-border gap-1">
        <button
          onClick={() => setMobileTab("feed")}
          className={`flex-1 py-2 text-xs font-bold font-display uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === "feed"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare size={14} />
          <span>Feed ({filteredPosts.length})</span>
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-2 text-xs font-bold font-display uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === "chat"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity size={14} />
          <span>Live Chat</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        </button>
        <button
          onClick={() => setMobileTab("trending")}
          className={`flex-1 py-2 text-xs font-bold font-display uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === "trending"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Flame size={14} />
          <span>Trending</span>
        </button>
      </div>

      {/* Main Board Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
        
        {/* Left Column - Posting Feed & Form (2/3 width on desktop) */}
        <div className={`lg:col-span-2 space-y-4 sm:space-y-6 ${mobileTab !== "feed" ? "hidden lg:block" : "block"}`}>
          {/* Post Creation Form */}
          <PostCreator onAddPost={handleAddPost} />

          {/* Filtering and Search Area */}
          <div className="glass-card p-3 sm:p-4 rounded-2xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            
            {/* Sort Tabs */}
            <div className="overflow-x-auto no-scrollbar flex items-center gap-1 bg-secondary/20 p-1 rounded-xl border border-border/40 w-full sm:w-fit shrink-0">
              {(["hot", "new", "top", "yolo", "porn"] as const).map((sort) => {
                const isActive = activeSort === sort;
                const getLabel = () => {
                  switch (sort) {
                    case "hot": return "🔥 Hot";
                    case "new": return "🆕 New";
                    case "top": return "🏆 Top";
                    case "yolo": return "🚀 YOLOs";
                    case "porn": return "📉 Gains/Losses";
                  }
                };

                return (
                  <button
                    key={sort}
                    onClick={() => setActiveSort(sort)}
                    className={`whitespace-nowrap px-2.5 sm:px-3 py-1.5 text-xs font-bold uppercase font-display rounded-lg transition-all shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                    }`}
                  >
                    {getLabel()}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 w-full md:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts or tickers..."
                className="w-full bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-10 pr-12 py-2 text-xs sm:text-sm text-foreground placeholder-muted-foreground/60 outline-none transition-all"
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
          </div>

          {/* Active Ticker Filter Alert */}
          {activeTicker && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-foreground animate-in slide-in-from-top-1">
              <span className="text-xs sm:text-sm font-bold font-display uppercase tracking-wide flex items-center gap-2">
                <Flame size={16} className="text-primary" />
                Filtering by Ticker: <span className="text-primary">${activeTicker}</span>
              </span>
              <button
                onClick={() => setActiveTicker(null)}
                className="text-xs text-primary font-bold font-mono hover:underline uppercase"
              >
                Show All Tickers
              </button>
            </div>
          )}

          {/* Posts List */}
          <div className="space-y-4">
            {filteredPosts.length === 0 ? (
              <div className="glass-card rounded-2xl border border-border p-8 sm:p-12 text-center space-y-3">
                <AlertCircle className="mx-auto text-muted-foreground animate-bounce" size={32} />
                <p className="font-display font-bold uppercase tracking-wider text-muted-foreground text-xs sm:text-sm">
                  No post matches your search or filters.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveTicker(null);
                    setActiveSort("hot");
                  }}
                  className="px-4 py-2 bg-secondary border border-border hover:bg-secondary/80 rounded-xl text-xs font-mono font-bold uppercase text-foreground transition-all"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onVote={handleVote}
                  onAddComment={handleAddComment}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column - Sidebar (1/3 width on desktop) */}
        <div className={`space-y-4 sm:space-y-6 lg:sticky lg:top-[90px] ${mobileTab === "feed" ? "hidden lg:block" : "block"}`}>
          
          {/* Live Chat Wall (shows first on mobile if chat tab is active) */}
          <div className={mobileTab === "trending" ? "hidden lg:block" : "block"}>
            <LiveChatWall 
              messages={chatMessages} 
              onSendMessage={handleSendChatMessage} 
            />
          </div>

          {/* Trending Tickers */}
          <div className={mobileTab === "chat" ? "hidden lg:block" : "block"}>
            <TrendingTickers 
              posts={posts} 
              activeTicker={activeTicker} 
              onSelectTicker={(ticker) => {
                setActiveTicker(ticker);
                setMobileTab("feed");
              }} 
            />
          </div>

          {/* Wendy's Rules Board */}
          <div className={mobileTab === "chat" ? "hidden lg:block" : "block"}>
            <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border shadow-lg space-y-4">
              <h3 className="text-sm font-black font-display uppercase tracking-wider flex items-center gap-2 text-foreground">
                <BookOpen size={16} className="text-primary" />
                Board Guidelines
              </h3>
              <ul className="space-y-2.5 font-sans text-xs text-muted-foreground leading-relaxed pl-1">
                <li className="flex items-start gap-2">
                  <span className="font-mono text-primary font-bold">01.</span>
                  <span>Positions or ban: YOLO, Gain, and Loss posts must attach real trade values.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-primary font-bold">02.</span>
                  <span>We like the stock: Support your fellow degens. Paper hands will be mocked.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-primary font-bold">03.</span>
                  <span>Sir, this is a Wendy\'s: Keep the discussions lighthearted and meme-friendly.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-primary font-bold">04.</span>
                  <span>Not Financial Advice: Do not complain if you liquidated your wallet on 50x leverage.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
