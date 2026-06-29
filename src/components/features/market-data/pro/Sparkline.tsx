"use client";

import React from "react";

export interface SparklineProps {
  data: number[];
  isBullish: boolean;
  width?: number;
  height?: number;
  label?: string;
}

export function Sparkline({ data, isBullish, width = 140, height = 44, label }: SparklineProps) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4; // margin padding
    return `${x},${y}`;
  });
  
  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
  const strokeColor = isBullish ? "#10B981" : "#EF4444";
  const gradId = `sparkline-grad-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className="inline-block p-3 bg-card border border-border/80 rounded-xl shadow-sm">
      {label && (
        <div className="text-[10px] font-mono text-muted-foreground uppercase font-black mb-1.5 px-0.5">
          {label}
        </div>
      )}
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between items-center text-[8px] font-mono text-muted-foreground uppercase mt-1 px-0.5 font-bold">
        <span>Min: ${min.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
        <span>Max: ${max.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
      </div>
    </div>
  );
}
