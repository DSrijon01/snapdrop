import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    LineChart as LucideLineChart, 
    Activity, 
    TrendingUp, 
    TrendingDown, 
    BarChart2, 
    Flame, 
    Zap 
} from 'lucide-react';
import { useExchangeRates } from '../../../hooks/useExchangeRates';
import { 
    ResponsiveContainer, 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    Tooltip as RechartsTooltip, 
    ReferenceLine,
    ComposedChart,
    Bar
} from 'recharts';

// Custom SVG icon for Candlestick Chart toggle
const CandlestickIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
    {/* Green candle */}
    <line x1="5" y1="2" x2="5" y2="14" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="3.5" y="4" width="3" height="6" fill="#10b981" rx="0.5"/>
    
    {/* Red candle */}
    <line x1="11" y1="2" x2="11" y2="14" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="9.5" y="7" width="3" height="6" fill="#ef4444" rx="0.5"/>
  </svg>
);

// Customized shape component to render candlesticks in Recharts Bar Chart
const CustomCandlestick = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!payload) return null;

    const { open, close, high, low } = payload;
    const isUp = close >= open;
    const color = isUp ? '#10b981' : '#ef4444'; // Green for up, Red for down

    const priceDiff = Math.abs(open - close);
    const scale = priceDiff > 0 ? (height / priceDiff) : 0;

    const bodyMax = Math.max(open, close);
    const bodyMin = Math.min(open, close);

    const yHigh = y - (high - bodyMax) * scale;
    const yLow = y + height + (bodyMin - low) * scale;

    const wickX = x + width / 2;

    return (
        <g>
            {/* High/Low Wick Line */}
            <line 
                x1={wickX} 
                y1={yHigh} 
                x2={wickX} 
                y2={yLow} 
                stroke={color} 
                strokeWidth={1.5} 
            />
            {/* Open/Close Candle Body */}
            <rect 
                x={x} 
                y={y} 
                width={width} 
                height={Math.max(height, 1.5)} // Ensure candle body is always visible
                fill={color}
                stroke={color}
                strokeWidth={1.5}
            />
        </g>
    );
};

interface DetailsProps {
    selectedCoin: string; // e.g. "BTC"
    fiat: string;         // e.g. "USD"
    favorites?: string[];
    setFavorites?: (favs: string[]) => void;
    onSelectCoin?: (coin: string) => void;
    onOpenWatchlist?: () => void;
    onOpenChart?: () => void;
    viewMode?: 'chart' | 'quote' | 'both';
}

const CIRCULATING_SUPPLIES: Record<string, number> = {
    'BTC': 19688000,
    'ETH': 120000000,
    'BNB': 149500000,
    'SOL': 447000000,
    'XRP': 55000000000
};

const TIMEFRAMES = [
    { label: '1D', interval: '5m', limit: 288 },
    { label: '1W', interval: '1h', limit: 168 },
    { label: '1M', interval: '4h', limit: 180 },
    { label: '3M', interval: '12h', limit: 180 },
    { label: '6M', interval: '1d', limit: 180 },
    { label: 'YTD', interval: '1d', limit: 0 }, // dynamically calculate
    { label: '1Y', interval: '1d', limit: 365 },
    { label: '2Y', interval: '1d', limit: 730 },
    { label: '5Y', interval: '1w', limit: 260 },
    { label: '10Y', interval: '1w', limit: 520 },
    { label: 'ALL', interval: '1w', limit: 1000 },
];

