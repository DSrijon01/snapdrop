"use client";

import React, { useState, useEffect } from "react";
import { X, Copy, Check, QrCode, Clock, Zap, ArrowRight, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { ChatRoom, RoomTimeRemaining } from "@/lib/rooms/types";

interface RoomQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: ChatRoom | null;
  timeRemaining?: RoomTimeRemaining;
  getShareUrl: (roomId: string) => string;
  getShareQrDataUrl: (roomId: string) => Promise<string>;
  onOpenExtendModal?: () => void;
  onEnterRoom?: (roomId: string) => void;
}

export function RoomQRModal({
  isOpen,
  onClose,
  room,
  timeRemaining,
  getShareUrl,
  getShareQrDataUrl,
  onOpenExtendModal,
  onEnterRoom,
}: RoomQRModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLoadingQr, setIsLoadingQr] = useState(true);

  const shareUrl = room ? getShareUrl(room.id) : "";

  // Load QR Code when modal opens
  useEffect(() => {
    if (!isOpen || !room) return;
    setIsLoadingQr(true);
    let isMounted = true;

    getShareQrDataUrl(room.id)
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsLoadingQr(false);
        }
      })
      .catch((e) => {
        console.error("QR load error:", e);
        if (isMounted) setIsLoadingQr(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, room, getShareQrDataUrl]);

  if (!isOpen || !room) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    toast.success("Share link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopiedCode(true);
    toast.success("Room code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleEnterRoom = () => {
    if (onEnterRoom) {
      onEnterRoom(room.id);
    }
    onClose();
    toast.success(`Joined #${room.name}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-card w-full max-w-sm sm:max-w-md rounded-2xl border border-border shadow-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col items-center text-center my-auto">
        {/* Top Accent Gradient */}
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
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2 shadow-xs">
          <QrCode size={22} />
        </div>

        <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-tight text-foreground truncate max-w-[260px]">
          {room.name}
        </h3>
        
        {/* Countdown Pill */}
        <div className="my-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary border border-border/80 text-[11px] font-mono">
          <Clock
            size={12}
            className={
              timeRemaining?.isExpiringSoon
                ? "text-amber-500 animate-spin"
                : timeRemaining?.isExpired
                ? "text-red-500"
                : "text-emerald-500"
            }
          />
          <span className="font-bold text-foreground">
            {timeRemaining?.isExpired ? (
              <span className="text-red-500">Expired</span>
            ) : (
              <span>Time Left: {timeRemaining?.formatted || "10:00"}</span>
            )}
          </span>
          <span className="text-[10px] text-muted-foreground">
            ({room.totalExtensions > 0 ? `+${room.totalExtensions}h` : "10m free trial"})
          </span>
        </div>

        {/* QR Code Container */}
        <div className="p-2.5 bg-white rounded-2xl border-2 border-border shadow-md my-1.5 flex items-center justify-center w-40 h-40 sm:w-44 sm:h-44 relative overflow-hidden">
          {isLoadingQr ? (
            <div className="flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs font-mono">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Generating QR...</span>
            </div>
          ) : qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code for ${room.name}`}
              className="w-full h-full object-contain rounded-lg"
            />
          ) : (
            <div className="text-zinc-500 text-xs font-mono">QR unavailable</div>
          )}
        </div>

        <span className="text-[10px] font-mono text-muted-foreground mb-2.5">
          Scan with phone camera or share link
        </span>

        {/* Link Box */}
        <div className="w-full bg-secondary/50 border border-border rounded-xl p-2 flex items-center justify-between gap-1.5 mb-3">
          <span className="text-xs font-mono text-foreground truncate select-all text-left flex-1 pl-1">
            {shareUrl}
          </span>
          <button
            onClick={handleCopyLink}
            className="py-1 px-2.5 rounded-lg bg-card hover:bg-primary hover:text-primary-foreground text-foreground border border-border transition-colors shrink-0 flex items-center gap-1 text-xs font-bold"
            title="Copy URL"
          >
            {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span className="text-[11px]">{copiedLink ? "Copied" : "Copy"}</span>
          </button>
        </div>

        {/* PRIMARY CTA: GO TO ROOM BUTTON */}
        <button
          type="button"
          onClick={handleEnterRoom}
          className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-primary text-primary-foreground font-black uppercase font-display tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-primary-hover shadow-lg shadow-primary/25 active:scale-98 transition-all mb-2 cursor-pointer"
        >
          <MessageSquare size={16} />
          <span>Enter Chat Room</span>
          <ArrowRight size={16} />
        </button>

        {/* Secondary Actions Row */}
        <div className="w-full grid grid-cols-2 gap-2 mt-0.5">
          <button
            onClick={handleCopyCode}
            className="py-2 px-3 rounded-xl border border-border bg-secondary/40 hover:bg-secondary text-xs font-mono font-bold text-foreground transition-colors flex items-center justify-center gap-1.5"
          >
            {copiedCode ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span>Copy Code</span>
          </button>

          {onOpenExtendModal && (
            <button
              onClick={() => {
                onClose();
                onOpenExtendModal();
              }}
              className="py-2 px-3 rounded-xl bg-secondary/70 hover:bg-secondary border border-border text-xs font-bold transition-all text-foreground flex items-center justify-center gap-1.5"
            >
              <Zap size={13} className="text-amber-500" />
              <span>Extend (+1h)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
