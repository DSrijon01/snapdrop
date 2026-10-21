"use client";

import React, { useState, useMemo } from "react";
import { ProEvent, ProOrder, ProPoolReserve, ProTokenType } from "./types";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightLeft,
  CheckCircle2,
  Coins,
  DollarSign,
  HelpCircle,
  Info,
  Loader2,
  Percent,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

interface TradingTerminalProps {
  event: ProEvent;
  selectedToken: ProTokenType;
  poolReserve: ProPoolReserve;
  orders: ProOrder[];
  userSolBalance: number;
  userTokenBalance: number; // For the selectedToken
  prefilledPrice?: number;
  prefilledQuantity?: number;
  prefilledSide?: "BUY" | "SELL";
  isSubmitting: boolean;
  onPlaceLimitOrder: (
    side: "BUY" | "SELL",
    tokenType: ProTokenType,
    price: number,
    quantity: number
  ) => Promise<void>;
  onExecuteTakerTrade: (
    action: "BUY" | "SELL",
    tokenType: ProTokenType,
    engine: "ORDER_BOOK" | "AMM",
    amount: number,
    limitPrice?: number
  ) => Promise<void>;
  onProvideAmmLiquidity: (
    tokenType: ProTokenType,
    tokenAmount: number,
    solAmount: number
  ) => Promise<void>;
}

