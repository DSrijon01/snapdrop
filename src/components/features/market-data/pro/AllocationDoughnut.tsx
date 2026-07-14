"use client";

import React from "react";

export interface DoughnutItem {
  name: string;
  value: number;
  color: string;
}

interface AllocationDoughnutProps {
  data: DoughnutItem[];
  title?: string;
}

export function AllocationDoughnut({ data, title = "YOUR CURRENT ALLOCATION" }: AllocationDoughnutProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let accumulatedPercent = 0;
  
  return (
    <div className="flex flex-col items-center justify-center gap-5 p-5 bg-card border border-border/80 rounded-2xl shadow-sm w-full max-w-md">
      <h4 className="text-[10px] font-mono text-muted-foreground uppercase font-black tracking-widest text-center">
        {title}
      </h4>
      <div className="flex flex-col items-center justify-center gap-6 w-full">
        {/* SVG Circle Segments */}
        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {data.map((item, idx) => {
              const percentage = (item.value / total) * 100;
              const r = 38;
              const c = 2 * Math.PI * r;
              const strokeDash = (percentage / 100) * c;
              const strokeOffset = c - strokeDash + (accumulatedPercent / 100) * c;
              accumulatedPercent += percentage;
              
              return (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="11"
                  strokeDasharray={`${strokeDash} ${c - strokeDash}`}
                  strokeDashoffset={-strokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 hover:stroke-[13px] cursor-pointer"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-full m-3 border border-border/30">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground font-black">Valuation</span>
            <span className="text-sm font-black font-display text-foreground">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full pt-4 border-t border-border/40 space-y-2.5">
          {data.map((item, idx) => {
            const pct = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={idx} className="flex items-center justify-between text-xs font-mono uppercase font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-foreground/85">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{pct}%</span>
                  <span className="text-foreground font-black">${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
