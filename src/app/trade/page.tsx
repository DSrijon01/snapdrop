"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { JupiterSwapTerminal } from "@/components/web3/JupiterSwapTerminal";
import { BuyStocksTerminal } from "@/components/web3/BuyStocksTerminal";
import { BuyOptionsTerminal } from "@/components/web3/BuyOptionsTerminal";
import { TradeFuturesTerminal } from "@/components/web3/TradeFuturesTerminal";
import { TradePerpsTerminal } from "@/components/web3/TradePerpsTerminal";
import { BuyWithCardModal } from "@/components/web3/BuyWithCardModal";
import { 
  CreditCard, 
  Zap, 
  Target, 
  Repeat, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Flame,
  Layers,
  Sparkles,
  Scale,
  Activity,
  SlidersHorizontal
} from "lucide-react";
import toast from "react-hot-toast";

export default function TradePage() {
  const [activeTab, setActiveTab] = useState<"swap" | "stocks" | "options" | "futures" | "perps">("swap");
  const [activeSubOption, setActiveSubOption] = useState<string>("market");
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  const handleSubOptionClick = (id: string) => {
    setActiveSubOption(id);
    if (id === "card") {
      setIsCardModalOpen(true);
      return;
    }
    if (id === "limit") {
      toast("Limit Orders simulated on Solana devnet!", { icon: "🎯" });
    } else if (id === "dca") {
      toast("Recurring DCA strategy simulated!", { icon: "🔄" });
    } else if (id === "degen") {
      toast("100x Degen Mode enabled for Perpetual Swaps!", { icon: "⚡" });
    } else if (id === "funding") {
      toast("Predicted 8h funding rates live via Pyth Oracle!", { icon: "⏱️" });
    }
  };

  return (
    <div className="flex flex-col items-center min-h-[80vh] px-3 sm:px-4 py-6 sm:py-8 relative">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-7xl flex flex-col gap-4 sm:gap-6 items-center relative z-10">
        {/* Header Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-1 mt-4 sm:mt-8"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-display uppercase tracking-tight text-foreground">
            Street Sync <span className="text-primary">Trade</span>
          </h1>
          <p className="text-muted-foreground text-[11px] sm:text-xs md:text-sm mt-2 sm:mt-3 max-w-2xl mx-auto uppercase tracking-widest font-mono border border-border bg-muted/40 py-1.5 sm:py-2 px-3 sm:px-4 rounded-full shadow-inner">
            Swap • Stocks • Options • Delivery Futures • Perpetual Swaps
          </p>
        </motion.div>

        {/* Primary Trade Tabs: Swap Coins, Buy Stocks, Buy Options, Trade Futures, Trade Perps */}
        <div className="flex border border-border bg-muted/30 rounded-2xl p-1 max-w-4xl w-full shadow-sm overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              setActiveTab("swap");
              setActiveSubOption("market");
            }}
            className={`flex-1 min-w-[110px] py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-display font-black uppercase tracking-wider rounded-xl transition-all ${
              activeTab === "swap"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.01]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Swap Coins
          </button>

          <button
            onClick={() => {
              setActiveTab("stocks");
              setActiveSubOption("market");
            }}
            className={`flex-1 min-w-[110px] py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-display font-black uppercase tracking-wider rounded-xl transition-all ${
              activeTab === "stocks"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.01]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Buy Stocks
          </button>

          <button
            onClick={() => {
              setActiveTab("options");
              setActiveSubOption("calls");
            }}
            className={`flex-1 min-w-[120px] py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-display font-black uppercase tracking-wider rounded-xl transition-all relative flex items-center justify-center gap-1 ${
              activeTab === "options"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.01]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <span>Buy Options</span>
            <span className="hidden sm:inline-flex items-center text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500 text-black font-black uppercase leading-none">
              HOT
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("futures");
              setActiveSubOption("all");
            }}
            className={`flex-1 min-w-[135px] py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-display font-black uppercase tracking-wider rounded-xl transition-all relative flex items-center justify-center gap-1.5 ${
              activeTab === "futures"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.01]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <span>Trade Futures</span>
            <span className="hidden sm:inline-flex items-center text-[8px] font-mono px-1 py-0.2 rounded bg-purple-500/30 text-purple-200 border border-purple-400/40 font-black uppercase leading-none">
              EXPERIMENTAL
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("perps");
              setActiveSubOption("market");
            }}
            className={`flex-1 min-w-[130px] py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-display font-black uppercase tracking-wider rounded-xl transition-all relative flex items-center justify-center gap-1.5 ${
              activeTab === "perps"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.01]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <span>Trade Perps</span>
            <span className="hidden sm:inline-flex items-center text-[8px] font-mono px-1 py-0.2 rounded bg-purple-500/30 text-purple-200 border border-purple-400/40 font-black uppercase leading-none">
              EXPERIMENTAL
            </span>
          </button>
        </div>

        {/* ================= EXPERIMENTAL STAGE FEATURE NOTICE ================= */}
        {(activeTab === "futures" || activeTab === "perps") && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between text-xs font-mono"
          >
            <div className="flex items-center gap-2 text-purple-300">
              <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[9px] font-black uppercase tracking-wider">
                STAGE LABS
              </span>
              <span>
                {activeTab === "futures" ? "Delivery Futures" : "Perpetual Swaps"} • Experimental Stage Feature on Solana Devnet
              </span>
            </div>
            <span className="hidden sm:inline-block text-[10px] text-purple-400 font-bold uppercase">
              Pyth Realtime
            </span>
          </motion.div>
        )}

        {/* ================= QUICK BUY / TRADE SUB-OPTIONS TOOLBAR ================= */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl flex items-center justify-between gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-secondary/30 border border-border shadow-xs overflow-x-auto no-scrollbar"
        >
          {activeTab === "swap" && (
            <>
              <button
                type="button"
                onClick={() => handleSubOptionClick("market")}
                className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  activeSubOption === "market"
                    ? "bg-card text-foreground border border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Zap size={13} className="text-primary" />
                <span>Instant</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubOptionClick("limit")}
                className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  activeSubOption === "limit"
                    ? "bg-card text-foreground border border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Target size={13} className="text-amber-500" />
                <span>Limit</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubOptionClick("dca")}
                className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  activeSubOption === "dca"
                    ? "bg-card text-foreground border border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Repeat size={13} className="text-blue-500" />
                <span>DCA</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubOptionClick("card")}
                className="flex-1 min-w-[100px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 active:scale-95"
              >
                <CreditCard size={13} />
                <span>Card/Fiat</span>
              </button>
            </>
          )}

          {activeTab === "stocks" && (
            <>
              <button
                type="button"
                onClick={() => handleSubOptionClick("market")}
                className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  activeSubOption === "market"
                    ? "bg-card text-foreground border border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TrendingUp size={13} className="text-green-500" />
                <span>Market</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubOptionClick("fractional")}
                className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  activeSubOption === "fractional"
                    ? "bg-card text-foreground border border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers size={13} className="text-primary" />
                <span>Fractional</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubOptionClick("limit")}
                className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  activeSubOption === "limit"
                    ? "bg-card text-foreground border border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Target size={13} className="text-amber-500" />
                <span>Limit</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubOptionClick("card")}
                className="flex-1 min-w-[100px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 active:scale-95"
              >
                <CreditCard size={13} />
                <span>Apple Pay</span>
              </button>
            </>
          )}

          {activeTab === "options" && (
            <>
              <button
                type="button"
                onClick={() => handleSubOptionClick("calls")}
                className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  activeSubOption === "calls"
                    ? "bg-green-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowUpRight size={14} />
                <span>Calls</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubOptionClick("puts")}
                className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  activeSubOption === "puts"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowDownRight size={14} />
                <span>Puts</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubOptionClick("weekly")}
                className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  activeSubOption === "weekly"
                    ? "bg-card text-foreground border border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Flame size={13} className="text-amber-500" />
                <span>Weekly</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubOptionClick("card")}
                className="flex-1 min-w-[100px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 active:scale-95"
              >
                <CreditCard size={13} />
                <span>Deposit</span>
              </button>
            </>
          )}

          {activeTab === "futures" && (
            <>
              <button
                type="button"
                onClick={() => handleSubOptionClick("all")}
                className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  activeSubOption === "all"
                    ? "bg-card text-foreground border border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Scale size={13} className="text-primary" />
                <span>All Delivery</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubOptionClick("crypto")}
                className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  activeSubOption === "crypto"
                    ? "bg-card text-foreground border border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles size={13} className="text-amber-500" />
                <span>Crypto</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubOptionClick("stocks")}
                className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  activeSubOption === "stocks"
                    ? "bg-card text-foreground border border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TrendingUp size={13} className="text-blue-500" />
                <span>Equities</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubOptionClick("card")}
                className="flex-1 min-w-[100px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 active:scale-95"
              >
                <CreditCard size={13} />
                <span>Deposit USDC</span>
              </button>
            </>
          )}

          {activeTab === "perps" && (
            <>
              <button
                type="button"
                onClick={() => handleSubOptionClick("market")}
                className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  activeSubOption === "market"
                    ? "bg-card text-foreground border border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Zap size={13} className="text-emerald-500" />
                <span>Market Perps</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubOptionClick("funding")}
                className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  activeSubOption === "funding"
                    ? "bg-card text-foreground border border-border shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Activity size={13} className="text-primary" />
                <span>Funding Rate</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubOptionClick("degen")}
                className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  activeSubOption === "degen"
                    ? "bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Flame size={13} className="text-amber-500" />
                <span>100x Degen</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubOptionClick("card")}
                className="flex-1 min-w-[100px] py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 active:scale-95"
              >
                <CreditCard size={13} />
                <span>Deposit USDC</span>
              </button>
            </>
          )}
        </motion.div>

        {/* Active Trading Terminal View Container */}
        <div className="w-full flex justify-center min-h-[500px] mt-2">
          <AnimatePresence mode="wait">
            {activeTab === "swap" && (
              <motion.div
                key="swap"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="w-full flex justify-center"
              >
                <JupiterSwapTerminal />
              </motion.div>
            )}

            {activeTab === "stocks" && (
              <motion.div
                key="stocks"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <BuyStocksTerminal />
              </motion.div>
            )}

            {activeTab === "options" && (
              <motion.div
                key="options"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <BuyOptionsTerminal />
              </motion.div>
            )}

            {activeTab === "futures" && (
              <motion.div
                key="futures"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <TradeFuturesTerminal />
              </motion.div>
            )}

            {activeTab === "perps" && (
              <motion.div
                key="perps"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <TradePerpsTerminal />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Fiat / Card On-Ramp Modal */}
      <BuyWithCardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        defaultAsset={activeTab === "stocks" ? "TSLA" : "SOL"}
      />
    </div>
  );
}
