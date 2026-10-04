"use client";

import React, { useState } from "react";
import { Plus, X, Sparkles, Clock, Zap, Users } from "lucide-react";
import { ChatRoom } from "@/lib/rooms/types";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (name: string, topic?: string) => ChatRoom;
  onRoomCreated?: (room: ChatRoom) => void;
}

export function CreateRoomModal({
  isOpen,
  onClose,
  onCreateRoom,
  onRoomCreated,
}: CreateRoomModalProps) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const room = onCreateRoom(name, topic);
    setName("");
    setTopic("");
    onClose();
    onRoomCreated?.(room);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-5 sm:p-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-amber-500 to-emerald-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
            <Plus size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-tight text-foreground leading-tight">
              Create Virtual Room
            </h3>
            <p className="text-xs text-muted-foreground font-mono">
              Private chat room for your friends & squad
            </p>
          </div>
        </div>

        {/* Perks Banner */}
        <div className="grid grid-cols-2 gap-2 mb-5 p-3 rounded-xl bg-secondary/30 border border-border/60 text-xs">
          <div className="flex items-start gap-2">
            <Clock size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-foreground block">10 Minutes Free</span>
              <span className="text-[10px] text-muted-foreground">Instant zero-cost trial</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Zap size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-foreground block">0.0001 SOL Extend</span>
              <span className="text-[10px] text-muted-foreground">+1 Hour extension anytime</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
              Room Name <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SOL Alpha Degens, Options Squad"
              maxLength={40}
              autoFocus
              className="w-full bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground placeholder-muted-foreground outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">
              Focus / Topic <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Live Trading & Market Sentiment"
              maxLength={60}
              className="w-full bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground placeholder-muted-foreground outline-none transition-all"
            />
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-[10px] font-mono uppercase text-muted-foreground font-semibold mb-1.5 block">
              Suggested Names:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {["🔥 Alpha Calls", "🐂 SOL Bull Run", "💎 Diamond Hands", "⚡ Quick Scalps"].map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setName(preset.replace(/^[^\s]+\s/, ""))}
                    className="px-2.5 py-1 rounded-lg bg-secondary/60 hover:bg-secondary text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
                  >
                    {preset}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border bg-secondary/40 text-foreground text-xs sm:text-sm font-bold hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:bg-primary-hover disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Sparkles size={16} />
              <span>Launch Room</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
