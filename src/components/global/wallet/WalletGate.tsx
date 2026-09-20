"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useEffect, useRef } from "react";
import { ClientWalletMultiButton as WalletMultiButton } from "@/components/global/wallet/ClientWalletMultiButton";

export function WalletGate({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();
  const hasConnected = useRef(false);
  const [showExitMessage, setShowExitMessage] = useState(false);
  const [robotSeed, setRobotSeed] = useState("EW9U");

  useEffect(() => {
    if (connected) {
      hasConnected.current = true;
      setShowExitMessage(false);
    } else if (hasConnected.current) {
      // User just disconnected
      setShowExitMessage(true);
    }
  }, [connected]);

  if (connected) {
    return <>{children}</>;
  }

  const BOT_ITEMS = [
    { word: "TRADE", seed: "EW9U" },
    { word: "PREDICT", seed: "StreetSync" },
    { word: "MANAGE", seed: "Solana" },
    { word: "SWAP", seed: "CyberBot" },
    { word: "NFTS", seed: "NeonRider" },
  ];
  const [itemIndex, setItemIndex] = useState(0);

  const cycleNext = () => {
    setItemIndex((prev) => (prev + 1) % BOT_ITEMS.length);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center h-full w-full self-center justify-self-center my-auto">
      <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 max-w-4xl mx-auto mt-12 md:mt-24">
        {/* Main Login Card */}
        <div className="p-8 sm:p-10 rounded-3xl bg-card border border-border max-w-lg shadow-xl mx-auto flex-1">
          <h2 className="text-4xl md:text-6xl font-black mb-6 text-foreground tracking-tight font-display">
            {showExitMessage ? (
              <span>System <span className="text-destructive">Disconnected</span>.</span>
            ) : (
              <span>Sync Your <span className="text-primary">Street</span>.</span>
            )}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed font-light">
            The next generation of digital collectibles. Connect your wallet to access the marketplace.
          </p>
          <div className="flex justify-center">
             <WalletMultiButton className="!py-4 !px-10 !h-auto !text-lg !bg-primary !text-primary-foreground hover:!bg-primary/90 hover:!scale-105 transition-all !rounded-xl !font-bold !uppercase !tracking-widest !shadow-lg !font-display" />
          </div>
        </div>

        {/* Animated Bottts Robot Avatar on the Right */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div 
            onClick={cycleNext}
            title="Click to cycle"
            className="relative group cursor-pointer flex flex-col items-center select-none"
          >
            {/* Glowing Backdrop Ring */}
            <div className="absolute inset-0 bg-primary/25 dark:bg-primary/35 blur-3xl rounded-full scale-125 pointer-events-none -z-10 animate-pulse" />

            {/* Avatar Image using exact DiceBear bottts API, scaled larger */}
            <img
              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${BOT_ITEMS[itemIndex].seed}&backgroundColor=transparent`}
              alt="Street Sync Bot"
              className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain drop-shadow-[0_0_25px_rgba(255,24,1,0.5)] dark:drop-shadow-[0_0_35px_rgba(255,24,1,0.7)] animate-bounce group-hover:scale-110 transition-transform duration-300 pointer-events-auto"
            />

            {/* Dynamic Street Sync Keyword Badge (changes on click) */}
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="px-6 py-2 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-md flex items-center gap-2.5 text-sm font-black uppercase tracking-widest font-display text-foreground transition-all group-hover:border-primary/50 group-hover:scale-105">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shrink-0 drop-shadow-[0_0_6px_rgba(255,24,1,0.8)]" />
                <span className="text-foreground font-black tracking-widest font-display">
                  {BOT_ITEMS[itemIndex].word}
                </span>
              </div>

              {/* All keywords strip with active one highlighted */}
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider font-display">
                {BOT_ITEMS.map((item, idx) => (
                  <span
                    key={item.word}
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemIndex(idx);
                    }}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      idx === itemIndex
                        ? "text-primary bg-primary/10 border border-primary/30"
                        : "text-muted-foreground/60 hover:text-foreground"
                    }`}
                  >
                    {item.word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
