"use client";

import Script from 'next/script';

declare global {
  interface Window {
    Jupiter: any;
  }
}

export const JupiterSwapTerminal = () => {
  return (
    <div className="w-full max-w-[480px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Devnet Warning Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-t-3xl p-4 mb-[-20px] relative z-0 flex items-start gap-3 pt-5 pb-8 shadow-sm">
        <div className="shrink-0 pt-0.5">
          <svg className="w-5 h-5 text-amber-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 className="text-amber-600 dark:text-amber-500 font-semibold text-xs tracking-wide mb-0.5">MVP Preview Mode</h4>
          <p className="text-amber-600/80 dark:text-amber-500/80 text-[11px] leading-relaxed">
            Swap routing is currently simulating via Solana Mainnet.
          </p>
        </div>
      </div>

      {/* Terminal Container (Uniswap-style Card) */}
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
              // @ts-ignore - Required for terminal initialization
              endpoint: "https://api.mainnet-beta.solana.com",
              strictTokenList: false,
              formProps: {
                initialInputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
                initialOutputMint: "So11111111111111111111111111111111111111112", // SOL
              },
            });
          }
        }}
      />
    </div>
  );
};
