"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { ClientWalletMultiButton as WalletMultiButton } from "@/components/ClientWalletMultiButton";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { CandyMachineMint } from "@/components/CandyMachineMint";
import { NFTGallery } from "@/components/NFTGallery";
import { WalletContextProvider } from "@/components/WalletContextProvider";

import { Marketplace } from "@/components/Marketplace";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";

function SnapDropContent() {
  const { connected } = useWallet();
  const [activeTab, setActiveTab] = useState<'stream' | 'marketplace'>('stream');
  const [refreshTrigger, setRefreshTrigger] = useState(0); // For gallery
  const [bgRefreshTrigger, setBgRefreshTrigger] = useState(0); // For background
  
  // Track connection history for "See You Again" state
  const hasConnected = useRef(false);
  const [showExitMessage, setShowExitMessage] = useState(false);

  useEffect(() => {
    if (connected) {
      hasConnected.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowExitMessage(false);
    } else if (hasConnected.current) {
      // User just disconnected
      setShowExitMessage(true);
      setBgRefreshTrigger(prev => prev + 1); // Shuffle background
    }
  }, [connected]);

  const handleMintSuccess = () => {
      // Trigger a refresh
      setRefreshTrigger(prev => prev + 1);
  };

  return (
    <main className="min-h-screen relative flex flex-col">
      <AnimatedBackground refreshTrigger={bgRefreshTrigger} />

      <header className="p-6 flex justify-between items-center z-10 sticky top-0 bg-black/80 backdrop-blur-md border-b border-red-900/20">
        <div className="flex items-center gap-2">
           <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-red-600 via-red-500 to-white tracking-tighter text-shadow-glow cursor-default select-none uppercase italic transform -skew-x-6">
             Street Sync
           </h1>
        </div>
        <WalletMultiButton className="!bg-gradient-to-r !from-red-700 !to-black hover:!from-red-600 hover:!to-gray-900 transition-all !rounded-none !skew-x-[-10deg] !font-bold !border !border-red-500/50" />
      </header>
      
      {/* OpenSea-style Tab Navigation (Only visible when connected) */}
      {connected && (
        <div className="border-b border-white/10 bg-black/40 backdrop-blur-sm sticky top-[88px] z-20">
            <div className="container mx-auto px-6 flex items-center gap-8">
                <button
                    onClick={() => setActiveTab('stream')}
                    className={`py-4 text-base font-bold relative transition-colors ${
                        activeTab === 'stream' ? 'text-white' : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Collection
                    {activeTab === 'stream' && (
                        <motion.div 
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-600 rounded-full"
                        />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('marketplace')}
                    className={`py-4 text-base font-bold relative transition-colors ${
                        activeTab === 'marketplace' ? 'text-white' : 'text-gray-400 hover:text-white'
                    }`}
                >
                    Marketplace
                    {activeTab === 'marketplace' && (
                        <motion.div 
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-600 rounded-full"
                        />
                    )}
                </button>
            </div>
        </div>
      )}

      <div className="flex-1 flex flex-col relative z-0">
        {!connected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
             <div className="p-10 rounded-3xl bg-black/60 backdrop-blur-xl border border-red-900/30 max-w-lg shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                <h2 className="text-4xl md:text-6xl font-black mb-6 text-white drop-shadow-2xl tracking-tight">
                  {showExitMessage ? (
                    <span>System <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800">Disconnected</span>.</span>
                  ) : (
                    <span>Sync Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-white">Street</span>.</span>
                  )}
                </h2>
                <p className="text-lg md:text-xl text-gray-400 mb-8 leading-relaxed font-light">
                  The next generation of digital collectibles. Connect your wallet to access the marketplace.
                </p>
                <div className="flex justify-center">
                   <WalletMultiButton className="!py-4 !px-10 !h-auto !text-lg !bg-red-600 !text-white hover:!bg-red-700 hover:!scale-105 transition-all !rounded-none !skew-x-[-10deg] !font-black !uppercase !tracking-widest !shadow-lg !shadow-red-900/50" />
                </div>
             </div>
          </div>
        ) : (
            <div className="animate-in fade-in duration-500">
                {activeTab === 'stream' ? (
                    <div className="container mx-auto p-6 space-y-8">
                        {/* Mint Section */}
                        <section>
                            <CandyMachineMint onMintSuccess={handleMintSuccess} />
                        </section>

                        {/* Gallery Section */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                <span className="w-2 h-8 bg-gradient-to-b from-green-400 to-pink-500 rounded-full"/>
                                Your Stream
                            </h3>
                            </div>
                            <NFTGallery refreshTrigger={refreshTrigger} />
                        </section>
                    </div>
                ) : (
                    <Marketplace />
                )}
            </div>
        )}
      </div>

      <footer className="p-6 text-center text-xs text-gray-600 z-10 relative">
        <p>© 2025 SnapDrop. Built on Solana.</p>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <WalletContextProvider>
      <SnapDropContent />
    </WalletContextProvider>
  );
}
