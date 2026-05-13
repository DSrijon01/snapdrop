"use client";

import { useState } from "react";
import { useStaking } from "@/hooks/useStaking";
import { Loader2, ShieldCheck, Droplets } from "lucide-react";
import { BN } from "@coral-xyz/anchor";

export function AdminPanel() {
  const {
    loading,
    isAdmin,
    liquidPool,
    initialized,
    initializePool,
    depositRewards,
    exchangeRate,
  } = useStaking();

  const [rewardAmount, setRewardAmount] = useState("");

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-card/30 border border-border/50 rounded-2xl backdrop-blur-sm mt-8 w-full max-w-4xl mx-auto min-h-[400px]">
        <ShieldCheck className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-2xl font-bold font-display text-muted-foreground">Access Denied</h2>
        <p className="text-muted-foreground mt-2">Only the Staking Authority can access this panel.</p>
      </div>
    );
  }

  const totalSol = liquidPool ? new BN(liquidPool.totalSolStaked).toNumber() / 10 ** 9 : 0;
  const totalSsMinted = liquidPool ? new BN(liquidPool.totalSsMinted).toNumber() / 10 ** 9 : 0;

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 space-y-8">
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <ShieldCheck className="w-8 h-8 text-primary" />
        <h2 className="text-3xl font-display font-bold">Liquid Staking Admin</h2>
      </div>

      {/* Active Pool Overview */}
      <div className="space-y-4">
        <h3 className="text-2xl font-display font-bold flex items-center gap-2">
          <Droplets className="w-6 h-6 text-primary" />
          Protocol Status
        </h3>
        
        {!initialized ? (
          <div className="p-8 bg-card/50 border border-border/50 rounded-2xl text-center text-muted-foreground backdrop-blur-sm flex flex-col items-center gap-4">
            <p>The Liquid Staking Pool has not been initialized.</p>
            <button
              onClick={() => initializePool()}
              disabled={loading}
              className="bg-primary text-primary-foreground font-bold text-lg px-8 py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Initialize Liquid Pool
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col justify-center text-center">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Total SOL in Vault</span>
              <span className="text-3xl font-bold text-primary">{totalSol.toLocaleString()} SOL</span>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col justify-center text-center">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">ssSOL Minted</span>
              <span className="text-3xl font-bold text-purple-400">{totalSsMinted.toLocaleString()} ssSOL</span>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col justify-center text-center">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Exchange Rate</span>
              <span className="text-3xl font-bold text-green-400">1 ssSOL = {exchangeRate.toFixed(4)} SOL</span>
            </div>
          </div>
        )}
      </div>

      {/* Admin Actions */}
      {initialized && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Deposit Rewards */}
          <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <h3 className="text-xl font-display font-bold mb-2">Simulate Validator Yield</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Deposit Native SOL into the vault to simulate staking rewards. This will organically increase the value of all ssSOL tokens!
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Amount to Deposit (SOL)</label>
                <input
                  type="number"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-background border border-input rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={loading}
                />
              </div>
              <button
                onClick={() => depositRewards(parseFloat(rewardAmount) * 10 ** 9)}
                disabled={loading || !rewardAmount || parseFloat(rewardAmount) <= 0}
                className="w-full bg-primary text-primary-foreground font-bold text-lg py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Deposit Rewards
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
