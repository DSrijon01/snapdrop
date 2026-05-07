"use client";

import { useEffect, useState } from "react";
// import { useWallet } from "@solana/wallet-adapter-react"; // Removed to avoid adapter version mismatch crashes

export const JupiterSwapTerminal = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadJupiter = async () => {
      try {
        // Dynamically import to ensure it only runs on the client
        const { init } = await import('@jup-ag/terminal');
        
        if (!mounted) return;

        // Ensure the DOM element is ready before init
        const target = document.getElementById("jupiter-terminal-app");
        if (target) {
            target.innerHTML = ''; // Clear any existing instance
        }

        init({
          displayMode: "integrated",
          integratedTargetId: "jupiter-terminal-app",
          endpoint: "https://api.mainnet-beta.solana.com", // CRITICAL: Mainnet for MVP
          strictTokenList: false,
          formProps: {
            initialInputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
            initialOutputMint: "So11111111111111111111111111111111111111112", // SOL
          },
        });
        
        setIsLoaded(true);
      } catch (err) {
        console.error("Failed to load Jupiter Terminal:", err);
      }
    };

    loadJupiter();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="w-full max-w-[480px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Devnet Warning Banner */}
      <div className="bg-amber-500/10 border border-amber-500/50 rounded-t-2xl p-4 mb-[-15px] relative z-0 flex items-start gap-3 pt-5 pb-8 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
        <div className="shrink-0 pt-0.5">
          <svg className="w-5 h-5 text-amber-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h4 className="text-amber-500 font-bold text-xs uppercase tracking-widest mb-1">MVP Preview Mode</h4>
          <p className="text-amber-500/80 text-[10px] leading-relaxed uppercase tracking-wide">
            Swap routing is currently simulating via Solana Mainnet. Do not execute live trades during Devnet testing.
          </p>
        </div>
      </div>

      {/* Terminal Container */}
      <div className="relative z-10 bg-[#1c1c1e] rounded-2xl p-2 shadow-2xl border border-[#2c2c2e] min-h-[500px]">
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#131313] z-50 rounded-xl">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
            <p className="text-muted-foreground font-mono text-[10px] tracking-[0.2em] uppercase">Syncing Protocol...</p>
          </div>
        )}
        <div 
          id="jupiter-terminal-app" 
          className="relative w-full h-full min-h-[500px] overflow-hidden rounded-xl bg-transparent"
        >
        </div>
      </div>
    </div>
  );
};
