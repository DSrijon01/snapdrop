import { useState, useEffect } from 'react';
import { Search, ChevronDown, TrendingUp, TrendingDown, Plus, X } from 'lucide-react';
import { useExchangeRates } from '../hooks/useExchangeRates';

interface SidebarProps {
    favorites: string[];
    setFavorites: (favs: string[]) => void;
    selectedCoin: string;
    setSelectedCoin: (coin: string) => void;
    fiat: string;
    setFiat: (fiat: string) => void;
}

export const MarketSidebar = ({ favorites, setFavorites, selectedCoin, setSelectedCoin, fiat, setFiat }: SidebarProps) => {
    const [tickers, setTickers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const { rates, formatPrice } = useExchangeRates();

    // Fetch favorite tickers
    useEffect(() => {
        const fetchTickers = async () => {
            if (favorites.length === 0) return;
            try {
                // Ensure USDT pairings
                const symbols = favorites.map(sym => `"${sym}USDT"`).join(',');
                const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbols}]`;
                const res = await fetch(url);
                const data = await res.json();
                if (Array.isArray(data)) {
                    // Sort to match favorites array order
                    const sorted = favorites.map(fav => data.find(d => d.symbol === `${fav}USDT`)).filter(Boolean);
                    setTickers(sorted);
                }
            } catch (e) {
                console.error("Failed to fetch favorite tickers", e);
            }
        };
        fetchTickers();
        const interval = setInterval(fetchTickers, 10000); // 10s updates
        return () => clearInterval(interval);
    }, [favorites]);

    // Async search for individual coins if user types
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const sym = searchQuery.toUpperCase() + 'USDT';
                const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults([data]);
                } else {
                    setSearchResults([]);
                }
            } catch (e) {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleAddFavorite = (symbolRaw: string) => {
        const base = symbolRaw.replace('USDT', '');
        if (!favorites.includes(base)) {
            setFavorites([...favorites, base]);
        }
        setSearchQuery('');
        setSelectedCoin(base);
    };

    const handleRemoveFavorite = (base: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setFavorites(favorites.filter(f => f !== base));
        if (selectedCoin === base && favorites.length > 1) {
            setSelectedCoin(favorites.find(f => f !== base) || favorites[0]);
        }
    };

    // Helper to generate a dummy sparkline based on trend
    const renderSparkline = (isPositive: boolean) => {
        const color = isPositive ? '#10b981' : '#ef4444'; // green : red
        // Just a simple bezier curve that generally goes up or down
        const d = isPositive 
            ? "M 0 20 Q 15 15, 25 10 T 50 0" 
            : "M 0 0 Q 15 10, 25 15 T 50 20";
        return (
            <svg viewBox="0 0 50 20" className="w-12 h-6 overflow-visible opacity-70">
                <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        );
    };

    return (
        <div className="flex flex-col h-full bg-card border-r border-border">
            
            {/* Search Top Bar */}
            <div className="p-4 border-b border-border/50 gap-3 flex flex-col pt-6">
                
                <div className="flex justify-between items-center mb-1">
                    <h2 className="text-xl font-bold font-display text-foreground">Watchlist</h2>
                    
                    {/* Fiat Selector Dropdown (Native) */}
                    <div className="relative">
                        <select 
                            className="appearance-none bg-muted hover:bg-muted/80 transition-colors border border-border/50 text-foreground text-xs font-bold py-1.5 pl-3 pr-7 rounded-md outline-none cursor-pointer"
                            value={fiat}
                            onChange={(e) => setFiat(e.target.value)}
                        >
                            <option value="USD">USD</option>
                            <option value="THB">THB</option>
                            <option value="BDT">BDT</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1.5 w-3 h-3 text-muted-foreground pointer-events-none" />
                    </div>
                </div>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search coins (e.g. ETH)"
                        className="w-full bg-muted border border-border/50 rounded-lg py-2 pl-9 pr-4 text-sm text-foreground focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto w-full">
                
                {/* Search Results Overlay Layer */}
                {searchQuery && (
                    <div className="p-2 border-b border-border/50 bg-muted/50 backdrop-blur-md">
                        <div className="text-xs text-gray-500 font-bold px-2 py-1 uppercase">Search Results</div>
                        {isSearching ? (
                            <div className="p-3 text-sm text-gray-400 text-center">Searching...</div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map((res: any) => {
                                const base = res.symbol.replace('USDT', '');
                                return (
                                <div key={res.symbol} className="flex justify-between items-center p-3 hover:bg-muted cursor-pointer rounded-lg m-1 group" onClick={() => handleAddFavorite(res.symbol)}>
                                    <div className="font-bold text-foreground text-sm">{base}</div>
                                    <button className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors p-1 rounded-md">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            )})
                        ) : (
                            <div className="p-3 text-sm text-gray-400 text-center">No paired USDT coin found</div>
                        )}
                    </div>
                )}

                {/* Favorites List */}
                <div className="py-2">
                    {tickers.map((coin: any) => {
                        const baseSymbol = coin.symbol.replace('USDT', '');
                        const isSelected = selectedCoin === baseSymbol;
                        const priceChange = parseFloat(coin.priceChangePercent);
                        const isPositive = priceChange >= 0;
                        const lastPrice = parseFloat(coin.lastPrice);

                        return (
                            <div 
                                key={baseSymbol}
                                onClick={() => setSelectedCoin(baseSymbol)}
                                className={`flex items-center justify-between px-4 py-3 cursor-pointer border-b border-border/20 transition-colors group
                                    ${isSelected ? 'bg-primary/20 border-l-4 border-l-primary' : 'hover:bg-white/5 border-l-4 border-l-transparent'}
                                `}
                            >
                                {/* Left: Ticker & Name */}
                                <div className="flex flex-col flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold text-base ${isSelected ? 'text-primary' : 'text-foreground'}`}>{baseSymbol}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 truncate mt-0.5">{baseSymbol} Token</span>
                                </div>

                                {/* Middle: Sparkline */}
                                <div className="flex-1 flex justify-center px-2">
                                    {renderSparkline(isPositive)}
                                </div>

                                {/* Right: Price & Pill */}
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className="text-sm font-bold text-foreground font-mono">
                                        {formatPrice(lastPrice, fiat)}
                                    </span>
                                    <div className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono flex items-center gap-1
                                        ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}
                                    `}>
                                        {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                                    </div>
                                </div>
                                
                                {/* Delete Hover Action */}
                                <div className="absolute left-1 hidden group-hover:flex items-center">
                                     <button onClick={(e) => handleRemoveFavorite(baseSymbol, e)} className="p-1 bg-red-500/80 rounded-full text-white scale-75 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X className="w-3 h-3" />
                                     </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            {/* Apple Stocks signature bottom gradient detail */}
            <div className="h-6 bg-gradient-to-t from-background to-transparent pointer-events-none mt-auto"></div>
        </div>
    );
};
