"use client";

import React from "react";
import {
  X,
  ExternalLink,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  Layers,
  Clock,
  Wallet,
  Hash,
  FileCode,
  Copy,
  Check,
} from "lucide-react";
import { TreasuryTransaction } from "@/types/treasury";
import { CATEGORY_CONFIG, ESTIMATED_SOL_USD } from "@/lib/treasuryParser";
import toast from "react-hot-toast";

interface TransactionDetailModalProps {
  tx: TreasuryTransaction | null;
  onClose: () => void;
}

export function TransactionDetailModal({ tx, onClose }: TransactionDetailModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!tx) return null;

  const catConfig = CATEGORY_CONFIG[tx.category] || {
    label: tx.categoryLabel || tx.category,
    color: "#3B82F6",
    bgLight: "bg-blue-100 text-blue-800",
    bgDark: "dark:bg-blue-950 dark:text-blue-300",
    description: "",
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const isInflow = tx.direction === "inflow";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-card-foreground">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm ${
                isInflow
                  ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-500 border border-red-500/30"
              }`}
            >
              {isInflow ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black font-display uppercase tracking-tight">
                  Transaction Drilldown
                </h3>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${catConfig.bgLight} ${catConfig.bgDark}`}
                >
                  {catConfig.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 font-mono">
                <Clock className="w-3 h-3" />
                {new Date(tx.timestamp).toUTCString()} (Slot: {tx.slot.toLocaleString()})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Amount & Yield Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/40 border border-border">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Gross Amount
              </p>
              <p className={`text-2xl font-black font-mono ${isInflow ? "text-emerald-500" : "text-red-500"}`}>
                {isInflow ? "+" : "-"}
                {tx.amountSol.toFixed(4)} SOL
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                ≈ ${(tx.amountSol * ESTIMATED_SOL_USD).toFixed(2)} USD
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Network Gas & Rent
              </p>
              <p className="text-lg font-bold font-mono text-foreground mt-0.5">
                {(tx.gasSpentSol + tx.rentCostSol).toFixed(6)} SOL
              </p>
              <p className="text-xs text-muted-foreground">
                Gas: {tx.gasSpentSol.toFixed(6)} | Rent: {tx.rentCostSol.toFixed(4)}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Net Yield To Treasury
              </p>
              <p className="text-2xl font-black font-mono text-primary">
                {tx.netYieldSol > 0 ? `+${tx.netYieldSol.toFixed(4)}` : tx.netYieldSol.toFixed(4)} SOL
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                ≈ ${(tx.netYieldSol * ESTIMATED_SOL_USD).toFixed(2)} USD
              </p>
            </div>
          </div>

          {/* Description / Reference Memo */}
          {tx.memo && (
            <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-xs">
              <p className="font-bold text-primary mb-0.5 uppercase tracking-wider text-[10px]">
                Reference Memo / Product Event
              </p>
              <p className="text-foreground font-medium">{tx.memo}</p>
            </div>
          )}

          {/* Transaction Metadata Grid */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
              On-Chain Identity & Participants
            </h4>

            {/* Signature */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 overflow-hidden mr-2">
                <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-bold shrink-0">Signature:</span>
                <span className="font-mono text-muted-foreground truncate">{tx.signature}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => copyToClipboard(tx.signature, "Signature")}
                  className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  title="Copy Signature"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 hover:bg-muted rounded text-primary hover:text-primary-hover flex items-center gap-1"
                  title="View on Solscan"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Counterparty */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 overflow-hidden mr-2">
                <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-bold shrink-0">Counterparty:</span>
                <span className="font-mono text-muted-foreground truncate">{tx.counterparty}</span>
              </div>
              <button
                onClick={() => copyToClipboard(tx.counterparty, "Address")}
                className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground shrink-0"
                title="Copy Address"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Instructions Decoded */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[11px] flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5" />
              Instruction Hierarchy ({tx.instructions.length})
            </h4>
            <div className="space-y-2">
              {tx.instructions.map((ix, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-muted/20 border border-border/80 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="font-bold text-foreground">
                      #{idx + 1} {ix.program}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-bold">{ix.type}</span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 break-all">{ix.details}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Program Event Logs */}
          {tx.logs && tx.logs.length > 0 && (
            <div className="space-y-2 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-muted-foreground text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Raw Execution Logs
              </h4>
              <div className="p-3 rounded-lg bg-zinc-950 text-zinc-300 font-mono text-[11px] max-h-36 overflow-y-auto space-y-1">
                {tx.logs.map((log, i) => (
                  <div key={i} className="leading-relaxed">
                    <span className="text-zinc-500 mr-2">[{i + 1}]</span>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Cryptographically Verified On-Chain Ledger</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
