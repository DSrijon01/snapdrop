"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { MarketSidebar } from '@/components/MarketSidebar';
import { MarketDetails } from '@/components/MarketDetails';
import { ArrowLeft } from 'lucide-react';

const DEFAULT_FAVORITES = ['BTC', 'BNB', 'SOL', 'ETH', 'XRP'];

export default function MarketDataPage() {
    // Persistent user preferences
    const [favorites, setFavorites] = useLocalStorage<string[]>('market_favorites', DEFAULT_FAVORITES);
    const [fiat, setFiat] = useLocalStorage<string>('market_fiat', 'USD');
    
    // Session state
    const [selectedCoin, setSelectedCoin] = useState<string>('BTC');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className="flex h-full w-full bg-background items-center justify-center text-muted-foreground animate-pulse">Loading Market Data...</div>;
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-background text-foreground font-sans">

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
