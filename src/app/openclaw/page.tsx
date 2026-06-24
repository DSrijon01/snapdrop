"use client";

import { TradingTerminal } from "@/components/features/openclaw/TradingTerminal";
import { ModuleSubscriptionWidget } from "@/components/global/subscription/ModuleSubscriptionWidget";

export default function OpenclawPage() {
  return (
    <div className="flex flex-col items-center justify-start p-2 md:p-6 min-h-[calc(100vh-100px)] w-full">
      <div className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-border/40 pb-6 mb-6 shrink-0">
        <div className="text-center sm:text-left">
          <h1 className="text-4xl font-black mb-2 font-display uppercase tracking-tight">OpenClaw AI Terminal</h1>
          <p className="text-muted-foreground text-xs max-w-2xl uppercase tracking-wider font-mono">
            GPU-Accelerated Autonomous AI Agents & Execution System
          </p>
        </div>
        <ModuleSubscriptionWidget moduleId="openclaw" />
      </div>
      
      <TradingTerminal />
    </div>
  );
}

