"use client";

import { motion } from "framer-motion";
import { JupiterSwapTerminal } from "@/components/web3/JupiterSwapTerminal";

export default function TradePage() {
    return (
        <div className="flex flex-col items-center min-h-[80vh] px-4 py-8 relative">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-full max-w-4xl flex flex-col gap-6 items-center relative z-10">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-4 mt-8"
                >
                    <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight">
                        Street Sync <span className="text-primary">Trade</span>
                    </h1>
                    <p className="text-muted-foreground text-xs md:text-sm mt-3 max-w-xl mx-auto uppercase tracking-widest font-mono border border-border bg-muted/50 py-2 px-4 rounded-full shadow-inner">
                        Powered by Jupiter Routing
                    </p>
                </motion.div>
                
                <div className="w-full flex justify-center">
                    <JupiterSwapTerminal />
                </div>
            </div>
        </div>
    );
}
