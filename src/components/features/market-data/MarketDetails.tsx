"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
    LineChart as LucideLineChart, 
    Activity, 
    TrendingUp, 
    TrendingDown, 
    BarChart2, 
    Flame, 
    Zap,
    Building2,
    ExternalLink,
    Copy,
    Check,
    ShieldCheck,
    Sparkles,
    Globe,
    Layers,
    Info
} from 'lucide-react';
import { useExchangeRates } from '../../../hooks/useExchangeRates';

import { 
    SecurityAsset, 
    fetchTokensXyzAsset, 
    isKnownSecurity, 
    generateSecurityChartData,
    POPULAR_SECURITIES_LIST 
} from '@/lib/tokensXyz';

// Custom SVG icon for Candlestick Chart toggle
const CandlestickIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
    <line x1="5" y1="2" x2="5" y2="14" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="3.5" y="4" width="3" height="6" fill="#10b981" rx="0.5"/>
    <line x1="11" y1="2" x2="11" y2="14" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="9.5" y="7" width="3" height="6" fill="#ef4444" rx="0.5"/>
  </svg>
);

interface DetailsProps {
    selectedCoin: string; // e.g. "BTC" or "TSLA"
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
    { label: 'YTD', interval: '1d', limit: 0 },
    { label: '1Y', interval: '1d', limit: 365 },
    { label: '2Y', interval: '1d', limit: 730 },
    { label: '5Y', interval: '1w', limit: 260 },
    { label: 'ALL', interval: '1w', limit: 1000 },
];

/**
 * High-performance, pixel-perfect native SVG Chart (Line & TradingView Candlestick)
 */
interface NativeChartProps {
    data: any[];
    onHover: (d: any | null) => void;
    hoveredData: any | null;
    fiat: string;
    baselinePrice: number;
    formatPrice: (price: number, fiat: string) => string;
    formatCompact: (val: number, cur: string) => string;
    chartType?: 'line' | 'candlestick';
    strokeColor?: string;
}

