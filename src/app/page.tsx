"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { ClientWalletMultiButton as WalletMultiButton } from "@/components/ClientWalletMultiButton";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { CandyMachineMint } from "@/components/CandyMachineMint";
import { NFTGallery } from "@/components/NFTGallery";
import { WalletContextProvider } from "@/components/WalletContextProvider";

import { Marketplace } from "@/components/Marketplace";
import { ForSale } from "@/components/ForSale";
import { ThemeToggle } from "@/components/ThemeToggle"; 
import { Logo } from "@/components/Logo";
import { MobileSyncModal } from "@/components/MobileSyncModal";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";

const ADMIN_WALLET = "9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu";
import { AdminDashboard } from "@/components/AdminDashboard";

function StreetSyncContent() {
  const { connected, publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState<'stream' | 'marketplace' | 'for-sale' | 'admin'>('stream');
  const [refreshTrigger, setRefreshTrigger] = useState(0); // For gallery
  const [bgRefreshTrigger, setBgRefreshTrigger] = useState(0); // For background
  
  // Track connection history for "See You Again" state
  const hasConnected = useRef(false);
  const [showExitMessage, setShowExitMessage] = useState(false);
  const [showMobileSync, setShowMobileSync] = useState(false);

  const isAdmin = publicKey?.toBase58() === ADMIN_WALLET;

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
    <main className="min-h-screen relative flex flex-col bg-background text-foreground transition-colors duration-300">
      <AnimatedBackground refreshTrigger={bgRefreshTrigger} />
      
      <MobileSyncModal isOpen={showMobileSync} onClose={() => setShowMobileSync(false)} />

      <header className="p-4 md:p-6 flex justify-between items-center z-50 sticky top-0 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2">
            <Logo size={32} className="rounded-sm md:w-10 md:h-10" /> 
           <h1 className="hidden md:block text-3xl font-black text-[var(--brand-text-color)] tracking-tighter cursor-default select-none uppercase italic transform -skew-x-6 font-display">
             Street Sync
           </h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setShowMobileSync(true)}
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-foreground border border-border"
              aria-label="Mobile Sync"
              title="Sync to Mobile"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <path d="M12 18h.01"></path>
              </svg>
            </button>
            <ThemeToggle />
            <WalletMultiButton className="!bg-primary hover:!bg-primary/90 transition-all !rounded-xl !font-bold !text-primary-foreground !px-3 md:!px-6 !text-sm md:!text-base !h-10 md:!h-12" />
        </div>
      </header>
      
      {/* OpenSea-style Tab Navigation (Only visible when connected) */}
      {connected && (
        <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-[88px] z-40">
            <div className="container mx-auto px-6 flex items-center gap-8 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('stream')}
                    className={`py-4 text-base font-bold font-display uppercase tracking-wide relative transition-colors whitespace-nowrap ${
                        activeTab === 'stream' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Collection
                    {activeTab === 'stream' && (
                        <motion.div 
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
                        />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('marketplace')}
                    className={`py-4 text-base font-bold font-display uppercase tracking-wide relative transition-colors whitespace-nowrap ${
                        activeTab === 'marketplace' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Marketplace
                    {activeTab === 'marketplace' && (
                        <motion.div 
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
                        />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('for-sale')}
                    className={`py-4 text-base font-bold font-display uppercase tracking-wide relative transition-colors whitespace-nowrap ${
                        activeTab === 'for-sale' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    For Sale
                    {activeTab === 'for-sale' && (
                        <motion.div 
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
                        />
                    )}
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('admin')}
                        className={`py-4 text-base font-bold font-display uppercase tracking-wide relative transition-colors whitespace-nowrap text-red-500 hover:text-red-400`}
                    >
                        One Click Launch
                         {activeTab === 'admin' && (
                            <motion.div 
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-500 rounded-full"
                            />
                        )}
                    </button>
                )}
            </div>
        </div>
      )}

      <div className="flex-1 flex flex-col relative z-0">
        {!connected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
             <div className="p-10 rounded-3xl bg-card border border-border max-w-lg shadow-xl">
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
                            <h3 className="text-2xl font-bold text-foreground flex items-center gap-2 font-display uppercase tracking-tight">
                                <span className="w-2 h-8 bg-primary rounded-full"/>
                                Your Stream
                            </h3>
                            </div>
                            <NFTGallery refreshTrigger={refreshTrigger} />
                        </section>
                    </div>
                ) : activeTab === 'marketplace' ? (
                    <Marketplace displayMode="real" />
                ) : activeTab === 'admin' ? (
                    <div className="container mx-auto">
                        <AdminDashboard />
                    </div>
                ) : (
                    <ForSale />
                )}
            </div>
        )}
      </div>

      <footer className="p-6 text-center text-xs text-muted-foreground z-10 relative border-t border-border bg-background">
        <p>© 2026 Street Sync. Built on Solana.</p>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <WalletContextProvider>
      <StreetSyncContent />
    </WalletContextProvider>
  );
}
