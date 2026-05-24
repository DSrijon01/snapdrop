"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Zap, Bot, Sparkles, AlertCircle, TrendingUp, DollarSign, ArrowUpRight } from "lucide-react";
import { AgentExecutionEngine, TokenPrice, AgentRule, LogEntry } from "./AgentExecutionEngine";
import { PositionsPane } from "./PositionsPane";
import { AiSuggestions } from "./AiSuggestions";
import { AgentController } from "./AgentController";
import { TradingViewChart } from "./TradingViewChart";

export const TradingTerminal: React.FC = () => {
  // Instantiate the execution engine once
  const engine = useMemo(() => new AgentExecutionEngine(), []);

  // React states synced from the engine
  const [prices, setPrices] = useState<Record<string, TokenPrice>>({});
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [rules, setRules] = useState<AgentRule[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeSymbol, setActiveSymbol] = useState("SOL");
  
  // Manual Order Entry State
  const [orderType, setOrderType] = useState<"market" | "limit" | "chase" | "twap">("market");
  const [isBuy, setIsBuy] = useState(true);
  const [amount, setAmount] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [twapSlicesInput, setTwapSlicesInput] = useState("5");

  // Sync state from engine on update
  useEffect(() => {
    const syncState = () => {
      setPrices({ ...engine.getPrices() });
      setBalances({ ...engine.getBalances() });
      setRules([...engine.getRules()]);
      setLogs([...engine.getLogs()]);
    };

    engine.setOnChange(syncState);
    syncState(); // initial sync
    
    // Auto-start the loop on load
    engine.start();

    return () => {
      engine.stop();
    };
  }, [engine]);

  // Handle manual order placement
  const handlePlaceOrder = () => {
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (orderType === "market") {
      const ok = engine.executeTrade(isBuy, activeSymbol, amtNum);
      if (ok) {
        setAmount("");
      }
    } else if (orderType === "limit") {
      const limitPrice = parseFloat(priceInput);
      if (isNaN(limitPrice) || limitPrice <= 0) {
        alert("Please enter a valid limit price.");
        return;
      }
      engine.addLog(`Placed manual LIMIT ${isBuy ? "BUY" : "SELL"} order of ${amtNum} ${activeSymbol} @ $${limitPrice}. Pending trigger...`, "info");
      
      // Spawn a Grid-like rule with 0% triggers to represent limit orders
      engine.addRule({
        type: "grid",
        symbol: activeSymbol,
        params: {
          gridBasePrice: limitPrice,
          buyTriggerPct: isBuy ? 0 : 99999, // Trigger immediately if price hits it
          sellTriggerPct: !isBuy ? 0 : 99999,
          tradeAmount: amtNum
        }
      });
      setAmount("");
      setPriceInput("");
    } else if (orderType === "chase") {
      // Chase order: Executes immediately at mid price
      const currentMid = prices[activeSymbol]?.price || 0;
      engine.addLog(`Initiating manual CHASE ${isBuy ? "BUY" : "SELL"} for ${activeSymbol}...`, "info");
      engine.addLog(`Chase re-pricing to best quote: $${currentMid}`, "warning");
      const ok = engine.executeTrade(isBuy, activeSymbol, amtNum);
      if (ok) {
        setAmount("");
      }
    } else if (orderType === "twap") {
      const slices = parseInt(twapSlicesInput) || 5;
      engine.addLog(`Spawning TWAP Agent to execute ${amtNum} ${activeSymbol} in ${slices} slices.`, "success");
      
      // Spawn TWAP rule directly
      engine.addRule({
        type: "twap",
        symbol: activeSymbol,
        params: {
          twapTotalAmount: amtNum,
          twapRemainingSlices: slices,
          twapSliceAmount: amtNum / slices,
          twapIsBuy: isBuy
        }
      });
      setAmount("");
    }
  };

  // Pre-fill fields from AI suggestion click
  const handleExecuteSuggestion = (suggestionIsBuy: boolean, suggestionSymbol: string, suggestionAmount: number) => {
    setActiveSymbol(suggestionSymbol);
    setIsBuy(suggestionIsBuy);
    setAmount(suggestionAmount.toString());
    setOrderType("market");
    engine.addLog(`AI Suggestion loaded: ${suggestionIsBuy ? "BUY" : "SELL"} ${suggestionAmount} ${suggestionSymbol}`, "info");
  };

  // Generate chart data based on price
  const activePriceObj = prices[activeSymbol];
  const activePrice = activePriceObj?.price || 0;
  const activeChange = activePriceObj?.change24h || 0;



  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Pane 1: Selected Ticker stats / Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart View */}
        <div className="lg:col-span-2 bg-card/45 backdrop-blur-md border border-border rounded-2xl p-5 flex flex-col justify-between shadow-lg h-[450px]">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-bold font-display uppercase tracking-tight">
                  {activeSymbol} Live Price Trail
                </h3>
              </div>
              <div className="flex gap-2">
                {Object.keys(prices).filter(s => s !== "USDC").map(sym => (
                  <button
                    key={sym}
                    onClick={() => setActiveSymbol(sym)}
                    className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase transition-colors ${
                      activeSymbol === sym 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted/80 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-mono font-black tracking-tighter text-foreground">${activePrice.toLocaleString(undefined, { minimumFractionDigits: activeSymbol === "SNAP" ? 4 : 2 })}</span>
              <span className={`text-xs font-bold font-mono ${activeChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                {activeChange >= 0 ? "+" : ""}{activeChange.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="flex-1 w-full min-h-0 relative mt-2">
            <TradingViewChart activeSymbol={activeSymbol} />
          </div>
        </div>

        {/* Signals Column */}
        <div className="h-[450px]">
          <AiSuggestions prices={prices} onExecuteSuggestion={handleExecuteSuggestion} />
        </div>

      </div>

      {/* Pane 2: Order Entry & Positions & Staking details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Manual Order Entry */}
        <div className="bg-card/45 backdrop-blur-md border border-border rounded-2xl p-5 flex flex-col justify-between shadow-lg h-full min-h-[400px]">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
              <h3 className="font-bold font-display uppercase tracking-tight flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Order Entry
              </h3>
              <div className="flex bg-muted rounded-lg p-0.5 border border-border text-[10px] font-mono font-bold uppercase">
                <button
                  onClick={() => setIsBuy(true)}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    isBuy ? 'bg-green-500 text-white' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setIsBuy(false)}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    !isBuy ? 'bg-red-500 text-white' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sell
                </button>
              </div>
            </div>

            {/* Order Type Tabs */}
            <div className="flex bg-muted rounded-xl p-1 border border-border mb-5">
              {(["market", "limit", "chase", "twap"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
                    orderType === type 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Amount ({activeSymbol})</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-primary font-mono text-sm"
                />
              </div>

              {orderType === "limit" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Limit Price (USDC)</label>
                  <input
                    type="number"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder={activePrice.toString()}
                    className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-primary font-mono text-sm"
                  />
                </div>
              )}

              {orderType === "twap" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Slices Count</label>
                  <input
                    type="number"
                    value={twapSlicesInput}
                    onChange={(e) => setTwapSlicesInput(e.target.value)}
                    placeholder="5"
                    className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-primary font-mono text-sm"
                  />
                </div>
              )}

              {orderType === "chase" && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border/20 flex gap-2 items-start text-xs text-muted-foreground">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                  <p className="leading-relaxed">
                    Chase orders automatically update price triggers to execute at the best available bid/ask spread until fully filled.
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 mt-6 ${
              isBuy
                ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg hover:shadow-green-500/25'
                : 'bg-red-500 text-white hover:bg-red-600 shadow-lg hover:shadow-red-500/25'
            }`}
          >
            {isBuy ? "Execute Buy" : "Execute Sell"}
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Positions & Account Summary */}
        <div className="lg:col-span-2 h-full min-h-[400px]">
          <PositionsPane engine={engine} balances={balances} prices={prices} />
        </div>

      </div>

      {/* Strategy Controllers & Logs */}
      <div className="border-t border-border/40 pt-6">
        <AgentController engine={engine} rules={rules} logs={logs} prices={prices} />
      </div>

    </div>
  );
};
