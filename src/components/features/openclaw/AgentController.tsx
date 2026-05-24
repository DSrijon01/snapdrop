"use client";

import React, { useState } from "react";
import { Play, Square, Plus, Trash2, ToggleLeft, ToggleRight, ListTodo, FileText, ChevronRight } from "lucide-react";
import { AgentExecutionEngine, AgentRule, LogEntry, TokenPrice } from "./AgentExecutionEngine";

interface AgentControllerProps {
  engine: AgentExecutionEngine;
  rules: AgentRule[];
  logs: LogEntry[];
  prices: Record<string, TokenPrice>;
}

export const AgentController: React.FC<AgentControllerProps> = ({ engine, rules, logs, prices }) => {
  const [ruleType, setRuleType] = useState<"grid" | "twap" | "rebalance">("grid");
  const [symbol, setSymbol] = useState("SOL");
  
  // Grid State
  const [gridBuyPct, setGridBuyPct] = useState("5");
  const [gridSellPct, setGridSellPct] = useState("10");
  const [gridAmount, setGridAmount] = useState("1");

  // TWAP State
  const [twapAmount, setTwapAmount] = useState("10");
  const [twapSlices, setTwapSlices] = useState("5");
  const [twapIsBuy, setTwapIsBuy] = useState(true);

  // Rebalance State
  const [weightSol, setWeightSol] = useState("50");
  const [weightSsSol, setWeightSsSol] = useState("30");
  const [weightUsdc, setWeightUsdc] = useState("20");

  const handleAddRule = () => {
    if (ruleType === "grid") {
      const currentPrice = prices[symbol]?.price || 0;
      engine.addRule({
        type: "grid",
        symbol,
        params: {
          gridBasePrice: currentPrice,
          buyTriggerPct: parseFloat(gridBuyPct) || 5,
          sellTriggerPct: parseFloat(gridSellPct) || 10,
          tradeAmount: parseFloat(gridAmount) || 1
        }
      });
    } else if (ruleType === "twap") {
      const amt = parseFloat(twapAmount) || 10;
      const slices = parseInt(twapSlices) || 5;
      engine.addRule({
        type: "twap",
        symbol,
        params: {
          twapTotalAmount: amt,
          twapRemainingSlices: slices,
          twapSliceAmount: amt / slices,
          twapIsBuy
        }
      });
    } else if (ruleType === "rebalance") {
      const wSol = parseFloat(weightSol) || 0;
      const wSsSol = parseFloat(weightSsSol) || 0;
      const wUsdc = parseFloat(weightUsdc) || 0;
      
      const sum = wSol + wSsSol + wUsdc;
      if (sum !== 100) {
        alert(`Target weights must sum to 100%! Current sum: ${sum}%`);
        return;
      }

      engine.addRule({
        type: "rebalance",
        symbol: "SOL", // Arbitrary since it rebalances the whole portfolio
        params: {
          targetWeights: {
            SOL: wSol,
            ssSOL: wSsSol,
            USDC: wUsdc
          }
        }
      });
    }
  };

  const isEngineRunning = engine.isRunning();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Pane A: Agent Strategy Creation & Control */}
      <div className="bg-card/45 backdrop-blur-md border border-border rounded-2xl p-5 flex flex-col justify-between shadow-lg">
        <div>
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-border">
            <h3 className="font-bold font-display uppercase tracking-tight flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-primary" />
              Configure AI Agents
            </h3>
            
            {/* Run / Stop Button */}
            <button
              onClick={() => isEngineRunning ? engine.stop() : engine.start()}
              className={`px-4 py-1.5 rounded-full font-mono text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 border ${
                isEngineRunning
                  ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                  : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
              }`}
            >
              {isEngineRunning ? (
                <><Square className="w-3 h-3 fill-current" /> Stop Engine</>
              ) : (
                <><Play className="w-3 h-3 fill-current" /> Run Engine</>
              )}
            </button>
          </div>

          {/* Strategy Select */}
          <div className="flex bg-muted rounded-xl p-1 border border-border mb-5">
            {(["grid", "twap", "rebalance"] as const).map(type => (
              <button
                key={type}
                onClick={() => setRuleType(type)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${
                  ruleType === type 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Inputs Section */}
          <div className="space-y-4">
            {ruleType !== "rebalance" && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Target Token</label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-primary font-mono text-sm"
                >
                  {Object.keys(prices).filter(s => s !== "USDC").map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Grid Form */}
            {ruleType === "grid" && (
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground font-mono">Buy Trigger (-%)</label>
                  <input
                    type="number"
                    value={gridBuyPct}
                    onChange={(e) => setGridBuyPct(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-primary text-center font-mono text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground font-mono">Sell Trigger (+%)</label>
                  <input
                    type="number"
                    value={gridSellPct}
                    onChange={(e) => setGridSellPct(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-primary text-center font-mono text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground font-mono">Order Size</label>
                  <input
                    type="number"
                    value={gridAmount}
                    onChange={(e) => setGridAmount(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-primary text-center font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {/* TWAP Form */}
            {ruleType === "twap" && (
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground font-mono">Total size</label>
                  <input
                    type="number"
                    value={twapAmount}
                    onChange={(e) => setTwapAmount(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-primary text-center font-mono text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground font-mono">Slices</label>
                  <input
                    type="number"
                    value={twapSlices}
                    onChange={(e) => setTwapSlices(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-primary text-center font-mono text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground font-mono">Direction</label>
                  <button
                    onClick={() => setTwapIsBuy(!twapIsBuy)}
                    className={`w-full py-3 rounded-xl font-bold uppercase text-xs transition-colors border ${
                      twapIsBuy 
                        ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                  >
                    {twapIsBuy ? "Buy" : "Sell"}
                  </button>
                </div>
              </div>
            )}

            {/* Rebalance Form */}
            {ruleType === "rebalance" && (
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground font-mono">SOL weight %</label>
                  <input
                    type="number"
                    value={weightSol}
                    onChange={(e) => setWeightSol(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-primary text-center font-mono text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground font-mono">ssSOL weight %</label>
                  <input
                    type="number"
                    value={weightSsSol}
                    onChange={(e) => setWeightSsSol(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-primary text-center font-mono text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground font-mono">USDC weight %</label>
                  <input
                    type="number"
                    value={weightUsdc}
                    onChange={(e) => setWeightUsdc(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-primary text-center font-mono text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleAddRule}
          className="w-full mt-6 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary-hover shadow-lg hover:shadow-primary/25 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          Deploy Agent
        </button>
      </div>

      {/* Pane B: Live Rules & Log Feeds */}
      <div className="grid grid-rows-2 gap-4 h-full">
        
        {/* Sub-Pane 1: Active Rules */}
        <div className="bg-card/45 backdrop-blur-md border border-border rounded-2xl p-5 flex flex-col h-64 overflow-hidden shadow-lg">
          <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest font-mono mb-3 block border-b border-border/30 pb-2">Active Rules ({rules.length})</span>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
            {rules.map((rule) => (
              <div key={rule.id} className="bg-background/80 border border-border/40 p-3 rounded-xl flex items-center justify-between text-xs transition-colors hover:border-primary/20">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${rule.isActive ? 'bg-green-400 animate-pulse' : 'bg-muted'}`} />
                  <div>
                    <div className="font-bold uppercase tracking-wider font-mono text-foreground">
                      {rule.type} {rule.type !== "rebalance" && `| ${rule.symbol}`}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {rule.type === "grid" && `Base: $${rule.params.gridBasePrice} | Trailing Buy/Sell: -${rule.params.buyTriggerPct}% / +${rule.params.sellTriggerPct}%`}
                      {rule.type === "twap" && `Slices Left: ${rule.params.twapRemainingSlices} | Slice Size: ${rule.params.twapSliceAmount?.toFixed(2)}`}
                      {rule.type === "rebalance" && `Weights: SOL ${rule.params.targetWeights?.SOL}% / ssSOL ${rule.params.targetWeights?.ssSOL}% / USDC ${rule.params.targetWeights?.USDC}%`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => engine.toggleRule(rule.id)}
                    className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {rule.isActive ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={() => engine.deleteRule(rule.id)}
                    className="p-1.5 hover:bg-red-500/10 hover:text-red-400 text-muted-foreground rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {rules.length === 0 && (
              <div className="text-center text-muted-foreground text-xs font-mono py-12">
                No active agent rules deployed.
              </div>
            )}
          </div>
        </div>

        {/* Sub-Pane 2: Terminal Logs */}
        <div className="bg-black/40 border border-border rounded-2xl p-5 flex flex-col h-64 overflow-hidden shadow-inner">
          <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest font-mono mb-2 block flex items-center gap-2 border-b border-border/10 pb-2">
            <FileText className="w-4 h-4 text-primary" />
            Agent execution feed
          </span>
          
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-[11px] leading-relaxed scrollbar-hide">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 items-start py-0.5 border-b border-white/[0.02] last:border-0">
                <span className="text-muted-foreground select-none shrink-0 font-medium">[{log.timestamp}]</span>
                <span className={`font-bold flex-1 ${
                  log.type === "success" ? "text-green-400" :
                  log.type === "warning" ? "text-amber-400" :
                  log.type === "error" ? "text-red-400" :
                  log.type === "trade" ? "text-blue-400" :
                  "text-muted-foreground"
                }`}>
                  {log.message}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center text-muted-foreground py-12 uppercase tracking-wider">
                Feed idle.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
