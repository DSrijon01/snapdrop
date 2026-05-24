"use client";

import React, { useState } from "react";
import { PlusCircle, Rocket, TrendingUp, TrendingDown, Clipboard, AlertCircle } from "lucide-react";
import { Post, Position } from "./mockData";

interface PostCreatorProps {
  onAddPost: (post: Omit<Post, "id" | "author" | "avatarSeed" | "createdAt" | "upvotes" | "comments">) => void;
}

const FLAIRS = ["YOLO", "DD", "LOSS PORN", "GAIN PORN", "MEME", "DISCUSSION"] as const;

export function PostCreator({ onAddPost }: PostCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [flair, setFlair] = useState<typeof FLAIRS[number]>("DISCUSSION");
  const [sentiment, setSentiment] = useState<"BULLISH" | "BEARISH" | "NEUTRAL">("NEUTRAL");
  const [ticker, setTicker] = useState("");
  
  // Position attachment
  const [attachPosition, setAttachPosition] = useState(false);
  const [posType, setPosType] = useState<"BUY" | "SELL">("BUY");
  const [posEntry, setPosEntry] = useState("");
  const [posCurrent, setPosCurrent] = useState("");
  const [posSize, setPosSize] = useState("");
  const [posLeverage, setPosLeverage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    let position: Position | undefined;
    if (attachPosition && ticker && posEntry && posSize) {
      position = {
        ticker: ticker.replace("$", "").toUpperCase(),
        type: posType,
        entryPrice: parseFloat(posEntry) || 0,
        currentPrice: parseFloat(posCurrent) || parseFloat(posEntry) || 0,
        size: parseFloat(posSize) || 0,
        leverage: posLeverage ? parseInt(posLeverage) : undefined,
      };
    }

    onAddPost({
      title: title.trim(),
      content: content.trim(),
      flair,
      sentiment,
      ticker: ticker ? ticker.replace("$", "").toUpperCase() : undefined,
      position,
    });

    // Reset Form
    setTitle("");
    setContent("");
    setFlair("DISCUSSION");
    setSentiment("NEUTRAL");
    setTicker("");
    setAttachPosition(false);
    setPosType("BUY");
    setPosEntry("");
    setPosCurrent("");
    setPosSize("");
    setPosLeverage("");
    setIsOpen(false);
  };

  // Auto-set flairs on certain conditions
  const handleFlairSelect = (selectedFlair: typeof FLAIRS[number]) => {
    setFlair(selectedFlair);
    if (selectedFlair === "LOSS PORN") {
      setSentiment("BEARISH");
      setAttachPosition(true);
    } else if (selectedFlair === "GAIN PORN" || selectedFlair === "YOLO") {
      setSentiment("BULLISH");
      setAttachPosition(true);
    }
  };

  return (
    <div className="glass-card rounded-2xl border border-border shadow-lg p-5 transition-all duration-300">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-secondary/10 hover:bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all duration-300 group"
        >
          <div className="flex items-center gap-3">
            <PlusCircle size={20} className="text-primary group-hover:scale-110 transition-transform" />
            <span className="font-display font-bold text-sm uppercase tracking-wider">
              Create a new Session Post (Positions, DD, YOLO...)
            </span>
          </div>
          <span className="text-[10px] font-mono border border-border px-2 py-0.5 rounded bg-card">
            POST
          </span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-md font-black font-display uppercase tracking-wider text-foreground">
              Create Session Post
            </h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground font-mono font-bold uppercase"
            >
              Cancel
            </button>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold uppercase text-muted-foreground tracking-wider">
              Post Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. YOLO'd my SOL balance into BONK calls..."
              className="w-full bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm font-medium text-foreground outline-none transition-all"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold uppercase text-muted-foreground tracking-wider">
              Content / Thesis *
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe your trade, write your DD analysis, or show off your gains..."
              className="w-full bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm font-medium text-foreground outline-none transition-all resize-y"
            />
          </div>

          {/* Grid Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Flair Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold uppercase text-muted-foreground tracking-wider">
                Flair Category
              </label>
              <select
                value={flair}
                onChange={(e) => handleFlairSelect(e.target.value as any)}
                className="w-full bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-sm font-medium text-foreground outline-none transition-all"
              >
                {FLAIRS.map((f) => (
                  <option key={f} value={f} className="bg-card">
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Sentiment */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold uppercase text-muted-foreground tracking-wider">
                Sentiment
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["BULLISH", "BEARISH", "NEUTRAL"] as const).map((sent) => {
                  const isActive = sentiment === sent;
                  const isBull = sent === "BULLISH";
                  const isBear = sent === "BEARISH";

                  return (
                    <button
                      key={sent}
                      type="button"
                      onClick={() => setSentiment(sent)}
                      className={`py-2 text-[10px] uppercase font-mono font-bold border rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                        isActive
                          ? isBull
                            ? "bg-green-500/10 border-green-500 text-green-500 shadow-[0_0_8px_rgba(34,197,94,0.15)]"
                            : isBear
                            ? "bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
                            : "bg-muted border-foreground text-foreground"
                          : "bg-secondary/20 border-transparent hover:border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isBull && <TrendingUp size={12} />}
                      {isBear && <TrendingDown size={12} />}
                      {sent}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ticker Tag */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold uppercase text-muted-foreground tracking-wider">
                Ticker Tag (optional)
              </label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="e.g. SOL, GME, BONK"
                className="w-full bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm font-medium text-foreground outline-none transition-all uppercase"
              />
            </div>
          </div>

          {/* Position Attaching Section */}
          <div className="border border-border/60 rounded-xl p-3.5 bg-secondary/5 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={attachPosition}
                onChange={(e) => setAttachPosition(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary w-4.5 h-4.5"
              />
              <span className="text-xs font-black font-display uppercase tracking-wide text-foreground">
                Attach Position Details (Positions or Ban!)
              </span>
            </label>

            {attachPosition && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 animate-in slide-in-from-top-1 duration-200">
                {/* Position Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold">
                    Position
                  </label>
                  <select
                    value={posType}
                    onChange={(e) => setPosType(e.target.value as any)}
                    className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-foreground outline-none"
                  >
                    <option value="BUY">LONG (BUY)</option>
                    <option value="SELL">SHORT (SELL)</option>
                  </select>
                </div>

                {/* Entry Price */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold">
                    Entry Price
                  </label>
                  <input
                    type="number"
                    step="any"
                    required={attachPosition}
                    value={posEntry}
                    onChange={(e) => setPosEntry(e.target.value)}
                    placeholder="e.g. 1.25"
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground outline-none"
                  />
                </div>

                {/* Current Price */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold">
                    Current Price
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={posCurrent}
                    onChange={(e) => setPosCurrent(e.target.value)}
                    placeholder="e.g. 1.45"
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground outline-none"
                  />
                </div>

                {/* Size / Tokens */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold">
                    Size (tokens)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required={attachPosition}
                    value={posSize}
                    onChange={(e) => setPosSize(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground outline-none"
                  />
                </div>

                {/* Leverage */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-mono uppercase text-muted-foreground font-bold">
                    Leverage (x)
                  </label>
                  <input
                    type="number"
                    value={posLeverage}
                    onChange={(e) => setPosLeverage(e.target.value)}
                    placeholder="e.g. 5, 10 (optional)"
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground outline-none"
                  />
                </div>

                {attachPosition && !ticker && (
                  <div className="col-span-full flex items-center gap-1.5 text-amber-500 mt-1">
                    <AlertCircle size={12} />
                    <span className="text-[10px] font-mono font-bold">
                      Note: You must fill the Ticker Tag above to attach this position.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-border hover:bg-secondary text-sm font-bold font-display uppercase tracking-wide transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-black font-display uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-102"
            >
              <Rocket size={16} />
              Launch Post!
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
