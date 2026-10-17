"use client";

import React, { useState, useMemo } from "react";
import { useNativeStaking, DevnetValidator, UserStakeAccount } from "@/hooks/useNativeStaking";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  ShieldCheck,
  Zap,
  Clock,
  Layers,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Server,
  Coins,
  ChevronDown,
  Lock,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";

export function NativeStakingDashboard() {
  const { connected } = useWallet();
  const {
    loading,
    actionLoading,
    solBalance,
    rentExemptReserve,
    validators,
    stakeAccounts,
    epochInfo,
    delegateStake,
    deactivateStake,
    withdrawStake,
    refreshData,
  } = useNativeStaking();

  const [stakeAmount, setStakeAmount] = useState<string>("");
  const [selectedValidator, setSelectedValidator] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Set default validator once loaded
  useMemo(() => {
    if (validators.length > 0 && !selectedValidator) {
      setSelectedValidator(validators[0].votePubkey);
    }
  }, [validators, selectedValidator]);

  const currentValidator = useMemo(() => {
    return validators.find((v) => v.votePubkey === selectedValidator) || validators[0];
  }, [validators, selectedValidator]);

  const totalUserStakedSol = useMemo(() => {
    return stakeAccounts.reduce((acc, curr) => acc + curr.solBalance, 0);
  }, [stakeAccounts]);

  const availableSol = solBalance / LAMPORTS_PER_SOL;
  const parsedAmount = parseFloat(stakeAmount) || 0;
  const rentExemptSol = rentExemptReserve / LAMPORTS_PER_SOL;
  const totalCost = parsedAmount > 0 ? parsedAmount + rentExemptSol : 0;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    toast.success("Copied address to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSetMax = () => {
    // Leave safe 0.05 SOL for transaction fees & rent
    const maxSafe = Math.max(0, availableSol - 0.05 - rentExemptSol);
    setStakeAmount(maxSafe > 0 ? maxSafe.toFixed(4) : "0");
  };

  const handleSetPercent = (pct: number) => {
    const amount = Math.max(0, (availableSol - 0.05 - rentExemptSol) * pct);
    setStakeAmount(amount > 0 ? amount.toFixed(4) : "0");
  };

  const handleStake = async () => {
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Please enter a valid SOL amount to stake");
      return;
    }
    if (!selectedValidator) {
      toast.error("Please select a validator");
      return;
    }
    await delegateStake(parsedAmount, selectedValidator);
    setStakeAmount("");
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* 1. Global Network & Epoch Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Epoch Card */}
        <div className="bg-card/40 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono uppercase mb-2">
            <span>Devnet Epoch</span>
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-display text-foreground">
              {epochInfo ? `#${epochInfo.epoch}` : "Loading..."}
            </span>
            <span className="text-xs font-mono text-emerald-400">
              {epochInfo ? `${epochInfo.progressPercent}%` : ""}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-muted/40 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500 rounded-full"
              style={{ width: `${epochInfo?.progressPercent || 0}%` }}
            />
          </div>
        </div>

        {/* Active Validators */}
        <div className="bg-card/40 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono uppercase mb-2">
            <span>Online Validators</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-display text-foreground">
              {validators.length}
            </span>
            <span className="text-xs font-mono text-muted-foreground">Active Nodes</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono mt-3 truncate">
            Securing Solana Devnet
          </p>
        </div>

        {/* User Balance */}
        <div className="bg-card/40 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono uppercase mb-2">
            <span>Available Balance</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black font-display text-foreground">
              {availableSol.toFixed(4)}
            </span>
            <span className="text-xs font-mono text-primary font-bold">SOL</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono mt-3">
            Ready for delegation
          </p>
        </div>

        {/* User Staked Total */}
        <div className="bg-card/40 backdrop-blur-md border border-border/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-mono uppercase mb-2">
            <span>Your Staked SOL</span>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black font-display text-foreground">
              {totalUserStakedSol.toFixed(4)}
            </span>
            <span className="text-xs font-mono text-purple-400 font-bold">SOL</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono mt-3">
            Across {stakeAccounts.length} stake account{stakeAccounts.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* 2. Main Delegation & Portfolio Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Delegate Stake Card (5 cols) */}
        <div className="lg:col-span-5 bg-card/45 backdrop-blur-md border border-border/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Delegate Stake
              </h2>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Native Solana Stake Program delegation
              </p>
            </div>
            <button
              onClick={refreshData}
              disabled={loading}
              className="p-2 rounded-xl border border-border/60 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-all"
              title="Refresh Network Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-muted-foreground">
              <span>Stake Amount</span>
              <span>Available: {availableSol.toFixed(4)} SOL</span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0.01"
                step="0.1"
                placeholder="0.00"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                disabled={actionLoading}
                className="w-full bg-background/80 border border-border/80 rounded-2xl px-4 py-4 text-2xl font-black font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-sm font-bold font-mono text-muted-foreground">SOL</span>
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="px-2.5 py-1 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary rounded-lg text-xs font-bold uppercase font-mono transition-all"
                >
                  Max
                </button>
              </div>
            </div>

            {/* Quick percentage chips */}
            <div className="flex gap-2 pt-1">
              {[0.25, 0.5, 0.75].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleSetPercent(pct)}
                  className="flex-1 py-1.5 bg-muted/30 hover:bg-muted/60 border border-border/60 rounded-xl text-[11px] font-mono font-bold text-muted-foreground hover:text-foreground transition-all"
                >
                  {pct * 100}%
                </button>
              ))}
            </div>
          </div>

          {/* Validator Selection Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-muted-foreground flex justify-between">
              <span>Select Devnet Validator</span>
              <span>Commission</span>
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-background/80 border border-border/80 hover:border-primary/50 rounded-2xl p-4 flex items-center justify-between text-left transition-all"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold shrink-0">
                    <Server className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-bold text-foreground truncate font-mono">
                      {currentValidator ? currentValidator.name : "Select a validator"}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {currentValidator ? `${currentValidator.votePubkey.slice(0, 16)}...` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg">
                    {currentValidator ? `${currentValidator.commission}% Fee` : ""}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute z-30 mt-2 w-full bg-card border border-border/90 rounded-2xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-border/40 backdrop-blur-xl">
                  {validators.map((v) => (
                    <button
                      key={v.votePubkey}
                      type="button"
                      onClick={() => {
                        setSelectedValidator(v.votePubkey);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full p-3.5 flex items-center justify-between hover:bg-primary/10 transition-colors text-left ${
                        v.votePubkey === selectedValidator ? "bg-primary/15" : ""
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="text-xs font-bold text-foreground font-mono truncate">
                          {v.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {v.votePubkey.slice(0, 12)}... | Stake: {v.activatedStake.toLocaleString()} SOL
                        </p>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-primary shrink-0">
                        {v.commission}%
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Transaction Summary Breakdown */}
          <div className="bg-muted/30 border border-border/60 rounded-2xl p-4 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-muted-foreground">
              <span>Delegated Principal:</span>
              <span className="text-foreground font-bold">{parsedAmount.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Rent-Exempt Reserve (refundable):</span>
              <span className="text-foreground">{rentExemptSol.toFixed(5)} SOL</span>
            </div>
            <div className="flex justify-between text-muted-foreground border-t border-border/40 pt-2 font-bold">
              <span>Total Debited:</span>
              <span className="text-primary">{totalCost.toFixed(5)} SOL</span>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1 leading-relaxed">
              * The rent reserve is held by the Stake Account and returned 100% when you withdraw and close the stake.
            </p>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleStake}
            disabled={
              !connected ||
              actionLoading ||
              !parsedAmount ||
              parsedAmount <= 0 ||
              totalCost > availableSol
            }
            className="w-full py-4 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-sm rounded-2xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {actionLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : !connected ? (
              "Connect Wallet to Stake"
            ) : totalCost > availableSol ? (
              "Insufficient SOL Balance"
            ) : (
              <>
                <span>Stake & Delegate SOL</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Right Side: My Native Stake Positions (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                My Stake Accounts
              </h2>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Active onchain positions managed by your wallet
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-muted/40 border border-border/60 px-3 py-1 rounded-xl text-foreground">
              {stakeAccounts.length} Account{stakeAccounts.length !== 1 ? "s" : ""}
            </span>
          </div>

          {stakeAccounts.length === 0 ? (
            /* Empty State */
            <div className="bg-card/30 border border-dashed border-border/80 rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-muted/40 border border-border/60 flex items-center justify-center text-muted-foreground mx-auto">
                <ShieldCheck className="w-8 h-8 opacity-60" />
              </div>
              <div className="max-w-sm mx-auto space-y-1">
                <h3 className="text-lg font-bold text-foreground font-display uppercase tracking-wide">
                  No Active Stake Accounts
                </h3>
                <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                  Delegate Devnet SOL to any validator on the left to create your first onchain stake position.
                </p>
              </div>
            </div>
          ) : (
            /* Stake Accounts List */
            <div className="space-y-4">
              {stakeAccounts.map((account) => {
                const pubkeyStr = account.pubkey.toBase58();
                const shortAccount = `${pubkeyStr.slice(0, 4)}...${pubkeyStr.slice(-4)}`;
                const isCopied = copiedKey === pubkeyStr;

                return (
                  <div
                    key={pubkeyStr}
                    className="bg-card/45 backdrop-blur-md border border-border/80 rounded-3xl p-6 shadow-xl space-y-5 hover:border-primary/40 transition-all"
                  >
                    {/* Header: Status and Balance */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={account.status} />
                          <span className="text-xs font-mono text-muted-foreground">
                            Account: <strong className="text-foreground">{shortAccount}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(pubkeyStr)}
                            className="p-1 hover:text-primary transition-colors text-muted-foreground"
                            title="Copy Stake Account Pubkey"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <a
                            href={`https://explorer.solana.com/address/${pubkeyStr}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:text-primary transition-colors text-muted-foreground"
                            title="View on Solana Explorer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Delegated to:{" "}
                          <span className="text-foreground font-semibold">
                            {account.voter ? `${account.voter.slice(0, 8)}...${account.voter.slice(-6)}` : "None (Inactive)"}
                          </span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase block">
                          Total Value
                        </span>
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="text-2xl font-black font-mono text-foreground">
                            {account.solBalance.toFixed(4)}
                          </span>
                          <span className="text-xs font-mono text-primary font-bold">SOL</span>
                        </div>
                      </div>
                    </div>

                    {/* Stake Info Strip */}
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-muted/20 border border-border/50 rounded-2xl p-3">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Active Stake:</span>
                        <span className="text-foreground font-bold">{account.activeStake.toFixed(4)} SOL</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Status Phase:</span>
                        <span className="text-foreground font-bold capitalize">{account.status}</span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-col gap-3 pt-1">
                      {account.status === "activating" ? (
                        <div className="space-y-3">
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-start gap-2.5">
                            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div className="text-xs font-mono">
                              <p className="text-amber-300 font-bold">
                                Warming Up in Epoch #{epochInfo ? epochInfo.epoch : "..."} ({epochInfo?.progressPercent || 0}% complete)
                              </p>
                              <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                                Under Solana consensus rules, a stake account must complete its activation epoch before it can be deactivated. Once this epoch reaches 100%, your stake will become <strong>Active</strong> and deactivation will unlock automatically.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                              <span>Warmup in progress</span>
                            </span>
                            <button
                              type="button"
                              disabled
                              className="px-4 py-2 bg-muted/60 border border-border/80 text-muted-foreground rounded-xl text-xs font-bold uppercase font-mono cursor-not-allowed flex items-center gap-1.5 opacity-70"
                              title="Cannot deactivate while activating. Available once the current epoch finishes."
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Deactivation Locked (Warming Up)</span>
                            </button>
                          </div>
                        </div>
                      ) : account.status === "active" ? (
                        <div className="w-full flex items-center justify-between">
                          <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Active & earning network rewards</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => deactivateStake(account.pubkey)}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-destructive/15 hover:bg-destructive/25 border border-destructive/30 text-destructive-foreground hover:text-destructive rounded-xl text-xs font-bold uppercase font-mono transition-all disabled:opacity-50"
                          >
                            Deactivate Stake
                          </button>
                        </div>
                      ) : account.status === "deactivating" ? (
                        <div className="space-y-3">
                          <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-3 flex items-start gap-2.5">
                            <Clock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                            <div className="text-xs font-mono">
                              <p className="text-orange-300 font-bold">
                                Cooling Down in Epoch #{epochInfo ? epochInfo.epoch : "..."} ({epochInfo?.progressPercent || 0}% complete)
                              </p>
                              <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                                This stake is cooling down. Once Epoch #{epochInfo ? epochInfo.epoch : "..."} finishes, your full principal and rewards will become <strong>Inactive</strong> and ready to withdraw to your wallet.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-orange-400 font-mono">Cooldown in progress</span>
                            <span className="px-4 py-2 bg-muted/60 border border-border/80 text-muted-foreground rounded-xl text-xs font-bold uppercase font-mono cursor-not-allowed opacity-70">
                              In Cooldown
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-mono">
                            Stake is inactive. Full SOL + Rent reserve ready to withdraw.
                          </span>
                          <button
                            type="button"
                            onClick={() => withdrawStake(account.pubkey, account.lamports)}
                            disabled={actionLoading}
                            className="px-5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 rounded-xl text-xs font-bold uppercase font-mono transition-all disabled:opacity-50"
                          >
                            Withdraw {account.solBalance.toFixed(4)} SOL
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: UserStakeAccount["status"] }) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Active
        </span>
      );
    case "activating":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Activating
        </span>
      );
    case "deactivating":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          Deactivating
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          Inactive
        </span>
      );
  }
}
