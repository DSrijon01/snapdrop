"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send, Activity } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ChatMessage } from "./mockData";

interface LiveChatWallProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
}

const QUICK_REACTIONS = ["🚀 Moon", "💎 Hands", "🐂 Bullish", "🐻 Bearish", "💸 Print it", "🍜 Ramen"];

export function LiveChatWall({ messages, onSendMessage }: LiveChatWallProps) {
  const { publicKey } = useWallet();
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleQuickReaction = (reaction: string) => {
    onSendMessage(reaction);
  };

  const getAuthorDisplay = (author: string) => {
    if (author.startsWith("User_") && author.length > 10) {
      return author.substring(0, 9);
    }
    return author;
  };

  return (
    <div className="glass-card live-chat-card flex flex-col w-full rounded-2xl border border-border shadow-lg overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-border bg-secondary/10 shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-primary animate-pulse" />
          <div>
            <h3 className="text-xs sm:text-sm font-black font-display uppercase tracking-wider text-foreground leading-none">
              Live Trading Chat
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">Instant Community Feed</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
          <span className="text-[10px] font-mono font-bold uppercase text-green-500 tracking-wider">
            LIVE
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3 scrollbar-hide bg-secondary/5"
      >
        {messages.map((msg) => {
          const isCurrentUser =
            publicKey && msg.author === `User_${publicKey.toString().substring(0, 4).toUpperCase()}`;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 transition-all duration-300 animate-in slide-in-from-bottom-2 ${
                isCurrentUser ? "flex-row-reverse" : ""
              }`}
            >
              {/* Dicebear Avatar */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-secondary border border-border overflow-hidden shrink-0 flex items-center justify-center p-0.5 shadow-sm">
                <img
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${msg.avatarSeed}&backgroundColor=transparent`}
                  alt={msg.author}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Message Content Bubble */}
              <div
                className={`max-w-[80%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm leading-relaxed ${
                  isCurrentUser
                    ? "bg-primary text-primary-foreground rounded-tr-none shadow-[0_4px_12px_rgba(218,41,28,0.15)]"
                    : "bg-card border border-border rounded-tl-none text-foreground shadow-xs"
                }`}
              >
                <div className={`flex items-center gap-2 mb-1 ${isCurrentUser ? "justify-end" : ""}`}>
                  <span className={`text-[11px] font-black font-display tracking-tight ${isCurrentUser ? "text-primary-foreground" : "text-foreground/90"}`}>
                    {getAuthorDisplay(msg.author)}
                  </span>
                  <span className={`text-[9px] font-mono ${isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="break-words font-sans text-xs sm:text-sm font-medium">{msg.content}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Reaction Chips */}
      <div className="px-3 py-1.5 border-t border-border/40 bg-secondary/10 shrink-0 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        <span className="text-[10px] font-mono text-muted-foreground uppercase shrink-0 font-bold hidden sm:inline">Quick:</span>
        {QUICK_REACTIONS.map((reaction) => (
          <button
            key={reaction}
            type="button"
            onClick={() => handleQuickReaction(reaction)}
            className="px-2.5 py-1 rounded-lg bg-card hover:bg-primary hover:text-primary-foreground border border-border text-[11px] font-mono font-medium text-foreground transition-all shrink-0 active:scale-95 shadow-xs"
          >
            {reaction}
          </button>
        ))}
      </div>

      {/* Input Message Form */}
      <form
        onSubmit={handleSubmit}
        className="p-2.5 sm:p-3 border-t border-border bg-card shrink-0 flex gap-2 items-center"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Say something to the board..."
          maxLength={150}
          className="flex-1 min-w-0 bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder-muted-foreground outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 sm:p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-all shadow-md shrink-0 flex items-center justify-center active:scale-95"
          aria-label="Send message"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
