"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Zap, Bot, Sparkles, AlertCircle, TrendingUp, DollarSign, ArrowUpRight, ChevronDown, Activity, Sliders, ShieldCheck } from "lucide-react";
import { AgentExecutionEngine, TokenPrice, AgentRule, LogEntry } from "./AgentExecutionEngine";
import { PositionsPane } from "./PositionsPane";
import { AiSuggestions } from "./AiSuggestions";
import { AgentController } from "./AgentController";
import { TradingViewChart } from "./TradingViewChart";

export const MARKET_TOKENS = [
  { symbol: "SOL", name: "Solana", badge: "L1" },
  { symbol: "BTC", name: "Bitcoin", badge: "Macro" },
  { symbol: "ETH", name: "Ethereum", badge: "Macro" },
  { symbol: "JUP", name: "Jupiter", badge: "DeFi" },
  { symbol: "RAY", name: "Raydium", badge: "AMM" },
  { symbol: "BONK", name: "Bonk", badge: "Meme" },
  { symbol: "WIF", name: "dogwifhat", badge: "Meme" },
  { symbol: "RENDER", name: "Render", badge: "AI" },
  { symbol: "ssSOL", name: "Street Staked SOL", badge: "Yield" },
  { symbol: "SNAP", name: "Snapdrop", badge: "Platform" },
];

