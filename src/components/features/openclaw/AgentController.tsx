"use client";

import React, { useState } from "react";
import { 
  Play, Square, Plus, Trash2, ToggleLeft, ToggleRight, 
  FileText, Cpu, Sparkles, Info, Check, Shield, Activity, ChevronDown, Zap
} from "lucide-react";
import { AgentExecutionEngine, AgentRule, LogEntry, TokenPrice } from "./AgentExecutionEngine";

export interface AIModel {
  id: "DeepSeek" | "Kimi3" | "Claude" | "GPT 5.6";
  name: string;
  badge: string;
  version: string;
  tagline: string;
  winRate: number;
  pnl: string;
  color: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  provider: string;
  status: "LIVE" | "ACTIVE" | "READY";
}

export const AI_MODELS: AIModel[] = [
  {
    id: "DeepSeek",
    name: "DeepSeek 4.5",
    badge: "DS 4.5",
    version: "v4.5-Quant",
    tagline: "Deep Reasoning & High-Frequency Quantitative Execution",
    winRate: 68.4,
    pnl: "+14.2%",
    color: "#00E5FF",
    bgGradient: "from-cyan-500/20 via-cyan-500/10 to-transparent",
    borderColor: "border-cyan-500/40",
    textColor: "text-cyan-400",
    provider: "DeepSeek AI Engine",
    status: "LIVE",
  },
  {
    id: "Kimi3",
    name: "Kimi 3",
    badge: "Kimi 3",
    version: "K1.5-LongContext",
    tagline: "Ultra-Long Context Window & Macro Sentiment Analysis",
    winRate: 64.8,
    pnl: "+9.8%",
    color: "#A855F7",
    bgGradient: "from-purple-500/20 via-purple-500/10 to-transparent",
    borderColor: "border-purple-500/40",
    textColor: "text-purple-400",
    provider: "Moonshot AI Engine",
    status: "LIVE",
  },
  {
    id: "Claude",
    name: "Claude 3.7",
    badge: "Claude 3.7",
    version: "3.7-Sonnet",
    tagline: "Hybrid Reasoning & Risk-Aware Portfolio Management",
    winRate: 71.2,
    pnl: "+18.5%",
    color: "#F97316",
    bgGradient: "from-orange-500/20 via-orange-500/10 to-transparent",
    borderColor: "border-orange-500/40",
    textColor: "text-orange-400",
    provider: "Anthropic AI Engine",
    status: "LIVE",
  },
  {
    id: "GPT 5.6",
    name: "GPT 5.6",
    badge: "GPT 5.6",
    version: "v5.6-Turbo",
    tagline: "Multi-Modal Pattern Recognition & Order Routing",
    winRate: 66.9,
    pnl: "+12.1%",
    color: "#22C55E",
    bgGradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
    borderColor: "border-emerald-500/40",
    textColor: "text-emerald-400",
    provider: "OpenAI Engine",
    status: "LIVE",
  },
];

export interface TradingStrategy {
  id: string;
  name: string;
  shortDesc: string;
  howItWorks: string;
  category: "Quantitative" | "Execution" | "AI & ML" | "Statistical";
  defaultBuyTrigger: number;
  defaultSellTrigger: number;
  defaultAmount: number;
}

