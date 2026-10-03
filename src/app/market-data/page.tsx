"use client";

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { MarketSidebar } from '@/components/features/market-data/MarketSidebar';
import { MarketDetails } from '@/components/features/market-data/MarketDetails';
import { ModuleSubscriptionWidget } from '@/components/global/subscription/ModuleSubscriptionWidget';
import { LineChart as ChartIcon, ListFilter } from 'lucide-react';

const DEFAULT_FAVORITES = ['BTC', 'BNB', 'SOL', 'ETH', 'XRP'];

export default function MarketDataPage() {
    // Persistent user preferences
    const [favorites, setFavorites] = useLocalStorage<string[]>('market_favorites', DEFAULT_FAVORITES);
    const [fiat, setFiat] = useLocalStorage<string>('market_fiat', 'USD');
    
    // Session state
    const [selectedCoin, setSelectedCoin] = useState<string>('BTC');
    const [mobileTab, setMobileTab] = useState<'chart' | 'watchlist'>('chart');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleSelectCoin = (coin: string) => {
        setSelectedCoin(coin);
        setMobileTab('chart');
    };

    if (!isMounted) {
        return <div className="flex h-full w-full bg-background items-center justify-center text-muted-foreground animate-pulse">Loading Market Data...</div>;
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-background text-foreground font-sans">
            
            {/* Local Page Header */}
            <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-border/40 shrink-0 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-lg sm:text-2xl font-black font-display uppercase tracking-tight whitespace-nowrap">
                        Market Data
                    </h2>
                </div>
                <div className="shrink-0 scale-90 sm:scale-100 origin-right">
                    <ModuleSubscriptionWidget moduleId="market-data" />
                </div>
            </div>

            {/* Mobile Tab Switcher (Visible only on mobile) */}
            <div className="md:hidden px-3 pt-2 pb-1 border-b border-border/30 bg-muted/20 shrink-0">
                <div className="grid grid-cols-2 gap-1 p-1 bg-muted/60 rounded-xl">
                    <button
                        onClick={() => setMobileTab('chart')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                            mobileTab === 'chart'
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <ChartIcon className="w-3.5 h-3.5 text-primary" />
                        <span className="truncate">{selectedCoin} Chart & Stats</span>
                    </button>
                    <button
                        onClick={() => setMobileTab('watchlist')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                            mobileTab === 'watchlist'
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <ListFilter className="w-3.5 h-3.5 text-primary" />
                        <span className="truncate">Watchlist ({favorites?.length || 0})</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Sidebar (Watchlist & Market search) */}
                <div className={`w-full md:w-[320px] lg:w-[350px] border-b md:border-b-0 md:border-r border-border bg-card/10 flex-col shrink-0 overflow-hidden ${
                    mobileTab === 'watchlist' ? 'flex flex-1 h-full' : 'hidden md:flex md:h-auto'
                }`}>
                    <MarketSidebar 
                       favorites={favorites} 
                       setFavorites={setFavorites}
                       selectedCoin={selectedCoin}
                       setSelectedCoin={handleSelectCoin}
                       onSelectCoin={handleSelectCoin}
                       fiat={fiat}
                       setFiat={setFiat}
                    />
                </div>
            
                {/* Main Details (Chart, Key Stats, Metrics) */}
                <div className={`flex-1 overflow-y-auto bg-background min-h-0 ${
                    mobileTab === 'chart' ? 'flex flex-col flex-1 h-full' : 'hidden md:flex md:flex-col'
                }`}>
                    <MarketDetails 
                       selectedCoin={selectedCoin}
                       fiat={fiat}
                       favorites={favorites}
                       setFavorites={setFavorites}
                       onSelectCoin={handleSelectCoin}
                       onOpenWatchlist={() => setMobileTab('watchlist')}
                    />
                </div>
            </div>
        </div>
    );
}

