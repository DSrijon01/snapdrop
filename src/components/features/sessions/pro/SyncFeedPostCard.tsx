"use client";

import React, { useState } from "react";
import { SyncFeedPost } from "./SyncFeedMockData";
import { 
  Heart, 
  MessageSquare, 
  Repeat, 
  Share2, 
  MoreHorizontal, 
  X, 
  Check, 
  Send,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface SyncFeedPostCardProps {
  post: SyncFeedPost;
  onToggleLike: (id: string) => void;
  onToggleRestack: (id: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onToggleSubscribeCreator: (author: string) => void;
}

export const SyncFeedPostCard: React.FC<SyncFeedPostCardProps> = ({
  post,
  onToggleLike,
  onToggleRestack,
  onAddComment,
  onToggleSubscribeCreator,
}) => {
  const [showComments, setShowComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success("Post link copied to clipboard!");
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddComment(post.id, newCommentText);
    setNewCommentText("");
    toast.success("Comment published to Sync Feed Pro!");
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/45 backdrop-blur-md border border-border/80 rounded-2xl p-5 md:p-6 space-y-4 shadow-lg relative overflow-hidden group hover:border-border transition-all"
    >
      {/* Social Proof Header if present */}
      {post.socialProof && (
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-muted-foreground pb-1 border-b border-border/30">
          <Heart size={13} className="text-orange-500 fill-orange-500/20" />
          <span>{post.socialProof}</span>
        </div>
      )}

      {/* Author Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src={post.authorAvatar}
            alt={post.author}
            className="w-10 h-10 rounded-full object-cover border border-border/60 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black font-display text-sm text-foreground hover:underline cursor-pointer">
                {post.author}
              </span>
              <span className="text-xs font-mono text-muted-foreground">{post.timeAgo}</span>
            </div>
            {post.topic && (
              <span className="text-[11px] font-mono text-orange-500 uppercase tracking-wider">
                #{post.topic}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Subscribe Button */}
          <button
            onClick={() => onToggleSubscribeCreator(post.author)}
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase transition-all flex items-center gap-1 ${
              post.isSubscribed
                ? "bg-secondary text-muted-foreground border border-border/80"
                : "bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/30"
            }`}
          >
            {post.isSubscribed ? (
              <>
                <Check size={12} />
                <span>Subscribed</span>
              </>
            ) : (
              <span>Subscribe</span>
            )}
          </button>

          <button className="text-muted-foreground hover:text-foreground p-1">
            <MoreHorizontal size={16} />
          </button>
          <button 
            onClick={() => setIsDismissed(true)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Post Content */}
      <div className="space-y-3 font-sans">
        {post.title && (
          <h3 className="text-lg md:text-xl font-black font-display tracking-tight text-foreground leading-snug">
            {post.title}
          </h3>
        )}

        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line font-normal">
          {post.content}
        </div>

        {/* Update / Highlight Box */}
        {post.callout && (
          <div className="p-3.5 rounded-xl bg-orange-500/5 border-l-4 border-orange-500 text-xs italic text-foreground/80 leading-relaxed">
            {post.callout}
          </div>
        )}

        {/* Dual Media Embed */}
        {post.mediaType === "images" && post.mediaUrl1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="relative rounded-xl overflow-hidden border border-border/60 group/img bg-muted/40 aspect-video md:aspect-auto h-48">
              <img
                src={post.mediaUrl1}
                alt="Research Paper Preview"
                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5 line-clamp-1">
                  <FileText size={14} className="text-orange-500" />
                  {post.mediaTitle1 || "Research Paper PDF Preview"}
                </span>
              </div>
            </div>

            {post.mediaUrl2 && (
              <div className="relative rounded-xl overflow-hidden border border-border/60 group/img bg-muted/40 aspect-video md:aspect-auto h-48">
                <img
                  src={post.mediaUrl2}
                  alt="Trading Terminal"
                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                />
              </div>
            )}
          </div>
        )}

        {post.mediaType === "chart" && post.mediaUrl1 && (
          <div className="rounded-xl overflow-hidden border border-border/60 bg-muted/30 aspect-video max-h-72">
            <img
              src={post.mediaUrl1}
              alt="Data Chart"
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Engagement Actions Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs font-mono text-muted-foreground font-bold">
        <div className="flex items-center gap-6">
          {/* Like */}
          <button
            onClick={() => onToggleLike(post.id)}
            className={`flex items-center gap-1.5 transition-colors ${
              post.userLiked ? "text-orange-500" : "hover:text-foreground"
            }`}
          >
            <Heart size={16} className={post.userLiked ? "fill-orange-500 text-orange-500" : ""} />
            <span>{post.likes}</span>
          </button>

          {/* Comment */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <MessageSquare size={16} />
            <span>{post.commentsCount}</span>
          </button>

          {/* Restack */}
          <button
            onClick={() => onToggleRestack(post.id)}
            className={`flex items-center gap-1.5 transition-colors ${
              post.userRestacked ? "text-emerald-500" : "hover:text-foreground"
            }`}
          >
            <Repeat size={16} />
            <span>{post.restacks}</span>
          </button>
        </div>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Share2 size={16} />
        </button>
      </div>

      {/* Inline Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-3 border-t border-border/40 space-y-3 overflow-hidden"
          >
            {/* Existing Comments */}
            {post.commentsList && post.commentsList.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {post.commentsList.map((c) => (
                  <div key={c.id} className="bg-muted/40 p-2.5 rounded-xl flex items-start gap-2.5 text-xs">
                    <img src={c.avatar} alt={c.author} className="w-6 h-6 rounded-full shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{c.author}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{c.time}</span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-0.5">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic font-mono text-center py-1">
                No comments yet. Be the first subscriber to reply!
              </p>
            )}

            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write a subscriber reply..."
                className="flex-1 bg-secondary/50 border border-border focus:border-orange-500 rounded-xl px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-orange-500 text-white rounded-xl text-xs font-mono font-bold uppercase flex items-center gap-1 hover:bg-orange-600 transition-all"
              >
                <Send size={12} />
                <span>Post</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
};
