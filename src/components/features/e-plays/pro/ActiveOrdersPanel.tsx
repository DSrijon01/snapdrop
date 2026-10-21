"use client";

import React, { useState } from "react";
import { ProOrder, ProPosition } from "./types";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Loader2,
  ShieldCheck,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";

interface ActiveOrdersPanelProps {
  orders: ProOrder[];
  positions: ProPosition[];
  connectedWalletPubkey?: string;
  isCancelling: boolean;
  onCancelOrder: (order: ProOrder) => Promise<void>;
  onFastExitPosition: (position: ProPosition) => Promise<void>;
}

export function ActiveOrdersPanel({
  orders,
  positions,
  connectedWalletPubkey,
  isCancelling,
  onCancelOrder,
  onFastExitPosition,
}: ActiveOrdersPanelProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "positions">("orders");

  // User's active resting maker orders
  const myOrders = orders.filter((o) => o.isActive);

  return (
    <div className="bg-card/45 backdrop-blur-md border border-border/70 rounded-3xl p-6 shadow-xl space-y-4">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 ${
              activeTab === "orders"
                ? "bg-muted text-primary border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            My Active Orders ({myOrders.length})
          </button>
          <button
            onClick={() => setActiveTab("positions")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 ${
              activeTab === "positions"
                ? "bg-muted text-primary border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            Open Positions ({positions.length})
          </button>
        </div>
      </div>

      {activeTab === "orders" ? (
        /* ACTIVE RESTING ORDERS */
        <div className="space-y-3">
          {myOrders.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-muted-foreground">
              No resting limit orders placed. Use the Market Maker tab to post bids/asks and provide liquidity.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-muted-foreground uppercase border-b border-border/30 pb-2">
                    <th className="py-2">Order ID</th>
                    <th>Side</th>
                    <th>Token</th>
                    <th>Limit Price</th>
                    <th>Filled / Qty</th>
                    <th>Escrow</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {myOrders.map((ord) => {
                    const remaining = ord.quantity - ord.filledQuantity;
                    const escrow = ord.side === "BUY" ? ord.price * remaining : remaining;
                    return (
                      <tr key={ord.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 font-bold text-foreground">#{ord.orderId}</td>
                        <td>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              ord.side === "BUY"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-rose-500/15 text-rose-400"
                            }`}
                          >
                            {ord.side}
                          </span>
                        </td>
                        <td className="font-bold text-foreground">{ord.tokenType}</td>
                        <td className="text-primary font-bold">{ord.price.toFixed(3)} SOL</td>
                        <td className="text-foreground/80">
                          {ord.filledQuantity} / {ord.quantity}
                        </td>
                        <td className="text-muted-foreground">
                          {escrow.toFixed(3)} {ord.side === "BUY" ? "SOL" : ord.tokenType}
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => onCancelOrder(ord)}
                            disabled={isCancelling}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold uppercase transition-all inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Cancel & Reclaim
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* OPEN POSITIONS & EARLY CASHOUT */
        <div className="space-y-3">
          {positions.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-muted-foreground">
              No active prediction shares held for this event.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-muted-foreground uppercase border-b border-border/30 pb-2">
                    <th className="py-2">Token</th>
                    <th>Shares</th>
                    <th>Avg Entry</th>
                    <th>Current Price</th>
                    <th>PnL (SOL)</th>
                    <th>Return %</th>
                    <th className="text-right">Fast Exit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {positions.map((pos, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 font-bold text-foreground">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pos.tokenType === "YES"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-rose-500/15 text-rose-400"
                          }`}
                        >
                          {pos.tokenType}
                        </span>
                      </td>
                      <td className="font-bold text-foreground">{pos.shares.toFixed(1)}</td>
                      <td className="text-muted-foreground">{pos.avgEntryPrice.toFixed(3)} SOL</td>
                      <td className="text-foreground">{pos.currentPrice.toFixed(3)} SOL</td>
                      <td className={pos.unrealizedPnlSol >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                        {pos.unrealizedPnlSol >= 0 ? "+" : ""}{pos.unrealizedPnlSol.toFixed(3)} SOL
                      </td>
                      <td className={pos.pnlPercent >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                        {pos.pnlPercent >= 0 ? "+" : ""}{pos.pnlPercent.toFixed(1)}%
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => onFastExitPosition(pos)}
                          className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[11px] font-bold uppercase transition-all"
                        >
                          Market Exit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
