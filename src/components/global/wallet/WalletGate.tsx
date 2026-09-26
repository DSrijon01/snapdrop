"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Gamepad2 } from "lucide-react";
import { ClientWalletMultiButton as WalletMultiButton } from "@/components/global/wallet/ClientWalletMultiButton";
import { InteractiveBotAvatar } from "@/components/features/avatar/InteractiveBotAvatar";

const CyberDodgeGame = dynamic(
  () => import("@/components/features/arcade/CyberDodgeGame"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-sm sm:max-w-md aspect-square bg-card/90 border-2 border-primary/30 rounded-3xl flex flex-col items-center justify-center font-mono text-xs text-primary gap-2 animate-pulse">
        <span className="w-3 h-3 rounded-full bg-primary animate-ping" />
        <span>Loading 3D Cyber Arcade Engine...</span>
      </div>
    ),
  }
);

const BOT_ITEMS = [
  { word: "TRADE", seed: "EW9U" },
  { word: "PREDICT", seed: "StreetSync" },
  { word: "MANAGE", seed: "Solana" },
  { word: "SWAP", seed: "CyberBot" },
  { word: "NFTS", seed: "NeonRider" },
];

export function WalletGate({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();
  const hasConnected = useRef(false);
  const [showExitMessage, setShowExitMessage] = useState(false);
  const [itemIndex, setItemIndex] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);

  useEffect(() => {
    if (connected) {
      hasConnected.current = true;
      setShowExitMessage(false);
    } else if (hasConnected.current) {
      // User just disconnected
      setShowExitMessage(true);
    }
  }, [connected]);

  const cycleNext = () => {
    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    if (nextCount >= 5 || itemIndex === 4) {
      setIsGameActive(true);
      return;
    }

    setItemIndex((prev) => (prev + 1) % BOT_ITEMS.length);
  };

  const handleSelectItem = (idx: number) => {
    const nextCount = clickCount + 1;
    setClickCount(nextCount);
    setItemIndex(idx);

    if (idx === 4 || nextCount >= 5) {
      setIsGameActive(true);
    }
  };

  if (connected) {
    return <>{children}</>;
  }

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

        {/* Animated & Interactive Avatar or 3D Arcade Mini-Game on 5th Click */}
        <div className="flex flex-col items-center justify-center shrink-0 w-full max-w-sm sm:max-w-md">
          {isGameActive ? (
            <CyberDodgeGame
              onExit={() => {
                setIsGameActive(false);
                setClickCount(0);
                setItemIndex(0);
              }}
            />
          ) : (
            <div className="flex flex-col items-center select-none">
              <InteractiveBotAvatar
                seed={BOT_ITEMS[itemIndex].seed}
                onClick={cycleNext}
                className="cursor-pointer"
              />

              {/* Dynamic Street Sync Keyword Badge (changes on click) */}
              <div className="mt-2 flex flex-col items-center gap-2">
                <div 
                  onClick={cycleNext}
                  className="cursor-pointer px-6 py-2 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-md flex items-center gap-2.5 text-sm font-black uppercase tracking-widest font-display text-foreground transition-all hover:border-primary/50 hover:scale-105 active:scale-95"
                >
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
                        handleSelectItem(idx);
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

                {/* Arcade Unlock Indicator / Fast Launch */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsGameActive(true);
                  }}
                  className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground/80 hover:text-primary transition-colors cursor-pointer group-hover:text-primary"
                >
                  <Gamepad2 className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {clickCount >= 4 ? (
                      <span className="text-primary font-bold animate-pulse">Click 1 more time to play 3D Arcade!</span>
                    ) : (
                      <span>Arcade Sync: <strong className="text-foreground">{clickCount}/5</strong> clicks</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
