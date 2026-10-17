"use client";

import { NativeStakingDashboard } from "@/components/features/snbl/NativeStakingDashboard";
import { ModuleSubscriptionWidget } from "@/components/global/subscription/ModuleSubscriptionWidget";

export default function SnblPage() {
  return (
    <div className="flex flex-col items-center justify-start px-3.5 py-4 sm:px-6 sm:py-8 pb-28 sm:pb-12 min-h-[calc(100vh-100px)] w-full">
      <div className="w-full max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 border-b border-border/40 pb-4 sm:pb-6 mb-5 sm:mb-8 shrink-0">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-4xl font-black mb-1 sm:mb-2 font-display uppercase tracking-tight">SS Staking</h1>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-2xl font-mono leading-relaxed">
            Stake SOL natively to earn network consensus rewards, or unlock Pro for the high-yield ssSOL savings & borrowing market.
          </p>
        </div>
        <div className="shrink-0">
          <ModuleSubscriptionWidget moduleId="snbl" />
        </div>
      </div>

      <NativeStakingDashboard />
    </div>
  );
}
