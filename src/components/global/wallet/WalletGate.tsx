"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClientWalletMultiButton as WalletMultiButton } from "@/components/global/wallet/ClientWalletMultiButton";
import { getStoredPhantomSession } from "@/lib/wallet/phantomDeeplink";

const BOT_ITEMS = [
  { word: "PREDICT", icon: "🎯", seed: "StreetSync" },
  { word: "TRADE", icon: "📈", seed: "CyberBot" },
  { word: "SWAP", icon: "🔄", seed: "EW9U" },
  { word: "STAKE", icon: "🥩", seed: "Solana" },
  { word: "NFTS", icon: "🖼️", seed: "NeonRider" },
];

const WORDS = [
  { text: "Do", highlight: false },
  { text: "EVERYTHING", highlight: true },
  { text: "Crypto", highlight: false },
  { text: "in", highlight: false },
  { text: "One", highlight: false },
  { text: "Space!", highlight: true },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const wordVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.8 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 450,
      damping: 24,
    },
  },
};

const chipsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.42,
    },
  },
};

const chipVariants = {
  hidden: { opacity: 0, scale: 0.5, y: 14 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 500,
      damping: 22,
    },
  },
};

export function WalletGate({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();
  const [hasMobileSession, setHasMobileSession] = useState(false);
  const hasConnected = useRef(false);
  const [showExitMessage, setShowExitMessage] = useState(false);
  const [itemIndex, setItemIndex] = useState(0);

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

  // Auto-cycle through features smoothly every 2.8 seconds in sync across both panels
  useEffect(() => {
    const timer = setInterval(() => {
      setItemIndex((prev) => (prev + 1) % BOT_ITEMS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

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
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black mb-3 sm:mb-5 text-foreground tracking-tight font-display">
            {showExitMessage ? (
              <span>System <span className="text-destructive">Disconnected</span>.</span>
            ) : (
              <span>Sync <span className="text-primary">It</span>.</span>
            )}
          </h2>

          {/* Animated Headline: Do EVERYTHING Crypto in One Space! popping up left to right */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mb-4 sm:mb-5 font-display"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {WORDS.map((w, idx) => (
              <motion.span
                key={idx}
                variants={wordVariants}
                className={`text-base sm:text-xl lg:text-2xl tracking-tight ${
                  w.highlight
                    ? "font-black text-primary drop-shadow-[0_0_12px_rgba(218,41,28,0.35)]"
                    : "font-bold text-foreground"
                }`}
              >
                {w.text}
              </motion.span>
            ))}
          </motion.div>

          {/* Animated Feature Badges popping up left to right in conjunction with the bot */}
          <motion.div
            className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap mb-6 sm:mb-8"
            variants={chipsContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {BOT_ITEMS.map((item, idx) => {
              const isActive = itemIndex === idx;
              return (
                <motion.button
                  key={item.word}
                  type="button"
                  onClick={() => setItemIndex(idx)}
                  variants={chipVariants}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider font-display transition-all duration-300 border flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(218,41,28,0.5)] scale-105"
                      : "bg-muted/70 text-muted-foreground border-border hover:text-foreground hover:bg-muted hover:border-border/80"
                  }`}
                >
                  <span className="text-xs">{item.icon}</span>
                  <span>{item.word}</span>
                </motion.button>
              );
            })}
          </motion.div>

          <motion.div 
            className="flex justify-center"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.35, type: "spring", stiffness: 350 }}
          >
             <WalletMultiButton className="!py-3 sm:!py-4 !px-6 sm:!px-10 !h-auto !text-base sm:!text-lg !bg-primary !text-primary-foreground hover:!bg-primary/90 hover:!scale-105 transition-all !rounded-xl !font-bold !uppercase !tracking-widest !shadow-lg !font-display" />
          </motion.div>
        </div>

        {/* Animated Bottts Robot Avatar on the Right (Desktop Only) */}
        <div className="hidden lg:flex flex-col items-center justify-center shrink-0">
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
              width={224}
              height={224}
              className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain drop-shadow-[0_0_25px_rgba(255,24,1,0.5)] dark:drop-shadow-[0_0_35px_rgba(255,24,1,0.7)] animate-bounce group-hover:scale-110 transition-transform duration-300 pointer-events-auto"
            />

            {/* Dynamic Street Sync Keyword Badge (changes on click / cycle) */}
            <div className="mt-4 flex flex-col items-center gap-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={itemIndex}
                  initial={{ opacity: 0, y: -6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 py-2 rounded-full bg-card/90 backdrop-blur-md border border-primary/40 shadow-md flex items-center gap-2.5 text-sm font-black uppercase tracking-widest font-display text-foreground"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shrink-0 drop-shadow-[0_0_6px_rgba(255,24,1,0.8)]" />
                  <span className="text-foreground font-black tracking-widest font-display">
                    {BOT_ITEMS[itemIndex].word}
                  </span>
                </motion.div>
              </AnimatePresence>

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
                        ? "text-primary bg-primary/10 border border-primary/30 scale-105"
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