export const TRADING_STRATEGIES: TradingStrategy[] = [
  {
    id: "pairs_trading",
    name: "1. Pairs Trading",
    shortDesc: "Trades two correlated instruments simultaneously to profit from relationship deviations.",
    howItWorks: "Trades two correlated instruments simultaneously. It goes long on one asset and short on the other to profit from deviations from their historical relationship, expecting the correlation to eventually resume.",
    category: "Statistical",
    defaultBuyTrigger: 3,
    defaultSellTrigger: 6,
    defaultAmount: 1,
  },
  {
    id: "scalping",
    name: "2. Scalping",
    shortDesc: "Captures minimal price differences over very short timeframes via order flow analysis.",
    howItWorks: "Involves making numerous small trades to capture minimal price differences over a short time. For example, tape reading is used to analyze order flow and timing, enabling scalpers to profit from very brief price fluctuations.",
    category: "Quantitative",
    defaultBuyTrigger: 1.5,
    defaultSellTrigger: 3,
    defaultAmount: 0.5,
  },
  {
    id: "smart_order_routing",
    name: "3. Smart Order Routing Trading",
    shortDesc: "Splits & routes orders dynamically across exchanges for optimal liquidity.",
    howItWorks: "Breaks large orders into smaller ones and routes them to different exchanges for the best available prices. An adaptive version adjusts routing dynamically based on real-time market conditions and liquidity.",
    category: "Execution",
    defaultBuyTrigger: 2,
    defaultSellTrigger: 4,
    defaultAmount: 2,
  },
  {
    id: "market_making",
    name: "4. Market-Making Trading",
    shortDesc: "Provides liquidity to profit from bid-ask spreads and statistical arbitrage.",
    howItWorks: "Buys and sells securities to provide liquidity in the market. It often employs statistical arbitrage to identify and exploit short-term price discrepancies between correlated securities.",
    category: "Statistical",
    defaultBuyTrigger: 1,
    defaultSellTrigger: 2,
    defaultAmount: 1,
  },
  {
    id: "momentum",
    name: "5. Momentum Strategy",
    shortDesc: "Rides strong price trends using RSI and trend-following indicators.",
    howItWorks: "Capitalizes on the continuation of existing price trends. Strategies like using the Relative Strength Index (RSI) or trend-following indicators help traders ride strong market movements in a specific direction.",
    category: "Quantitative",
    defaultBuyTrigger: 4,
    defaultSellTrigger: 8,
    defaultAmount: 1.5,
  },
  {
    id: "twap",
    name: "6. Time-Weighted Average Price (TWAP)",
    shortDesc: "Splits trade evenly over a set time period to minimize market impact.",
    howItWorks: "Splits the trade evenly over a set time period regardless of volume, aiming to achieve an average execution price close to the start-to-finish (arrival) price.",
    category: "Execution",
    defaultBuyTrigger: 2.5,
    defaultSellTrigger: 5,
    defaultAmount: 5,
  },
  {
    id: "vwap",
    name: "7. Volume-Weighted Average Price (VWAP)",
    shortDesc: "Executes orders weighted by historical volume profiles and market impact.",
    howItWorks: "Divides orders into smaller trades executed throughout the day at the volume-weighted average price. It takes into account historical volume profiles and market impact to optimize execution, with strategies like Implementation Shortfall VWAP aiming for minimal deviation from the VWAP.",
    category: "Execution",
    defaultBuyTrigger: 2.5,
    defaultSellTrigger: 5.5,
    defaultAmount: 5,
  },
  {
    id: "seasonality",
    name: "8. Seasonality Trading",
    shortDesc: "Identifies recurring market patterns based on periodic time factors.",
    howItWorks: "Identifies recurring market patterns based on time factors (year, month, week, etc.). For example, the Calendar Spread Strategy exploits seasonal trends by taking positions in futures contracts or options with different expiration dates.",
    category: "Statistical",
    defaultBuyTrigger: 5,
    defaultSellTrigger: 10,
    defaultAmount: 2,
  },
  {
    id: "volatility",
    name: "9. Volatility Trading",
    shortDesc: "Captures significant price movements after periods of low volatility.",
    howItWorks: "Focuses on profiting from changes in market volatility by using options, futures, or other derivatives. An example is the Volatility Breakout strategy, which aims to capture significant price movements after periods of low volatility.",
    category: "Quantitative",
    defaultBuyTrigger: 6,
    defaultSellTrigger: 12,
    defaultAmount: 2,
  },
  {
    id: "machine_learning",
    name: "10. Machine Learning-Based Strategy",
    shortDesc: "Leverages Neural Networks and Random Forests to uncover complex data patterns.",
    howItWorks: "Leverages machine learning algorithms (e.g., Neural Networks, Random Forests, Support Vector Machines) to analyze large datasets and uncover complex patterns, aiding in making data-driven trading decisions.",
    category: "AI & ML",
    defaultBuyTrigger: 3.5,
    defaultSellTrigger: 7.5,
    defaultAmount: 1.5,
  },
  {
    id: "pattern_recognition",
    name: "11. Pattern Recognition Strategy",
    shortDesc: "Identifies recurring chart patterns such as triangles, head & shoulders, or flags.",
    howItWorks: "Utilizes advanced pattern recognition techniques to identify and exploit recurring chart patterns such as triangles, head and shoulders, or flags.",
    category: "Quantitative",
    defaultBuyTrigger: 4,
    defaultSellTrigger: 9,
    defaultAmount: 1,
  },
  {
    id: "sentiment_analysis",
    name: "12. Sentiment Analysis Trading",
    shortDesc: "Analyzes social media, news, and text data via NLP to gauge market impact.",
    howItWorks: "Uses natural language processing and machine learning to analyze social media, news, and other textual data, gauging market sentiment and its potential impact on prices.",
    category: "AI & ML",
    defaultBuyTrigger: 3,
    defaultSellTrigger: 7,
    defaultAmount: 1.5,
  },
  {
    id: "deep_rl",
    name: "13. Deep Reinforcement Learning Strategy",
    shortDesc: "Trains autonomous agents via trial & error in dynamic market conditions.",
    howItWorks: "Applies deep learning combined with reinforcement learning to train agents that learn and adapt trading strategies through trial and error in response to changing market conditions.",
    category: "AI & ML",
    defaultBuyTrigger: 5,
    defaultSellTrigger: 10,
    defaultAmount: 2,
  },
  {
    id: "adaptive",
    name: "14. Adaptive Strategies",
    shortDesc: "Dynamically adjusts rules and parameters based on current market dynamics.",
    howItWorks: "Dynamically adjust their parameters or rules based on current market conditions, ensuring that the trading approach remains effective as market dynamics evolve.",
    category: "Quantitative",
    defaultBuyTrigger: 4,
    defaultSellTrigger: 8,
    defaultAmount: 1,
  },
  {
    id: "genetic_algorithms",
    name: "15. Genetic Algorithms Strategy",
    shortDesc: "Evolves strategy parameters via natural selection mutation and crossover.",
    howItWorks: "Uses genetic programming principles (such as mutation and crossover) to evolve and optimize trading strategies over time, aiming to discover robust and adaptive approaches by simulating the process of natural selection.",
    category: "AI & ML",
    defaultBuyTrigger: 4.5,
    defaultSellTrigger: 9.5,
    defaultAmount: 1,
  },
];

