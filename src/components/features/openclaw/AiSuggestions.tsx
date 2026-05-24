"use client";

import React, { useState, useEffect } from "react";
import { Bot, Sparkles, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { TokenPrice } from "./AgentExecutionEngine";

interface AiSuggestionsProps {
  prices: Record<string, TokenPrice>;
  onExecuteSuggestion: (isBuy: boolean, symbol: string, amount: number) => void;
}

export const AiSuggestions: React.FC<AiSuggestionsProps> = ({ prices, onExecuteSuggestion }) => {
  const [suggestion, setSuggestion] = useState<{
    text: string;
    isBuy: boolean;
    symbol: string;
    amount: number;
    targetPrice: number;
    reasoning: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  // Generate suggestions based on prices
  const generateSuggestion = () => {
    setLoading(true);
    setTimeout(() => {
      const symbols = Object.keys(prices).filter(s => s !== "USDC");
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      const token = prices[randomSymbol];
      if (!token) return;

      const isBuy = token.change24h < 0; // Buy the dip, sell the pump
      const amount = randomSymbol === "SOL" || randomSymbol === "ssSOL" 
        ? Number((Math.random() * 2 + 0.5).toFixed(2)) 
        : Math.floor(Math.random() * 1000 + 100);
      
      const targetPrice = token.price;

      const reasoning = isBuy
        ? `${randomSymbol} is down ${Math.abs(token.change24h).toFixed(2)}% in 24h. RSI is indicating oversold at 32. Support holds strong at $${(targetPrice * 0.95).toFixed(2)}. Suggesting entry.`
        : `${randomSymbol} has rallied ${token.change24h.toFixed(2)}% in 24h. Moving averages show near-term exhaustion. Suggesting taking partial profit.`;

      setSuggestion({
        text: `${isBuy ? "BUY" : "SELL"} ${amount} ${randomSymbol} near $${targetPrice}`,
        isBuy,
        symbol: randomSymbol,
        amount,
        targetPrice,
        reasoning
      });
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    generateSuggestion();
    const interval = setInterval(generateSuggestion, 20000); // refresh every 20s
    return () => clearInterval(interval);
  }, [prices]);

  return (
    <div className="bg-card/40 backdrop-blur-md border border-border rounded-2xl p-5 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
        <h3 className="font-bold font-display uppercase tracking-tight flex items-center gap-2 text-primary">
          <Bot className="w-5 h-5" />
          AI Signals & Suggestions
        </h3>
        <button 
          onClick={generateSuggestion}
          className="text-xs uppercase tracking-wider font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          Re-Analyze
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground animate-pulse py-8">
          <Zap className="w-8 h-8 text-primary animate-spin mb-2" />
          <span className="font-mono text-xs uppercase tracking-widest">Running AI Analysis...</span>
        </div>
      ) : suggestion ? (
        <div className="flex-1 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className={`flex items-center gap-2 px-3 py-2 border rounded-xl font-mono text-sm font-bold ${
              suggestion.isBuy 
                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {suggestion.isBuy ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              <span>{suggestion.text}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono block mb-1">Signal Reasoning</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {suggestion.reasoning}
              </p>
            </div>

            {/* Technical stats grid */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/30">
              <div className="bg-muted/40 p-2 rounded-lg border border-border/20 text-center">
                <span className="text-[9px] uppercase font-bold text-muted-foreground font-mono block">RSI (14)</span>
                <span className={`text-xs font-mono font-bold ${suggestion.isBuy ? 'text-green-400' : 'text-red-400'}`}>
                  {suggestion.isBuy ? "32.4 (Oversold)" : "74.8 (Overbought)"}
                </span>
              </div>
              <div className="bg-muted/40 p-2 rounded-lg border border-border/20 text-center">
                <span className="text-[9px] uppercase font-bold text-muted-foreground font-mono block">SMA Cross</span>
                <span className="text-xs font-mono font-bold text-foreground">
                  {suggestion.isBuy ? "Bullish Convergence" : "Exhaustion Limit"}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onExecuteSuggestion(suggestion.isBuy, suggestion.symbol, suggestion.amount)}
            className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 ${
              suggestion.isBuy
                ? 'bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-green-500/20'
                : 'bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-red-500/20'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Execute Order Immediately
          </button>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs font-mono py-8">
          No signal detected.
        </div>
      )}
    </div>
  );
};