export function TradingTerminal({
  event,
  selectedToken,
  poolReserve,
  orders,
  userSolBalance,
  userTokenBalance,
  prefilledPrice,
  prefilledQuantity,
  prefilledSide,
  isSubmitting,
  onPlaceLimitOrder,
  onExecuteTakerTrade,
  onProvideAmmLiquidity,
}: TradingTerminalProps) {
  // Mode: Market Taker (Instant Swap/Crossing) vs Market Maker (Limit Order / AMM)
  const [roleMode, setRoleMode] = useState<"TAKER" | "MAKER">("TAKER");

  // Taker Settings
  const [takerAction, setTakerAction] = useState<"BUY" | "SELL">(prefilledSide || "BUY");
  const [takerEngine, setTakerEngine] = useState<"ORDER_BOOK" | "AMM">("ORDER_BOOK");
  const [takerAmount, setTakerAmount] = useState<string>(prefilledQuantity ? String(prefilledQuantity) : "5");

  // Maker Settings
  const [makerTab, setMakerTab] = useState<"LIMIT" | "AMM">("LIMIT");
  const [makerSide, setMakerSide] = useState<"BUY" | "SELL">(prefilledSide || "BUY");
  const [makerPrice, setMakerPrice] = useState<string>(
    prefilledPrice ? String(prefilledPrice) : (selectedToken === "YES" ? "0.55" : "0.45")
  );
  const [makerQuantity, setMakerQuantity] = useState<string>(
    prefilledQuantity ? String(prefilledQuantity) : "10"
  );
  const [ammTokenAmount, setAmmTokenAmount] = useState<string>("50");
  const [ammSolAmount, setAmmSolAmount] = useState<string>("25");

  // Keep price updated when user clicks an orderbook level
  React.useEffect(() => {
    if (prefilledPrice) setMakerPrice(String(prefilledPrice));
    if (prefilledQuantity) {
      setMakerQuantity(String(prefilledQuantity));
      setTakerAmount(String(prefilledQuantity));
    }
    if (prefilledSide) {
      setTakerAction(prefilledSide);
      setMakerSide(prefilledSide);
    }
  }, [prefilledPrice, prefilledQuantity, prefilledSide]);

  // Expiry status check (24-hour span)
  const now = Math.floor(Date.now() / 1000);
  const isExpired = event.expiryTs > 0 && now >= event.expiryTs;

  // Best prices on the order book
  const activeTokenOrders = orders.filter((o) => o.isActive && o.tokenType === selectedToken);
  const bestBid = activeTokenOrders
    .filter((o) => o.side === "BUY")
    .reduce((max, o) => (o.price > max ? o.price : max), 0);
  const bestAsk = activeTokenOrders
    .filter((o) => o.side === "SELL")
    .reduce((min, o) => (o.price < min ? o.price : min), 1.0);

  // Calculate Taker quote & execution preview
  const numTakerAmount = parseFloat(takerAmount) || 0;
  const takerCalculation = useMemo(() => {
    if (numTakerAmount <= 0) return { output: 0, fee: 0, avgPrice: 0, priceImpact: 0 };

    if (takerEngine === "ORDER_BOOK") {
      // Crossing Order Book
      const matchingOrders = activeTokenOrders
        .filter((o) => (takerAction === "BUY" ? o.side === "SELL" : o.side === "BUY"))
        .sort((a, b) => (takerAction === "BUY" ? a.price - b.price : b.price - a.price));

      let filled = 0;
      let totalCostSol = 0;
      for (const ord of matchingOrders) {
        const available = ord.quantity - ord.filledQuantity;
        const take = Math.min(available, numTakerAmount - filled);
        filled += take;
        totalCostSol += take * ord.price;
        if (filled >= numTakerAmount) break;
      }

      if (filled === 0) {
        // Fallback to mid price if no crossing depth
        const fallbackPrice = takerAction === "BUY" ? (bestAsk < 1 ? bestAsk : 0.6) : (bestBid > 0 ? bestBid : 0.4);
        totalCostSol = numTakerAmount * fallbackPrice;
        filled = numTakerAmount;
      }

      const fee = totalCostSol * 0.0025; // 25 bps (Chapter 14 rule)
      const avgPrice = filled > 0 ? totalCostSol / filled : 0;

      return {
        output: takerAction === "BUY" ? filled : totalCostSol - fee,
        fee,
        avgPrice,
        priceImpact: 0.1, // Fixed depth impact
      };
    } else {
      // AMM Constant Product (Chapter 15: x * y = k)
      const reserveIn = takerAction === "BUY" ? poolReserve.solReserve : (selectedToken === "YES" ? poolReserve.yesReserve : poolReserve.noReserve);
      const reserveOut = takerAction === "BUY" ? (selectedToken === "YES" ? poolReserve.yesReserve : poolReserve.noReserve) : poolReserve.solReserve;

      const fee = numTakerAmount * (poolReserve.feeBps / 10000);
      const taxedIn = numTakerAmount - fee;
      const output = (taxedIn * reserveOut) / (reserveIn + taxedIn);
      const spotPriceBefore = reserveIn / (reserveOut || 1);
      const executionPrice = numTakerAmount / (output || 1);
      const priceImpact = Math.max(0, ((executionPrice - spotPriceBefore) / spotPriceBefore) * 100);

      return {
        output,
        fee,
        avgPrice: executionPrice,
        priceImpact,
      };
    }
  }, [numTakerAmount, takerAction, takerEngine, activeTokenOrders, selectedToken, poolReserve, bestAsk, bestBid]);

  // Maker Escrow calculation
  const numMakerPrice = parseFloat(makerPrice) || 0;
  const numMakerQty = parseFloat(makerQuantity) || 0;
  const makerEscrowNeeded = makerSide === "BUY" ? numMakerPrice * numMakerQty : numMakerQty;

  const handleTakerSubmit = async () => {
    if (numTakerAmount <= 0) return;
    await onExecuteTakerTrade(takerAction, selectedToken, takerEngine, numTakerAmount);
  };

  const handleMakerLimitSubmit = async () => {
    if (numMakerPrice <= 0 || numMakerQty <= 0) return;
    await onPlaceLimitOrder(makerSide, selectedToken, numMakerPrice, numMakerQty);
  };

  const handleMakerAmmSubmit = async () => {
    const tAmt = parseFloat(ammTokenAmount) || 0;
    const sAmt = parseFloat(ammSolAmount) || 0;
    if (tAmt <= 0 || sAmt <= 0) return;
    await onProvideAmmLiquidity(selectedToken, tAmt, sAmt);
  };

  return (
    <div className="bg-card/45 backdrop-blur-md border border-border/70 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
      <div>
        {/* Terminal Header & Mode Toggle */}
        <div className="flex items-center justify-between pb-5 border-b border-border/40">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary animate-pulse" />
              <h2 className="text-lg font-black font-display uppercase tracking-tight">
                Execution Terminal
              </h2>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              Trading <strong className="text-foreground">{selectedToken} Token</strong> on 24H Event
            </p>
          </div>

          {/* Role Toggle: TAKER vs MAKER */}
          <div className="flex items-center bg-muted/60 p-1 rounded-2xl border border-border/60">
            <button
              onClick={() => setRoleMode("TAKER")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 ${
                roleMode === "TAKER"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Market Taker
            </button>
            <button
              onClick={() => setRoleMode("MAKER")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 ${
                roleMode === "MAKER"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              Market Maker
            </button>
          </div>
        </div>

        {/* 24-Hour Expiration Notice if expired */}
        {isExpired && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2 text-rose-400 text-xs font-mono">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>24-Hour trading period expired. New trades are locked. Settlement in progress.</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAKER INTERFACE                                                           */}
        {/* ========================================================================= */}
        {roleMode === "TAKER" ? (
          <div className="space-y-5 pt-4">
            {/* Taker Action Toggle: Buy vs Sell */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-2xl border border-border/60">
              <button
                onClick={() => setTakerAction("BUY")}
                className={`py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
                  takerAction === "BUY"
                    ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Instant Buy {selectedToken}
              </button>
              <button
                onClick={() => setTakerAction("SELL")}
                className={`py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
                  takerAction === "SELL"
                    ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Instant Sell {selectedToken}
              </button>
            </div>

            {/* Execution Engine Selector */}
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground px-1">
              <span>Routing Engine:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setTakerEngine("ORDER_BOOK")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all ${
                    takerEngine === "ORDER_BOOK"
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  CLOB Crossing (Ch. 14)
                </button>
                <button
                  onClick={() => setTakerEngine("AMM")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all ${
                    takerEngine === "AMM"
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  AMM Pool (Ch. 15)
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="bg-muted/20 border border-border/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">
                  {takerAction === "BUY" ? "Paying Amount" : "Tokens to Sell"}
                </span>
                <span className="text-muted-foreground">
                  Balance:{" "}
                  <strong className="text-foreground">
                    {takerAction === "BUY"
                      ? `${userSolBalance.toFixed(3)} SOL`
                      : `${userTokenBalance.toFixed(1)} ${selectedToken}`}
                  </strong>
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={takerAmount}
                  onChange={(e) => setTakerAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={isExpired}
                  className="bg-transparent font-mono text-2xl font-black text-foreground focus:outline-none w-full"
                />
                <span className="text-xs font-mono font-bold uppercase px-2.5 py-1 rounded-lg bg-card border border-border shrink-0">
                  {takerAction === "BUY" ? (takerEngine === "ORDER_BOOK" ? "Shares" : "SOL") : selectedToken}
                </span>
              </div>
            </div>

            {/* Execution Quote Breakdown */}
            <div className="bg-card/30 border border-border/50 rounded-2xl p-3.5 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Estimated Receive:</span>
                <span className="font-bold text-foreground">
                  {takerCalculation.output.toFixed(3)}{" "}
                  {takerAction === "BUY" ? selectedToken : "SOL"}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Effective Price:</span>
                <span className="text-foreground">{takerCalculation.avgPrice.toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Taker Fee (25 bps):</span>
                <span className="text-primary">{takerCalculation.fee.toFixed(4)} SOL</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Price Impact:</span>
                <span className={takerCalculation.priceImpact > 2 ? "text-amber-400 font-bold" : "text-emerald-400"}>
                  {takerCalculation.priceImpact.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Execute Button */}
            <button
              onClick={handleTakerSubmit}
              disabled={isExpired || isSubmitting || numTakerAmount <= 0}
              className={`w-full py-4 rounded-2xl font-bold uppercase tracking-wider text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${
                isExpired
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : takerAction === "BUY"
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/25 active:scale-[0.99]"
                  : "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/25 active:scale-[0.99]"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Executing Taker Trade...
                </>
              ) : isExpired ? (
                "24H Trading Window Expired"
              ) : (
                `Execute Market ${takerAction} (${selectedToken})`
              )}
            </button>
          </div>
        ) : (
          /* ========================================================================= */
          /* MAKER INTERFACE                                                           */
          /* ========================================================================= */
          <div className="space-y-5 pt-4">
            {/* Maker Sub-tabs: Limit Order vs AMM Pool */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-2xl border border-border/60">
              <button
                onClick={() => setMakerTab("LIMIT")}
                className={`py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
                  makerTab === "LIMIT"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Limit Order Book
              </button>
              <button
                onClick={() => setMakerTab("AMM")}
                className={`py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
                  makerTab === "AMM"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Provide AMM Liquidity
              </button>
            </div>

            {makerTab === "LIMIT" ? (
              /* LIMIT ORDER BOOK MAKER */
              <div className="space-y-4">
                {/* Maker Side: Bid vs Ask */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold uppercase">
                  <button
                    onClick={() => setMakerSide("BUY")}
                    className={`py-2 rounded-xl border transition-all ${
                      makerSide === "BUY"
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-400"
                        : "border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Post Limit Bid (Buy)
                  </button>
                  <button
                    onClick={() => setMakerSide("SELL")}
                    className={`py-2 rounded-xl border transition-all ${
                      makerSide === "SELL"
                        ? "bg-rose-500/15 border-rose-500 text-rose-400"
                        : "border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Post Limit Ask (Sell)
                  </button>
                </div>

                {/* Limit Price Input */}
                <div className="bg-muted/20 border border-border/80 rounded-2xl p-3.5 space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>Limit Price</span>
                    <span>Range: 0.01 - 0.99 SOL</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="0.99"
                      value={makerPrice}
                      onChange={(e) => setMakerPrice(e.target.value)}
                      placeholder="0.50"
                      disabled={isExpired}
                      className="bg-transparent font-mono text-xl font-black text-foreground focus:outline-none w-full"
                    />
                    <span className="text-xs font-mono font-bold uppercase text-muted-foreground">
                      SOL / Share
                    </span>
                  </div>
                </div>

                {/* Quantity Input */}
                <div className="bg-muted/20 border border-border/80 rounded-2xl p-3.5 space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>Order Quantity</span>
                    <span>
                      {makerSide === "BUY"
                        ? `SOL Balance: ${userSolBalance.toFixed(3)}`
                        : `${selectedToken} Balance: ${userTokenBalance.toFixed(1)}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={makerQuantity}
                      onChange={(e) => setMakerQuantity(e.target.value)}
                      placeholder="10"
                      disabled={isExpired}
                      className="bg-transparent font-mono text-xl font-black text-foreground focus:outline-none w-full"
                    />
                    <span className="text-xs font-mono font-bold uppercase text-muted-foreground">
                      Shares
                    </span>
                  </div>
                </div>

                {/* Maker Escrow Summary */}
                <div className="bg-card/30 border border-border/50 rounded-2xl p-3.5 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Escrow Required:</span>
                    <strong className="text-foreground">
                      {makerEscrowNeeded.toFixed(3)} {makerSide === "BUY" ? "SOL" : selectedToken}
                    </strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Maker Fee Rebate:</span>
                    <span className="text-emerald-400 font-bold">0.00% (Free to Post)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-1">
                    Funds are safely held in the program market vault PDA until matched or cancelled.
                  </p>
                </div>

                <button
                  onClick={handleMakerLimitSubmit}
                  disabled={isExpired || isSubmitting || numMakerPrice <= 0 || numMakerQty <= 0}
                  className={`w-full py-4 rounded-2xl font-bold uppercase tracking-wider text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${
                    isExpired
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/25 active:scale-[0.99]"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Posting Limit Order...
                    </>
                  ) : isExpired ? (
                    "24H Trading Window Expired"
                  ) : (
                    `Place ${makerSide} Limit Order`
                  )}
                </button>
              </div>
            ) : (
              /* AMM LIQUIDITY MAKER */
              <div className="space-y-4">
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-xs font-mono text-foreground/90 space-y-1">
                  <span className="font-bold text-primary block uppercase">Constant-Product Pool (Ch. 15)</span>
                  <p className="text-muted-foreground text-[11px]">
                    Deposit both {selectedToken} tokens and SOL to deepen market liquidity. Earn 25 bps fees on every taker swap.
                  </p>
                </div>

                <div className="bg-muted/20 border border-border/80 rounded-2xl p-3.5 space-y-1.5">
                  <span className="text-xs font-mono text-muted-foreground block">
                    {selectedToken} Token Deposit
                  </span>
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="number"
                      step="5"
                      min="1"
                      value={ammTokenAmount}
                      onChange={(e) => setAmmTokenAmount(e.target.value)}
                      disabled={isExpired}
                      className="bg-transparent font-mono text-xl font-black text-foreground focus:outline-none w-full"
                    />
                    <span className="text-xs font-mono font-bold uppercase text-muted-foreground">
                      {selectedToken}
                    </span>
                  </div>
                </div>

                <div className="bg-muted/20 border border-border/80 rounded-2xl p-3.5 space-y-1.5">
                  <span className="text-xs font-mono text-muted-foreground block">SOL Deposit</span>
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="number"
                      step="1"
                      min="0.1"
                      value={ammSolAmount}
                      onChange={(e) => setAmmSolAmount(e.target.value)}
                      disabled={isExpired}
                      className="bg-transparent font-mono text-xl font-black text-foreground focus:outline-none w-full"
                    />
                    <span className="text-xs font-mono font-bold uppercase text-muted-foreground">SOL</span>
                  </div>
                </div>

                {/* Current Pool Reserves */}
                <div className="bg-card/30 border border-border/50 rounded-2xl p-3.5 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Pool {selectedToken} Reserve:</span>
                    <span className="text-foreground">
                      {selectedToken === "YES" ? poolReserve.yesReserve : poolReserve.noReserve}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Pool SOL Reserve:</span>
                    <span className="text-foreground">{poolReserve.solReserve.toFixed(2)} SOL</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Fee Accrual:</span>
                    <span className="text-emerald-400 font-bold">25 bps (0.25%)</span>
                  </div>
                </div>

                <button
                  onClick={handleMakerAmmSubmit}
                  disabled={isExpired || isSubmitting}
                  className={`w-full py-4 rounded-2xl font-bold uppercase tracking-wider text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${
                    isExpired
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/25 active:scale-[0.99]"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding Pool Liquidity...
                    </>
                  ) : isExpired ? (
                    "24H Trading Window Expired"
                  ) : (
                    "Supply Liquidity & Mint LP Shares"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
