"use client";

import React, { useState, useMemo } from "react";
import { ProOrder, ProTokenType, RecentTrade } from "./types";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, BarChart2, Clock, Layers, Zap } from "lucide-react";

interface OrderBookViewProps {
  orders: ProOrder[];
  selectedToken: ProTokenType;
  onSelectToken: (token: ProTokenType) => void;
  onSelectPriceLevel: (price: number, quantity: number, side: "BUY" | "SELL") => void;
  recentTrades: RecentTrade[];
  midPrice: number;
}

export function OrderBookView({
  orders,
  selectedToken,
  onSelectToken,
  onSelectPriceLevel,
  recentTrades,
  midPrice,
}: OrderBookViewProps) {
  const [tab, setTab] = useState<"book" | "trades">("book");

  // Filter active orders for the chosen token (YES or NO)
  const tokenOrders = useMemo(() => {
    return orders.filter((o) => o.isActive && o.tokenType === selectedToken);
  }, [orders, selectedToken]);

  // Separate Bids (Buy orders) and Asks (Sell orders)
  const { bids, asks, maxDepth } = useMemo(() => {
    const rawBids = tokenOrders
      .filter((o) => o.side === "BUY")
      .map((o) => ({
        price: o.price,
        size: o.quantity - o.filledQuantity,
        total: o.price * (o.quantity - o.filledQuantity),
      }))
      .sort((a, b) => b.price - a.price); // Highest bid first

    const rawAsks = tokenOrders
      .filter((o) => o.side === "SELL")
      .map((o) => ({
        price: o.price,
        size: o.quantity - o.filledQuantity,
        total: o.price * (o.quantity - o.filledQuantity),
      }))
      .sort((a, b) => a.price - b.price); // Lowest ask first

    let max = 0;
    let accumBid = 0;
    const bidLevels = rawBids.map((b) => {
      accumBid += b.size;
      if (accumBid > max) max = accumBid;
      return { ...b, accum: accumBid };
    });

    let accumAsk = 0;
    const askLevels = rawAsks.map((a) => {
      accumAsk += a.size;
      if (accumAsk > max) max = accumAsk;
      return { ...a, accum: accumAsk };
    });

    return {
      bids: bidLevels.slice(0, 8),
      asks: askLevels.slice(0, 8).reverse(), // Reverse so lowest ask is at bottom near spread
      maxDepth: max || 1,
    };
  }, [tokenOrders]);

  const bestBid = bids.length > 0 ? bids[0].price : 0;
  const bestAsk = asks.length > 0 ? asks[asks.length - 1].price : 0;
  const spread = bestAsk > 0 && bestBid > 0 ? Math.max(0, bestAsk - bestBid) : 0;
  const spreadBps = bestBid > 0 ? Math.round((spread / bestBid) * 10000) : 0;

  return (
    <div className="bg-card/45 backdrop-blur-md border border-border/70 rounded-3xl p-5 flex flex-col h-full shadow-xl">
      {/* Header & Token Switcher */}
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black font-display uppercase tracking-wider">
              Real-Time Order Book
            </h3>
            <p className="text-[10px] font-mono text-muted-foreground uppercase">
              Price-Time Priority (Chapter 14 CLOB)
            </p>
          </div>
        </div>

        {/* YES / NO Token Selector */}
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
          <button
            onClick={() => onSelectToken("YES")}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
              selectedToken === "YES"
                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            YES Token
          </button>
          <button
            onClick={() => onSelectToken("NO")}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
              selectedToken === "NO"
                ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            NO Token
          </button>
        </div>
      </div>

      {/* View Switcher: Book vs Recent Trades */}
      <div className="flex items-center gap-2 pt-3 pb-2">
        <button
          onClick={() => setTab("book")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all ${
            tab === "book"
              ? "bg-muted text-primary font-bold border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Depth Book ({tokenOrders.length})
        </button>
        <button
          onClick={() => setTab("trades")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all ${
            tab === "trades"
              ? "bg-muted text-primary font-bold border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Live Trades ({recentTrades.length})
        </button>
      </div>

      {tab === "book" ? (
        <div className="flex-1 flex flex-col justify-between pt-2">
          {/* Table Headers */}
          <div className="grid grid-cols-3 text-[10px] font-mono uppercase text-muted-foreground pb-2 px-2 border-b border-border/30">
            <span>Price (SOL)</span>
            <span className="text-right">Size (Qty)</span>
            <span className="text-right">Total (SOL)</span>
          </div>

          {/* Asks (Sells) */}
          <div className="flex flex-col justify-end space-y-1 py-1.5 min-h-[140px]">
            {asks.length === 0 ? (
              <div className="text-center py-6 text-xs font-mono text-muted-foreground/60 italic">
                No active asks on book
              </div>
            ) : (
              asks.map((ask, idx) => {
                const depthPct = Math.min(100, (ask.accum / maxDepth) * 100);
                return (
                  <div
                    key={`ask-${idx}`}
                    onClick={() => onSelectPriceLevel(ask.price, ask.size, "BUY")}
                    className="grid grid-cols-3 text-xs font-mono py-1 px-2 rounded hover:bg-rose-500/10 cursor-pointer relative group transition-colors"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-rose-500/15 rounded pointer-events-none transition-all"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="text-rose-400 font-bold flex items-center gap-1 z-10">
                      {ask.price.toFixed(3)}
                    </span>
                    <span className="text-right text-foreground/80 z-10">
                      {ask.size.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </span>
                    <span className="text-right text-muted-foreground z-10">
                      {ask.total.toFixed(3)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Spread / Mid-Market Price Bar */}
          <div className="py-2.5 px-3 my-1.5 bg-muted/40 border-y border-border/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground uppercase">Mid:</span>
              <span className="text-sm font-black font-mono text-primary">
                {midPrice.toFixed(3)} SOL
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                {Math.round(midPrice * 100)}% Implied
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-muted-foreground block">
                Spread: {spread > 0 ? `${spread.toFixed(3)} SOL` : "0.000"} ({spreadBps} bps)
              </span>
            </div>
          </div>

          {/* Bids (Buys) */}
          <div className="flex flex-col space-y-1 py-1.5 min-h-[140px]">
            {bids.length === 0 ? (
              <div className="text-center py-6 text-xs font-mono text-muted-foreground/60 italic">
                No active bids on book
              </div>
            ) : (
              bids.map((bid, idx) => {
                const depthPct = Math.min(100, (bid.accum / maxDepth) * 100);
                return (
                  <div
                    key={`bid-${idx}`}
                    onClick={() => onSelectPriceLevel(bid.price, bid.size, "SELL")}
                    className="grid grid-cols-3 text-xs font-mono py-1 px-2 rounded hover:bg-emerald-500/10 cursor-pointer relative group transition-colors"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 rounded pointer-events-none transition-all"
                      style={{ width: `${depthPct}%` }}
                    />
                    <span className="text-emerald-400 font-bold flex items-center gap-1 z-10">
                      {bid.price.toFixed(3)}
                    </span>
                    <span className="text-right text-foreground/80 z-10">
                      {bid.size.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </span>
                    <span className="text-right text-muted-foreground z-10">
                      {bid.total.toFixed(3)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Recent Trades Tape */
        <div className="flex-1 flex flex-col pt-2 overflow-y-auto max-h-[340px]">
          <div className="grid grid-cols-4 text-[10px] font-mono uppercase text-muted-foreground pb-2 px-2 border-b border-border/30">
            <span>Time</span>
            <span>Side</span>
            <span className="text-right">Price</span>
            <span className="text-right">Total</span>
          </div>
          <div className="space-y-1 py-1">
            {recentTrades.length === 0 ? (
              <div className="text-center py-10 text-xs font-mono text-muted-foreground">
                No recorded trades in this 24h cycle
              </div>
            ) : (
              recentTrades.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-4 text-xs font-mono py-1 px-2 rounded hover:bg-muted/40"
                >
                  <span className="text-muted-foreground">{t.time}</span>
                  <span
                    className={`font-bold flex items-center gap-0.5 ${
                      t.side === "BUY" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {t.side === "BUY" ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {t.side}
                  </span>
                  <span className="text-right text-foreground font-semibold">
                    {t.price.toFixed(3)}
                  </span>
                  <span className="text-right text-muted-foreground">
                    {t.totalSol.toFixed(3)} SOL
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
