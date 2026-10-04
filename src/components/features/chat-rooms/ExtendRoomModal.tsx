"use client";

import React, { useState } from "react";
import { X, Zap, Clock, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ChatRoom, RoomTimeRemaining } from "@/lib/rooms/types";

interface ExtendRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: ChatRoom | null;
  timeRemaining?: RoomTimeRemaining;
  onExtend: (roomId: string, hours?: number) => Promise<boolean>;
  isExtending?: boolean;
}

export function ExtendRoomModal({
  isOpen,
  onClose,
  room,
  timeRemaining,
  onExtend,
  isExtending = false,
}: ExtendRoomModalProps) {
  const { publicKey } = useWallet();
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !room) return null;

  const handleConfirmExtend = async () => {
    const success = await onExtend(room.id, 1);
    if (success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-5 sm:p-6 relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-primary to-emerald-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 shadow-xs">
            <Zap size={22} className="fill-amber-500/20" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-tight text-foreground leading-tight">
              Extend Virtual Room
            </h3>
            <p className="text-xs text-muted-foreground font-mono">
              Add 1 hour of live private chat for your squad
            </p>
          </div>
        </div>

        {/* Room Info Card */}
        <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/80 mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-mono">Room:</span>
            <span className="font-bold font-display uppercase text-foreground">{room.name}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-mono">Current Status:</span>
            <span
              className={`font-mono font-bold ${
                timeRemaining?.isExpired
                  ? "text-red-500"
                  : timeRemaining?.isExpiringSoon
                  ? "text-amber-500"
                  : "text-emerald-500"
              }`}
            >
              {timeRemaining?.isExpired ? "Expired" : `${timeRemaining?.formatted} remaining`}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-mono">Added Duration:</span>
            <span className="font-bold text-foreground font-mono flex items-center gap-1 text-primary">
              <Clock size={12} /> +1 Hour (60 mins)
            </span>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-mono text-xs font-black">
              ◎
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">Extension Fee</span>
              <span className="text-[10px] text-muted-foreground font-mono">Bare minimum payment</span>
            </div>
          </div>
          <div className="text-right font-mono">
            <div className="text-base font-black text-primary">0.0001 SOL</div>
            <div className="text-[10px] text-muted-foreground">≈ $0.015 USD</div>
          </div>
        </div>

        {/* Wallet Status Notice */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/20 border border-border text-[11px] font-mono text-muted-foreground mb-4">
          <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
          <span>
            {publicKey ? (
              <>
                Paying from: <span className="text-foreground font-bold">{publicKey.toString().slice(0, 4)}..{publicKey.toString().slice(-4)}</span>
              </>
            ) : (
              "Wallet not connected. Instant Demo Extension will be applied."
            )}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isExtending}
            className="flex-1 py-2.5 rounded-xl border border-border bg-secondary/40 text-foreground text-xs sm:text-sm font-bold hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmExtend}
            disabled={isExtending || isSuccess}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-1.5 ${
              isSuccess
                ? "bg-emerald-500 text-white"
                : "bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            }`}
          >
            {isSuccess ? (
              <>
                <CheckCircle2 size={16} />
                <span>Extended!</span>
              </>
            ) : isExtending ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Zap size={16} />
                <span>Pay 0.0001 SOL</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
