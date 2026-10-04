"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Send,
  Activity,
  Plus,
  QrCode,
  Zap,
  Clock,
  Users,
  Share2,
  Sparkles,
  ArrowRight,
  Flame,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ChatMessage } from "./mockData";
import { useChatRooms } from "@/lib/rooms/useChatRooms";
import { CreateRoomModal } from "@/components/features/chat-rooms/CreateRoomModal";
import { RoomQRModal } from "@/components/features/chat-rooms/RoomQRModal";
import { ExtendRoomModal } from "@/components/features/chat-rooms/ExtendRoomModal";
import { ChatRoom } from "@/lib/rooms/types";
import { pushChatMessage, subscribeToRoomMessages, FirebaseChatMessage } from "@/lib/l2database/chat";

interface LiveChatWallProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  scope?: "sessions" | "prediction-market";
  contextId?: string;
}

const QUICK_REACTIONS = ["🚀 Moon", "💎 Hands", "🐂 Bullish", "🐻 Bearish", "💸 Print it", "🍜 Ramen"];

export function LiveChatWall({
  messages,
  onSendMessage,
  scope = "sessions",
  contextId,
}: LiveChatWallProps) {
  const { publicKey } = useWallet();
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Virtual Rooms Hook & Store
  const {
    rooms,
    activeRoomId,
    activeRoom,
    activeRoomTime,
    isExtending,
    createRoom,
    extendRoom,
    switchRoom,
    sendMessage,
    getTimeRemaining,
    getShareUrl,
    getShareQrDataUrl,
    EXTENSION_COST_SOL,
  } = useChatRooms({
    scope,
    contextId,
    globalMessages: messages,
    onSendGlobalMessage: onSendMessage,
  });

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);

  // Realtime Database sync for active room
  const [remoteMessages, setRemoteMessages] = useState<FirebaseChatMessage[]>([]);

  useEffect(() => {
    const unsub = subscribeToRoomMessages(activeRoom.id, (msgs) => {
      if (msgs && msgs.length > 0) {
        setRemoteMessages(msgs);
      }
    });
    return () => unsub();
  }, [activeRoom.id]);

  // Combine and deduplicate active room messages with remote Firebase RTDB messages
  const displayMessages = React.useMemo(() => {
    if (!remoteMessages.length) return activeRoom.messages;
    const map = new Map<string, ChatMessage>();
    activeRoom.messages.forEach((m) => map.set(m.id, m));
    remoteMessages.forEach((rm) => {
      map.set(rm.id, {
        id: rm.id,
        author: rm.author,
        avatarSeed: rm.avatarSeed,
        content: rm.content,
        createdAt: rm.createdAt,
      });
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [activeRoom.messages, remoteMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [displayMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    sendMessage(text);

    // Push to Firebase Realtime Database
    const authorName = publicKey
      ? `User_${publicKey.toString().substring(0, 4).toUpperCase()}`
      : "You";
    pushChatMessage(activeRoom.id, {
      author: authorName,
      avatarSeed: authorName,
      content: text,
      walletAddress: publicKey?.toBase58(),
    }).catch((err) => {
      console.warn("[LiveChatWall] Firebase RTDB push fallback:", err);
    });

    setInputText("");
  };

  const handleQuickReaction = (reaction: string) => {
    sendMessage(reaction);

    const authorName = publicKey
      ? `User_${publicKey.toString().substring(0, 4).toUpperCase()}`
      : "You";
    pushChatMessage(activeRoom.id, {
      author: authorName,
      avatarSeed: authorName,
      content: reaction,
      walletAddress: publicKey?.toBase58(),
    }).catch((err) => {
      console.warn("[LiveChatWall] Firebase RTDB push fallback:", err);
    });
  };

  const getAuthorDisplay = (author: string) => {
    if (author.startsWith("User_") && author.length > 10) {
      return author.substring(0, 9);
    }
    return author;
  };

  // Callback when a new room is created -> automatically open the share QR code modal!
  const handleRoomCreated = (newRoom: ChatRoom) => {
    setIsQrOpen(true);
  };

  return (
    <div className="glass-card live-chat-card flex flex-col w-full rounded-2xl border border-border shadow-lg overflow-hidden relative">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border bg-secondary/10 shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity size={18} className="text-primary animate-pulse shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-black font-display uppercase tracking-wider text-foreground leading-none truncate flex items-center gap-1.5">
              <span>{activeRoom.isGlobal ? "Live Trading Chat" : activeRoom.name}</span>
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono block truncate">
              {activeRoom.isGlobal
                ? "Instant Community Feed"
                : activeRoom.topic || "Virtual Chat Room"}
            </span>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Virtual Room Status / Timer Pill */}
          {!activeRoom.isGlobal && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold ${
                activeRoomTime.isExpired
                  ? "bg-red-500/10 border-red-500/30 text-red-500"
                  : activeRoomTime.isExpiringSoon
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
              }`}
              title="Session duration countdown"
            >
              <Clock size={12} className={activeRoomTime.isExpiringSoon ? "animate-spin" : ""} />
              <span>{activeRoomTime.isExpired ? "EXPIRED" : activeRoomTime.formatted}</span>
            </div>
          )}

          {/* QR Share Button for Virtual Rooms */}
          {!activeRoom.isGlobal && (
            <button
              type="button"
              onClick={() => setIsQrOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-secondary/70 hover:bg-secondary border border-border text-foreground hover:text-primary transition-all text-xs font-mono font-bold flex items-center gap-1 shadow-2xs"
              title="Share QR Code & Invite Friends"
            >
              <QrCode size={14} className="text-primary" />
              <span className="hidden sm:inline">QR / Invite</span>
            </button>
          )}

          {/* Extend Room (+1h) Button */}
          {!activeRoom.isGlobal && (
            <button
              type="button"
              onClick={() => setIsExtendOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary hover:text-primary-hover transition-all text-xs font-mono font-bold flex items-center gap-1 shadow-2xs active:scale-95"
              title="Extend room duration by 1 hour for 0.0001 SOL"
            >
              <Zap size={14} className="fill-primary/20" />
              <span className="hidden sm:inline">+1h (0.0001 SOL)</span>
              <span className="sm:hidden">+1h</span>
            </button>
          )}

          {/* Global Wall Live Badge */}
          {activeRoom.isGlobal && (
            <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
              <span className="text-[10px] font-mono font-bold uppercase text-green-500 tracking-wider">
                LIVE
              </span>
            </div>
          )}

          {/* Primary '+ Create Room' Button */}
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover text-[11px] sm:text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
            title="Create a 10-minute free virtual room with shareable QR code"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span className="hidden sm:inline">Create a Room</span>
            <span className="sm:hidden">Room</span>
          </button>
        </div>
      </div>

      {/* Room Tabs Selector Bar */}
      <div className="px-3 py-1.5 border-b border-border/60 bg-secondary/15 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold shrink-0 hidden sm:inline">
          Rooms:
        </span>

        {/* Global Wall Tab */}
        <button
          type="button"
          onClick={() => switchRoom("global")}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeRoomId === "global"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <span># Global Wall</span>
          <span className="text-[10px] opacity-80">(Live)</span>
        </button>

        {/* Virtual User Rooms */}
        {rooms.map((room) => {
          const roomTimer = getTimeRemaining(room);
          const isActive = activeRoomId === room.id;

          return (
            <button
              key={room.id}
              type="button"
              onClick={() => switchRoom(room.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                isActive
                  ? "bg-card border-primary text-primary shadow-xs font-bold"
                  : "bg-secondary/30 border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              <span className="truncate max-w-[110px]">{room.name}</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                  roomTimer.isExpired
                    ? "bg-red-500/20 text-red-400"
                    : roomTimer.isExpiringSoon
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {roomTimer.isExpired ? "EXP" : roomTimer.formatted}
              </span>
            </button>
          );
        })}

        {/* Quick '+ Create' Shortcut Pill */}
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="px-2 py-1 rounded-lg border border-dashed border-border hover:border-primary/60 text-muted-foreground hover:text-primary text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-1"
          title="Create virtual room"
        >
          <Plus size={12} />
          <span>New Room</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3 scrollbar-hide bg-secondary/5 min-h-[220px]"
      >
        {displayMessages.length === 0 ? (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-4 text-muted-foreground space-y-2">
            <Users size={28} className="text-muted-foreground/40" />
            <p className="text-xs font-mono">No messages yet in this room.</p>
            <p className="text-[11px] text-muted-foreground/70">
              Share the QR code or link to invite your trading squad!
            </p>
          </div>
        ) : (
          displayMessages.map((msg) => {
            const isCurrentUser =
              publicKey && msg.author === `User_${publicKey.toString().substring(0, 4).toUpperCase()}`;

            const isSystem = msg.author === "StreetSync_Bot";

            if (isSystem) {
              return (
                <div
                  key={msg.id}
                  className="flex items-center justify-center my-2 animate-in fade-in"
                >
                  <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5 text-center max-w-[90%]">
                    <span className="text-[11px] font-mono text-primary font-bold flex items-center justify-center gap-1.5">
                      <Sparkles size={12} /> {msg.content}
                    </span>
                  </div>
                </div>
              );
            }

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
                  <div
                    className={`flex items-center gap-2 mb-1 ${
                      isCurrentUser ? "justify-end" : ""
                    }`}
                  >
                    <span
                      className={`text-[11px] font-black font-display tracking-tight ${
                        isCurrentUser ? "text-primary-foreground" : "text-foreground/90"
                      }`}
                    >
                      {getAuthorDisplay(msg.author)}
                    </span>
                    <span
                      className={`text-[9px] font-mono ${
                        isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
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
          })
        )}

        {/* Expired Session Lock Banner */}
        {!activeRoom.isGlobal && activeRoomTime.isExpired && (
          <div className="p-4 rounded-2xl bg-card border-2 border-red-500/40 shadow-xl text-center space-y-3 my-3 animate-in fade-in">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 mx-auto flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black font-display uppercase tracking-tight text-foreground">
                10-Minute Free Session Expired
              </h4>
              <p className="text-xs text-muted-foreground font-mono mt-1 max-w-sm mx-auto">
                This virtual room has ended. Extend it for 1 hour for just 0.0001 SOL to keep chatting with your friends!
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsExtendOpen(true)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Zap size={14} />
                <span>Extend for 1 Hour (0.0001 SOL)</span>
              </button>
              <button
                type="button"
                onClick={() => switchRoom("global")}
                className="px-3 py-2 rounded-xl border border-border bg-secondary/40 hover:bg-secondary text-xs font-bold text-foreground transition-colors"
              >
                Back to Global Wall
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Reaction Chips */}
      <div className="px-3 py-1.5 border-t border-border/40 bg-secondary/10 shrink-0 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        <span className="text-[10px] font-mono text-muted-foreground uppercase shrink-0 font-bold hidden sm:inline">
          Quick:
        </span>
        {QUICK_REACTIONS.map((reaction) => (
          <button
            key={reaction}
            type="button"
            disabled={!activeRoom.isGlobal && activeRoomTime.isExpired}
            onClick={() => handleQuickReaction(reaction)}
            className="px-2.5 py-1 rounded-lg bg-card hover:bg-primary hover:text-primary-foreground border border-border text-[11px] font-mono font-medium text-foreground transition-all shrink-0 active:scale-95 shadow-xs disabled:opacity-40 disabled:pointer-events-none"
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
          disabled={!activeRoom.isGlobal && activeRoomTime.isExpired}
          placeholder={
            !activeRoom.isGlobal && activeRoomTime.isExpired
              ? "Room expired — extend for 0.0001 SOL to send messages"
              : activeRoom.isGlobal
              ? "Say something to the board..."
              : `Message #${activeRoom.name}...`
          }
          maxLength={150}
          className="flex-1 min-w-0 bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder-muted-foreground outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || (!activeRoom.isGlobal && activeRoomTime.isExpired)}
          className="p-2 sm:p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-all shadow-md shrink-0 flex items-center justify-center active:scale-95"
          aria-label="Send message"
        >
          <Send size={15} />
        </button>
      </form>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreateRoom={createRoom}
        onRoomCreated={handleRoomCreated}
      />

      {/* Shareable QR Code Modal */}
      <RoomQRModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        room={activeRoom.isGlobal ? null : activeRoom}
        timeRemaining={activeRoomTime}
        getShareUrl={getShareUrl}
        getShareQrDataUrl={getShareQrDataUrl}
        onOpenExtendModal={() => setIsExtendOpen(true)}
      />

      {/* 0.0001 SOL 1-Hour Extend Modal */}
      <ExtendRoomModal
        isOpen={isExtendOpen}
        onClose={() => setIsExtendOpen(false)}
        room={activeRoom.isGlobal ? null : activeRoom}
        timeRemaining={activeRoomTime}
        onExtend={extendRoom}
        isExtending={isExtending}
      />
    </div>
  );
}
