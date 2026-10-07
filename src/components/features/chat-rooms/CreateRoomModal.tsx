"use client";

import React, { useState } from "react";
import { Plus, X, Clock, Zap, ArrowRight, Sparkles } from "lucide-react";
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
    const room = onCreateRoom(name.trim(), topic.trim() || undefined);
    setName("");
    setTopic("");
    onClose();
    onRoomCreated?.(room);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-card w-full max-w-sm sm:max-w-md rounded-2xl border border-border shadow-2xl p-4 sm:p-5 relative overflow-hidden my-auto">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-amber-500 to-emerald-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
            <Plus size={20} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black font-display uppercase tracking-tight text-foreground leading-tight">
              Create Virtual Room
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              Private chat room for your trading squad
            </p>
          </div>
        </div>

        {/* Compact Perks Pill Banner */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-secondary/40 border border-border/70 text-[11px] font-mono text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5 text-foreground font-semibold">
            <Clock size={13} className="text-emerald-500" />
            <span>10m Free Trial</span>
          </div>
          <span className="text-muted-foreground/50">•</span>
          <div className="flex items-center gap-1.5">
            <Zap size={13} className="text-amber-500" />
            <span>+1h for 0.0001 SOL</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 font-mono">
              Room Name <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SOL Bull Run"
              maxLength={40}
              autoFocus
              className="w-full bg-secondary/40 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-foreground placeholder-muted-foreground outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 font-mono">
              Topic <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Live Trading & Alpha"
              maxLength={60}
              className="w-full bg-secondary/40 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-foreground placeholder-muted-foreground outline-none transition-all"
            />
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-[10px] font-mono uppercase text-muted-foreground font-semibold mb-1 block">
              Suggestions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {["🔥 Alpha Calls", "🐂 SOL Bull Run", "💎 Diamond Hands", "⚡ Quick Scalps"].map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setName(preset.replace(/^[^\s]+\s/, ""))}
                    className="px-2 py-0.5 rounded-lg bg-secondary/60 hover:bg-secondary text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border/50 transition-colors cursor-pointer"
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
              className="py-2.5 px-3 rounded-xl border border-border bg-secondary/40 text-foreground text-xs font-bold hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2.5 px-3 rounded-xl bg-primary text-primary-foreground font-black uppercase font-display tracking-wider text-xs sm:text-sm hover:bg-primary-hover disabled:opacity-50 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <span>Create Room &amp; QR</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
