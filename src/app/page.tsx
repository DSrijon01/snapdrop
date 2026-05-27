"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { ClientWalletMultiButton as WalletMultiButton } from "@/components/global/wallet/ClientWalletMultiButton";
import { AnimatedBackground } from "@/components/global/theme-logo/AnimatedBackground";
import { StackedNFTGallery } from "@/app/snbl/_components/StackedNFTGallery";
import { NFTGallery } from "@/components/features/nft-marketplace/NFTGallery";

import { Marketplace } from "@/components/features/nft-marketplace/Marketplace";
import { ForSale } from "@/components/features/nft-marketplace/ForSale";
import { TokensGallery } from "@/components/features/nft-marketplace/TokensGallery";
import { SellTokens } from "@/components/features/nft-marketplace/SellTokens";
import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";

const ADMIN_WALLET = "9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu";
import { AdminDashboard } from "@/components/features/one-click-launch/AdminDashboard";

function StreetSyncContent() {
  const { connected, publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState<'stream' | 'for-sale' | 'marketplace' | 'sell-tokens' | 'admin'>('stream');
  const [subTab, setSubTab] = useState<'nfts' | 'tokens'>('nfts');
  const [refreshTrigger, setRefreshTrigger] = useState(0); // For gallery
  const [bgRefreshTrigger, setBgRefreshTrigger] = useState(0); // For background
  
  const isAdmin = publicKey?.toBase58() === ADMIN_WALLET;

  const handleMintSuccess = () => {
      // Trigger a refresh
      setRefreshTrigger(prev => prev + 1);
  };

  return (
    <main className="min-h-screen relative flex flex-col bg-background text-foreground transition-colors duration-300">
      <AnimatedBackground refreshTrigger={bgRefreshTrigger} />
      
        {/* OpenSea-style Tab Navigation (Only visible when connected) */}
        <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-[0px] z-40">
            <div className="container mx-auto px-6 flex items-center gap-8 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('stream')}
                    className={`py-4 text-base font-bold font-display uppercase tracking-wide relative transition-colors whitespace-nowrap ${
                        activeTab === 'stream' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Buy and List NFTs
                    {activeTab === 'stream' && (
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
                    NFTs for Sale
                    {activeTab === 'for-sale' && (
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
                    Buy Tokens
                    {activeTab === 'marketplace' && (
                        <motion.div 
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
                        />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('sell-tokens')}
                    className={`py-4 text-base font-bold font-display uppercase tracking-wide relative transition-colors whitespace-nowrap ${
                        activeTab === 'sell-tokens' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Sell Tokens
                    {activeTab === 'sell-tokens' && (
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

        <div className="flex-1 flex flex-col relative overflow-hidden">
            <div className="animate-in fade-in duration-500">
                {activeTab === 'stream' ? (
                    <div className="container mx-auto px-4 py-4 space-y-4">
                        <section>
                            <StackedNFTGallery />
                        </section>

                        <section>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 border-b border-border/60 pb-3 gap-4 font-display">
                                <h3 className="text-xl font-bold text-foreground flex items-center gap-2 font-display uppercase tracking-tight">
                                    <span className="w-1.5 h-6 bg-primary rounded-full"/>
                                    Your Stream
                                </h3>
                                
                                <div className="flex bg-muted p-1 rounded-xl border border-border">
                                    <button
                                        onClick={() => setSubTab('nfts')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wide font-display ${
                                            subTab === 'nfts'
                                                ? 'bg-background text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        My NFTs
                                    </button>
                                    <button
                                        onClick={() => setSubTab('tokens')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wide font-display ${
                                            subTab === 'tokens'
                                                ? 'bg-background text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        My Tokens / Portfolio
                                    </button>
                                </div>
                            </div>
                            
                            {subTab === 'nfts' ? (
                                <NFTGallery refreshTrigger={refreshTrigger} />
                            ) : (
                                <TokensGallery refreshTrigger={refreshTrigger} />
                            )}
                        </section>
                    </div>
                ) : activeTab === 'marketplace' ? (
                    <Marketplace displayMode="real" />
                ) : activeTab === 'sell-tokens' ? (
                    <SellTokens />
                ) : activeTab === 'admin' ? (
                    <div className="container mx-auto">
                        <AdminDashboard />
                    </div>
                ) : (
                    <ForSale />
                )}
            </div>
        </div>

    </main>
  );
}

export default function Home() {
  return <StreetSyncContent />;
}