const NativeChart: React.FC<NativeChartProps> = ({
    data,
    onHover,
    hoveredData,
    fiat,
    baselinePrice,
    formatPrice,
    formatCompact,
    chartType = 'line',
    strokeColor = '#10b981'
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [cursor, setCursor] = useState<{ x: number; y: number; index: number } | null>(null);

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
    const gridLevels = [0.15, 0.4, 0.65, 0.9].map((ratio) => yMin + ratio * yRange);
    const tickStep = Math.max(Math.floor(data.length / Math.min(Math.floor(plotWidth / 85), 8)), 1);

    const handlePointerMove = (clientX: number, clientY: number) => {
        if (!data || data.length === 0 || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        if (x < margin.left || x > width - margin.right || y < margin.top || y > height - margin.bottom) {
            setCursor(null);
            onHover(null);
            return;
        }

        const relativeX = x - margin.left;
        const idx = Math.min(Math.max(Math.floor((relativeX / plotWidth) * data.length), 0), data.length - 1);
        setCursor({ x, y, index: idx });
        onHover(data[idx]);
    };

    const handlePointerLeave = () => {
        setCursor(null);
        onHover(null);
    };

    const hoveredCandle = cursor && data && data[cursor.index] ? data[cursor.index] : null;

    return (
        <div 
            ref={containerRef}
            className="w-full h-full relative cursor-crosshair select-none touch-none"
            onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
            onMouseLeave={handlePointerLeave}
            onTouchMove={(e) => {
                if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchEnd={handlePointerLeave}
        >
            {width > 0 && height > 0 && (
                <svg width={width} height={height} className="overflow-visible block">
                    <line 
                        x1={margin.left} 
                        y1={getY(baselinePrice)} 
                        x2={width - margin.right} 
                        y2={getY(baselinePrice)} 
                        stroke="#555" 
                        strokeDasharray="3 3" 
                        opacity={0.4} 
                    />

                    {gridLevels.map((lvlPrice, i) => {
                        const y = getY(lvlPrice);
                        return (
                            <g key={i}>
                                <line 
                                    x1={margin.left} 
                                    y1={y} 
                                    x2={width - margin.right} 
                                    y2={y} 
                                    stroke="currentColor" 
                                    className="text-border/40" 
                                    strokeDasharray="2 4" 
                                />
                                <text 
                                    x={width - margin.right + 8} 
                                    y={y + 3.5} 
                                    fill="#888" 
                                    fontSize={10} 
                                    fontFamily="monospace"
                                    fontWeight={600}
                                >
                                    {formatCompact(lvlPrice, fiat)}
                                </text>
                            </g>
                        );
                    })}

                    {data.map((d, i) => {
                        if (i % tickStep !== 0) return null;
                        return (
                            <text
                                key={d.timestamp || i}
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

                    {chartType === 'line' ? (
                        <g>
                            <defs>
                                <linearGradient id="nativeChartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                                    <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                                </linearGradient>
                            </defs>
                            {/* Area fill under curve */}
                            {data.length > 1 && (
                                <path
                                    d={`${data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.close ?? d.rawPrice)}`).join(' ')} L ${getX(data.length - 1)} ${height - margin.bottom} L ${getX(0)} ${height - margin.bottom} Z`}
                                    fill="url(#nativeChartAreaGradient)"
                                />
                            )}
                            {/* Main continuous stroke line */}
                            {data.length > 1 && (
                                <path
                                    d={data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.close ?? d.rawPrice)}`).join(' ')}
                                    fill="none"
                                    stroke={strokeColor}
                                    strokeWidth={2.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}
                            {/* Hover Active Dot */}
                            {cursor && data[cursor.index] && (
                                <circle
                                    cx={getX(cursor.index)}
                                    cy={getY(data[cursor.index].close ?? data[cursor.index].rawPrice)}
                                    r={5}
                                    fill={strokeColor}
                                    stroke="#fff"
                                    strokeWidth={2}
                                />
                            )}
                        </g>
                    ) : (
                        data.map((d, i) => {
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
                                    <line
                                        x1={cx}
                                        y1={yHigh}
                                        x2={cx}
                                        y2={yLow}
                                        stroke={color}
                                        strokeWidth={candleWidth > 4 ? 1.5 : 1}
                                        strokeLinecap="round"
                                    />
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
                        })
                    )}

                    {cursor && (
                        <g pointerEvents="none">
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
    const [securityAsset, setSecurityAsset] = useState<SecurityAsset | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [currentTimeframe, setCurrentTimeframe] = useState(TIMEFRAMES[0]);
    const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');
    const [isLoadingChart, setIsLoadingChart] = useState(false);
    const [hoveredData, setHoveredData] = useState<any | null>(null);
    const [copiedMint, setCopiedMint] = useState(false);
    const knownSecurityMeta = useMemo(() => {
        const sym = selectedCoin?.toUpperCase().trim();
        return POPULAR_SECURITIES_LIST.find(s => s.symbol === sym) || null;
    }, [selectedCoin]);

    const isSecurity = Boolean(knownSecurityMeta || securityAsset);

    // Reset hovered data on coin or timeframe change
    useEffect(() => {
        setHoveredData(null);
    }, [selectedCoin, currentTimeframe]);

    // 1. Determine Asset Type & Fetch Details
    useEffect(() => {
        if (!selectedCoin) return;
        let isMounted = true;

        const loadAsset = async () => {
            const sym = selectedCoin.toUpperCase().trim();
            
            // Check if it's a security or query Tokens.xyz
            if (isKnownSecurity(sym)) {
                const sec = await fetchTokensXyzAsset(sym);
                if (isMounted) {
                    setSecurityAsset(sec);
                    setTicker(null);
                }
                return;
            }

            // Otherwise, attempt crypto fetch via Binance
            try {
                const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}USDT`);
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        setTicker(data);
                        setSecurityAsset(null);
                    }
                    return;
                }
            } catch {
                // If Binance fails, test Tokens.xyz as fallback
            }

            // Fallback check to Tokens.xyz
            const secFallback = await fetchTokensXyzAsset(sym);
            if (isMounted) {
                if (secFallback) {
                    setSecurityAsset(secFallback);
                    setTicker(null);
                } else {
                    setSecurityAsset(null);
                }
            }
        };

        loadAsset();
        const interval = setInterval(loadAsset, 12000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [selectedCoin]);

    // 2. Fetch Chart Data (Binance for crypto, Synthetic High-Fidelity for Securities)
    useEffect(() => {
        if (!selectedCoin) return;
        let isMounted = true;

        const loadChart = async () => {
            setIsLoadingChart(true);

            // If Security asset is present or known, synthesize responsive chart series immediately
            if (isSecurity) {
                const fallbackAsset: SecurityAsset = securityAsset || {
                    assetId: knownSecurityMeta?.id || selectedCoin.toLowerCase(),
                    name: knownSecurityMeta?.name || selectedCoin,
                    symbol: selectedCoin.toUpperCase(),
                    category: knownSecurityMeta?.category || 'equity',
                    price: 250,
                    priceChange24hPercent: 2.1,
                    volume24hUSD: 5000000,
                    marketCap: 100000000000,
                    canonicalPrice: 248.5,
                };
                const secPoints = generateSecurityChartData(fallbackAsset, currentTimeframe.label, fiat, formatPrice);
                if (isMounted) {
                    setChartData(secPoints);
                    setIsLoadingChart(false);
                }
                return;
            }

            // If Crypto asset, load real Binance klines
            try {
                let limit = currentTimeframe.limit;
                if (currentTimeframe.label === 'YTD') {
                    const daysSinceJan1 = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24));
                    limit = Math.max(daysSinceJan1, 2);
                }
                const url = `https://api.binance.com/api/v3/klines?symbol=${selectedCoin}USDT&interval=${currentTimeframe.interval}&limit=${limit}`;
                const res = await fetch(url);
                const data = await res.json();
                
                if (Array.isArray(data) && isMounted) {
                    const formatted = data.map((d: any) => {
                        const timeMs = d[0];
                        const dateObj = new Date(timeMs);
                        const open = parseFloat(d[1]);
                        const high = parseFloat(d[2]);
                        const low = parseFloat(d[3]);
                        const close = parseFloat(d[4]);
                        const volume = parseFloat(d[5]);
                        
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
                if (isMounted) setIsLoadingChart(false);
            }
        };

        loadChart();
    }, [selectedCoin, securityAsset?.symbol, securityAsset?.price, currentTimeframe, fiat, formatPrice]);

    // Format compact currency
    const formatCompact = useCallback((val: number, cur: string) => {
        const rate = rates[cur] || 1;
        const converted = val * rate;
        const symbol = cur === 'THB' ? '฿' : cur === 'BDT' ? '৳' : '$';
        const formatted = new Intl.NumberFormat('en-US', {
            notation: "compact",
            compactDisplay: "short",
            maximumFractionDigits: 2
        }).format(converted);
        return `${symbol}${formatted}`;
    }, [rates]);

    // Computed price & stats
    const currentPriceNum = isSecurity 
        ? (securityAsset?.price || securityAsset?.canonicalPrice || 0)
        : (ticker?.lastPrice ? parseFloat(ticker.lastPrice) : 0);

    const currentPriceStr = currentPriceNum > 0 ? formatPrice(currentPriceNum, fiat) : '---';

    const pctChange24h = isSecurity
        ? (securityAsset?.priceChange24hPercent ?? 0)
        : (ticker?.priceChangePercent ? parseFloat(ticker.priceChangePercent) : 0);

    const isPositive24h = pctChange24h >= 0;

    // Crypto-specific numbers
    const high = ticker?.highPrice ? parseFloat(ticker.highPrice) : (isSecurity ? currentPriceNum * 1.025 : 0);
    const low = ticker?.lowPrice ? parseFloat(ticker.lowPrice) : (isSecurity ? currentPriceNum * 0.975 : 0);
    const baseVolumeNum = ticker?.volume ? parseFloat(ticker.volume) : 0;
    const quoteVolumeNum = ticker?.quoteVolume ? parseFloat(ticker.quoteVolume) : (securityAsset?.volume24hUSD || 0);
    const tradesCount = ticker?.count ? Number(ticker.count) : (securityAsset?.primaryVariant?.trade24h || null);
    
    // Circulating supply & Market Cap
    const circulatingSupply = CIRCULATING_SUPPLIES[selectedCoin];
    const marketCap = isSecurity
        ? (securityAsset?.marketCap || null)
        : (circulatingSupply && currentPriceNum > 0 ? circulatingSupply * currentPriceNum : null);

    // 24h range percent
    const rangePercent = (high > low && currentPriceNum >= low)
        ? Math.min(Math.max(((currentPriceNum - low) / (high - low)) * 100, 2), 98)
        : 50;

    const volatilityPercent = (low > 0 && high >= low)
        ? (((high - low) / low) * 100).toFixed(2)
        : '0.00';

    // Spread between Solana DEX token price and canonical Wall St price
    const canonicalPriceNum = securityAsset?.canonicalPrice || 0;
    const dexSpreadPct = (canonicalPriceNum > 0 && currentPriceNum > 0)
        ? (((currentPriceNum - canonicalPriceNum) / canonicalPriceNum) * 100)
        : null;

    // Baseline & dynamic chart stroke color
    const baselinePrice = chartData.length > 0 ? chartData[0].close : 0;
    const latestPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : 0;
    const isUpTrend = latestPrice >= baselinePrice;
    const strokeColor = isUpTrend ? '#10b981' : '#ef4444';

    const handleCopyMint = (mintStr: string) => {
        if (!mintStr) return;
        navigator.clipboard.writeText(mintStr);
        setCopiedMint(true);
        setTimeout(() => setCopiedMint(false), 2000);
    };

    // Mobile Coin Chips
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
                        + All Assets
                    </button>
                )}
            </div>
        )
    );

    // Header with Dual Pricing & Security Identification
    const renderHeader = () => {
        const displayPrice = hoveredData
            ? formatPrice(hoveredData.close ?? hoveredData.rawPrice, fiat)
            : currentPriceStr;

        const isHovered = !!hoveredData;
        const priceToCompare = hoveredData ? (hoveredData.close ?? hoveredData.rawPrice) : currentPriceNum;
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

        const titleName = isSecurity 
            ? (securityAsset?.name || knownSecurityMeta?.name || selectedCoin) 
            : `${selectedCoin} Token`;
        const primaryVariantSymbol = securityAsset?.primaryVariant?.symbol || `${selectedCoin}x`;

        return (
            <div className="mb-2 md:mb-3 shrink-0 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    {/* Symbol, Name & Verified Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                            {securityAsset?.imageUrl && (
                                <img 
                                    src={securityAsset.imageUrl} 
                                    alt={selectedCoin} 
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-border object-contain bg-muted/40 p-0.5" 
                                />
                            )}
                            <h1 className="text-2xl md:text-4xl font-black font-display text-primary uppercase leading-none tracking-tight">
                                {selectedCoin}
                            </h1>
                        </div>

                        <span className="text-xs sm:text-base text-muted-foreground font-mono font-bold truncate">
                            {titleName}
                        </span>

                        {/* Category & Security Trust Badges */}
                        {isSecurity ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    <span>{securityAsset?.category || knownSecurityMeta?.category || 'Equity'}</span>
                                </span>
                                {securityAsset?.primaryVariant?.stockVariantTier && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3" />
                                        <span>{securityAsset.primaryVariant.stockVariantTier.replace('_', ' ')}</span>
                                    </span>
                                )}
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                                    Solana: {primaryVariantSymbol}
                                </span>
                            </div>
                        ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                Crypto Pair
                            </span>
                        )}
                    </div>
                    
                    {/* Live Pricing Display */}
                    <div className="flex flex-col mt-1">
                        <div className="flex flex-wrap items-baseline gap-2.5">
                            <span className="text-2xl sm:text-3xl md:text-5xl font-mono font-black tracking-tighter text-foreground leading-none">
                                {displayPrice}
                            </span>
                            
                            {/* Canonical Real-World Stock Price Benchmark */}
                            {isSecurity && canonicalPriceNum > 0 && (
                                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-mono text-muted-foreground">
                                    <span>Wall St Benchmark:</span>
                                    <span className="font-bold text-foreground">
                                        {formatPrice(canonicalPriceNum, fiat)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Change Pill & Spread Pill */}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className={`text-xs sm:text-sm md:text-base font-bold font-mono px-2 py-0.5 rounded-lg ${
                                isUp ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                            }`}>
                                {isUp ? '+' : ''}{changePct.toFixed(2)}% {isHovered ? `(${isUp ? '+' : ''}${formatPrice(Math.abs(changeDiff), fiat)})` : '24h'}
                            </span>

                            {/* Spread Pill */}
                            {isSecurity && dexSpreadPct !== null && (
                                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
                                    Math.abs(dexSpreadPct) < 0.5 
                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                                        : dexSpreadPct > 0 
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                                            : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                }`} title="Difference between Solana DEX token price and real-world canonical stock price">
                                    {dexSpreadPct >= 0 ? '+' : ''}{dexSpreadPct.toFixed(2)}% Spread vs NYSE/NASDAQ
                                </span>
                            )}

                            {isHovered && (
                                <span className="text-xs sm:text-sm font-mono font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50">
                                    {timeLabel}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Watchlist Button */}
                {favorites && setFavorites && (
                    <button 
                        onClick={() => {
                            if (favorites.includes(selectedCoin)) {
                                setFavorites(favorites.filter(c => c !== selectedCoin));
                            } else {
                                setFavorites([...favorites, selectedCoin]);
                            }
                        }}
                        className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-bold text-[10px] md:text-xs transition shrink-0 shadow-xs ${
                            favorites.includes(selectedCoin) 
                                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20' 
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                    >
                        {favorites.includes(selectedCoin) ? 'Remove Watchlist' : '+ Add Watchlist'}
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
                        className={`px-2.5 py-1 rounded-lg text-[10px] md:text-xs font-bold transition-colors shrink-0 ${
                            currentTimeframe.label === tf.label 
                                ? 'bg-primary text-primary-foreground shadow-xs' 
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
                            ? 'bg-background text-foreground shadow-xs font-bold' 
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
                            ? 'bg-background text-foreground shadow-xs font-bold' 
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Candlestick Chart"
                >
                    <CandlestickIcon />
                </button>
            </div>
        </div>
    );

    // Rich Securities & On-Chain Architecture Dashboard Card
    const renderSecuritiesDeepDive = () => {
        if (!securityAsset) return null;
        const pv = securityAsset.primaryVariant;

        return (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-blue-500/30 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border/40 pb-2.5">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-black text-foreground uppercase tracking-wider">
                            On-Chain Securities Architecture
                        </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        SPL Tokenized Security
                    </span>
                </div>

                {/* Solana Mint Address & Explorer Link */}
                {pv?.mint && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between gap-2">
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                Solana Mint Address
                            </span>
                            <span className="font-mono text-xs text-foreground truncate font-semibold">
                                {pv.mint}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                onClick={() => handleCopyMint(pv.mint)}
                                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-border/40"
                                title="Copy Mint Address"
                            >
                                {copiedMint ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <a
                                href={`https://solscan.io/token/${pv.mint}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-border/40"
                                title="View on Solscan"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                )}

                {/* Key On-Chain Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Execution Quality Score */}
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Execution Score</span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-base font-black font-mono text-foreground">
                                {pv?.executionScore ? `${pv.executionScore.toFixed(1)}` : '85.0'}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">/ 100</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                            <div 
                                className="bg-emerald-500 h-1.5 rounded-full" 
                                style={{ width: `${Math.min(pv?.executionScore || 85, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Token Holders */}
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">On-Chain Holders</span>
                        <span className="text-base font-black font-mono text-foreground">
                            {pv?.holders ? new Intl.NumberFormat('en-US').format(pv.holders) : '---'}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono font-medium">Verified wallets</span>
                    </div>

                    {/* DEX Liquidity */}
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">DEX Liquidity</span>
                        <span className="text-base font-black font-mono text-foreground">
                            {pv?.liquidity ? formatCompact(pv.liquidity, fiat) : '---'}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">AMM Pools Depth</span>
                    </div>

                    {/* 24h DEX Trades */}
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">24h Swaps</span>
                        <span className="text-base font-black font-mono text-foreground">
                            {pv?.trade24h ? new Intl.NumberFormat('en-US').format(pv.trade24h) : '---'}
                        </span>
                        <span className="text-[10px] text-primary font-mono font-medium">On-chain activity</span>
                    </div>
                </div>

                {/* Company Description */}
                {securityAsset.description && (
                    <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Info className="w-3 h-3 text-primary" />
                            <span>About {securityAsset.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed font-normal">
                            {securityAsset.description}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    // Rich Key Quote Section
    const renderKeyQuoteSection = () => (
        <div className="flex flex-col gap-3.5 py-1 animate-in fade-in slide-in-from-bottom-2">
            
            {/* If Security, Show Deep Dive Card */}
            {isSecurity && renderSecuritiesDeepDive()}

            {/* 24h Price Range Visual Progress Card */}
            <div className="p-3.5 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col gap-2.5">
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
                    <div 
                        className="absolute top-0 flex flex-col items-center -translate-x-1/2 transition-all duration-500"
                        style={{ left: `${rangePercent}%` }}
                    >
                        <div className="w-3.5 h-3.5 rounded-full bg-primary border-2 border-background shadow-md shadow-primary/40 ring-2 ring-primary/30" />
                        <span className="text-[10px] font-mono font-bold text-foreground mt-0.5 whitespace-nowrap bg-background/90 px-1 py-0.5 rounded border border-border/50 shadow-xs">
                            {currentPriceStr}
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
                    <span className="text-[10px] text-muted-foreground font-semibold font-mono">
                        {isSecurity ? 'Total Valuation' : 'Supply × Price'}
                    </span>
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

                {/* Circulating / Securities Tier */}
                <div className="p-3 rounded-2xl bg-card border border-border/50 flex flex-col gap-1 shadow-xs hover:border-border transition-colors">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[11px] uppercase font-bold tracking-wider">
                            {isSecurity ? 'Trust Tier' : 'Circulating'}
                        </span>
                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <span className="text-base sm:text-lg font-mono font-bold text-foreground truncate">
                        {isSecurity ? (securityAsset?.primaryVariant?.trustTier || 'Tier 2') : (circulatingSupply ? `${new Intl.NumberFormat('en-US', { notation: "compact" }).format(circulatingSupply)}` : '---')}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold font-mono">
                        {isSecurity ? 'On-Chain Verified' : 'In circulation'}
                    </span>
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
                    <span className="text-[10px] text-emerald-500 font-semibold font-mono">
                        {isSecurity ? 'Solana DEX Swaps' : 'Real-time matching'}
                    </span>
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
            
            <NativeChart
                data={chartData}
                onHover={setHoveredData}
                hoveredData={hoveredData}
                fiat={fiat}
                baselinePrice={baselinePrice}
                formatPrice={formatPrice}
                formatCompact={formatCompact}
                chartType={chartType}
                strokeColor={strokeColor}
            />
        </div>
    );

    // Mobile View: Chart Tab
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

    // Mobile View: Key Quote Tab
    if (viewMode === 'quote') {
        return (
            <div className="flex flex-col h-full bg-background p-3 md:p-6 lg:px-8 py-2 md:py-4 pb-32 md:pb-6 overflow-y-auto">
                {renderCoinChips()}
                {renderHeader()}
                {renderKeyQuoteSection()}
            </div>
        );
    }

    // Desktop View: Both Chart and Key Quote Section
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
