"use client";

import Link from "next/link";
import { Zap, ArrowRight } from "lucide-react";
import { NativeStakingDashboard } from "@/components/features/snbl/NativeStakingDashboard";
import { ModuleSubscriptionWidget } from "@/components/global/subscription/ModuleSubscriptionWidget";

export default function SnblPage() {
  return (
    <div className="flex flex-col items-center justify-start px-3.5 py-4 sm:px-6 sm:py-8 pb-28 sm:pb-12 min-h-[calc(100vh-100px)] w-full">
      <div className="w-full max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 border-b border-border/40 pb-4 sm:pb-6 mb-4 sm:mb-6 shrink-0">
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

      {/* Pro Tier Navigation Banner */}
      <div className="w-full max-w-6xl mb-4 sm:mb-8 bg-gradient-to-r from-purple-950/40 via-card/50 to-primary/10 border border-purple-500/30 rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Zap className="w-4 h-4 sm:w-6 sm:h-6 text-primary animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground text-xs sm:text-base uppercase font-display tracking-wider truncate">
                SS Staking Pro & Money Market
              </h3>
              <span className="text-[9px] sm:text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 sm:px-2 py-0.5 rounded-full font-mono uppercase font-bold shrink-0">
                Pro
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground font-mono mt-0.5 line-clamp-1 sm:line-clamp-none">
              Access the liquid ssSOL savings pool, yield simulator models, and upcoming collateralized loans.
            </p>
          </div>
        </div>
        <Link
          href="/snbl/snbl-pro"
          className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl sm:rounded-2xl text-xs font-bold uppercase tracking-wider font-mono transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>Enter Pro Environment</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Link>
      </div>

      <NativeStakingDashboard />
    </div>
  );
}