export const MarketDetails = ({ 
    selectedCoin, 
    fiat, 
    favorites, 
    setFavorites, 
    onSelectCoin, 
    onOpenWatchlist,
    onOpenChart,
    viewMode = 'both'
}: DetailsProps) => {
    const { rates, formatPrice } = useExchangeRates();
    const [ticker, setTicker] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [currentTimeframe, setCurrentTimeframe] = useState(TIMEFRAMES[0]);
    const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');
    const [isLoadingChart, setIsLoadingChart] = useState(false);

    // Fetch live Ticker stats
    useEffect(() => {
        if (!selectedCoin) return;
        const fetchTicker = async () => {
            try {
                const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${selectedCoin}USDT`);
                if (res.ok) setTicker(await res.json());
            } catch (e) {
                console.error("Failed to fetch ticker for", selectedCoin);
            }
        };
        fetchTicker();
        const interval = setInterval(fetchTicker, 10000);
        return () => clearInterval(interval);
    }, [selectedCoin]);

    // Fetch Historical Data for Chart
    useEffect(() => {
        if (!selectedCoin) return;
        const fetchChart = async () => {
            setIsLoadingChart(true);
            try {
                let limit = currentTimeframe.limit;
                if (currentTimeframe.label === 'YTD') {
                    const daysSinceJan1 = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24));
                    limit = Math.max(daysSinceJan1, 2); // default minimal safety
                }
                const url = `https://api.binance.com/api/v3/klines?symbol=${selectedCoin}USDT&interval=${currentTimeframe.interval}&limit=${limit}`;
                const res = await fetch(url);
                const data = await res.json();
                
                if (Array.isArray(data)) {
                    // Formatting data for chart
                    const formatted = data.map((d: any) => {
                        const open = parseFloat(d[1]);
                        const high = parseFloat(d[2]);
                        const low = parseFloat(d[3]);
                        const close = parseFloat(d[4]);
                        
                        return {
                            date: new Date(d[0]).toLocaleDateString(undefined, { 
                                month: 'short', 
                                day: 'numeric',
                                ...(currentTimeframe.label === '1D' ? { hour: '2-digit', minute: '2-digit' } : {}) 
                            }),
                            rawPrice: close,
                            formattedPrice: formatPrice(close, fiat),
                            open,
                            high,
                            low,
                            close,
                            range: [low, high]
                        };
                    });
                    setChartData(formatted);
                }
            } catch (e) {
                console.error("Failed to load historical chart", e);
            } finally {
                setIsLoadingChart(false);
            }
        };
        fetchChart();
    }, [selectedCoin, currentTimeframe, fiat]);

    // Parse metric values
    const high = ticker?.highPrice ? parseFloat(ticker.highPrice) : 0;
    const low = ticker?.lowPrice ? parseFloat(ticker.lowPrice) : 0;
    const last = ticker?.lastPrice ? parseFloat(ticker.lastPrice) : 0;
    const baseVolumeNum = ticker?.volume ? parseFloat(ticker.volume) : 0;
    const quoteVolumeNum = ticker?.quoteVolume ? parseFloat(ticker.quoteVolume) : 0;
    const tradesCount = ticker?.count ? Number(ticker.count) : null;
    
    // 24h range percent calculation (0% to 100%)
    const rangePercent = (high > low && last >= low)
        ? Math.min(Math.max(((last - low) / (high - low)) * 100, 2), 98)
        : 50;

    // Intraday volatility
    const volatilityPercent = (low > 0 && high >= low)
        ? (((high - low) / low) * 100).toFixed(2)
        : '0.00';

    // Market capitalization
    const circulatingSupply = CIRCULATING_SUPPLIES[selectedCoin];
    const marketCap = (circulatingSupply && last > 0)
        ? circulatingSupply * last
        : null;

    // Helper for compact currency formatting
    const formatCompact = (val: number, cur: string) => {
        const rate = rates[cur] || 1;
        const converted = val * rate;
        const symbol = cur === 'THB' ? '฿' : cur === 'BDT' ? '৳' : '$';
        const formatted = new Intl.NumberFormat('en-US', {
            notation: "compact",
            compactDisplay: "short",
            maximumFractionDigits: 2
        }).format(converted);
        return `${symbol}${formatted}`;
    };

    const currentPrice = ticker ? formatPrice(last, fiat) : '---';
    const pctChange24h = ticker ? parseFloat(ticker.priceChangePercent) : 0;
    const isPositive24h = pctChange24h >= 0;

    // Dynamic stroke color for LineChart based on net change
    const baselinePrice = chartData.length > 0 ? chartData[0].close : 0;
    const latestPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : 0;
    const isUpTrend = latestPrice >= baselinePrice;
    const strokeColor = isUpTrend ? '#10b981' : '#ef4444'; // Green or Red

    // Custom Interactive Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            if (chartType === 'candlestick') {
                return (
                    <div className="bg-black/90 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl border border-border shadow-xl text-xs space-y-1">
                        <div className="font-semibold text-muted-foreground">{label}</div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono pt-1">
                            <span className="text-muted-foreground">OPEN:</span>
                            <span className="font-bold text-right">{formatPrice(data.open, fiat)}</span>
                            <span className="text-emerald-500 font-bold">HIGH:</span>
                            <span className="font-bold text-right text-emerald-500">{formatPrice(data.high, fiat)}</span>
                            <span className="text-red-500 font-bold">LOW:</span>
                            <span className="font-bold text-right text-red-500">{formatPrice(data.low, fiat)}</span>
                            <span className="text-muted-foreground">CLOSE:</span>
                            <span className="font-bold text-right">{formatPrice(data.close, fiat)}</span>
                        </div>
                    </div>
                );
            }
            const raw = payload[0].value;
            return (
                <div className="bg-black/90 backdrop-blur-md text-white px-3 py-2 rounded-xl border border-border shadow-xl text-sm">
                    <div className="font-medium text-xs text-muted-foreground mb-1">{label}</div>
                    <div className="font-mono font-bold text-foreground">{formatPrice(raw, fiat)}</div>
                </div>
            );
        }
        return null;
    };

    // Quick Favorite Coin Chips Bar
    const renderCoinChips = () => (
        favorites && favorites.length > 0 && (
            <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-hide shrink-0">
                {favorites.map((coin) => (
                    <button
                        key={coin}
                        onClick={() => onSelectCoin?.(coin)}
                        className={`px-3 py-1 rounded-full text-xs font-mono font-bold shrink-0 transition-all ${
                            selectedCoin === coin
                                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 scale-105'
                                : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <span>{coin}</span>
                    </button>
                ))}
                {onOpenWatchlist && (
                    <button
                        onClick={onOpenWatchlist}
                        className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold text-primary bg-primary/10 hover:bg-primary/20 shrink-0 transition-colors"
                    >
                        + All Coins
                    </button>
                )}
            </div>
        )
    );

    // Header with Title, Price and Watchlist Toggle
    const renderHeader = () => (
        <div className="mb-2 md:mb-3 shrink-0 flex items-start justify-between gap-2">
            <div>
                <div className="flex items-center gap-2 mb-0">
                    <h1 className="text-2xl md:text-4xl font-black font-display text-primary uppercase leading-none">{selectedCoin}</h1>
                    <span className="text-xs md:text-xl text-muted-foreground font-mono">{selectedCoin} Token</span>
                </div>
                
                <div className="flex flex-col mt-1">
                    <span className="text-2xl sm:text-3xl md:text-5xl font-mono font-black tracking-tighter text-foreground leading-none">
                        {currentPrice}
                    </span>
                    <span className={`text-xs sm:text-sm md:text-xl font-bold font-mono ${isPositive24h ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isPositive24h ? '+' : ''}{pctChange24h.toFixed(2)}% Today
                    </span>
                </div>
            </div>

            {favorites && setFavorites && (
                <button 
                    onClick={() => {
                        if (favorites.includes(selectedCoin)) {
                            setFavorites(favorites.filter(c => c !== selectedCoin));
                        } else {
                            setFavorites([...favorites, selectedCoin]);
                        }
                    }}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full font-bold text-[10px] md:text-sm transition self-start shrink-0 ${
                        favorites.includes(selectedCoin) 
                            ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                >
                    {favorites.includes(selectedCoin) ? 'Remove Watchlist' : 'Add to Watchlist'}
                </button>
            )}
        </div>
    );

    // Timeframe and Candlestick toggles
    const renderChartControls = () => (
        <div className="flex items-center justify-between mb-2 md:mb-3 shrink-0 gap-3">
            <div className="flex gap-1 md:gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {TIMEFRAMES.map((tf) => (
                    <button
                        key={tf.label}
                        onClick={() => setCurrentTimeframe(tf)}
                        className={`px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold transition-colors shrink-0
                            ${currentTimeframe.label === tf.label 
                                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20' 
                                : 'bg-transparent text-muted-foreground hover:bg-muted'
                            }`}
                    >
                        {tf.label}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border shrink-0">
                <button
                    onClick={() => setChartType('line')}
                    className={`p-1.5 rounded-lg transition-all ${
                        chartType === 'line' 
                            ? 'bg-background text-foreground shadow-sm' 
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Line Chart"
                >
                    <LucideLineChart className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setChartType('candlestick')}
                    className={`p-1.5 rounded-lg transition-all ${
                        chartType === 'candlestick' 
                            ? 'bg-background text-foreground shadow-sm' 
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Candlestick Chart"
                >
                    <CandlestickIcon />
                </button>
            </div>
        </div>
    );

    // Rich Key Quote Section (Creative & Responsive)
    const renderKeyQuoteSection = () => (
        <div className="flex flex-col gap-3 py-1 animate-in fade-in slide-in-from-bottom-2">
            {/* 24h Price Range Visual Progress Card */}
            <div className="p-3.5 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-primary" />
                        24h Price Range
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-muted-foreground">
                        Spread: <span className="text-foreground font-bold">{volatilityPercent}%</span>
                    </span>
                </div>

                {/* Range Bar */}
                <div className="relative pt-1 pb-4">
                    <div className="h-2 w-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 opacity-90 shadow-inner" />
                    {/* Animated current price indicator pin */}
                    <div 
                        className="absolute top-0 flex flex-col items-center -translate-x-1/2 transition-all duration-500"
                        style={{ left: `${rangePercent}%` }}
                    >
                        <div className="w-3.5 h-3.5 rounded-full bg-primary border-2 border-background shadow-md shadow-primary/40 ring-2 ring-primary/30" />
                        <span className="text-[10px] font-mono font-bold text-foreground mt-0.5 whitespace-nowrap bg-background/90 px-1 py-0.5 rounded border border-border/50 shadow-xs">
                            {currentPrice}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">24h Low</span>
                        <span className="font-bold text-red-500">{formatPrice(low, fiat)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">24h High</span>
                        <span className="font-bold text-emerald-500">{formatPrice(high, fiat)}</span>
                    </div>
                </div>
            </div>

            {/* Key Market Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {/* 24h High */}
                <div className="p-3 rounded-2xl bg-card border border-border/50 flex flex-col gap-1 shadow-xs hover:border-border transition-colors">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[11px] uppercase font-bold tracking-wider">24h High</span>
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <span className="text-base sm:text-lg font-mono font-bold text-foreground truncate">
                        {high > 0 ? formatPrice(high, fiat) : '---'}
                    </span>
                    <span className="text-[10px] text-emerald-500 font-semibold font-mono">Peak in 24h</span>
                </div>

                {/* 24h Low */}
                <div className="p-3 rounded-2xl bg-card border border-border/50 flex flex-col gap-1 shadow-xs hover:border-border transition-colors">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[11px] uppercase font-bold tracking-wider">24h Low</span>
                        <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    <span className="text-base sm:text-lg font-mono font-bold text-foreground truncate">
                        {low > 0 ? formatPrice(low, fiat) : '---'}
                    </span>
                    <span className="text-[10px] text-red-500 font-semibold font-mono">Trough in 24h</span>
                </div>

                {/* 24h Volume Token */}
                <div className="p-3 rounded-2xl bg-card border border-border/50 flex flex-col gap-1 shadow-xs hover:border-border transition-colors">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[11px] uppercase font-bold tracking-wider">24h Vol ({selectedCoin})</span>
                        <BarChart2 className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-base sm:text-lg font-mono font-bold text-foreground truncate">
                        {baseVolumeNum > 0 ? new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(baseVolumeNum) : '---'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">Base coin volume</span>
                </div>

                {/* 24h Volume Fiat */}
                <div className="p-3 rounded-2xl bg-card border border-border/50 flex flex-col gap-1 shadow-xs hover:border-border transition-colors">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[11px] uppercase font-bold tracking-wider">24h Vol ({fiat})</span>
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <span className="text-base sm:text-lg font-mono font-bold text-foreground truncate">
                        {quoteVolumeNum > 0 ? formatCompact(quoteVolumeNum, fiat) : '---'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">Total fiat turnover</span>
                </div>

                {/* Market Cap */}
                <div className="p-3 rounded-2xl bg-card border border-border/50 flex flex-col gap-1 shadow-xs hover:border-border transition-colors">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[11px] uppercase font-bold tracking-wider">Market Cap</span>
                        <Zap className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-base sm:text-lg font-mono font-bold text-foreground truncate">
                        {marketCap ? formatCompact(marketCap, fiat) : 'N/A'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                        {circulatingSupply ? `${new Intl.NumberFormat('en-US', { notation: "compact" }).format(circulatingSupply)} circulating` : 'Supply unverified'}
                    </span>
                </div>

                {/* 24h Trades / Live Activity */}
                <div className="p-3 rounded-2xl bg-card border border-border/50 flex flex-col gap-1 shadow-xs hover:border-border transition-colors">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[11px] uppercase font-bold tracking-wider">24h Trades</span>
                        <div className="flex items-center gap-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </div>
                    </div>
                    <span className="text-base sm:text-lg font-mono font-bold text-foreground truncate">
                        {tradesCount ? new Intl.NumberFormat('en-US', { notation: "compact" }).format(tradesCount) : 'Live Stream'}
                    </span>
                    <span className="text-[10px] text-emerald-500 font-semibold font-mono">Real-time matching</span>
                </div>
            </div>

            {/* Quick Actions (Trade on DEX / Switch to Chart) */}
            <div className="flex items-center gap-2 pt-1">
                <Link
                    href={`/trade`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98]"
                >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Trade {selectedCoin} on DEX</span>
                </Link>
                {onOpenChart && (
                    <button
                        onClick={onOpenChart}
                        className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-muted text-foreground hover:bg-muted/80 font-bold text-xs sm:text-sm border border-border/60 transition-all active:scale-[0.98]"
                    >
                        <LucideLineChart className="w-4 h-4 text-primary" />
                        <span>View Chart</span>
                    </button>
                )}
            </div>
        </div>
    );

    // Chart component
    const renderChart = () => (
        <div className="w-full flex-1 min-h-[220px] md:min-h-[380px] lg:min-h-[440px] relative shrink-0">
            {isLoadingChart && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10 transition-opacity rounded-2xl">
                    <div className="text-muted-foreground text-xs md:text-sm font-bold animate-pulse font-mono">Loading Chart...</div>
                </div>
            )}
            <ResponsiveContainer width="99%" height="100%">
                {chartType === 'line' ? (
                    <LineChart data={chartData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                        <XAxis 
                            dataKey="date" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#888', fontWeight: 600 }}
                            minTickGap={35}
                            tickMargin={8}
                        />
                        <YAxis 
                            domain={['dataMin', 'dataMax']} 
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#888', fontWeight: 600 }}
                            tickFormatter={(val) => {
                                if (val >= 1000) {
                                    return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(val);
                                }
                                return Number.isInteger(val) ? val.toString() : val.toFixed(2);
                            }}
                            tickMargin={8}
                            width={44}
                        />
                        <RechartsTooltip cursor={{ strokeDasharray: '3 3', stroke: '#555' }} content={<CustomTooltip />} />
                        <ReferenceLine y={baselinePrice} stroke="#444" strokeDasharray="3 3" opacity={0.5} />
                        <Line 
                            type="monotone" 
                            dataKey="rawPrice" 
                            stroke={strokeColor} 
                            strokeWidth={3} 
                            dot={false}
                            activeDot={{ r: 6, fill: strokeColor, stroke: '#fff', strokeWidth: 2 }} 
                            isAnimationActive={false}
                        />
                    </LineChart>
                ) : (
                    <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <XAxis 
                            dataKey="date" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#888', fontWeight: 600 }}
                            minTickGap={35}
                            tickMargin={8}
                        />
                        <YAxis 
                            domain={['dataMin', 'dataMax']} 
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#888', fontWeight: 600 }}
                            tickFormatter={(val) => {
                                if (val >= 1000) {
                                    return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(val);
                                }
                                return Number.isInteger(val) ? val.toString() : val.toFixed(2);
                            }}
                            tickMargin={8}
                            width={44}
                        />
                        <RechartsTooltip cursor={{ strokeDasharray: '3 3', stroke: '#555' }} content={<CustomTooltip />} />
                        <ReferenceLine y={baselinePrice} stroke="#444" strokeDasharray="3 3" opacity={0.5} />
                        <Bar 
                            dataKey="range" 
                            shape={<CustomCandlestick />} 
                            isAnimationActive={false}
                        />
                    </ComposedChart>
                )}
            </ResponsiveContainer>
        </div>
    );

    // Render mode: Only Chart (Mobile) -> Full viewport height, ZERO page scrolling, ZERO blank white space!
    if (viewMode === 'chart') {
        return (
            <div className="flex flex-col h-full bg-background p-3 md:p-6 lg:px-8 py-2 md:py-4 overflow-hidden select-none">
                {renderCoinChips()}
                {renderHeader()}
                {renderChartControls()}
                {renderChart()}
            </div>
        );
    }

    // Render mode: Only Key Quote (Mobile) -> Dedicated rich analytics dashboard
    if (viewMode === 'quote') {
        return (
            <div className="flex flex-col h-full bg-background p-3 md:p-6 lg:px-8 py-2 md:py-4 pb-32 md:pb-6 overflow-y-auto">
                {renderCoinChips()}
                {renderHeader()}
                {renderKeyQuoteSection()}
            </div>
        );
    }

    // Default / Desktop mode: Both Chart and Key Quote Section
    return (
        <div className="flex flex-col h-full bg-background p-3 md:p-6 lg:px-8 py-2 md:py-4 pb-32 md:pb-6 overflow-y-auto">
            {renderCoinChips()}
            {renderHeader()}
            {renderChartControls()}
            {renderChart()}
            <div className="mt-4 border-t border-border/40 pt-4">
                {renderKeyQuoteSection()}
            </div>
        </div>
    );
};