interface AgentControllerProps {
  engine: AgentExecutionEngine;
  rules: AgentRule[];
  logs: LogEntry[];
  prices: Record<string, TokenPrice>;
}

export const AgentController: React.FC<AgentControllerProps> = ({ engine, rules, logs, prices }) => {
  // Selected Model State (DeepSeek, Kimi3, Claude, GPT 5.6)
  const [selectedModelId, setSelectedModelId] = useState<"DeepSeek" | "Kimi3" | "Claude" | "GPT 5.6">("DeepSeek");
  
  // Selected Strategy State (from 15 strategies)
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("momentum");
  
  // Parameter State
  const [symbol, setSymbol] = useState("SOL");
  const [buyTriggerPct, setBuyTriggerPct] = useState("4");
  const [sellTriggerPct, setSellTriggerPct] = useState("8");
  const [tradeAmount, setTradeAmount] = useState("1.5");

  // Selected Model Object
  const selectedModel = AI_MODELS.find(m => m.id === selectedModelId) || AI_MODELS[0];
  
  // Selected Strategy Object
  const selectedStrategy = TRADING_STRATEGIES.find(s => s.id === selectedStrategyId) || TRADING_STRATEGIES[4];

  // Handle Strategy Selection Change
  const handleStrategyChange = (stratId: string) => {
    setSelectedStrategyId(stratId);
    const strat = TRADING_STRATEGIES.find(s => s.id === stratId);
    if (strat) {
      setBuyTriggerPct(strat.defaultBuyTrigger.toString());
      setSellTriggerPct(strat.defaultSellTrigger.toString());
      setTradeAmount(strat.defaultAmount.toString());
    }
  };

  const handleAddRule = () => {
    const currentPrice = prices[symbol]?.price || 0;
    const buyPct = parseFloat(buyTriggerPct) || 5;
    const sellPct = parseFloat(sellTriggerPct) || 10;
    const amt = parseFloat(tradeAmount) || 1;

    engine.addRule({
      type: "grid",
      symbol,
      model: selectedModel.id,
      modelName: selectedModel.name,
      strategyId: selectedStrategy.id,
      strategyName: selectedStrategy.name,
      howItWorks: selectedStrategy.howItWorks,
      params: {
        gridBasePrice: currentPrice,
        buyTriggerPct: buyPct,
        sellTriggerPct: sellPct,
        tradeAmount: amt
      }
    });

    engine.addLog(`[${selectedModel.name}] Active rule configured using ${selectedStrategy.name} strategy for ${symbol}.`, "success");
  };

  const isEngineRunning = engine.isRunning();

  return (
    <div className="space-y-6">
      
      {/* -------------------------------------------------------------
          TOP BAR: AI MODEL SELECTION PILLS (Tradermap Reference UI)
          ------------------------------------------------------------- */}
      <div className="bg-card/60 backdrop-blur-md border border-border rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Model Picker Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 mr-2">
            <Cpu className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-mono font-black uppercase tracking-wider text-muted-foreground">Select AI Model:</span>
          </div>

          {AI_MODELS.map((model) => {
            const isSelected = selectedModelId === model.id;
            return (
              <button
                key={model.id}
                onClick={() => setSelectedModelId(model.id)}
                className={`relative px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer border ${
                  isSelected
                    ? `${model.borderColor} bg-card text-foreground shadow-md ring-1 ring-primary/40`
                    : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: model.color }} />
                <span>{model.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                  isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {model.badge}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary ml-1" />}
              </button>
            );
          })}
        </div>

        {/* Selected Model Performance Snippet */}
        <div className="flex items-center gap-4 bg-muted/40 border border-border/60 px-4 py-2 rounded-xl w-full md:w-auto justify-between md:justify-end">
          <div>
            <div className="text-[9px] font-mono uppercase text-muted-foreground font-black">Active Win Rate</div>
            <div className="text-xs font-black font-mono text-green-400">{selectedModel.winRate}%</div>
          </div>
          <div className="h-6 w-px bg-border/60" />
          <div>
            <div className="text-[9px] font-mono uppercase text-muted-foreground font-black">30D Return</div>
            <div className="text-xs font-black font-mono text-primary">{selectedModel.pnl}</div>
          </div>
          <div className="h-6 w-px bg-border/60" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            <span className="text-[10px] font-mono font-black uppercase text-green-400">{selectedModel.status}</span>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          MAIN PANES GRID
          ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pane A: MODEL SELECTION & TRADING STRATEGY CONFIGURATION */}
        <div className="bg-card/45 backdrop-blur-md border border-border rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div>
            
            {/* Header with Run / Stop Engine Controls */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
              <h3 className="font-bold font-display uppercase tracking-tight flex items-center gap-2 text-foreground">
                <Sparkles className="w-5 h-5 text-primary" />
                Model Selection & Strategy Setup
              </h3>
              
              {/* Engine Toggle */}
              <button
                onClick={() => isEngineRunning ? engine.stop() : engine.start()}
                className={`px-4 py-1.5 rounded-full font-mono text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 border cursor-pointer ${
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

            {/* Selected Model Header Card */}
            <div className={`p-4 rounded-xl border ${selectedModel.borderColor} bg-gradient-to-r ${selectedModel.bgGradient} mb-5 flex items-center justify-between`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedModel.color }} />
                  <span className="font-bold font-display text-sm uppercase tracking-wide text-foreground">{selectedModel.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-background/60 border border-border font-bold text-muted-foreground">
                    {selectedModel.version}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{selectedModel.tagline}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-muted-foreground uppercase font-black block">Engine</span>
                <span className="text-xs font-bold font-mono text-foreground">{selectedModel.provider}</span>
              </div>
            </div>

            {/* 1. TRADING STRATEGY SELECTOR (Requirement 2 & Image 2) */}
            <div className="space-y-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-muted-foreground font-mono flex items-center justify-between">
                  <span>Select Trading Strategy (15 Strategies)</span>
                  <span className="text-primary">{selectedStrategy.category}</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedStrategyId}
                    onChange={(e) => handleStrategyChange(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 pr-10 outline-none focus:border-primary font-mono text-xs font-bold text-foreground appearance-none cursor-pointer"
                  >
                    {TRADING_STRATEGIES.map((strat) => (
                      <option key={strat.id} value={strat.id}>
                        {strat.name} — [{strat.category}]
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* 2. HOW IT WORKS CARD (Requirement 2 - Explain Strategy Mechanics) */}
              <div className="p-4 bg-muted/30 border border-border/70 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold font-display uppercase tracking-wide text-primary">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>How It Works: {selectedStrategy.name}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed font-sans font-medium">
                  {selectedStrategy.howItWorks}
                </p>
              </div>

              {/* 3. TARGET TOKEN & PARAMETERS */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground font-mono">Target Token</label>
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-primary font-mono text-xs font-bold"
                  >
                    {Object.keys(prices).filter(s => s !== "USDC").map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground font-mono">Buy Trigger (-%)</label>
                  <input
                    type="number"
                    value={buyTriggerPct}
                    onChange={(e) => setBuyTriggerPct(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-primary text-center font-mono text-xs font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground font-mono">Sell Trigger (+%)</label>
                  <input
                    type="number"
                    value={sellTriggerPct}
                    onChange={(e) => setSellTriggerPct(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-primary text-center font-mono text-xs font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground font-mono">Order Size</label>
                  <input
                    type="number"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3 outline-none focus:border-primary text-center font-mono text-xs font-bold"
                  />
                </div>
              </div>

            </div>
          </div>

          <button
            onClick={handleAddRule}
            className="w-full mt-6 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary-hover shadow-lg hover:shadow-primary/25 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer font-display"
          >
            <Plus className="w-4 h-4" />
            Deploy Agent Rule ({selectedModel.name} | {selectedStrategy.name})
          </button>
        </div>

        {/* Pane B: LIVE RULES & AI EXECUTION FEED */}
        <div className="grid grid-rows-2 gap-4 h-full">
          
          {/* Sub-Pane 1: Active Rules (Showing AI Model & Trading Strategy in Action) */}
          <div className="bg-card/45 backdrop-blur-md border border-border rounded-2xl p-5 flex flex-col h-72 overflow-hidden shadow-lg">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
              <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest font-mono flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary" />
                Active Deployed Rules ({rules.length})
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">Model & Strategy Verified</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-hide">
              {rules.map((rule) => {
                const modelBadge = rule.modelName || rule.model || "DeepSeek 4.5";
                const stratName = rule.strategyName || rule.type.toUpperCase();

                return (
                  <div key={rule.id} className="bg-background/80 border border-border/60 p-3.5 rounded-xl space-y-2 transition-colors hover:border-primary/40">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${rule.isActive ? 'bg-green-400 animate-pulse' : 'bg-muted'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black uppercase tracking-wider font-mono text-xs text-foreground">
                              {stratName}
                            </span>
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold">
                              {modelBadge}
                            </span>
                            <span className="text-[9px] font-mono text-muted-foreground font-bold uppercase">
                              [{rule.symbol}]
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => engine.toggleRule(rule.id)}
                          className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title={rule.isActive ? "Pause Rule" : "Activate Rule"}
                        >
                          {rule.isActive ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button 
                          onClick={() => engine.deleteRule(rule.id)}
                          className="p-1 hover:bg-red-500/10 hover:text-red-400 text-muted-foreground rounded-lg transition-colors cursor-pointer"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Strategy How It Works Summary */}
                    {rule.howItWorks && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed font-sans font-medium pl-5 border-l-2 border-primary/20">
                        {rule.howItWorks}
                      </p>
                    )}

                    <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-4 pt-1 border-t border-border/20">
                      <span>Base Price: <strong className="text-foreground">${rule.params.gridBasePrice?.toFixed(2)}</strong></span>
                      <span>Buy: <strong className="text-green-400">-{rule.params.buyTriggerPct}%</strong></span>
                      <span>Sell: <strong className="text-red-400">+{rule.params.sellTriggerPct}%</strong></span>
                      <span>Size: <strong className="text-foreground">{rule.params.tradeAmount} {rule.symbol}</strong></span>
                    </div>
                  </div>
                );
              })}
              
              {rules.length === 0 && (
                <div className="text-center text-muted-foreground text-xs font-mono py-12 space-y-2">
                  <p className="font-bold">No active agent rules deployed.</p>
                  <p className="text-[10px] opacity-70">Select an AI Model (DeepSeek, Kimi3, Claude, GPT 5.6) and Trading Strategy above to deploy rules.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sub-Pane 2: AI Execution & Rationale Feed (Tradermap Image 3 Reference) */}
          <div className="bg-black/50 border border-border rounded-2xl p-5 flex flex-col h-72 overflow-hidden shadow-inner">
            <div className="flex items-center justify-between border-b border-border/20 pb-2 mb-2">
              <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest font-mono flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                {selectedModel.name} AI Rationale & Execution Feed
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                <span className="text-[10px] font-mono font-bold text-green-400 uppercase">Live Engine</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px] leading-relaxed scrollbar-hide">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2 items-start py-1 border-b border-white/[0.03] last:border-0">
                  <span className="text-muted-foreground/60 select-none shrink-0 font-medium text-[10px]">[{log.timestamp}]</span>
                  <span className={`font-medium flex-1 ${
                    log.type === "success" ? "text-green-400" :
                    log.type === "warning" ? "text-amber-400" :
                    log.type === "error" ? "text-red-400" :
                    log.type === "trade" ? "text-cyan-400" :
                    "text-muted-foreground"
                  }`}>
                    {log.message}
                  </span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center text-muted-foreground py-12 uppercase tracking-wider text-xs">
                  Feed idle. Deploy an AI model rule to begin autonomous trading loop.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
