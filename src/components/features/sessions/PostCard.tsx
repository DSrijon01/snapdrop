"use client";

import React, { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, MessageSquare, Share2, Rocket, FileText, CheckCircle } from "lucide-react";
import { Post, BoardComment } from "./mockData";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";

interface PostCardProps {
  post: Post;
  onVote: (postId: string, voteType: "up" | "down") => void;
  onAddComment: (postId: string, content: string) => void;
}

export function PostCard({ post, onVote, onAddComment }: PostCardProps) {
  const { publicKey } = useWallet();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  
  // Real-time position price fluctuation
  const [livePrice, setLivePrice] = useState<number | null>(
    post.position ? post.position.currentPrice : null
  );

  useEffect(() => {
    if (!post.position || livePrice === null) return;

    // Set up a random interval to simulate real-time price changes
    const interval = setInterval(() => {
      setLivePrice((prevPrice) => {
        if (prevPrice === null) return null;
        // Fluctuate price by -1.5% to +1.5%
        const percentChange = (Math.random() * 3 - 1.5) / 100;
        const newPrice = prevPrice * (1 + percentChange);
        // Round to suitable decimals
        return parseFloat(newPrice.toFixed(post.position?.entryPrice && post.position.entryPrice < 0.01 ? 6 : 2));
      });
    }, 4000 + Math.random() * 2000); // every 4-6 seconds

    return () => clearInterval(interval);
  }, [post.position]);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(post.id, commentText.trim());
    setCommentText("");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!", {
      style: {
        background: "var(--card)",
        color: "var(--foreground)",
        border: "1px border var(--border)",
      },
    });
  };

  // P&L Calculations
  const renderPositionCard = () => {
    if (!post.position || livePrice === null) return null;

    const { ticker, type, entryPrice, size, leverage = 1 } = post.position;
    const isLong = type === "BUY";
    
    // Percentage Return
    let pnlPercent = ((livePrice - entryPrice) / entryPrice) * 100;
    if (!isLong) pnlPercent = -pnlPercent; // Invert for Short
    pnlPercent = pnlPercent * leverage;

    // Dollar Return
    let pnlAmount = (livePrice - entryPrice) * size * leverage;
    if (!isLong) pnlAmount = -pnlAmount;

    const isProfit = pnlAmount >= 0;

    return (
      <div className={`mt-4 border rounded-xl overflow-hidden bg-secondary/5 transition-all ${
        isProfit 
          ? "border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.05)]" 
          : "border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
      }`}>
        {/* Header bar */}
        <div className={`px-4 py-2 flex justify-between items-center text-xs font-black font-display uppercase tracking-wider ${
          isProfit ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
        }`}>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isProfit ? "bg-green-500 animate-pulse" : "bg-red-500 animate-pulse"}`} />
            {isLong ? "Long Position" : "Short Position"} {leverage > 1 ? `${leverage}x` : ""}
          </span>
          <span className="font-mono font-bold tracking-tight">
            Live Fluctuation
          </span>
        </div>

        {/* Position Stats Grid */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground font-mono font-bold">Asset</span>
            <p className="text-base font-black font-display text-foreground">${ticker}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground font-mono font-bold">Entry Price</span>
            <p className="text-base font-bold font-mono text-foreground">${entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground font-mono font-bold">Mark Price</span>
            <p className="text-base font-bold font-mono text-foreground">${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground font-mono font-bold">Position Size</span>
            <p className="text-base font-bold font-mono text-foreground">{size.toLocaleString()} tokens</p>
          </div>
        </div>

        {/* P&L Panel */}
        <div className={`p-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-secondary/10`}>
          <div>
            <span className="text-[10px] uppercase text-muted-foreground font-mono font-bold">Estimated P&L</span>
            <div className="flex items-baseline gap-2.5">
              <span className={`text-xl sm:text-2xl font-black font-mono ${isProfit ? "text-green-500" : "text-red-500"}`}>
                {isProfit ? "+" : ""}${pnlAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-sm font-black font-mono ${isProfit ? "text-green-500" : "text-red-500"}`}>
                ({isProfit ? "+" : ""}{pnlPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isProfit ? (
              <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-mono font-bold uppercase tracking-wider">
                Printing Cash 💸
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-mono font-bold uppercase tracking-wider">
                Paper Losses 📄
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getFlairStyle = (flair: Post["flair"]) => {
    switch (flair) {
      case "YOLO":
        return "bg-amber-500/10 border-amber-500/30 text-amber-500";
      case "DD":
        return "bg-purple-500/10 border-purple-500/30 text-purple-500";
      case "LOSS PORN":
        return "bg-rose-600/10 border-rose-600/30 text-rose-500";
      case "GAIN PORN":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-500";
      case "MEME":
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-500";
      case "DISCUSSION":
        return "bg-blue-500/10 border-blue-500/30 text-blue-500";
    }
  };

  const getAuthorDisplay = (author: string) => {
    if (author.startsWith("User_") && author.length > 10) {
      return author.substring(0, 9);
    }
    return author;
  };

  return (
    <div className="glass-card rounded-2xl border border-border shadow-lg p-5 flex gap-4 transition-all hover:border-border/80 duration-300">
      {/* Vote Panel (Desktop Sidebar) */}
      <div className="hidden sm:flex flex-col items-center gap-1.5 shrink-0 bg-secondary/20 p-2 rounded-xl h-fit border border-border/40">
        <button
          onClick={() => onVote(post.id, "up")}
          className={`p-1.5 rounded-lg transition-all ${
            post.userVote === "up" 
              ? "text-primary bg-primary/10" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          aria-label="Upvote"
        >
          <ChevronUp size={20} className="stroke-[2.5]" />
        </button>
        <span className={`font-mono font-bold text-sm tracking-tight ${
          post.userVote === "up" 
            ? "text-primary" 
            : post.userVote === "down" 
            ? "text-red-500" 
            : "text-foreground"
        }`}>
          {post.upvotes}
        </span>
        <button
          onClick={() => onVote(post.id, "down")}
          className={`p-1.5 rounded-lg transition-all ${
            post.userVote === "down" 
              ? "text-red-500 bg-red-500/10" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          aria-label="Downvote"
        >
          <ChevronDown size={20} className="stroke-[2.5]" />
        </button>
      </div>

      {/* Main Post Section */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Post Metadata Header */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-secondary border border-border overflow-hidden shrink-0 flex items-center justify-center p-0.5">
            <img
              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${post.avatarSeed}&backgroundColor=transparent`}
              alt={post.author}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-sm font-black font-display text-foreground tracking-tight">
              {getAuthorDisplay(post.author)}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              • {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Flair Badge */}
            <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-mono font-black uppercase tracking-wider ${getFlairStyle(post.flair)}`}>
              {post.flair}
            </span>

            {/* Sentiment Badge */}
            {post.sentiment !== "NEUTRAL" && (
              <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                post.sentiment === "BULLISH"
                  ? "bg-green-500/10 border-green-500/30 text-green-500"
                  : "bg-red-500/10 border-red-500/30 text-red-500"
              }`}>
                {post.sentiment === "BULLISH" ? "🐂 Bullish" : "🐻 Bearish"}
              </span>
            )}
          </div>
        </div>

        {/* Post Content */}
        <div className="space-y-2.5">
          {/* Ticker Indicator prefix if exists */}
          <h2 className="text-lg font-black font-display uppercase tracking-tight text-foreground leading-tight">
            {post.ticker && (
              <span className="mr-2 text-primary font-mechanical border border-primary/20 px-1.5 py-0.5 rounded bg-primary/5 text-sm align-middle tracking-wider">
                ${post.ticker}
              </span>
            )}
            <span className="align-middle">{post.title}</span>
          </h2>
          <p className="text-muted-foreground text-sm font-medium leading-relaxed break-words whitespace-pre-line font-sans">
            {post.content}
          </p>
        </div>

        {/* Position Details widget */}
        {renderPositionCard()}

        {/* Bottom Actions Row & Mobile Votes */}
        <div className="flex items-center justify-between border-t border-border/40 pt-3 text-muted-foreground text-xs font-mono font-bold uppercase tracking-wider">
          {/* Mobile Upvote/Downvote actions */}
          <div className="flex sm:hidden items-center gap-1 bg-secondary/30 rounded-xl p-1 border border-border/40 shrink-0">
            <button
              onClick={() => onVote(post.id, "up")}
              className={`p-1.5 rounded-lg ${post.userVote === "up" ? "text-primary" : ""}`}
            >
              <ChevronUp size={18} />
            </button>
            <span className="px-1 text-foreground font-mono">{post.upvotes}</span>
            <button
              onClick={() => onVote(post.id, "down")}
              className={`p-1.5 rounded-lg ${post.userVote === "down" ? "text-red-500" : ""}`}
            >
              <ChevronDown size={18} />
            </button>
          </div>

          <div className="flex items-center gap-5">
            {/* Comments toggle */}
            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-2 hover:text-foreground transition-colors py-1.5 px-3 rounded-lg hover:bg-secondary/40 ${
                showComments ? "text-foreground bg-secondary/20" : ""
              }`}
            >
              <MessageSquare size={16} />
              <span>{post.comments.length} Comments</span>
            </button>

            {/* Share button */}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 hover:text-foreground transition-colors py-1.5 px-3 rounded-lg hover:bg-secondary/40"
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>

        {/* Expandable Comments Area */}
        {showComments && (
          <div className="border-t border-border/60 pt-4 mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {/* Add Comment Form */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a reply. Be nice or don't..."
                className="flex-1 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground font-black font-display text-xs uppercase tracking-wider rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
              >
                Reply
              </button>
            </form>

            {/* Comments List */}
            <div className="space-y-3.5">
              {post.comments.length === 0 ? (
                <p className="text-xs text-muted-foreground italic pl-2 py-1 font-sans">
                  No replies yet. Be the first to tell them why their trade is terrible!
                </p>
              ) : (
                post.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 bg-secondary/10 p-3 rounded-xl border border-border/30">
                    <div className="w-7 h-7 rounded-md bg-secondary border border-border overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${comment.avatarSeed}&backgroundColor=transparent`}
                        alt={comment.author}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-display text-foreground">
                          {getAuthorDisplay(comment.author)}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed break-words font-medium font-sans">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
