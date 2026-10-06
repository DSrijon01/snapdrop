"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Wallet, 
  Skull, 
  Copy, 
  RefreshCw, 
  ShieldCheck, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Sparkles, 
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AgentExecutionEngine, TokenPrice } from "./AgentExecutionEngine";

interface PositionsPaneProps {
  engine: AgentExecutionEngine;
  balances: Record<string, number>;
  prices: Record<string, TokenPrice>;
}

export const PositionsPane: React.FC<PositionsPaneProps> = ({ engine, balances, prices }) => {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();

  const [nukeArmed, setNukeArmed] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [copied, setCopied] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [onChainSol, setOnChainSol] = useState(0);

  const timerRef = useRef<any>(null);

  const isSimulator = engine.isSimulator();
  const agentAddress = engine.getSessionPublicKey();

  const refreshBalance = async () => {
    setIsRefreshing(true);
    try {
      const bal = await engine.refreshOnChainBalance();
      setOnChainSol(bal);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshBalance();
    const interval = setInterval(refreshBalance, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = () => {
    if (!agentAddress) return;
    navigator.clipboard.writeText(agentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fund Agent from Connected Phantom/Solana Wallet
  const handleFundFromWallet = async (amountSol = 0.5) => {
    if (!connected || !publicKey) {
      alert("Please connect your Solana wallet (e.g. Phantom) in the top bar first.");
      return;
    }
    if (!agentAddress) return;

    setIsFunding(true);
    try {
      engine.addLog(`Initiating transfer of ${amountSol} SOL from your wallet to SS Terminal Agent Vault...`, "info");
      
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(agentAddress),
          lamports: Math.floor(amountSol * LAMPORTS_PER_SOL),
        })
      );

      const sig = await sendTransaction(tx, connection);
      engine.addLog(`Fund transaction submitted: ${sig.slice(0, 8)}... Confirming...`, "info", sig);
      
      await connection.confirmTransaction(sig, "confirmed");
      engine.addLog(`Agent Vault successfully funded with ${amountSol} SOL!`, "success", sig);
      await refreshBalance();
    } catch (err: any) {
      engine.addLog(`Funding failed: ${err.message}`, "error");
    } finally {
      setIsFunding(false);
    }
  };

  // 1-Click Devnet Airdrop
  const handleDevnetAirdrop = async () => {
    if (!agentAddress) return;
    setIsAirdropping(true);
    try {
      engine.addLog(`Requesting 1 SOL Devnet Airdrop for Agent Vault...`, "info");
      const sig = await connection.requestAirdrop(new PublicKey(agentAddress), 1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, "confirmed");
      engine.addLog(`Airdrop confirmed! +1.000 SOL added to Agent Vault.`, "success", sig);
      await refreshBalance();
    } catch (err: any) {
      engine.addLog(`Airdrop rate-limited by public faucet: ${err.message}. You can also use 'Fund from Wallet'.`, "warning");
    } finally {
      setIsAirdropping(false);
    }
  };

  // Withdraw from Agent back to user's connected wallet
  const handleWithdrawAll = async () => {
    if (!connected || !publicKey) {
      alert("Please connect your wallet to receive withdrawn funds.");
      return;
    }
    if (onChainSol <= 0.005) {
      alert("Agent Vault balance is too low to withdraw.");
      return;
    }

    setIsWithdrawing(true);
    try {
      engine.addLog(`Sweeping funds from Agent Vault back to ${publicKey.toBase58().slice(0, 4)}...`, "info");
      const sig = await engine.withdrawTo(publicKey);
      await refreshBalance();
    } catch (err: any) {
      engine.addLog(`Withdrawal error: ${err.message}`, "error");
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Reset / Fresh Agent Key
  const handleResetKey = () => {
    if (onChainSol > 0.01) {
      if (!confirm(`Warning: Your current agent vault holds ${onChainSol.toFixed(4)} SOL. Are you sure you want to generate a new key without withdrawing?`)) {
        return;
      }
    }
    engine.resetSessionKey();
    refreshBalance();
  };

  // Nuke logic
  const handleNukeClick = () => {
    if (!nukeArmed) {
      setNukeArmed(true);
      setCountdown(5);
      engine.addLog("NUKE Armed! Click again within 5 seconds to wipe all positions.", "warning");
    } else {
      engine.listNuke();
      setNukeArmed(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    if (nukeArmed) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setNukeArmed(false);
            engine.addLog("NUKE disarmed automatically.", "info");
            clearInterval(timerRef.current);
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nukeArmed]);

  // Calculate total portfolio value
  const totalValueUsd = Object.keys(balances).reduce((acc, symbol) => {
    const bal = balances[symbol] || 0;
    const price = prices[symbol]?.price || 0;
    return acc + bal * price;
  }, 0);

  return (
    <div className="bg-card/45 backdrop-blur-md border border-border rounded-2xl p-5 shadow-lg space-y-4">
      
      {/* Top Section: Balances & Header */}
      <div>
        <div className="flex items-center justify-between mb-3 border-b border-border pb-2.5">
          <h3 className="font-bold font-display uppercase tracking-tight flex items-center gap-2 text-foreground">
            <Wallet className="w-5 h-5 text-primary" />
            Wallet & Positions
          </h3>
          <span className="text-xs font-mono font-bold text-muted-foreground uppercase bg-muted px-2.5 py-1 border border-border rounded-md">
            Portfolio: ${totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Tokens List - Compact & Scrollable */}
        <div className="max-h-44 overflow-y-auto custom-scrollbar pr-1 mb-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.keys(balances).map((symbol) => {
              const bal = balances[symbol] || 0;
              const price = prices[symbol]?.price || 0;
              const val = bal * price;

              return (
                <div key={symbol} className="bg-background/70 border border-border/50 px-3 py-2 rounded-xl flex items-center justify-between text-xs hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-display text-xs text-foreground uppercase tracking-wide">{symbol}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ${price >= 10 ? price.toFixed(1) : price.toFixed(symbol === "BONK" ? 6 : symbol === "SNAP" ? 4 : 2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold font-mono text-xs block text-foreground leading-tight">
                      {bal.toLocaleString(undefined, { maximumFractionDigits: symbol === "BONK" ? 0 : 4 })}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono block leading-tight">
                      ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Agent Vault & Network Mode / Nuke Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/30">
        
        {/* Native SS Terminal Agent Vault (Solana) */}
        <div className="bg-muted/40 p-3.5 rounded-xl border border-border/40 text-xs space-y-2.5 flex flex-col justify-between">
          <div className="flex justify-between items-center text-[10px] font-mono font-bold text-muted-foreground uppercase border-b border-border/20 pb-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${onChainSol > 0.005 ? 'bg-emerald-500 animate-pulse' : 'bg-cyan-500'}`} />
              <span className="text-foreground tracking-wider font-extrabold">
                SS Terminal Agent Vault (Solana)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={refreshBalance} 
                disabled={isRefreshing}
                className="hover:text-foreground transition-colors p-1 cursor-pointer"
                title="Refresh On-Chain Balance"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
              </button>

              <button 
                onClick={handleCopy}
                className="flex items-center gap-1 hover:text-foreground transition-colors font-bold cursor-pointer"
                title="Copy Address"
              >
                <Copy className="w-3 h-3" />
                {copied ? "Copied!" : "Copy"}
              </button>

              <button 
                onClick={handleResetKey}
                className="hover:text-amber-400 transition-colors p-1 cursor-pointer"
                title="Generate Fresh Agent Key"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {/* Address & Live Balance Row */}
            <div className="font-mono text-[11px] break-all font-bold select-all bg-muted/50 p-2 rounded-lg border border-border flex justify-between items-center gap-2 max-w-full overflow-hidden">
              <span className="text-muted-foreground truncate min-w-0">{agentAddress}</span>
              <span className="text-[10px] font-mono font-black uppercase text-foreground bg-primary/20 px-2 py-0.5 rounded border border-primary/30 shrink-0">
                {onChainSol.toFixed(3)} SOL
              </span>
            </div>

            {/* Instant In-App Funding Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleFundFromWallet(0.5)}
                disabled={isFunding}
                className="flex items-center justify-center gap-1 bg-primary/10 hover:bg-primary/20 border border-primary/30 p-1.5 rounded-lg text-[10px] font-bold font-mono uppercase transition-colors text-primary text-center cursor-pointer disabled:opacity-50"
              >
                <ArrowDownLeft className="w-3 h-3" />
                {isFunding ? "Funding..." : "Fund 0.5"}
              </button>

              <button
                onClick={handleDevnetAirdrop}
                disabled={isAirdropping}
                className="flex items-center justify-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 p-1.5 rounded-lg text-[10px] font-bold font-mono uppercase transition-colors text-emerald-400 text-center cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3" />
                {isAirdropping ? "Airdropping..." : "Airdrop 1"}
              </button>

              <button
                onClick={handleWithdrawAll}
                disabled={isWithdrawing || onChainSol <= 0.005}
                className="flex items-center justify-center gap-1 bg-background/80 hover:bg-muted border border-border p-1.5 rounded-lg text-[10px] font-bold font-mono uppercase transition-colors text-muted-foreground hover:text-foreground text-center cursor-pointer disabled:opacity-40"
              >
                <ArrowUpRight className="w-3 h-3" />
                {isWithdrawing ? "Sweeping..." : "Withdraw"}
              </button>
            </div>
          </div>
        </div>

        {/* Network Mode & Nuke Button */}
        <div className="space-y-3 flex flex-col justify-between">
          {/* Simulator / Live Mode Toggle */}
          <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-xl border border-border/20">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase font-bold font-display tracking-tight text-foreground/80">Network Mode</span>
            </div>
            <div className="flex bg-background border border-border p-0.5 rounded-lg text-[10px] font-mono font-bold uppercase">
              <button
                onClick={() => engine.setSimulator(true)}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  isSimulator ? 'bg-primary text-primary-foreground font-black' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sandbox
              </button>
              <button
                onClick={() => engine.setSimulator(false)}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  !isSimulator ? 'bg-primary text-primary-foreground font-black' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Live On-Chain
              </button>
            </div>
          </div>

          {/* Confirm-to-Confirm NUKE button */}
          <button
            onClick={handleNukeClick}
            className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 flex items-center justify-center gap-2 border cursor-pointer ${
              nukeArmed
                ? 'bg-red-600 border-red-700 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-[1.02]'
                : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-600 shadow-md hover:shadow-red-500/20'
            }`}
          >
            <Skull className={`w-4 h-4 ${nukeArmed ? 'animate-bounce' : ''}`} />
            {nukeArmed ? (
              <span className="font-black">NUKE ARMED! CONFIRM ({countdown}s)</span>
            ) : (
              <span className="font-black">NUKE POSITIONS</span>
            )}
          </button>
        </div>

      </div>

    </div>
  );
};

