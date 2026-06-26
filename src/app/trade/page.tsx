"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { JupiterSwapTerminal } from "@/components/web3/JupiterSwapTerminal";
import { BuyStocksTerminal } from "@/components/web3/BuyStocksTerminal";

export default function TradePage() {
    const [activeTab, setActiveTab] = useState<"swap" | "stocks">("swap");

    return (
        <div className="flex flex-col items-center min-h-[80vh] px-4 py-8 relative">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-full max-w-6xl flex flex-col gap-6 items-center relative z-10">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-2 mt-8"
                >
                    <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight">
                        Street Sync <span className="text-primary">Trade</span>
                    </h1>
                    <p className="text-muted-foreground text-xs md:text-sm mt-3 max-w-xl mx-auto uppercase tracking-widest font-mono border border-border bg-muted/50 py-2 px-4 rounded-full shadow-inner">
                        Sync Assets & Tokenized Equities
                    </p>
                </motion.div>

                {/* Tab Switcher */}
                <div className="flex border border-border bg-muted/30 rounded-xl p-1 max-w-[360px] w-full shadow-sm mb-4">
                    <button
                        onClick={() => setActiveTab("swap")}
                        className={`flex-1 py-2 text-xs md:text-sm font-display font-black uppercase tracking-wider rounded-lg transition-all ${
                            activeTab === "swap"
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                    >
                        Swap Coins
                    </button>
                    <button
                        onClick={() => setActiveTab("stocks")}
                        className={`flex-1 py-2 text-xs md:text-sm font-display font-black uppercase tracking-wider rounded-lg transition-all ${
                            activeTab === "stocks"
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                    >
                        Buy Stocks
                    </button>
                </div>
                
                {/* Active view container */}
                <div className="w-full flex justify-center min-h-[500px]">
                    <AnimatePresence mode="wait">
                        {activeTab === "swap" ? (
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
                        ) : (
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
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

