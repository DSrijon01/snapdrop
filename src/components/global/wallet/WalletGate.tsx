"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClientWalletMultiButton as WalletMultiButton } from "@/components/global/wallet/ClientWalletMultiButton";
import { getStoredPhantomSession } from "@/lib/wallet/phantomDeeplink";

const BOT_ITEMS = [
  { word: "TRADE", seed: "CyberBot" },
  { word: "PREDICT", seed: "StreetSync" },
  { word: "MANAGE", seed: "Solana" },
  { word: "SWAP", seed: "EW9U" },
  { word: "NFTS", seed: "NeonRider" },
];

export function WalletGate({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();
  const [hasMobileSession, setHasMobileSession] = useState(false);
  const hasConnected = useRef(false);
  const [showExitMessage, setShowExitMessage] = useState(false);
  const [itemIndex, setItemIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const session = getStoredPhantomSession();
      setHasMobileSession(Boolean(session && session.publicKey));

      const handleConnect = () => setHasMobileSession(true);
      const handleDisconnect = () => setHasMobileSession(false);
      window.addEventListener("phantom_mobile_connected", handleConnect);
      window.addEventListener("phantom_mobile_disconnected", handleDisconnect);
      return () => {
        window.removeEventListener("phantom_mobile_connected", handleConnect);
        window.removeEventListener("phantom_mobile_disconnected", handleDisconnect);
      };
    }
  }, []);

  // Preload bot avatar images to eliminate any flickering during auto-cycling
  useEffect(() => {
    if (typeof window !== "undefined") {
      BOT_ITEMS.forEach((item) => {
        const img = new Image();
        img.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${item.seed}&backgroundColor=transparent`;
      });
    }
  }, []);

  // Auto-animate across bot items with a fast, snappy pause (1.6 seconds)
  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      setItemIndex((prev) => (prev + 1) % BOT_ITEMS.length);
    }, 1600);

    return () => clearTimeout(timer);
  }, [itemIndex, isPaused]);

  const isUserConnected = connected || hasMobileSession;

  useEffect(() => {
    if (isUserConnected) {
      hasConnected.current = true;
      setShowExitMessage(false);
    } else if (hasConnected.current) {
      // User just disconnected
      setShowExitMessage(true);
    }
  }, [isUserConnected]);

  const cycleNext = () => {
    setItemIndex((prev) => (prev + 1) % BOT_ITEMS.length);
  };

  if (isUserConnected) {
    return <>{children}</>;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center h-full w-full self-center justify-self-center my-auto">
      <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 max-w-4xl mx-auto my-auto w-full">
        {/* Main Login Card */}
        <div className="p-6 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl bg-card border border-border max-w-sm sm:max-w-lg shadow-xl mx-auto flex-1 w-full">
          {/* Mobile-only compact bot avatar badge */}
          <div className="lg:hidden flex items-center justify-center mb-4">
            <div 
              onClick={cycleNext}
              className="relative cursor-pointer flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary/80 border border-border shadow-sm active:scale-95 transition-transform"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={itemIndex}
                  initial={{ opacity: 0, y: 3, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -3, scale: 0.94 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="flex items-center gap-2"
                >
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${BOT_ITEMS[itemIndex].seed}&backgroundColor=transparent`}
                    alt="Street Sync Bot"
                    width={28}
                    height={28}
                    className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(255,24,1,0.5)]"
                  />
                  <span className="text-[11px] font-black uppercase tracking-widest font-display text-foreground">
                    {BOT_ITEMS[itemIndex].word}
                  </span>
                </motion.div>
              </AnimatePresence>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black mb-3 sm:mb-6 text-foreground tracking-tight font-display">
            {showExitMessage ? (
              <span>System <span className="text-destructive">Disconnected</span>.</span>
            ) : (
              <span>Sync <span className="text-primary">It</span>.</span>
            )}
          </h2>
          <p className="text-sm sm:text-base lg:text-xl text-muted-foreground mb-6 sm:mb-8 leading-relaxed font-light">
            Do <span className="text-primary font-black">EVERYTHING</span> Crypto in One Space!
          </p>
          <div className="flex justify-center">
             <WalletMultiButton className="!py-3 sm:!py-4 !px-6 sm:!px-10 !h-auto !text-base sm:!text-lg !bg-primary !text-primary-foreground hover:!bg-primary/90 hover:!scale-105 transition-all !rounded-xl !font-bold !uppercase !tracking-widest !shadow-lg !font-display" />
          </div>
        </div>

        {/* Animated Bottts Robot Avatar on the Right (Desktop Only) */}
        <div 
          className="hidden lg:flex flex-col items-center justify-center shrink-0"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div 
            onClick={cycleNext}
            title="Click to cycle"
            className="relative group cursor-pointer flex flex-col items-center select-none"
          >
            {/* Glowing Backdrop Ring */}
            <div className="absolute inset-0 bg-primary/25 dark:bg-primary/35 blur-3xl rounded-full scale-125 pointer-events-none -z-10 animate-pulse" />

            {/* Avatar Image using exact DiceBear bottts API with smooth transition */}
            <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 flex items-center justify-center relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={itemIndex}
                  initial={{ opacity: 0, scale: 0.9, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -6 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${BOT_ITEMS[itemIndex].seed}&backgroundColor=transparent`}
                    alt="Street Sync Bot"
                    width={224}
                    height={224}
                    className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain drop-shadow-[0_0_25px_rgba(255,24,1,0.5)] dark:drop-shadow-[0_0_35px_rgba(255,24,1,0.7)] animate-bounce group-hover:scale-110 transition-transform duration-300 pointer-events-auto"
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dynamic Street Sync Keyword Badge (changes on auto or click) */}
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="px-6 py-2 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-md flex items-center gap-2.5 text-sm font-black uppercase tracking-widest font-display text-foreground transition-all group-hover:border-primary/50 group-hover:scale-105">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shrink-0 drop-shadow-[0_0_6px_rgba(255,24,1,0.8)]" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={itemIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.14 }}
                    className="text-foreground font-black tracking-widest font-display min-w-[70px] text-center inline-block"
                  >
                    {BOT_ITEMS[itemIndex].word}
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* All keywords strip with active one highlighted */}
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider font-display">
                {BOT_ITEMS.map((item, idx) => {
                  const isActive = idx === itemIndex;
                  return (
                    <button
                      key={item.word}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemIndex(idx);
                      }}
                      className={`relative px-2 py-0.5 rounded transition-all cursor-pointer ${
                        isActive
                          ? "text-primary font-black"
                          : "text-muted-foreground/60 hover:text-foreground"
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="activeKeyword"
                          className="absolute inset-0 bg-primary/10 border border-primary/30 rounded"
                          transition={{ type: "spring", stiffness: 550, damping: 28 }}
                        />
                      )}
                      <span className="relative z-10">{item.word}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
