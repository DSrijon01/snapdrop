"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useEffect, useRef } from "react";
import { ClientWalletMultiButton as WalletMultiButton } from "@/components/ClientWalletMultiButton";

export function WalletGate({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();
  const hasConnected = useRef(false);
  const [showExitMessage, setShowExitMessage] = useState(false);

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

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center h-full w-full self-center justify-self-center my-auto">
      <div className="p-10 rounded-3xl bg-card border border-border max-w-lg shadow-xl mx-auto mt-20 md:mt-32">
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
    </div>
  );
}
