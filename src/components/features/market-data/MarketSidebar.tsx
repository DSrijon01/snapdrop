import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ChevronDown, Plus, X, Coins, Building2, Sparkles, Layers } from 'lucide-react';
import { useExchangeRates } from '../../../hooks/useExchangeRates';
import { 
    SecurityAsset, 
    fetchCuratedSecurities, 
    fetchTokensXyzAsset, 
    isKnownSecurity,
    POPULAR_SECURITIES_LIST 
} from '@/lib/tokensXyz';

interface SidebarProps {
    favorites: string[];
    setFavorites: (favs: string[]) => void;
    selectedCoin: string;
    setSelectedCoin: (coin: string) => void;
    fiat: string;
    setFiat: (fiat: string) => void;
    onSelectCoin?: (coin: string) => void;
}

export const MarketSidebar = ({ 
    favorites, 
    setFavorites, 
    selectedCoin, 
    setSelectedCoin, 
    fiat, 
    setFiat, 
    onSelectCoin 
}: SidebarProps) => {
    const [cryptoTickers, setCryptoTickers] = useState<any[]>([]);
    const [allTickers, setAllTickers] = useState<any[]>([]);
    const [curatedSecurities, setCuratedSecurities] = useState<SecurityAsset[]>([]);
    const [securityFavs, setSecurityFavs] = useState<Record<string, SecurityAsset>>({});
    const [activeCategory, setActiveCategory] = useState<'all' | 'crypto' | 'securities'>('all');
    
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [remoteSecurityResult, setRemoteSecurityResult] = useState<SecurityAsset | null>(null);
    const { formatPrice } = useExchangeRates();

    // 1. Fetch Curated Securities from Tokens.xyz API on mount
    useEffect(() => {
        let isMounted = true;
        const loadSecurities = async () => {
            const list = await fetchCuratedSecurities();
            if (isMounted && list.length > 0) {
                setCuratedSecurities(list);
            }
        };
        loadSecurities();
        const interval = setInterval(loadSecurities, 45000); // 45s refresh
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    // 2. Fetch Favorite Crypto Tickers from Binance
    useEffect(() => {
        const fetchCryptoFavorites = async () => {
            // Filter favorites that are NOT known securities
            const cryptoFavs = favorites.filter(fav => !isKnownSecurity(fav));
            if (cryptoFavs.length === 0) {
                setCryptoTickers([]);
                return;
            }
            try {
                const symbols = cryptoFavs.map(sym => `"${sym}USDT"`).join(',');
                const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbols}]`;
                const res = await fetch(url);
                const data = await res.json();
                if (Array.isArray(data)) {
                    const sorted = cryptoFavs.map(fav => data.find(d => d.symbol === `${fav}USDT`)).filter(Boolean);
                    setCryptoTickers(sorted);
                }
            } catch (e) {
                console.error("Failed to fetch favorite crypto tickers", e);
            }
        };

        fetchCryptoFavorites();
        const interval = setInterval(fetchCryptoFavorites, 12000);
        return () => clearInterval(interval);
    }, [favorites]);

    // 3. Fetch Favorite Securities from Tokens.xyz
    useEffect(() => {
        let isMounted = true;
        const fetchSecurityFavorites = async () => {
            const secFavs = favorites.filter(fav => isKnownSecurity(fav));
            if (secFavs.length === 0) {
                setSecurityFavs({});
                return;
            }

            const updates: Record<string, SecurityAsset> = {};
            await Promise.all(
                secFavs.map(async (sym) => {
                    // Check local curated list first
                    const cached = curatedSecurities.find(s => s && s.symbol?.toUpperCase() === sym.toUpperCase());
                    if (cached) {
                        updates[sym] = cached;
                    } else {
                        const direct = await fetchTokensXyzAsset(sym);
                        if (direct) updates[sym] = direct;
                    }
                })
            );

            if (isMounted) {
                setSecurityFavs(prev => ({ ...prev, ...updates }));
            }
        };

        fetchSecurityFavorites();
    }, [favorites, curatedSecurities]);

    // 4. Fetch Global Binance Index of all available crypto pairs
    useEffect(() => {
        const fetchGlobalTickers = async () => {
            try {
                const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
                const data = await res.json();
                if (Array.isArray(data)) {
                    const filtered = data
                        .filter(d => d.symbol.endsWith('USDT'))
                        .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
                    setAllTickers(filtered);
                }
            } catch (e) {
                console.error("Failed to fetch global tickers", e);
            }
        };
        fetchGlobalTickers();
    }, []);

    // 5. Intelligent Multi-Asset Search (Crypto + Securities + On-demand Tokens.xyz query)
    useEffect(() => {
        if (!searchQuery.trim()) {
            setRemoteSecurityResult(null);
            setIsSearching(false);
            return;
        }

        const query = searchQuery.toUpperCase().trim();
        setIsSearching(true);

        // Check if query could be a direct security ticker on Tokens.xyz
        let timer: any = null;
        if (query.length >= 2 && query.length <= 8) {
            timer = setTimeout(async () => {
                const result = await fetchTokensXyzAsset(query);
                setRemoteSecurityResult(result);
                setIsSearching(false);
            }, 350);
        } else {
            setIsSearching(false);
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [searchQuery]);

    // Filtered search results
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return { securities: [], cryptos: [] };
        const query = searchQuery.toUpperCase().trim();

        const securities = curatedSecurities.filter(sec => 
            sec && (
                sec.symbol?.toUpperCase().includes(query) || 
                sec.name?.toUpperCase().includes(query)
            )
        );

        const cryptos = allTickers
            .filter(t => t.symbol.includes(query))
            .slice(0, 20);

        return { securities, cryptos };
    }, [searchQuery, curatedSecurities, allTickers]);

    const handleSelect = (symbol: string) => {
        setSelectedCoin(symbol);
        onSelectCoin?.(symbol);
    };

    const handleAddFavorite = (symbolRaw: string, isSecurity = false) => {
        const base = isSecurity ? symbolRaw.toUpperCase() : symbolRaw.replace('USDT', '');
        if (!favorites.includes(base)) {
            setFavorites([...favorites, base]);
        }
        setSearchQuery('');
        setRemoteSecurityResult(null);
        handleSelect(base);
    };

    const handleRemoveFavorite = (base: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = favorites.filter(f => f !== base);
        setFavorites(updated);
        if (selectedCoin === base && updated.length > 0) {
            handleSelect(updated[0]);
        }
    };

    // Helper to generate dynamic sparkline SVG based on price direction
    const renderSparkline = (isPositive: boolean) => {
        const color = isPositive ? '#10b981' : '#ef4444';
        const d = isPositive 
            ? "M 0 18 Q 15 14, 25 8 T 48 2" 
            : "M 0 2 Q 15 8, 25 14 T 48 18";
        return (
            <svg viewBox="0 0 48 20" className="w-10 h-5 overflow-visible opacity-70">
                <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        );
    };

    // Badge styling for categories
    const renderCategoryBadge = (category?: string) => {
        switch (category) {
            case 'equity':
                return <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">Stock</span>;
            case 'etf':
                return <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30">ETF</span>;
            case 'commodity':
                return <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">Metal</span>;
            default:
                return <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Sec</span>;
        }
    };

    return (
        <div className="flex flex-col h-full bg-card border-r-0 md:border-r border-border">
            
            {/* Top Control Bar: Title & Fiat Selector */}
            <div className="p-3 sm:p-4 border-b border-border/50 flex flex-col gap-2.5 pt-3 sm:pt-4">
                
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-black font-display text-foreground tracking-tight">Market Assets</h2>
                    </div>
                    
                    {/* Fiat Selector */}
                    <div className="relative">
                        <select 
                            className="appearance-none bg-muted hover:bg-muted/80 transition-colors border border-border/50 text-foreground text-xs font-bold py-1.5 pl-2.5 pr-7 rounded-lg outline-none cursor-pointer"
                            value={fiat}
                            onChange={(e) => setFiat(e.target.value)}
                        >
                            <option value="USD">USD ($)</option>
                            <option value="THB">THB (฿)</option>
                            <option value="BDT">BDT (৳)</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                </div>

                {/* Category Filter Pills (All / Crypto / Securities) */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-xl border border-border/40">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                            activeCategory === 'all'
                                ? 'bg-background text-foreground shadow-xs font-black'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>All</span>
                    </button>
                    <button
                        onClick={() => setActiveCategory('crypto')}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                            activeCategory === 'crypto'
                                ? 'bg-background text-foreground shadow-xs font-black'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Crypto</span>
                    </button>
                    <button
                        onClick={() => setActiveCategory('securities')}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                            activeCategory === 'securities'
                                ? 'bg-background text-foreground shadow-xs font-black'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Securities</span>
                    </button>
                </div>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <input 
                        type="text"
                        placeholder="Search coins or stocks (e.g. TSLA, BTC)"
                        className="w-full bg-muted border border-border/60 rounded-xl py-2 pl-9 pr-8 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto w-full">
                
                {/* Search Results Overlay Layer */}
                {searchQuery && (
                    <div className="p-2 border-b border-border/60 bg-muted/40 backdrop-blur-md space-y-2">
                        <div className="flex items-center justify-between px-2 pt-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            <span>Search Results</span>
                            {isSearching && <span className="animate-pulse text-primary font-mono text-[10px]">Searching...</span>}
                        </div>

                        {/* Direct Security match if returned from API */}
                        {remoteSecurityResult && (
                            <div className="p-1 rounded-xl bg-primary/10 border border-primary/30">
                                <div className="text-[10px] font-black text-primary px-2 py-0.5 uppercase tracking-wide flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    <span>Verified Security</span>
                                </div>
                                <div 
                                    onClick={() => handleAddFavorite(remoteSecurityResult.symbol, true)}
                                    className="flex items-center justify-between p-2.5 hover:bg-primary/20 cursor-pointer rounded-lg transition-colors group"
                                >
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-black text-foreground text-sm">{remoteSecurityResult.symbol}</span>
                                            {renderCategoryBadge(remoteSecurityResult.category)}
                                        </div>
                                        <span className="text-[11px] text-muted-foreground truncate">{remoteSecurityResult.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-foreground">
                                            {formatPrice(remoteSecurityResult.price, fiat)}
                                        </span>
                                        <button className="bg-primary text-primary-foreground p-1 rounded-md shadow-xs hover:scale-105 transition-transform">
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Local Curated Securities Results */}
                        {searchResults.securities.length > 0 && (
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-blue-400 px-2 uppercase tracking-wide">Securities & Equities</div>
                                {searchResults.securities.map((sec) => (
                                    <div 
                                        key={`search-sec-${sec.symbol}`} 
                                        onClick={() => handleAddFavorite(sec.symbol, true)}
                                        className="flex justify-between items-center p-2.5 hover:bg-muted cursor-pointer rounded-lg border border-border/40 group transition-colors"
                                    >
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-black text-foreground text-xs sm:text-sm">{sec.symbol}</span>
                                                {renderCategoryBadge(sec.category)}
                                            </div>
                                            <span className="text-[11px] text-muted-foreground truncate">{sec.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-foreground">
                                                {formatPrice(sec.price, fiat)}
                                            </span>
                                            <button className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground p-1 rounded-md transition-colors">
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Crypto Results */}
                        {searchResults.cryptos.length > 0 && (
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-amber-500 px-2 uppercase tracking-wide">Crypto Pairs</div>
                                {searchResults.cryptos.map((res: any) => {
                                    const base = res.symbol.replace('USDT', '');
                                    return (
                                        <div 
                                            key={`search-cryp-${res.symbol}`} 
                                            onClick={() => handleAddFavorite(res.symbol, false)}
                                            className="flex justify-between items-center p-2.5 hover:bg-muted cursor-pointer rounded-lg border border-border/40 group transition-colors"
                                        >
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-black text-foreground text-xs sm:text-sm">{base}</span>
                                                <span className="text-[11px] text-muted-foreground">{base} Token</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-foreground">
                                                    {formatPrice(parseFloat(res.lastPrice), fiat)}
                                                </span>
                                                <button className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground p-1 rounded-md transition-colors">
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {!remoteSecurityResult && searchResults.securities.length === 0 && searchResults.cryptos.length === 0 && !isSearching && (
                            <div className="p-4 text-xs text-muted-foreground text-center font-medium">
                                No matching ticker found. Try typing a US stock symbol (e.g. AAPL, TSLA) or crypto (e.g. BTC).
                            </div>
                        )}
                    </div>
                )}

                {/* 1. WATCHLIST (Favorites) */}
                {!searchQuery && (
                    <div>
                        <div className="px-4 py-2 bg-muted/20 border-b border-border/40 flex items-center justify-between">
                            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                                Watchlist ({favorites.length})
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground font-semibold">Active Watch</span>
                        </div>

                        <div className="divide-y divide-border/20">
                            {favorites.map((favSymbol) => {
                                const isSecurity = isKnownSecurity(favSymbol);
                                
                                // Security asset data
                                const secData = securityFavs[favSymbol] || curatedSecurities.find(s => s.symbol.toUpperCase() === favSymbol.toUpperCase());
                                
                                // Crypto ticker data
                                const cryptoData = cryptoTickers.find(c => c.symbol === `${favSymbol}USDT`);

                                const isSelected = selectedCoin.toUpperCase() === favSymbol.toUpperCase();

                                const priceNum = isSecurity 
                                    ? (secData?.price || secData?.canonicalPrice || 0)
                                    : (cryptoData ? parseFloat(cryptoData.lastPrice) : 0);

                                const priceChange = isSecurity
                                    ? (secData?.priceChange24hPercent ?? 0)
                                    : (cryptoData ? parseFloat(cryptoData.priceChangePercent) : 0);

                                const isPositive = priceChange >= 0;
                                const displayName = isSecurity 
                                    ? (secData?.name || favSymbol)
                                    : `${favSymbol} Token`;

                                return (
                                    <div 
                                        key={`fav-${favSymbol}`}
                                        data-coin-id={favSymbol}
                                        onClick={() => handleSelect(favSymbol)}
                                        className={`relative flex items-center justify-between pl-4 pr-11 py-2.5 sm:py-3 cursor-pointer transition-colors group ${
                                            isSelected 
                                                ? 'bg-primary/15 border-l-4 border-l-primary' 
                                                : 'hover:bg-muted/60 border-l-4 border-l-transparent'
                                        }`}
                                    >
                                        {/* Left: Ticker, Category & Name */}
                                        <div className="flex flex-col flex-1 min-w-0 pr-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`font-black text-sm sm:text-base ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                    {favSymbol}
                                                </span>
                                                {isSecurity && renderCategoryBadge(secData?.category)}
                                            </div>
                                            <span className="text-[11px] text-muted-foreground truncate font-medium">
                                                {displayName}
                                            </span>
                                        </div>

                                        {/* Middle: Sparkline */}
                                        <div className="hidden sm:flex flex-1 justify-center px-1">
                                            {renderSparkline(isPositive)}
                                        </div>

                                        {/* Right: Price & 24h Pill */}
                                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                                            <span className="text-xs sm:text-sm font-black text-foreground font-mono">
                                                {priceNum > 0 ? formatPrice(priceNum, fiat) : '---'}
                                            </span>
                                            <div className={`px-1.5 py-0.2 rounded-md text-[10px] font-black font-mono flex items-center gap-0.5 ${
                                                isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                                            }`}>
                                                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                                            </div>
                                        </div>
                                        
                                        {/* Delete Action Button */}
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => handleRemoveFavorite(favSymbol, e)} 
                                                className="p-1.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                                                title="Remove from Watchlist"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 2. SECURITIES / TOKENIZED STOCKS SECTION (Tokens.xyz Powered) */}
                {!searchQuery && (activeCategory === 'all' || activeCategory === 'securities') && (
                    <div className="mt-2">
                        <div className="px-4 py-2 bg-blue-500/10 border-y border-blue-500/20 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                            <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-[11px] font-black text-blue-400 uppercase tracking-wider">
                                    Tokenized Securities
                                </span>
                            </div>
                            <span className="text-[10px] font-mono text-blue-400/80 font-bold">RWA</span>
                        </div>

                        <div className="divide-y divide-border/20">
                            {curatedSecurities.filter(Boolean).map((sec) => {
                                const isSelected = selectedCoin?.toUpperCase() === sec?.symbol?.toUpperCase();
                                const isFav = favorites?.includes(sec?.symbol);
                                const priceChange = sec?.priceChange24hPercent ?? 0;
                                const isPositive = priceChange >= 0;

                                return (
                                    <div 
                                        key={`sec-curated-${sec.symbol}`}
                                        data-coin-id={sec.symbol}
                                        onClick={() => handleSelect(sec.symbol)}
                                        className={`relative flex items-center justify-between pl-4 pr-11 py-2.5 sm:py-3 cursor-pointer transition-colors group ${
                                            isSelected 
                                                ? 'bg-blue-500/15 border-l-4 border-l-blue-500' 
                                                : 'hover:bg-muted/50 border-l-4 border-l-transparent'
                                        }`}
                                    >
                                        <div className="flex flex-col flex-1 min-w-0 pr-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`font-black text-sm sm:text-base ${isSelected ? 'text-blue-400' : 'text-foreground'}`}>
                                                    {sec.symbol}
                                                </span>
                                                {renderCategoryBadge(sec.category)}
                                            </div>
                                            <span className="text-[11px] text-muted-foreground truncate font-medium">
                                                {sec.name}
                                            </span>
                                        </div>

                                        <div className="hidden sm:flex flex-1 justify-center px-1">
                                            {renderSparkline(isPositive)}
                                        </div>

                                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                                            <span className="text-xs sm:text-sm font-black text-foreground font-mono">
                                                {formatPrice(sec.price || 0, fiat)}
                                            </span>
                                            <div className={`px-1.5 py-0.2 rounded-md text-[10px] font-black font-mono ${
                                                isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                                            }`}>
                                                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                                            </div>
                                        </div>

                                        {/* Add to favorites action */}
                                        {!isFav && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleAddFavorite(sec.symbol, true); }}
                                                    className="p-1.5 bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground rounded-lg transition-colors shadow-xs"
                                                    title="Add to Watchlist"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. TOP CRYPTO MARKETS SECTION */}
                {!searchQuery && (activeCategory === 'all' || activeCategory === 'crypto') && allTickers.length > 0 && (
                    <div className="mt-2">
                        <div className="px-4 py-2 bg-amber-500/10 border-y border-amber-500/20 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                            <div className="flex items-center gap-1.5">
                                <Coins className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-[11px] font-black text-amber-500 uppercase tracking-wider">
                                    Top Crypto Markets
                                </span>
                            </div>
                            <span className="text-[10px] font-mono text-amber-500/80 font-bold">Live</span>
                        </div>

                        <div className="divide-y divide-border/20 pb-28 md:pb-12">
                            {allTickers.slice(0, 50).map((coin: any) => {
                                const baseSymbol = coin.symbol.replace('USDT', '');
                                if (favorites.includes(baseSymbol)) return null;

                                const isSelected = selectedCoin.toUpperCase() === baseSymbol.toUpperCase();
                                const priceChange = parseFloat(coin.priceChangePercent);
                                const isPositive = priceChange >= 0;
                                const lastPrice = parseFloat(coin.lastPrice);

                                return (
                                    <div 
                                        key={`global-${baseSymbol}`}
                                        onClick={() => handleSelect(baseSymbol)}
                                        className={`relative flex items-center justify-between pl-4 pr-11 py-2.5 sm:py-3 cursor-pointer transition-colors group ${
                                            isSelected 
                                                ? 'bg-amber-500/15 border-l-4 border-l-amber-500' 
                                                : 'hover:bg-muted/50 border-l-4 border-l-transparent'
                                        }`}
                                    >
                                        <div className="flex flex-col flex-1 min-w-0 pr-2">
                                            <span className={`font-black text-sm sm:text-base ${isSelected ? 'text-amber-500' : 'text-foreground'}`}>
                                                {baseSymbol}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground truncate font-medium">
                                                {baseSymbol} Token
                                            </span>
                                        </div>

                                        <div className="hidden sm:flex flex-1 justify-center px-1">
                                            {renderSparkline(isPositive)}
                                        </div>

                                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                                            <span className="text-xs sm:text-sm font-black text-foreground font-mono">
                                                {formatPrice(lastPrice, fiat)}
                                            </span>
                                            <div className={`px-1.5 py-0.2 rounded-md text-[10px] font-black font-mono ${
                                                isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                                            }`}>
                                                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                                            </div>
                                        </div>

                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleAddFavorite(coin.symbol, false); }}
                                                className="p-1.5 bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground rounded-lg transition-colors shadow-xs"
                                                title="Add to Watchlist"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