export const TradingTerminal: React.FC = () => {
  // Instantiate the execution engine once
  const engine = useMemo(() => new AgentExecutionEngine(), []);

  // Active Tab state: Tracking vs. Configuration
  const [activeTab, setActiveTab] = useState<"tracking" | "configuration">("tracking");

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
      const sliceAmt = amtNum / slices;
      engine.addLog(`Started TWAP order: ${amtNum} ${activeSymbol} split into ${slices} slices (${sliceAmt.toFixed(4)}/slice).`, "info");
      
      // Execute 1st slice immediately
      engine.executeTrade(isBuy, activeSymbol, sliceAmt);
      
      // Schedule subsequent slices in the engine logs
      let executedSlices = 1;
      const interval = setInterval(() => {
        if (executedSlices < slices && engine.isRunning()) {
          executedSlices++;
          engine.executeTrade(isBuy, activeSymbol, sliceAmt);
          engine.addLog(`TWAP Slice ${executedSlices}/${slices} executed: ${sliceAmt.toFixed(4)} ${activeSymbol}.`, "info");
        } else {
          clearInterval(interval);
          if (executedSlices >= slices) {
            engine.addLog(`TWAP order of ${amtNum} ${activeSymbol} completed.`, "success");
          }
        }
      }, 4000);
      setAmount("");
    }
  };

  // Handle execution from AI suggestions
  const handleExecuteSuggestion = (suggestionIsBuy: boolean, suggestionSymbol: string, suggestionAmount: number) => {
    setActiveSymbol(suggestionSymbol);
    setIsBuy(suggestionIsBuy);
    setAmount(suggestionAmount.toString());
    setActiveTab("configuration");
    engine.addLog(`AI Suggestion loaded: ${suggestionIsBuy ? "BUY" : "SELL"} ${suggestionAmount} ${suggestionSymbol}`, "info");
  };

  // Generate chart data based on price
  const activePriceObj = prices[activeSymbol];
  const activePrice = activePriceObj?.price || 0;
  const activeChange = activePriceObj?.change24h || 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
      
      {/* Top Tab Bar: Tracking vs Configuration */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md border border-border p-2 rounded-2xl shadow-sm">
        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          {/* Tracking Tab Button */}
          <button
            onClick={() => setActiveTab("tracking")}
            className={`flex-1 sm:flex-initial px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-display text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border ${
              activeTab === "tracking"
                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Tracking</span>
            {rules.length > 0 && (
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-black ${
                activeTab === "tracking" ? "bg-black/20 text-white" : "bg-primary/20 text-primary"
              }`}>
                {rules.length}
              </span>
            )}
          </button>

          {/* Configuration Tab Button */}
          <button
            onClick={() => setActiveTab("configuration")}
            className={`flex-1 sm:flex-initial px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-display text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border ${
              activeTab === "configuration"
                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Configuration</span>
          </button>
        </div>

        {/* Live Status Pill / Engine Indicator */}
        <div className="hidden sm:flex items-center gap-3 px-3.5 py-1.5 bg-muted/40 rounded-xl border border-border/50 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-emerald-500 font-bold uppercase">Solana Engine Active</span>
          </span>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-muted-foreground">
            Active: <strong className="text-foreground">{activeSymbol}</strong> (${activePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })})
          </span>
        </div>
      </div>

      {/* -----------------------------------------------------------------
          TAB 1: TRACKING & LIVE MONITOR
          ----------------------------------------------------------------- */}
      {activeTab === "tracking" && (
        <div className="space-y-4">
          
          {/* Pane 1: Selected Ticker stats / Chart Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Chart View */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-sm min-h-[390px] overflow-hidden max-w-full">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-2.5 mb-3 gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <TrendingUp className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-bold font-display uppercase tracking-tight text-foreground text-sm sm:text-base truncate">
                        Whole Market Live Price Trail
                      </h3>
                    </div>
                  </div>

                  {/* Market Token Selector Dropdown */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select
                        value={activeSymbol}
                        onChange={(e) => setActiveSymbol(e.target.value)}
                        className="bg-muted/40 hover:bg-muted border border-border text-foreground text-xs font-mono font-bold rounded-xl px-3 py-1.5 pr-8 appearance-none focus:outline-none focus:border-primary shadow-sm cursor-pointer transition-colors"
                      >
                        {MARKET_TOKENS.map((token) => {
                          const p = prices[token.symbol]?.price;
                          return (
                            <option key={token.symbol} value={token.symbol} className="bg-popover text-popover-foreground">
                              {token.symbol} — {token.name} ({token.badge}) {p ? `$${p >= 10 ? p.toFixed(1) : p.toFixed(token.symbol === "BONK" ? 6 : token.symbol === "SNAP" ? 4 : 2)}` : ""}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-mono font-black tracking-tighter text-foreground">
                      ${activePrice.toLocaleString(undefined, { minimumFractionDigits: activeSymbol === "BONK" ? 6 : activeSymbol === "SNAP" ? 4 : 2 })}
                    </span>
                    <span className={`text-xs font-bold font-mono ${activeChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {activeChange >= 0 ? "+" : ""}{activeChange.toFixed(2)}%
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">24h</span>
                  </div>

                  {/* Quick Select Chips */}
                  <div className="hidden sm:flex items-center gap-1 overflow-x-auto pb-0.5">
                    {["SOL", "BTC", "ETH", "JUP", "BONK", "ssSOL", "SNAP"].map((sym) => (
                      <button
                        key={sym}
                        onClick={() => setActiveSymbol(sym)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase transition-all ${
                          activeSymbol === sym 
                            ? 'bg-primary text-primary-foreground shadow-sm' 
                            : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full min-h-0 relative mt-1">
                <TradingViewChart activeSymbol={activeSymbol} />
              </div>
            </div>

            {/* Signals Column */}
            <div className="h-[390px]">
              <AiSuggestions prices={prices} onExecuteSuggestion={handleExecuteSuggestion} />
            </div>

          </div>

          {/* Positions & Account Summary */}
          <div>
            <PositionsPane engine={engine} balances={balances} prices={prices} />
          </div>

          {/* Active Deployed Rules & AI Rationale Feed */}
          <div>
            <AgentController 
              engine={engine} 
              rules={rules} 
              logs={logs} 
              prices={prices} 
              viewMode="tracking"
              onSwitchToConfig={() => setActiveTab("configuration")}
            />
          </div>

        </div>
      )}

      {/* -----------------------------------------------------------------
          TAB 2: CONFIGURATION & SETUP
          ----------------------------------------------------------------- */}
      {activeTab === "configuration" && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left 2 Cols: AI Model Selector & Strategy Automation Config */}
            <div className="lg:col-span-2">
              <AgentController 
                engine={engine} 
                rules={rules} 
                logs={logs} 
                prices={prices} 
                viewMode="config"
                onRuleDeployed={() => setActiveTab("tracking")}
              />
            </div>

            {/* Right 1 Col: Manual Order Entry Console & Safeguards */}
            <div className="space-y-6">
              
              {/* Manual Order Entry */}
              <div className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between shadow-sm min-h-[420px]">
                <div>
                  <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
                    <h3 className="font-bold font-display uppercase tracking-tight flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Order Entry Console
                    </h3>
                    <div className="flex bg-muted rounded-lg p-0.5 border border-border text-[10px] font-mono font-bold uppercase">
                      <button
                        onClick={() => setIsBuy(true)}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          isBuy ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => setIsBuy(false)}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          !isBuy ? 'bg-rose-600 text-white' : 'text-muted-foreground hover:text-foreground'
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
                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
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
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Amount ({activeSymbol})</label>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Bal: {balances[activeSymbol] !== undefined ? balances[activeSymbol].toLocaleString(undefined, { maximumFractionDigits: activeSymbol === "BONK" ? 0 : 4 }) : "0.00"}
                        </span>
                      </div>
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
                  className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer ${
                    isBuy
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg hover:shadow-emerald-600/25'
                      : 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg hover:shadow-rose-600/25'
                  }`}
                >
                  {isBuy ? `Execute Buy (${activeSymbol})` : `Execute Sell (${activeSymbol})`}
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {/* Strategy Deployment Safeguards Card */}
              <div className="bg-card/60 backdrop-blur-md border border-border rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold font-display uppercase tracking-wide text-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Execution Safeguards</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-2.5 font-mono leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Direct Devnet/Mainnet RPC transaction routing with zero middleman custody.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Autonomous stop-loss & take-profit grid boundaries verified every 5s.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Real-time fallback to Chase repricing on volatile price slippage.</span>
                  </li>
                </ul>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
