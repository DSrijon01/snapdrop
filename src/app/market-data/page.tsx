"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { MarketSidebar } from '@/components/features/market-data/MarketSidebar';
import { MarketDetails } from '@/components/features/market-data/MarketDetails';
import { ArrowLeft } from 'lucide-react';
import { ModuleSubscriptionWidget } from '@/components/global/subscription/ModuleSubscriptionWidget';

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
            
            {/* Local Page Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
                <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight">
                    Market Data
                </h2>
                <ModuleSubscriptionWidget moduleId="market-data" />
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Sidebar (Pane 1 - Top on mobile, Left on Desktop) */}
                <div className="w-full h-[35vh] md:h-auto md:w-[320px] lg:w-[350px] border-b md:border-b-0 md:border-r border-border bg-card/10 flex flex-col shrink-0 overflow-hidden">
                    <MarketSidebar 
                       favorites={favorites} 
                       setFavorites={setFavorites}
                       selectedCoin={selectedCoin}
                       setSelectedCoin={setSelectedCoin}
                       fiat={fiat}
                       setFiat={setFiat}
                    />
                </div>
            
                {/* Main Details (Pane 2 - Bottom on mobile, Right on Desktop) */}
                <div className="flex-1 overflow-y-auto bg-background min-h-[50vh] md:min-h-0">
                    <MarketDetails 
                       selectedCoin={selectedCoin}
                       fiat={fiat}
                       favorites={favorites}
                       setFavorites={setFavorites}
                    />
                </div>
            </div>
        </div>
    );
}
