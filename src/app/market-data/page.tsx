"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { MarketSidebar } from '@/components/MarketSidebar';
import { MarketDetails } from '@/components/MarketDetails';
import { ArrowLeft } from 'lucide-react';

export default function MarketDataPage() {
    // Persistent user preferences
    const [favorites, setFavorites] = useLocalStorage<string[]>('market_favorites', ['BTC', 'BNB', 'SOL', 'ETH', 'XRP']);
    const [fiat, setFiat] = useLocalStorage<string>('market_fiat', 'USD');
    
    // Session state
    const [selectedCoin, setSelectedCoin] = useState<string>('BTC');

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground font-sans">
            {/* Minimal Header */}
            <div className="h-14 border-b border-border bg-card/50 backdrop-blur-md flex items-center px-4 shrink-0 justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                    </Link>
                    <h1 className="text-xl font-black font-display uppercase tracking-tight italic">Street Sync <span className="text-primary">Markets</span></h1>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar (Pane 1) */}
                <div className="w-full md:w-[320px] lg:w-[350px] border-r border-border bg-card/10 flex flex-col shrink-0">
                <MarketSidebar 
                   favorites={favorites} 
                   setFavorites={setFavorites}
                   selectedCoin={selectedCoin}
                   setSelectedCoin={setSelectedCoin}
                   fiat={fiat}
                   setFiat={setFiat}
                />
            </div>
            
            {/* Main Details (Pane 2) */}
            <div className="flex-1 overflow-y-auto hidden md:block bg-background">
                <MarketDetails 
                   selectedCoin={selectedCoin}
                   fiat={fiat}
                />
            </div>
            </div>
        </div>
    );
}
