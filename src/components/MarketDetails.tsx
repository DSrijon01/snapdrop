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
}

const TIMEFRAMES = [
    { label: '1D', interval: '5m', limit: 288 },
    { label: '1W', interval: '1h', limit: 168 },
    { label: '1M', interval: '4h', limit: 180 },
    { label: '3M', interval: '12h', limit: 180 },
    { label: '6M', interval: '1d', limit: 180 },
    { label: 'YTD', interval: '1d', limit: 0 }, // dynamically calculate
    { label: '1Y', interval: '1d', limit: 365 },
    { label: 'ALL', interval: '1w', limit: 1000 },
];

export const MarketDetails = ({ selectedCoin, fiat }: DetailsProps) => {
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
                    // Mapping to { date, price }
                    const mapped = data.map(candle => ({
                        date: new Date(candle[0]).toLocaleDateString(undefined, { 
                            month: 'short', day: 'numeric', 
                            hour: currentTimeframe.label === '1D' ? '2-digit' : undefined,
                            minute: currentTimeframe.label === '1D' ? '2-digit' : undefined 
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
        <div className="flex flex-col h-full bg-background dark:bg-black p-6 lg:p-10 animate-in fade-in slide-in-from-right-4">
            
            {/* Massive Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl md:text-5xl font-black font-display text-primary uppercase">{selectedCoin}</h1>
                    <span className="text-xl md:text-2xl text-muted-foreground font-mono">{selectedCoin} Token</span>
                </div>
                
                <div className="flex flex-col mt-2">
                    <span className="text-5xl md:text-7xl font-mono font-black tracking-tighter text-foreground">
                        {currentPrice}
                    </span>
                    <span className={`text-xl md:text-2xl font-bold font-mono mt-1 ${isPositive24h ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isPositive24h ? '+' : ''}{pctChange24h.toFixed(2)}% Today
                    </span>
                </div>
            </div>

            {/* Timeframe Toggles */}
            <div className="flex gap-1 md:gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {TIMEFRAMES.map((tf) => (
                    <button
                        key={tf.label}
                        onClick={() => setCurrentTimeframe(tf)}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors shrink-0
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
            <div className="h-[40vh] min-h-[300px] w-full mb-10 relative">
                {isLoadingChart && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                        <div className="text-muted-foreground font-bold animate-pulse">Loading Chart...</div>
                    </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <XAxis 
                            dataKey="date" 
                            hide 
                        />
                        <YAxis 
                            domain={['dataMin', 'dataMax']} 
                            hide 
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
            <div className="mt-auto">
                <h3 className="text-lg font-bold font-display uppercase border-b border-border/50 pb-2 mb-4 text-primary">Key Statistics</h3>
                {ticker ? (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground uppercase font-bold mb-1">Open</span>
                            <span className="text-lg font-mono font-medium">{formatPrice(parseFloat(ticker.openPrice), fiat)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground uppercase font-bold mb-1">High</span>
                            <span className="text-lg font-mono font-medium">{formatPrice(parseFloat(ticker.highPrice), fiat)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground uppercase font-bold mb-1">Low</span>
                            <span className="text-lg font-mono font-medium">{formatPrice(parseFloat(ticker.lowPrice), fiat)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground uppercase font-bold mb-1">Vol (24h)</span>
                            <span className="text-lg font-mono font-medium">{new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(parseFloat(ticker.volume))}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground uppercase font-bold mb-1">Mkt Cap</span>
                            <span className="text-lg font-mono font-medium text-muted-foreground">Requires circulating supply</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-muted-foreground animate-pulse">Loading statistics...</div>
                )}
            </div>
        </div>
    );
};
