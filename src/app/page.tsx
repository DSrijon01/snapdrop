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

      <header className="p-6 flex justify-between items-center z-10 sticky top-0 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-2">
           <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-pink-500 tracking-tighter text-shadow-glow cursor-default select-none">
             SnapDrop
           </h1>
        </div>
        <WalletMultiButton className="!bg-gradient-to-r !from-green-600 !to-pink-600 hover:!from-green-500 hover:!to-pink-500 transition-all !rounded-full !font-bold" />
      </header>
      
      <div className="flex-1 flex flex-col relative z-0">
        {!connected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
             <div className="p-8 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 max-w-lg shadow-2xl">
                <h2 className="text-4xl md:text-6xl font-black mb-6 text-white drop-shadow-lg">
                  {showExitMessage ? (
                    <span>See You <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-green-400">Again</span>.</span>
                  ) : (
                    <span>NFT <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-pink-500">Stream</span>.</span>
                  )}
                </h2>
                <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
                  Your decentralized photo stream on Solana. Connect your wallet to view your collection and mint exclusive SnapDrops.
                </p>
                <div className="flex justify-center">
                   <WalletMultiButton className="!py-4 !px-8 !h-auto !text-lg !bg-white !text-black hover:!scale-105 transition-transform !rounded-full !font-black" />
                </div>
             </div>
          </div>
        ) : (
          <div className="container mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             
             {/* Tab Navigation */}
             <div className="flex justify-center mb-8">
                 <div className="bg-black/40 backdrop-blur-lg border border-white/10 p-1.5 rounded-full flex gap-1 relative shadow-xl">
                      <button 
                          onClick={() => setActiveTab('stream')}
                          className={`relative px-8 py-2.5 rounded-full text-sm font-bold transition-all z-10 ${activeTab === 'stream' ? 'text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                      >
                          My Stream
                          {activeTab === 'stream' && (
                              <motion.div 
                                  layoutId="tab-bg"
                                  className="absolute inset-0 bg-gradient-to-r from-green-600 to-pink-600 rounded-full -z-10"
                                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                              />
                          )}
                      </button>
                      <button 
                          onClick={() => setActiveTab('marketplace')}
                          className={`relative px-8 py-2.5 rounded-full text-sm font-bold transition-all z-10 ${activeTab === 'marketplace' ? 'text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                      >
                          Marketplace
                          {activeTab === 'marketplace' && (
                              <motion.div 
                                  layoutId="tab-bg"
                                  className="absolute inset-0 bg-gradient-to-r from-green-600 to-pink-600 rounded-full -z-10"
                                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                              />
                          )}
                      </button>
                 </div>
             </div>

             {activeTab === 'stream' ? (
                <>
                    {/* Mint Section */}
                    <section className="flex justify-center">
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
                </>
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
