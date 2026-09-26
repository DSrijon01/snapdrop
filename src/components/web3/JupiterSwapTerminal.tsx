"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Script from 'next/script';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  POPULAR_TOKENS, 
  TokenInfo, 
  fetchJupiterQuote, 
  simulateJupiterSwap, 
  JupiterQuoteResponse, 
  SwapSimulationReceipt,
  getJupiterApiKey,
  setJupiterApiKey 
} from '@/utils/jupiterApi';

declare global {
  interface Window {
    Jupiter: any;
  }
}

export const JupiterSwapTerminal: React.FC = () => {
  const [mode, setMode] = useState<'simulator' | 'terminal'>('simulator');

  // Simulator State
  const [fromToken, setFromToken] = useState<TokenInfo>(POPULAR_TOKENS[0]); // SOL
  const [toToken, setToToken] = useState<TokenInfo>(POPULAR_TOKENS[1]); // USDC
  const [fromAmount, setFromAmount] = useState<string>("1.0");
  const [quote, setQuote] = useState<JupiterQuoteResponse | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [receipt, setReceipt] = useState<SwapSimulationReceipt | null>(null);
  const [slippageBps, setSlippageBps] = useState<number>(50); // 0.5%
  const [apiKeyActive, setApiKeyActive] = useState<boolean>(true);

  // Check API Key
  useEffect(() => {
    const key = getJupiterApiKey();
    setApiKeyActive(Boolean(key));
  }, []);

  // Calculate output amount from quote
  const outputAmountFormatted = useMemo(() => {
    if (!quote || !quote.outAmount) return "";
    const outAtomic = BigInt(quote.outAmount);
    const outNum = Number(outAtomic) / Math.pow(10, toToken.decimals);
    return outNum.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }, [quote, toToken]);

  // Rate string (1 FROM = X TO)
  const rateFormatted = useMemo(() => {
    if (!quote || !quote.outAmount || !fromAmount || Number(fromAmount) <= 0) return null;
    const outAtomic = BigInt(quote.outAmount);
    const outNum = Number(outAtomic) / Math.pow(10, toToken.decimals);
    const rate = outNum / Number(fromAmount);
    return `1 ${fromToken.symbol} ≈ ${rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${toToken.symbol}`;
  }, [quote, fromAmount, fromToken, toToken]);

  // Fetch Quote Debounced
  const updateQuote = useCallback(async () => {
    const numAmount = parseFloat(fromAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    setIsFetchingQuote(true);
    setQuoteError(null);

    try {
      const atomicAmount = Math.floor(numAmount * Math.pow(10, fromToken.decimals)).toString();
      const quoteRes = await fetchJupiterQuote(
        fromToken.mint,
        toToken.mint,
        atomicAmount,
        slippageBps
      );
      setQuote(quoteRes);
    } catch (err: any) {
      console.warn("Jupiter quote error:", err);
      setQuoteError(err.message || "Failed to fetch live quote from Jupiter");
      setQuote(null);
    } finally {
      setIsFetchingQuote(false);
    }
  }, [fromAmount, fromToken, toToken, slippageBps]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateQuote();
    }, 450);
    return () => clearTimeout(timer);
  }, [updateQuote]);

  // Swap Direction
  const handleFlipTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount("1.0");
  };

  // Run Swap Simulation
  const handleExecuteSimulation = async () => {
    if (!quote) return;
    const numFrom = parseFloat(fromAmount);
    if (isNaN(numFrom) || numFrom <= 0) return;

    setIsSimulating(true);
    try {
      const resultReceipt = await simulateJupiterSwap(quote, fromToken, toToken, numFrom);
      setReceipt(resultReceipt);
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleConfigureApiKey = () => {
    const current = getJupiterApiKey();
    const entered = window.prompt("Configure Jupiter Developer API Key (api.jup.ag):", current);
    if (entered !== null) {
      setJupiterApiKey(entered);
      setApiKeyActive(Boolean(entered.trim()));
      updateQuote();
    }
  };

  return (
    <div className="w-full max-w-[500px] mx-auto animate-in fade-in slide-in-from-bottom-6 duration-500">
      
      {/* Mode Switcher & Status Bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex bg-muted/60 p-1 rounded-xl border border-border">
          <button
            id="btn-mode-simulator"
            onClick={() => setMode('simulator')}
            className={`px-3 py-1 text-xs font-bold font-display uppercase tracking-wider rounded-lg transition-all ${
              mode === 'simulator'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            ⚡ Live Simulator
          </button>
          <button
            id="btn-mode-terminal"
            onClick={() => setMode('terminal')}
            className={`px-3 py-1 text-xs font-bold font-display uppercase tracking-wider rounded-lg transition-all ${
              mode === 'terminal'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Widget Embed
          </button>
        </div>

        {/* API Key Status Pill */}
        <button
          type="button"
          onClick={handleConfigureApiKey}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg transition-colors cursor-pointer"
          title="Click to view or edit your Jupiter Developer API Key"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Jupiter API: {apiKeyActive ? "Connected" : "Keyless"}</span>
          <span className="text-[10px] opacity-70">⚙️</span>
        </button>
      </div>

      {mode === 'simulator' ? (
        /* =================== INTERACTIVE SIMULATOR CARD =================== */
        <div className="relative bg-card border border-border rounded-3xl p-5 md:p-6 shadow-2xl overflow-hidden backdrop-blur-xl">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2">
                Swap Coins
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                  DEVNET DEMO
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time quotes & route aggregation via Jupiter API
              </p>
            </div>

            {/* Slippage Selector */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60">
              {[10, 50, 100].map((bps) => (
                <button
                  key={bps}
                  onClick={() => setSlippageBps(bps)}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                    slippageBps === bps ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {bps / 100}%
                </button>
              ))}
            </div>
          </div>

          {/* INPUT: You Pay */}
          <div className="bg-muted/40 border border-border rounded-2xl p-4 mb-2 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
              <span>You Pay</span>
              <span>Balance: 12.50 {fromToken.symbol}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <input
                id="input-from-amount"
                type="number"
                step="any"
                min="0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.0"
                className="w-full bg-transparent text-2xl md:text-3xl font-black font-display text-foreground outline-none placeholder:text-muted-foreground/40"
              />

              {/* Token Selector */}
              <select
                id="select-from-token"
                value={fromToken.symbol}
                onChange={(e) => {
                  const sel = POPULAR_TOKENS.find(t => t.symbol === e.target.value);
                  if (sel) {
                    if (sel.symbol === toToken.symbol) handleFlipTokens();
                    else setFromToken(sel);
                  }
                }}
                className="bg-card border border-border rounded-xl px-3 py-2 text-sm font-bold font-display text-foreground cursor-pointer outline-none hover:border-primary/50"
              >
                {POPULAR_TOKENS.map((t) => (
                  <option key={t.symbol} value={t.symbol} className="bg-card text-foreground">
                    {t.symbol} - {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* FLIP BUTTON */}
          <div className="flex justify-center -my-3 relative z-10">
            <button
              id="btn-flip-tokens"
              type="button"
              onClick={handleFlipTokens}
              className="p-2.5 rounded-full bg-card border border-border shadow-lg hover:border-primary text-muted-foreground hover:text-primary transition-all hover:scale-110 active:scale-95"
              title="Flip direction"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8v12M17 20l4-4M17 20l-4-4"/>
              </svg>
            </button>
          </div>

          {/* OUTPUT: You Receive */}
          <div className="bg-muted/40 border border-border rounded-2xl p-4 mt-2 mb-4 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
              <span>You Receive</span>
              {isFetchingQuote && (
                <span className="text-[10px] text-primary flex items-center gap-1 font-mono animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Fetching Jupiter quote...
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <input
                id="input-to-amount"
                type="text"
                readOnly
                value={outputAmountFormatted || (isFetchingQuote ? "..." : "0.0")}
                placeholder="0.0"
                className="w-full bg-transparent text-2xl md:text-3xl font-black font-display text-foreground outline-none"
              />

              {/* Token Selector */}
              <select
                id="select-to-token"
                value={toToken.symbol}
                onChange={(e) => {
                  const sel = POPULAR_TOKENS.find(t => t.symbol === e.target.value);
                  if (sel) {
                    if (sel.symbol === fromToken.symbol) handleFlipTokens();
                    else setToToken(sel);
                  }
                }}
                className="bg-card border border-border rounded-xl px-3 py-2 text-sm font-bold font-display text-foreground cursor-pointer outline-none hover:border-primary/50"
              >
                {POPULAR_TOKENS.map((t) => (
                  <option key={t.symbol} value={t.symbol} className="bg-card text-foreground">
                    {t.symbol} - {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* QUOTE ROUTING STATS */}
          {quote && (
            <div className="bg-background/80 border border-border rounded-xl p-3 mb-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Best Route:</span>
                <span className="font-mono font-semibold text-foreground flex items-center gap-1">
                  {quote.routePlan?.map(r => r.swapInfo.label).join(' ➔ ') || "Jupiter Direct"}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Rate:</span>
                <span className="font-mono text-foreground font-semibold">{rateFormatted}</span>
              </div>
              {quote.swapUsdValue && (
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Est. USD Value:</span>
                  <span className="font-mono text-emerald-500 font-semibold">${Number(quote.swapUsdValue).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Price Impact:</span>
                <span className="font-mono text-foreground">
                  {(Number(quote.priceImpactPct || 0) * 100).toFixed(4)}%
                </span>
              </div>
            </div>
          )}

          {quoteError && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-4 text-xs text-destructive">
              {quoteError}
            </div>
          )}

          {/* EXECUTE BUTTON */}
          <button
            id="btn-simulate-swap"
            type="button"
            disabled={!quote || isFetchingQuote || isSimulating}
            onClick={handleExecuteSimulation}
            className={`w-full py-4 rounded-xl font-black font-display uppercase tracking-wider text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
              !quote || isFetchingQuote || isSimulating
                ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                : 'bg-primary text-primary-foreground hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] shadow-primary/20'
            }`}
          >
            {isSimulating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Routing through Jupiter...</span>
              </>
            ) : (
              <span>Simulate Swap with Jupiter</span>
            )}
          </button>
        </div>
      ) : (
        /* =================== EMBEDDED WIDGET CARD =================== */
        <div>
          {/* Devnet Warning Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-t-3xl p-4 mb-[-20px] relative z-0 flex items-start gap-3 pt-5 pb-8 shadow-sm">
            <div className="shrink-0 pt-0.5">
              <svg className="w-5 h-5 text-amber-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-amber-600 dark:text-amber-500 font-semibold text-xs tracking-wide mb-0.5">Jupiter Official Terminal</h4>
              <p className="text-amber-600/80 dark:text-amber-500/80 text-[11px] leading-relaxed">
                Interacting with Jupiter v3 Terminal widget.
              </p>
            </div>
          </div>

          <div className="relative z-10 bg-white dark:bg-[#131313] rounded-[24px] p-2 sm:p-3 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-gray-200 dark:border-gray-800 min-h-[460px]">
            <div 
              id="jupiter-terminal-app" 
              className="relative w-full h-full min-h-[460px] overflow-hidden rounded-[16px] bg-transparent"
            >
            </div>
          </div>

          <Script 
            src="https://terminal.jup.ag/main-v3.js" 
            strategy="lazyOnload"
            onLoad={() => {
              if (window.Jupiter) {
                window.Jupiter.init({
                  displayMode: "integrated",
                  integratedTargetId: "jupiter-terminal-app",
                  endpoint: "https://api.mainnet-beta.solana.com",
                  strictTokenList: false,
                  formProps: {
                    initialInputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                    initialOutputMint: "So11111111111111111111111111111111111111112",
                  },
                });
              }
            }}
          />
        </div>
      )}

      {/* =================== SUCCESS RECEIPT MODAL =================== */}
      <AnimatePresence>
        {receipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-sm">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-black font-display uppercase tracking-tight text-foreground">Swap Simulated</h4>
                    <p className="text-[11px] text-muted-foreground font-mono">{receipt.timestamp}</p>
                  </div>
                </div>
                <button
                  onClick={() => setReceipt(null)}
                  className="text-muted-foreground hover:text-foreground p-1 text-lg font-mono"
                >
                  ✕
                </button>
              </div>

              {/* Swap Summary */}
              <div className="bg-muted/30 border border-border rounded-2xl p-4 text-center space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Swapped</span>
                <div className="text-2xl font-black font-display text-foreground">
                  {receipt.inputAmount} {receipt.inputToken.symbol} ➔ {receipt.outputAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {receipt.outputToken.symbol}
                </div>
                <p className="text-xs font-mono text-emerald-500 pt-1">
                  1 {receipt.inputToken.symbol} = {receipt.exchangeRate.toFixed(4)} {receipt.outputToken.symbol}
                </p>
              </div>

              {/* Transaction Metrics */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Routing Hops:</span>
                  <span className="text-foreground font-semibold">{receipt.routeSteps.join(" ➔ ")}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Price Impact:</span>
                  <span className="text-foreground">{receipt.priceImpact}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Context Slot:</span>
                  <span className="text-foreground font-mono">{receipt.contextSlot}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Simulated Tx Sig:</span>
                  <span className="text-primary font-mono truncate max-w-[200px]">{receipt.signature.slice(0, 16)}...</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setReceipt(null)}
                  className="w-full py-3 bg-primary text-primary-foreground font-bold font-display uppercase tracking-wider rounded-xl hover:opacity-90 transition-opacity"
                >
                  Close Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
