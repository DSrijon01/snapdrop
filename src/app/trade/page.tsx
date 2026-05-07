"use client";

import { motion } from "framer-motion";

export default function TradePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card border border-border rounded-3xl p-12 max-w-lg shadow-2xl relative overflow-hidden"
            >
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
                
                <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight mb-4 relative z-10">
                    Trading <span className="text-primary">Coming Soon</span>
                </h1>
                <p className="text-muted-foreground text-lg mb-8 relative z-10">
                    We're building the ultimate high-speed trading experience. Stay tuned for advanced charting, one-click execution, and instant liquidity.
                </p>
                
                <div className="flex justify-center relative z-10">
                    <span className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
                    </span>
                </div>
            </motion.div>
        </div>
    );
}
