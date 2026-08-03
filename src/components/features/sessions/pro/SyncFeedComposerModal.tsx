"use client";

import React, { useState } from "react";
import { X, Send, Image, FileText, Sparkles, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface SyncFeedComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishPost: (postData: { title: string; content: string; topic: string; mediaUrl?: string }) => void;
}

export const SyncFeedComposerModal: React.FC<SyncFeedComposerModalProps> = ({
  isOpen,
  onClose,
  onPublishPost,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [topic, setTopic] = useState("Finance & Markets");
  const [mediaUrl, setMediaUrl] = useState("");
  const [showMediaInput, setShowMediaInput] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Please enter some post content.");
      return;
    }

    onPublishPost({
      title: title.trim(),
      content: content.trim(),
      topic,
      mediaUrl: mediaUrl.trim() || undefined,
    });

    setTitle("");
    setContent("");
    setMediaUrl("");
    setShowMediaInput(false);
    onClose();
    toast.success("Sync Feed Pro Article Published!");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl bg-card border border-border/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-primary" />
              <h2 className="text-xl font-black font-display uppercase tracking-tight text-foreground">
                Publish to Sync Feed Pro
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (Optional)..."
                className="w-full bg-transparent text-lg md:text-xl font-bold font-display text-foreground placeholder-muted-foreground outline-none border-b border-border/40 pb-2"
              />
            </div>

            {/* Topic selector */}
            <div className="flex items-center gap-2">
              <Hash size={14} className="text-primary" />
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="bg-secondary/50 border border-border rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-foreground outline-none"
              >
                <option value="Finance & Markets">Finance & Markets</option>
                <option value="Quantitative Trading">Quantitative Trading</option>
                <option value="Solana & Crypto">Solana & Crypto</option>
                <option value="Macro Economics">Macro Economics</option>
                <option value="Tech & AI">Tech & AI</option>
              </select>
            </div>

            {/* Content Textarea */}
            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="What's on your mind? Share research, due diligence, or market notes..."
                className="w-full bg-secondary/30 border border-border/60 focus:border-primary rounded-2xl p-4 text-sm text-foreground placeholder-muted-foreground outline-none resize-none"
              />
            </div>

            {/* Optional Image URL Input */}
            {showMediaInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-1"
              >
                <label className="text-xs font-mono font-bold text-muted-foreground">
                  Image or Chart Preview URL:
                </label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
                />
              </motion.div>
            )}

            {/* Footer Toolbar */}
            <div className="flex items-center justify-between pt-4 border-t border-border/40">
              <div className="flex items-center gap-3 text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setShowMediaInput(!showMediaInput)}
                  className="flex items-center gap-1.5 text-xs font-mono font-bold hover:text-primary transition-colors"
                >
                  <Image size={16} />
                  <span>Attach Media</span>
                </button>
                <button
                  type="button"
                  onClick={() => toast("Research PDF upload enabled for Pro subscribers.")}
                  className="flex items-center gap-1.5 text-xs font-mono font-bold hover:text-primary transition-colors"
                >
                  <FileText size={16} />
                  <span>Attach Research PDF</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-secondary text-muted-foreground rounded-xl text-xs font-mono font-bold uppercase hover:bg-secondary/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-mono font-bold uppercase hover:bg-primary-hover shadow-md shadow-primary/20 flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>Publish Note</span>
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
