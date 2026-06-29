"use client";

import React from "react";
import { Sparkles, Bell } from "lucide-react";

interface ActionCardProps {
  suggestedMove: string;
  primaryText: string;
  secondaryText: string;
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
}

export function ActionCard({ suggestedMove, primaryText, secondaryText, onPrimaryClick, onSecondaryClick }: ActionCardProps) {
  return (
    <div className="border border-border/80 bg-card rounded-2xl p-5 space-y-4 shadow-sm w-full max-w-xl">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary mt-0.5 shrink-0">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1">
          <h4 className="text-[10px] font-mono font-black uppercase text-muted-foreground tracking-widest mb-1.5">Suggested Move</h4>
          <p className="text-sm text-foreground/90 leading-relaxed font-sans font-medium">{suggestedMove}</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={onPrimaryClick}
          className="flex-1 py-3 px-4 bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all rounded-xl font-bold uppercase tracking-wider text-xs shadow-md shadow-primary/10 text-center cursor-pointer font-mono"
        >
          {primaryText}
        </button>
        <button
          onClick={onSecondaryClick}
          className="flex-1 py-3 px-4 bg-secondary/80 hover:bg-secondary text-foreground hover:text-primary border border-border hover:border-primary/40 active:scale-[0.98] transition-all rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer font-mono"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>{secondaryText}</span>
        </button>
      </div>
    </div>
  );
}
