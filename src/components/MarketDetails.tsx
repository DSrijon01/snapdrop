import { useState, useEffect } from 'react';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { 
    ResponsiveContainer, 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    Tooltip as RechartsTooltip, 
    ReferenceLine
} from 'recharts';

interface DetailsProps {
    selectedCoin: string; // e.g. "BTC"
    fiat: string;         // e.g. "USD"
    favorites?: string[];
    setFavorites?: (favs: string[]) => void;
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

export const MarketDetails = ({ selectedCoin, fiat, favorites, setFavorites }: DetailsProps) => {
    const { rates, formatPrice } = useExchangeRates();
    const [ticker, setTicker] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [currentTimeframe, setCurrentTimeframe] = useState(TIMEFRAMES[0]);
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

                const url = `https://api.binance.com/api/v3/uiKlines?symbol=${selectedCoin}USDT&interval=${currentTimeframe.interval}&limit=${limit}`;
                const res = await fetch(url);
                const data = await res.json();
                
                if (Array.isArray(data)) {
                    const tf = currentTimeframe.label;
                    const showYear = ['1Y', '2Y', '5Y', '10Y', 'ALL'].includes(tf);
                    const is1D = tf === '1D';

                    // Mapping to { date, price }
                    const mapped = data.map(candle => ({
                        date: new Date(candle[0]).toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: showYear && tf !== '1Y' ? undefined : 'numeric', 
                            year: showYear ? 'numeric' : undefined,
                            hour: is1D ? '2-digit' : undefined,
                            minute: is1D ? '2-digit' : undefined 
                        }),
                        rawPrice: parseFloat(candle[4]) // Close price
                    }));
                    setChartData(mapped);
                }
            } catch (e) {
                console.error("Failed to fetch chart", e);
            } finally {
                setIsLoadingChart(false);
            }
        };
        fetchChart();
    }, [selectedCoin, currentTimeframe.label]);

    if (!selectedCoin) {
        return <div className="flex h-full items-center justify-center text-muted-foreground">Select a coin to view details</div>;
    }

    // Calculations for UI
    const currentPriceRaw = ticker ? parseFloat(ticker.lastPrice) : 0;
    const currentPrice = formatPrice(currentPriceRaw, fiat);
    
    // Percentage from ticker (24h)
    const pctChange24h = ticker ? parseFloat(ticker.priceChangePercent) : 0;
    const isPositive24h = pctChange24h >= 0;

    // Calculate chart color based on timeframe open vs close
    const chartIsPositive = chartData.length > 0 
        ? chartData[chartData.length - 1].rawPrice >= chartData[0].rawPrice 
        : isPositive24h;
    
    const strokeColor = chartIsPositive ? '#10b981' : '#ef4444'; // Apple Stocks Green/Red
    const baselinePrice = chartData.length > 0 ? chartData[0].rawPrice : currentPriceRaw;

    // Custom Tooltip component for Recharts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const raw = payload[0].value;
            return (
                <div className="bg-black/80 backdrop-blur-md text-white px-3 py-2 rounded-lg border border-border shadow-xl text-sm">
                    <div className="font-medium">{label}</div>
                    <div className="font-mono font-bold">{formatPrice(raw, fiat)}</div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col h-full bg-background dark:bg-black p-4 md:p-6 lg:px-8 py-4 animate-in fade-in slide-in-from-right-4 overflow-y-auto overflow-x-hidden">
            
            {/* Massive Header */}
            <div className="mb-4 shrink-0 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl md:text-4xl font-black font-display text-primary uppercase">{selectedCoin}</h1>
                        <span className="text-lg md:text-xl text-muted-foreground font-mono">{selectedCoin} Token</span>
                    </div>
                    
                    <div className="flex flex-col mt-1">
                        <span className="text-4xl md:text-5xl font-mono font-black tracking-tighter text-foreground">
                            {currentPrice}
                        </span>
                        <span className={`text-lg md:text-xl font-bold font-mono mt-0.5 ${isPositive24h ? 'text-emerald-500' : 'text-red-500'}`}>
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
                        className={`px-4 py-2 rounded-full font-bold text-sm transition self-start shrink-0 ${
                            favorites.includes(selectedCoin) 
                                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                                : 'bg-[#1c1c1e] text-white hover:bg-[#2c2c2e]'
                        }`}
                    >
                        {favorites.includes(selectedCoin) ? 'Remove Watchlist' : 'Add to Watchlist'}
                    </button>
                )}
            </div>

            {/* Timeframe Toggles */}
            <div className="flex gap-1 md:gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide shrink-0">
                {TIMEFRAMES.map((tf) => (
                    <button
                        key={tf.label}
                        onClick={() => setCurrentTimeframe(tf)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors shrink-0
                            ${currentTimeframe.label === tf.label 
                                ? 'bg-[#333333] text-white dark:bg-white dark:text-black' 
                                : 'bg-transparent text-muted-foreground hover:bg-[#222222] dark:hover:bg-white/10'
                            }`}
                    >
                        {tf.label}
                    </button>
                ))}
            </div>

            {/* Main Interactive Chart */}
            <div className="flex-1 w-full min-h-[160px] md:min-h-[250px] max-h-[500px] mb-4 relative">
                {isLoadingChart && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10 transition-opacity">
                        <div className="text-muted-foreground font-bold animate-pulse">Loading Chart...</div>
                    </div>
                )}
                <ResponsiveContainer width="99%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                        <XAxis 
                            dataKey="date" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 13, fill: '#888', fontWeight: 600 }}
                            minTickGap={65}
                            tickMargin={12}
                        />
                        <YAxis 
                            domain={['dataMin', 'dataMax']} 
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 13, fill: '#888', fontWeight: 600 }}
                            tickFormatter={(val) => {
                                if (val >= 1000) {
                                    return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(val);
                                }
                                return Number.isInteger(val) ? val.toString() : val.toFixed(2);
                            }}
                            tickMargin={12}
                            width={50}
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
                            isAnimationActive={false} // Immediate render for snappier feel
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Key Statistics Grid */}
            <div className="mt-auto pt-3 shrink-0 pb-4 md:pb-0">
                <h3 className="text-[11px] font-bold font-display uppercase border-b border-border/50 pb-1.5 mb-3 text-primary">Key Statistics</h3>
                {ticker ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Low (24h)</span>
                            <span className="text-base font-mono font-medium">{formatPrice(parseFloat(ticker.lowPrice), fiat)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">High (24h)</span>
                            <span className="text-base font-mono font-medium">{formatPrice(parseFloat(ticker.highPrice), fiat)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Close</span>
                            <span className="text-base font-mono font-medium">{formatPrice(parseFloat(ticker.lastPrice), fiat)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Market Cap</span>
                            <span className="text-base font-mono font-medium">
                                {CIRCULATING_SUPPLIES[selectedCoin] 
                                    ? new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(CIRCULATING_SUPPLIES[selectedCoin] * parseFloat(ticker.lastPrice))
                                    : 'N/A'
                                }
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="text-muted-foreground animate-pulse">Loading statistics...</div>
                )}
            </div>
        </div>
    );
};
