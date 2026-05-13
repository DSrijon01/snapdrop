"use client";

import { useState } from "react";
import { useStaking } from "@/hooks/useStaking";
import { BN } from "@coral-xyz/anchor";
import { Loader2, Droplets, ArrowRightLeft } from "lucide-react";

export function StakingDashboard() {
  const {
    loading,
    liquidPool,
    solBalance,
    ssBalance,
    exchangeRate,
    initialized,
    stakeTokens,
    unstakeTokens,
  } = useStaking();

  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-card/30 border border-border/50 rounded-2xl backdrop-blur-sm mt-8 w-full max-w-4xl mx-auto min-h-[400px]">
        <h2 className="text-2xl font-bold font-display text-muted-foreground">Liquid Staking Not Initialized</h2>
        <p className="text-muted-foreground mt-2">The admin hasn't initialized the liquid staking pool yet.</p>
      </div>
    );
  }

  const formatTokens = (amount: any) => {
    if (!amount) return "0";
    return (amount / 10 ** 9).toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const formattedSolBalance = formatTokens(solBalance);
  const formattedSsBalance = formatTokens(ssBalance);
  const projectedSsAmount = stakeAmount ? (parseFloat(stakeAmount) / exchangeRate).toFixed(4) : "0.0000";
  const projectedSolAmount = unstakeAmount ? (parseFloat(unstakeAmount) * exchangeRate).toFixed(4) : "0.0000";

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 space-y-6">
      
      {/* Liquid Staking Header */}
      <div className="bg-gradient-to-r from-primary/20 via-background to-background border border-primary/20 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 opacity-10">
          <Droplets className="w-48 h-48 -mr-10 -mt-10" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-4xl font-display font-bold mb-4 text-foreground flex items-center gap-3">
            Liquid Staking
          </h2>
          <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
            Stake your SOL to receive <span className="font-bold text-purple-400">ssSOL</span> (Street Sync SOL). 
            Your ssSOL automatically accrues yield over time through validator rewards!
          </p>
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground uppercase tracking-wider font-bold mb-1">Exchange Rate</span>
              <span className="text-2xl font-bold text-green-400">1 ssSOL = {exchangeRate.toFixed(4)} SOL</span>
            </div>
            <div className="h-10 w-px bg-border/50"></div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground uppercase tracking-wider font-bold mb-1">Total Value Locked</span>
              <span className="text-2xl font-bold text-primary">{formatTokens(new BN(liquidPool.totalSolStaked).toNumber())} SOL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stake/Unstake Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stake Form */}
        <div className="bg-card border border-border rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-display font-bold">Stake SOL</h3>
              <div className="text-right">
                <span className="text-xs text-muted-foreground uppercase font-bold block mb-1">Available</span>
                <span className="font-bold text-primary">{formattedSolBalance} SOL</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="relative">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-background border border-input rounded-2xl px-4 py-4 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={loading}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground">SOL</span>
                    <button 
                      onClick={() => setStakeAmount((solBalance / 10**9).toString())}
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md hover:bg-primary/20 font-bold uppercase"
                    >
                      Max
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center text-muted-foreground py-2">
                <ArrowRightLeft className="w-5 h-5 rotate-90" />
              </div>

              <div className="bg-background border border-border/50 rounded-2xl p-4 flex items-center justify-between opacity-80">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-bold uppercase mb-1">You will receive</span>
                  <span className="text-xl font-bold text-purple-400">{projectedSsAmount}</span>
                </div>
                <span className="font-bold text-purple-400">ssSOL</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={() => stakeTokens(parseFloat(stakeAmount) * 10 ** 9)}
              disabled={loading || !stakeAmount || parseFloat(stakeAmount) <= 0 || parseFloat(stakeAmount) * 10 ** 9 > solBalance}
              className="w-full bg-primary text-primary-foreground font-bold text-xl py-4 rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : null}
              {parseFloat(stakeAmount) * 10 ** 9 > solBalance ? "Insufficient SOL Balance" : "Stake SOL"}
            </button>
          </div>
        </div>

        {/* Unstake Form */}
        <div className="bg-card border border-border rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-display font-bold">Unstake</h3>
              <div className="text-right">
                <span className="text-xs text-muted-foreground uppercase font-bold block mb-1">Available</span>
                <span className="font-bold text-purple-400">{formattedSsBalance} ssSOL</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="relative">
                  <input
                    type="number"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-background border border-input rounded-2xl px-4 py-4 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={loading}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground">ssSOL</span>
                    <button 
                      onClick={() => setUnstakeAmount((ssBalance / 10**9).toString())}
                      className="text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded-md hover:bg-purple-500/20 font-bold uppercase"
                    >
                      Max
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center text-muted-foreground py-2">
                <ArrowRightLeft className="w-5 h-5 rotate-90" />
              </div>

              <div className="bg-background border border-border/50 rounded-2xl p-4 flex items-center justify-between opacity-80">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-bold uppercase mb-1">You will receive</span>
                  <span className="text-xl font-bold text-primary">{projectedSolAmount}</span>
                </div>
                <span className="font-bold text-primary">SOL</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={() => unstakeTokens(parseFloat(unstakeAmount) * 10 ** 9)}
              disabled={loading || !unstakeAmount || parseFloat(unstakeAmount) <= 0 || parseFloat(unstakeAmount) * 10 ** 9 > ssBalance}
              className="w-full bg-destructive text-destructive-foreground font-bold text-xl py-4 rounded-2xl hover:bg-destructive/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-destructive/20"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : null}
              {parseFloat(unstakeAmount) * 10 ** 9 > ssBalance ? "Insufficient ssSOL Balance" : "Unstake to SOL"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
