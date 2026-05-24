"use client";

import React, { useState, useEffect, useRef } from "react";
import { Wallet, Skull, Copy, Info, AlertTriangle, ShieldCheck } from "lucide-react";
import { AgentExecutionEngine, TokenPrice } from "./AgentExecutionEngine";

interface PositionsPaneProps {
  engine: AgentExecutionEngine;
  balances: Record<string, number>;
  prices: Record<string, TokenPrice>;
}

export const PositionsPane: React.FC<PositionsPaneProps> = ({ engine, balances, prices }) => {
  const [nukeArmed, setNukeArmed] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<any>(null);

  const isSimulator = engine.isSimulator();

  const sessionWalletPublicKey = engine.getSessionPublicKey();

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionWalletPublicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNukeClick = () => {
    if (!nukeArmed) {
      // Arm the nuke
      setNukeArmed(true);
      setCountdown(5);
      engine.addLog("NUKE Armed! Click again within 5 seconds to wipe all positions.", "warning");
    } else {
      // Execute the nuke
      engine.listNuke();
      setNukeArmed(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
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
    <div className="bg-card/45 backdrop-blur-md border border-border rounded-2xl p-5 flex flex-col justify-between h-full shadow-lg gap-6">
      
      {/* Top Section: Balances */}
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <h3 className="font-bold font-display uppercase tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Wallet & Positions
          </h3>
          <span className="text-xs font-mono font-bold text-muted-foreground uppercase bg-muted px-2.5 py-1 border border-border">
            Total Val: ${totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Tokens List */}
        <div className="space-y-2 mb-4">
          {Object.keys(balances).map((symbol) => {
            const bal = balances[symbol] || 0;
            const price = prices[symbol]?.price || 0;
            const val = bal * price;

            return (
              <div key={symbol} className="bg-background/60 border border-border/40 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold font-display text-sm block">{symbol}</span>
                  <span className="text-[10px] text-muted-foreground font-mono block">Price: ${price.toLocaleString(undefined, { minimumFractionDigits: symbol === "SNAP" ? 4 : 2 })}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono text-sm block">{bal.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                  <span className="text-[10px] text-muted-foreground font-mono block">${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Local Session Wallet Info */}
        <div className="bg-muted/40 p-4 rounded-xl border border-border/30 text-xs space-y-2">
          <div className="flex justify-between items-center text-[10px] font-mono font-bold text-muted-foreground uppercase border-b border-border/20 pb-1.5 mb-1.5">
            <span>Agent Wallet (Local Session)</span>
            <button 
              onClick={handleCopy}
              className="flex items-center gap-1 hover:text-foreground transition-colors font-bold"
            >
              <Copy className="w-3 h-3" />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="font-mono break-all font-bold select-all text-muted-foreground leading-relaxed bg-black/30 p-2 rounded-lg border border-border/10">
            {sessionWalletPublicKey}
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed italic">
            * This local agent key is stored in your session. Fund it with Devnet SOL to run actual on-chain transaction automation.
          </p>
        </div>
      </div>

      {/* Bottom Section: Network Mode & Nuke Button */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        
        {/* Simulator/Real Network Mode Toggle */}
        <div className="flex items-center justify-between bg-muted/40 p-3 rounded-xl border border-border/20">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs uppercase font-bold font-display tracking-tight text-foreground/80">Network Mode</span>
          </div>
          <div className="flex bg-background border border-border p-0.5 rounded-lg text-[10px] font-mono font-bold uppercase">
            <button
              onClick={() => engine.setSimulator(true)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                isSimulator ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sandbox
            </button>
            <button
              onClick={() => engine.setSimulator(false)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                !isSimulator ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Devnet
            </button>
          </div>
        </div>

        {/* Confirm-to-Confirm NUKE button */}
        <button
          onClick={handleNukeClick}
          className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all duration-300 flex items-center justify-center gap-2.5 border ${
            nukeArmed
              ? 'bg-red-600 border-red-700 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-[1.02]'
              : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-600 shadow-md hover:shadow-red-500/20'
          }`}
        >
          <Skull className={`w-5 h-5 ${nukeArmed ? 'animate-bounce' : ''}`} />
          {nukeArmed ? (
            <span className="font-black">NUKE ARMED! CLICK TO CONFIRM ({countdown}s)</span>
          ) : (
            <span className="font-black">NUKE POSITIONS</span>
          )}
        </button>
      </div>

    </div>
  );
};
