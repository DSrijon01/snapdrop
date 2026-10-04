"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    ReferenceLine
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

/**
 * High-performance, pixel-perfect native SVG Candlestick Chart (TradingView style)
 * Solves Recharts Bar glitches, infinite wick spikes, and label clipping.
 */
interface NativeCandlestickChartProps {
    data: any[];
    onHover: (d: any | null) => void;
    hoveredData: any | null;
    fiat: string;
    baselinePrice: number;
    formatPrice: (price: number, fiat: string) => string;
    formatCompact: (val: number, cur: string) => string;
}

const NativeCandlestickChart: React.FC<NativeCandlestickChartProps> = ({
    data,
    onHover,
    hoveredData,
    fiat,
    baselinePrice,
    formatPrice,
    formatCompact
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [cursor, setCursor] = useState<{ x: number; y: number; index: number } | null>(null);

    // Track responsive container size
    useEffect(() => {
        if (!containerRef.current) return;
        const update = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth || 800,
                    height: containerRef.current.clientHeight || 400
                });
            }
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    const { width, height } = dimensions;

    const margin = { top: 15, right: 65, bottom: 28, left: 10 };
    const plotWidth = Math.max(width - margin.left - margin.right, 20);
    const plotHeight = Math.max(height - margin.top - margin.bottom, 20);

    // Compute min and max bounds across all candles with 5% safety margin
    const { yMin, yMax, yRange } = useMemo(() => {
        if (!data || data.length === 0) return { yMin: 0, yMax: 100, yRange: 100 };
        let min = Infinity;
        let max = -Infinity;
        for (const d of data) {
            if (d.low < min) min = d.low;
            if (d.high > max) max = d.high;
        }
        if (!isFinite(min) || !isFinite(max)) return { yMin: 0, yMax: 100, yRange: 100 };
        const pad = (max - min) * 0.05;
        const clampedMin = Math.max(0, min - pad);
        const clampedMax = max + pad;
        return { yMin: clampedMin, yMax: clampedMax, yRange: clampedMax - clampedMin || 1 };
    }, [data]);

    const getY = (val: number) => margin.top + ((yMax - val) / yRange) * plotHeight;
    const getX = (idx: number) => margin.left + ((idx + 0.5) / data.length) * plotWidth;
    const candleWidth = Math.max(Math.min((plotWidth / data.length) * 0.75, 14), 1.5);

    // 4 horizontal grid price levels
    const gridLevels = [0.15, 0.4, 0.65, 0.9].map((ratio) => yMin + ratio * yRange);

    // Bottom date ticks
    const tickStep = Math.max(Math.floor(data.length / Math.min(Math.floor(plotWidth / 85), 8)), 1);

    const handlePointerMove = (clientX: number, clientY: number) => {
        if (!data || data.length === 0 || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const rawIdx = Math.floor(((x - margin.left) / plotWidth) * data.length);
        const idx = Math.max(0, Math.min(data.length - 1, rawIdx));
        const candle = data[idx];

        setCursor({ x, y, index: idx });
        onHover(candle);
    };

    const handlePointerLeave = () => {
        setCursor(null);
        onHover(null);
    };

    const hoveredCandle = cursor && data[cursor.index] ? data[cursor.index] : hoveredData;

    return (
        <div 
            ref={containerRef} 
            className="w-full h-full relative select-none"
            onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
            onMouseLeave={handlePointerLeave}
            onTouchMove={(e) => {
                if (e.touches && e.touches[0]) {
                    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
                }
            }}
            onTouchEnd={handlePointerLeave}
        >
            {width > 0 && height > 0 && (
                <svg
                    width={width}
                    height={height}
                    className="w-full h-full cursor-crosshair overflow-visible"
                >
                    {/* Background hit test rect */}
                    <rect
                        x={0}
                        y={0}
                        width={width}
                        height={height}
                        fill="transparent"
                    />

                    {/* Horizontal Grid lines and Price labels */}
                    {gridLevels.map((lvl, idx) => (
                        <g key={idx}>
                            <line
                                x1={margin.left}
                                y1={getY(lvl)}
                                x2={width - margin.right}
                                y2={getY(lvl)}
                                stroke="#444"
                                strokeDasharray="3 3"
                                opacity={0.25}
                            />
                            <text
                                x={width - margin.right + 8}
                                y={getY(lvl) + 4}
                                fill="#888"
                                fontSize={10}
                                fontFamily="monospace"
                                fontWeight={600}
                            >
                                {formatCompact(lvl, fiat)}
                            </text>
                        </g>
                    ))}

                    {/* Baseline Reference Line */}
                    {baselinePrice > 0 && (
                        <line
                            x1={margin.left}
                            y1={getY(baselinePrice)}
                            x2={width - margin.right}
                            y2={getY(baselinePrice)}
                            stroke="#555"
                            strokeDasharray="4 4"
                            opacity={0.5}
                        />
                    )}

                    {/* X-Axis bottom date labels */}
                    {data.map((d, i) => {
                        if (i % tickStep !== 0) return null;
                        return (
                            <text
                                key={i}
                                x={getX(i)}
                                y={height - 8}
                                textAnchor="middle"
                                fill="#888"
                                fontSize={11}
                                fontFamily="monospace"
                                fontWeight={600}
                            >
                                {d.date}
                            </text>
                        );
                    })}

                    {/* Candlesticks (Wick and Body) */}
                    {data.map((d, i) => {
                        const cx = getX(i);
                        const yHigh = getY(d.high);
                        const yLow = getY(d.low);
                        const yOpen = getY(d.open);
                        const yClose = getY(d.close);
                        const isUp = d.close >= d.open;
                        const color = isUp ? '#10b981' : '#ef4444';
                        const bodyTop = Math.min(yOpen, yClose);
                        const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1.5);

                        return (
                            <g key={d.timestamp || i}>
                                {/* Wick Line (Bounded strictly between High and Low) */}
                                <line
                                    x1={cx}
                                    y1={yHigh}
                                    x2={cx}
                                    y2={yLow}
                                    stroke={color}
                                    strokeWidth={candleWidth > 4 ? 1.5 : 1}
                                    strokeLinecap="round"
                                />
                                {/* Candle Body (Bounded between Open and Close) */}
                                <rect
                                    x={cx - candleWidth / 2}
                                    y={bodyTop}
                                    width={candleWidth}
                                    height={bodyHeight}
                                    fill={color}
                                    stroke={color}
                                    strokeWidth={0.5}
                                    rx={candleWidth > 5 ? 1 : 0}
                                />
                            </g>
                        );
                    })}

                    {/* Interactive Crosshair & Cursor */}
                    {cursor && (
                        <g pointerEvents="none">
                            {/* Vertical Line */}
                            <line
                                x1={getX(cursor.index)}
                                y1={margin.top}
                                x2={getX(cursor.index)}
                                y2={height - margin.bottom}
                                stroke="#888"
                                strokeDasharray="3 3"
                                strokeWidth={1}
                                opacity={0.8}
                            />
                            {/* Horizontal Line */}
                            <line
                                x1={margin.left}
                                y1={cursor.y}
                                x2={width - margin.right}
                                y2={cursor.y}
                                stroke="#888"
                                strokeDasharray="3 3"
                                strokeWidth={1}
                                opacity={0.8}
                            />
                            {/* Y-Axis Hovered Price Tag */}
                            {cursor.y >= margin.top && cursor.y <= height - margin.bottom && (
                                <g transform={`translate(${width - margin.right + 2}, ${cursor.y - 10})`}>
                                    <rect width={58} height={20} rx={4} fill="#18181b" stroke="#3f3f46" />
                                    <text
                                        x={29}
                                        y={14}
                                        fill="#fff"
                                        fontSize={10}
                                        fontFamily="monospace"
                                        fontWeight={700}
                                        textAnchor="middle"
                                    >
                                        {formatCompact(yMax - ((cursor.y - margin.top) / plotHeight) * yRange, fiat)}
                                    </text>
                                </g>
                            )}
                        </g>
                    )}
                </svg>
            )}

            {/* Floating OHLC Tooltip */}
            {hoveredCandle && (
                <div 
                    className="absolute z-20 pointer-events-none bg-black/90 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl border border-border/80 shadow-2xl text-xs space-y-1.5 min-w-[190px] transition-all"
                    style={{
                        top: cursor ? Math.max(10, Math.min(cursor.y - 70, height - 130)) : 16,
                        left: cursor ? Math.max(16, Math.min(cursor.x - 95, width - 215)) : 20,
                    }}
                >
                    <div className="flex items-center justify-between border-b border-white/10 pb-1">
                        <span className="font-semibold text-muted-foreground text-[11px]">
                            {hoveredCandle.fullTimestamp || hoveredCandle.date}
                        </span>
                        <span
                            className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                hoveredCandle.close >= hoveredCandle.open
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-red-500/20 text-red-400'
                            }`}
                        >
                            {hoveredCandle.close >= hoveredCandle.open ? '+' : ''}
                            {(((hoveredCandle.close - hoveredCandle.open) / (hoveredCandle.open || 1)) * 100).toFixed(2)}%
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono pt-0.5 text-[11px]">
                        <span className="text-muted-foreground">OPEN:</span>
                        <span className="font-bold text-right text-foreground">{formatPrice(hoveredCandle.open, fiat)}</span>
                        <span className="text-emerald-500 font-bold">HIGH:</span>
                        <span className="font-bold text-right text-emerald-500">{formatPrice(hoveredCandle.high, fiat)}</span>
                        <span className="text-red-500 font-bold">LOW:</span>
                        <span className="font-bold text-right text-red-500">{formatPrice(hoveredCandle.low, fiat)}</span>
                        <span className="text-muted-foreground">CLOSE:</span>
                        <span className="font-bold text-right text-foreground">{formatPrice(hoveredCandle.close, fiat)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

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
    const [hoveredData, setHoveredData] = useState<any | null>(null);

    // Reset hovered data on coin or timeframe change
    useEffect(() => {
        setHoveredData(null);
    }, [selectedCoin, currentTimeframe]);

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
                        const timeMs = d[0];
                        const dateObj = new Date(timeMs);
                        const open = parseFloat(d[1]);
                        const high = parseFloat(d[2]);
                        const low = parseFloat(d[3]);
                        const close = parseFloat(d[4]);
                        const volume = parseFloat(d[5]);
                        
                        // Full localized timestamp with date and time (e.g. "17 Jan, 14:30" or "17 Jan 2026, 14:30")
                        const fullTimestamp = dateObj.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        });

                        const shortDate = dateObj.toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: 'numeric',
                            ...(currentTimeframe.label === '1D' ? { hour: '2-digit', minute: '2-digit' } : {}) 
                        });

                        return {
                            timestamp: timeMs,
                            date: shortDate,
                            fullTimestamp,
                            rawPrice: close,
                            formattedPrice: formatPrice(close, fiat),
                            open,
                            high,
                            low,
                            close,
                            volume,
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

    // Calculate dynamic Y-axis domain with 4% padding so line and wicks never clip
    const yDomain = useMemo(() => {
        if (!chartData || chartData.length === 0) return ['dataMin', 'dataMax'];
        let min = Infinity;
        let max = -Infinity;
        for (const d of chartData) {
            if (d.low < min) min = d.low;
            if (d.high > max) max = d.high;
        }
        if (!isFinite(min) || !isFinite(max)) return ['dataMin', 'dataMax'];
        const padding = (max - min) * 0.04;
        return [Math.max(0, min - padding), max + padding];
    }, [chartData]);

    // Custom Interactive Tooltip with precise timestamp and price action for LineChart
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const fullTime = data.fullTimestamp || label;
            const raw = data.rawPrice ?? payload[0].value;
            const diffFromBaseline = raw - baselinePrice;
            const pctFromBaseline = baselinePrice > 0 ? (diffFromBaseline / baselinePrice) * 100 : 0;
            const isUp = diffFromBaseline >= 0;

            return (
                <div className="bg-black/90 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl border border-border shadow-xl text-xs space-y-1 min-w-[170px]">
                    <div className="font-medium text-[11px] text-muted-foreground border-b border-white/10 pb-1">{fullTime}</div>
                    <div className="font-mono text-base font-black text-foreground">{formatPrice(raw, fiat)}</div>
                    <div className={`font-mono text-[11px] font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isUp ? '+' : ''}{pctFromBaseline.toFixed(2)}% ({isUp ? '+' : ''}{formatPrice(Math.abs(diffFromBaseline), fiat)})
                    </div>
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

    // Header with Title, Price, Timeframe change, and Hover timestamp of price action
    const renderHeader = () => {
        const displayPrice = hoveredData
            ? formatPrice(hoveredData.close ?? hoveredData.rawPrice, fiat)
            : currentPrice;

        const isHovered = !!hoveredData;
        const priceToCompare = hoveredData ? (hoveredData.close ?? hoveredData.rawPrice) : last;
        const changePct = isHovered
            ? (baselinePrice > 0 ? ((priceToCompare - baselinePrice) / baselinePrice) * 100 : 0)
            : pctChange24h;
        const changeDiff = isHovered
            ? priceToCompare - baselinePrice
            : (ticker ? parseFloat(ticker.priceChange) : 0);
        const isUp = changePct >= 0;

        const timeLabel = isHovered
            ? (hoveredData.fullTimestamp || hoveredData.date)
            : 'Today';

        return (
            <div className="mb-2 md:mb-3 shrink-0 flex items-start justify-between gap-2">
                <div>
                    <div className="flex items-center gap-2 mb-0">
                        <h1 className="text-2xl md:text-4xl font-black font-display text-primary uppercase leading-none">{selectedCoin}</h1>
                        <span className="text-xs md:text-xl text-muted-foreground font-mono">{selectedCoin} Token</span>
                    </div>
                    
                    <div className="flex flex-col mt-1">
                        <span className="text-2xl sm:text-3xl md:text-5xl font-mono font-black tracking-tighter text-foreground leading-none">
                            {displayPrice}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`text-xs sm:text-sm md:text-xl font-bold font-mono ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                                {isUp ? '+' : ''}{changePct.toFixed(2)}% {isHovered ? `(${isUp ? '+' : ''}${formatPrice(Math.abs(changeDiff), fiat)})` : 'Today'}
                            </span>
                            {isHovered && (
                                <span className="text-xs sm:text-sm font-mono font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50">
                                    {timeLabel}
                                </span>
                            )}
                        </div>
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
    };

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
                    <span className="text-[10px] text-red-500 font-semibold font-mono">Floor in 24h</span>
                </div>

                {/* Market Cap */}
                <div className="p-3 rounded-2xl bg-card border border-border/50 flex flex-col gap-1 shadow-xs hover:border-border transition-colors">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[11px] uppercase font-bold tracking-wider">Market Cap</span>
                        <BarChart2 className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-base sm:text-lg font-mono font-bold text-foreground truncate">
                        {marketCap ? formatCompact(marketCap, fiat) : '---'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold font-mono">Supply × Price</span>
                </div>

                {/* 24h Volume */}
                <div className="p-3 rounded-2xl bg-card border border-border/50 flex flex-col gap-1 shadow-xs hover:border-border transition-colors">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[11px] uppercase font-bold tracking-wider">24h Volume</span>
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <span className="text-base sm:text-lg font-mono font-bold text-foreground truncate">
                        {quoteVolumeNum ? formatCompact(quoteVolumeNum, fiat) : '---'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold font-mono">
                        {baseVolumeNum ? `${new Intl.NumberFormat('en-US', { notation: "compact" }).format(baseVolumeNum)} ${selectedCoin}` : 'Total Traded'}
                    </span>
                </div>

                {/* Circulating Supply */}
                <div className="p-3 rounded-2xl bg-card border border-border/50 flex flex-col gap-1 shadow-xs hover:border-border transition-colors">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[11px] uppercase font-bold tracking-wider">Circulating</span>
                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <span className="text-base sm:text-lg font-mono font-bold text-foreground truncate">
                        {circulatingSupply ? `${new Intl.NumberFormat('en-US', { notation: "compact" }).format(circulatingSupply)}` : '---'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold font-mono">Verified in circulation</span>
                </div>

                {/* 24h Trades Count */}
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
        <div className="w-full h-[280px] sm:h-[340px] md:h-[380px] lg:h-[400px] min-h-[260px] relative shrink-0">
            {isLoadingChart && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10 transition-opacity rounded-2xl">
                    <div className="text-muted-foreground text-xs md:text-sm font-bold animate-pulse font-mono">Loading Chart...</div>
                </div>
            )}
            
            {chartType === 'line' ? (
                <ResponsiveContainer width="99%" height="100%">
                    <LineChart 
                        data={chartData} 
                        margin={{ top: 15, right: 15, left: -10, bottom: 28 }}
                        onMouseMove={(state: any) => {
                            if (state?.activeTooltipIndex != null && chartData[state.activeTooltipIndex]) {
                                setHoveredData(chartData[state.activeTooltipIndex]);
                            } else if (state?.activePayload?.[0]?.payload) {
                                setHoveredData(state.activePayload[0].payload);
                            }
                        }}
                        onMouseLeave={() => setHoveredData(null)}
                    >
                        <XAxis 
                            dataKey="date" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#888', fontWeight: 600 }}
                            minTickGap={35}
                            tickMargin={12}
                        />
                        <YAxis 
                            domain={yDomain} 
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
                            width={48}
                        />
                        <RechartsTooltip cursor={{ strokeDasharray: '3 3', stroke: '#888' }} content={<CustomTooltip />} />
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
                </ResponsiveContainer>
            ) : (
                <NativeCandlestickChart
                    data={chartData}
                    onHover={setHoveredData}
                    hoveredData={hoveredData}
                    fiat={fiat}
                    baselinePrice={baselinePrice}
                    formatPrice={formatPrice}
                    formatCompact={formatCompact}
                />
            )}
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
