"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Loader2, 
  CheckCircle2,
  ChevronRight,
  TrendingUp as BulletIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  dayHigh: number;
  dayLow: number;
  openPrice: number;
  peRatio: string;
  supply: string;
}

// Fixed baseline stocks
const INITIAL_STOCKS: Record<string, Omit<StockData, 'price' | 'change24h'>> = {
  TSLA: {
    symbol: "TSLA",
    name: "Tesla Inc. Tokenized Stock",
    volume24h: 124500000,
    marketCap: 585400000000,
    dayHigh: 188.50,
    dayLow: 181.20,
    openPrice: 183.00,
    peRatio: "42.8",
    supply: "3.18B dTSLA"
  },
  AAPL: {
    symbol: "AAPL",
    name: "Apple Inc. Tokenized Stock",
    volume24h: 89300000,
    marketCap: 2680000000000,
    dayHigh: 174.20,
    dayLow: 171.50,
    openPrice: 172.10,
    peRatio: "26.4",
    supply: "15.4B dAAPL"
  },
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA Corp. Tokenized Stock",
    volume24h: 156800000,
    marketCap: 3120000000000,
    dayHigh: 129.80,
    dayLow: 124.60,
    openPrice: 125.10,
    peRatio: "68.2",
    supply: "24.5B dNVDA"
  },
  AMZN: {
    symbol: "AMZN",
    name: "Amazon.com Inc. Tokenized Stock",
    volume24h: 74200000,
    marketCap: 1850000000000,
    dayHigh: 179.90,
    dayLow: 176.40,
    openPrice: 177.50,
    peRatio: "38.9",
    supply: "10.4B dAMZN"
  },
  COIN: {
    symbol: "COIN",
    name: "Coinbase Global Tokenized Stock",
    volume24h: 42100000,
    marketCap: 53200000000,
    dayHigh: 228.40,
    dayLow: 219.80,
    openPrice: 221.30,
    peRatio: "31.2",
    supply: "240M dCOIN"
  }
};

// Generate historical data points for the charts
const generateHistory = (basePrice: number, pointsCount = 30) => {
  let price = basePrice * 0.95; // Start a bit lower
  const data = [];
  const now = new Date();
  
  for (let i = pointsCount; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const change = (Math.random() - 0.48) * 0.02; // Slight upward bias
    price = price * (1 + change);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: parseFloat(price.toFixed(2)),
    });
  }
  return data;
};

export const BuyStocksTerminal = () => {
  const [stocks, setStocks] = useState<Record<string, StockData>>(() => {
    const initialized: Record<string, StockData> = {};
    Object.keys(INITIAL_STOCKS).forEach((symbol) => {
      const base = INITIAL_STOCKS[symbol];
      // Set initial prices around realistic levels
      let price = 180.00;
      let change = -1.25;
      if (symbol === 'AAPL') { price = 172.80; change = 0.85; }
      else if (symbol === 'NVDA') { price = 127.40; change = 3.42; }
      else if (symbol === 'AMZN') { price = 178.15; change = -0.45; }
      else if (symbol === 'COIN') { price = 224.60; change = 2.18; }
      
      initialized[symbol] = {
        ...base,
        price,
        change24h: change
      };
    });
    return initialized;
  });

  const [selectedSymbol, setSelectedSymbol] = useState<string>("TSLA");
  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M" | "1Y">("1W");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [sharesInput, setSharesInput] = useState<string>("");
  const [usdcInput, setUsdcInput] = useState<string>("");
  
  // Wallet / Portfolio state
  const [usdcBalance, setUsdcBalance] = useState<number>(5420.50);
  const [portfolio, setPortfolio] = useState<Record<string, number>>({
    TSLA: 4,
    AAPL: 8,
    NVDA: 0,
    AMZN: 0,
    COIN: 2
  });

  // Transaction execution status
  const [txState, setTxState] = useState<"idle" | "simulating" | "success" | "error">("idle");
  const [txDetails, setTxDetails] = useState<string>("");

  const currentStock = useMemo(() => stocks[selectedSymbol], [stocks, selectedSymbol]);

  // Generate historical data cache
  const chartsCache = useMemo(() => {
    const cache: Record<string, Array<{date: string; price: number}>> = {};
    Object.keys(stocks).forEach(symbol => {
      cache[symbol] = generateHistory(stocks[symbol].price, 50);
    });
    return cache;
  }, []);

  const [chartData, setChartData] = useState<Array<{date: string; price: number}>>([]);

  // Load correct chart data based on timeframe
  useEffect(() => {
    const baseData = chartsCache[selectedSymbol] || [];
    let sliceLen = 7;
    if (timeframe === "1D") sliceLen = 3; // Simulating intra-day with fewer points
    else if (timeframe === "1W") sliceLen = 7;
    else if (timeframe === "1M") sliceLen = 20;
    else sliceLen = 45;

    // Map timestamps to mock layout
    const formatted = baseData.slice(-sliceLen).map((item, idx) => {
      let dateStr = item.date;
      if (timeframe === "1D") {
        const hour = 9 + Math.floor((idx * 8) / 3);
        dateStr = `${hour}:00`;
      }
      return {
        date: dateStr,
        price: item.price
      };
    });

    // Make sure the last point matches current price exactly
    if (formatted.length > 0 && currentStock) {
      formatted[formatted.length - 1].price = currentStock.price;
    }

    setChartData(formatted);
  }, [selectedSymbol, timeframe, currentStock, chartsCache]);

  // Dynamic simulation loop (prices tick every 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setStocks(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(symbol => {
          const s = updated[symbol];
          // Random walk pricing: +/- 0.05% to 0.12%
          const percentChange = (Math.random() - 0.49) * 0.0016; 
          const oldPrice = s.price;
          const newPrice = parseFloat((oldPrice * (1 + percentChange)).toFixed(2));
          
          // Calculate high/low adjustments
          const dayHigh = Math.max(s.dayHigh, newPrice);
          const dayLow = Math.min(s.dayLow, newPrice);
          
          // Update 24h change
          const openPrice = s.openPrice;
          const change24h = parseFloat((((newPrice - openPrice) / openPrice) * 100).toFixed(2));

          updated[symbol] = {
            ...s,
            price: newPrice,
            dayHigh,
            dayLow,
            change24h
          };
        });
        return updated;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Update inputs on stock selection or trade type change
  useEffect(() => {
    setSharesInput("");
    setUsdcInput("");
  }, [selectedSymbol, tradeType]);

  // Calculation helpers
  const handleSharesChange = (val: string) => {
    if (val === "") {
      setSharesInput("");
      setUsdcInput("");
      return;
    }
    const cleanVal = val.replace(/[^0-9.]/g, '');
    setSharesInput(cleanVal);
    const sharesNum = parseFloat(cleanVal);
    if (!isNaN(sharesNum)) {
      setUsdcInput((sharesNum * currentStock.price).toFixed(2));
    }
  };

  const handleUsdcChange = (val: string) => {
    if (val === "") {
      setSharesInput("");
      setUsdcInput("");
      return;
    }
    const cleanVal = val.replace(/[^0-9.]/g, '');
    setUsdcInput(cleanVal);
    const usdcNum = parseFloat(cleanVal);
    if (!isNaN(usdcNum)) {
      setSharesInput((usdcNum / currentStock.price).toFixed(4));
    }
  };

  const transactionFee = useMemo(() => {
    const amount = parseFloat(usdcInput) || 0;
    return parseFloat((amount * 0.001).toFixed(2)); // 0.1% transaction fee
  }, [usdcInput]);

  const totalCost = useMemo(() => {
    const amount = parseFloat(usdcInput) || 0;
    return tradeType === "buy" ? amount + transactionFee : amount - transactionFee;
  }, [usdcInput, transactionFee, tradeType]);

  const isBalanceSufficient = useMemo(() => {
    const shares = parseFloat(sharesInput) || 0;
    if (shares <= 0) return false;
    
    if (tradeType === "buy") {
      return totalCost <= usdcBalance;
    } else {
      const owned = portfolio[selectedSymbol] || 0;
      return shares <= owned;
    }
  }, [sharesInput, tradeType, totalCost, usdcBalance, portfolio, selectedSymbol]);

  // Simulated transaction submission
  const executeOrder = async () => {
    if (!isBalanceSufficient) return;
    const shares = parseFloat(sharesInput);
    const cost = totalCost;

    setTxState("simulating");
    setTxDetails(`Initiating ${tradeType === "buy" ? "Purchase" : "Sale"} of ${shares} ${selectedSymbol}...`);

    // Simulated latency stages
    await new Promise(r => setTimeout(r, 1200));
    setTxDetails("Routing swap order via devnet token pools...");
    await new Promise(r => setTimeout(r, 1000));
    setTxDetails("Waiting for transaction confirmation on Solana ledger...");
    await new Promise(r => setTimeout(r, 1000));

    // Confirm state changes
    setTxState("success");
    setUsdcBalance(prev => parseFloat((tradeType === "buy" ? prev - cost : prev + cost).toFixed(2)));
    setPortfolio(prev => {
      const owned = prev[selectedSymbol] || 0;
      return {
        ...prev,
        [selectedSymbol]: parseFloat((tradeType === "buy" ? owned + shares : owned - shares).toFixed(4))
      };
    });

    setSharesInput("");
    setUsdcInput("");
  };

  const isPositive = currentStock.change24h >= 0;

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-6xl mx-auto">
      
      {/* LEFT COLUMN: Stocks list selector */}
      <div className="lg:col-span-4 bg-card border border-border flex flex-col shadow-md rounded-2xl overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-display font-black text-sm uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
            Tokenized Equities
          </h3>
          <p className="text-[10px] font-mono text-muted-foreground uppercase mt-1">Solana Devnet Tokenized Pools</p>
        </div>

        <div className="divide-y divide-border overflow-y-auto max-h-[500px]">
          {Object.values(stocks).map((stock) => {
            const active = selectedSymbol === stock.symbol;
            const stockPos = stock.change24h >= 0;
            return (
              <button
                key={stock.symbol}
                onClick={() => setSelectedSymbol(stock.symbol)}
                className={`w-full p-4 flex items-center justify-between text-left transition-all hover:bg-muted/50 ${
                  active ? "bg-muted/80 border-l-4 border-primary" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Styled Symbol Icon Container */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-xs shadow-inner ${
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}>
                    {stock.symbol}
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm tracking-tight">{stock.symbol}</h4>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{stock.name}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-sm">
                    ${stock.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    stockPos ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  }`}>
                    {stockPos ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                    {stockPos ? '+' : ''}{stock.change24h}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* User Balance Summary footer inside list */}
        <div className="mt-auto p-4 border-t border-border bg-secondary/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-mono uppercase text-muted-foreground">Portfolio USDC:</span>
          </div>
          <div className="font-mono font-bold text-sm text-foreground">
            ${usdcBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Chart, Stats and Action Card */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {/* Main interactive terminal card */}
        <div className="bg-card border border-border p-4 sm:p-6 shadow-md rounded-2xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-black text-2xl tracking-tight uppercase">
                  {currentStock.name}
                </h2>
                <span className="text-xs font-mono border border-border bg-muted/50 px-2 py-0.5 rounded uppercase tracking-wider text-muted-foreground">
                  d{currentStock.symbol}
                </span>
              </div>
              <div className="flex items-baseline gap-3 mt-1.5">
                <span className="font-mono font-bold text-3xl tracking-tighter">
                  ${currentStock.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className={`inline-flex items-center gap-0.5 font-mono text-sm ${
                  isPositive ? "text-emerald-500" : "text-red-500"
                }`}>
                  {isPositive ? '+' : ''}{currentStock.change24h}% Today
                </span>
              </div>
            </div>

            {/* Timeframe filters */}
            <div className="flex border border-border bg-muted/30 rounded-lg p-1 gap-1">
              {(["1D", "1W", "1M", "1Y"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1 text-xs font-mono font-bold uppercase rounded-md transition-all ${
                    timeframe === t 
                      ? "bg-primary text-primary-foreground shadow" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Area Chart */}
          <div className="h-64 sm:h-80 w-full mb-6 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#888', fontWeight: 600 }}
                  tickMargin={8}
                />
                <YAxis 
                  domain={['dataMin - 1', 'dataMax + 1']}
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#888', fontWeight: 600 }}
                  tickFormatter={(val) => `$${val}`}
                  tickMargin={8}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1b1b1b', 
                    borderColor: '#374151',
                    borderRadius: '8px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`$${val}`, 'Price']}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke={isPositive ? '#10b981' : '#ef4444'} 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#chartGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Double Columns: Stats and Transaction Forms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
            
            {/* Stock Statistics Column */}
            <div>
              <h3 className="font-display font-black text-sm uppercase tracking-wide mb-4 text-foreground">
                Market Telemetry
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-muted/20 border border-border/50 rounded-lg">
                  <div className="text-muted-foreground uppercase text-[9px] tracking-wider">Day High</div>
                  <div className="font-bold mt-1 text-sm">${currentStock.dayHigh.toFixed(2)}</div>
                </div>
                <div className="p-3 bg-muted/20 border border-border/50 rounded-lg">
                  <div className="text-muted-foreground uppercase text-[9px] tracking-wider">Day Low</div>
                  <div className="font-bold mt-1 text-sm">${currentStock.dayLow.toFixed(2)}</div>
                </div>
                <div className="p-3 bg-muted/20 border border-border/50 rounded-lg">
                  <div className="text-muted-foreground uppercase text-[9px] tracking-wider">Market Cap</div>
                  <div className="font-bold mt-1 text-sm">
                    ${(currentStock.marketCap / 1e9).toFixed(1)}B
                  </div>
                </div>
                <div className="p-3 bg-muted/20 border border-border/50 rounded-lg">
                  <div className="text-muted-foreground uppercase text-[9px] tracking-wider">24h Volume</div>
                  <div className="font-bold mt-1 text-sm">
                    ${(currentStock.volume24h / 1e6).toFixed(1)}M
                  </div>
                </div>
                <div className="p-3 bg-muted/20 border border-border/50 rounded-lg">
                  <div className="text-muted-foreground uppercase text-[9px] tracking-wider">P/E Ratio</div>
                  <div className="font-bold mt-1 text-sm">{currentStock.peRatio}</div>
                </div>
                <div className="p-3 bg-muted/20 border border-border/50 rounded-lg">
                  <div className="text-muted-foreground uppercase text-[9px] tracking-wider">Token Supply</div>
                  <div className="font-bold mt-1 text-sm">{currentStock.supply}</div>
                </div>
              </div>
            </div>

            {/* Trading Buy/Sell Column */}
            <div className="flex flex-col border border-border bg-muted/10 p-4 rounded-xl relative overflow-hidden">
              
              {/* Buy/Sell tab selectors */}
              <div className="flex border border-border bg-muted/30 rounded-lg p-1 mb-4">
                <button
                  onClick={() => setTradeType("buy")}
                  className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase rounded-md transition-all ${
                    tradeType === "buy" 
                      ? "bg-emerald-500 text-white shadow" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setTradeType("sell")}
                  className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase rounded-md transition-all ${
                    tradeType === "sell" 
                      ? "bg-red-500 text-white shadow" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sell
                </button>
              </div>

              {/* Balances Context */}
              <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground mb-3 px-1">
                <span>
                  {tradeType === "buy" ? "AVAILABLE USDC" : `OWNED d${selectedSymbol}`}
                </span>
                <span className="font-bold text-foreground">
                  {tradeType === "buy" 
                    ? `$${usdcBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : `${portfolio[selectedSymbol] || 0} Shares`
                  }
                </span>
              </div>

              {/* Form Input fields */}
              <div className="space-y-3">
                <div className="relative">
                  <label className="absolute top-2.5 left-3 text-[9px] font-mono text-muted-foreground uppercase">
                    Shares
                  </label>
                  <input
                    type="text"
                    value={sharesInput}
                    onChange={(e) => handleSharesChange(e.target.value)}
                    placeholder="0.00"
                    disabled={txState === "simulating"}
                    className="w-full bg-background border border-border text-foreground font-mono font-bold text-right pt-6 pb-2 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  />
                </div>

                <div className="relative">
                  <label className="absolute top-2.5 left-3 text-[9px] font-mono text-muted-foreground uppercase">
                    USDC Amount
                  </label>
                  <input
                    type="text"
                    value={usdcInput}
                    onChange={(e) => handleUsdcChange(e.target.value)}
                    placeholder="0.00"
                    disabled={txState === "simulating"}
                    className="w-full bg-background border border-border text-foreground font-mono font-bold text-right pt-6 pb-2 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  />
                  <div className="absolute left-3 bottom-2 text-xs font-mono text-muted-foreground pointer-events-none">
                    $
                  </div>
                </div>
              </div>

              {/* Order breakdown */}
              {parseFloat(sharesInput) > 0 && (
                <div className="mt-4 space-y-1.5 p-2.5 bg-muted/20 border border-border/50 rounded-lg text-[10px] font-mono">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Broker Pool Fee (0.1%)</span>
                    <span>${transactionFee.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground pt-1.5 border-t border-border/30">
                    <span>Estimated {tradeType === "buy" ? "Cost" : "Proceeds"}</span>
                    <span>${totalCost.toFixed(2)} USDC</span>
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={executeOrder}
                disabled={!isBalanceSufficient || txState === "simulating"}
                className={`w-full mt-4 py-3 font-display font-black text-sm uppercase tracking-wide rounded-xl shadow-md transition-all ${
                  isBalanceSufficient 
                    ? tradeType === "buy"
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer active:scale-[0.98]"
                      : "bg-red-500 hover:bg-red-600 text-white cursor-pointer active:scale-[0.98]"
                    : "bg-muted border border-border text-muted-foreground cursor-not-allowed"
                }`}
              >
                {parseFloat(sharesInput) <= 0 
                  ? "Enter Quantity" 
                  : !isBalanceSufficient 
                    ? "Insufficient Balance" 
                    : `${tradeType === "buy" ? "Buy" : "Sell"} ${selectedSymbol}`
                }
              </button>

              {/* Simulated Transaction Status Screen */}
              <AnimatePresence>
                {txState !== "idle" && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20"
                  >
                    {txState === "simulating" && (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <h4 className="font-display font-bold text-sm uppercase tracking-wide">Executing Devnet swap</h4>
                        <p className="text-[10px] font-mono text-muted-foreground leading-relaxed max-w-[200px]">{txDetails}</p>
                      </div>
                    )}

                    {txState === "success" && (
                      <div className="flex flex-col items-center gap-3">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-bounce" />
                        <h4 className="font-display font-bold text-sm uppercase tracking-wide">Swap Executed</h4>
                        <p className="text-[10px] font-mono text-muted-foreground leading-relaxed max-w-[200px]">
                          Transaction successfully recorded on simulated Solana Devnet ledger.
                        </p>
                        <button
                          onClick={() => setTxState("idle")}
                          className="mt-4 px-4 py-1.5 bg-muted hover:bg-secondary text-foreground text-xs font-mono font-bold uppercase rounded-md border border-border transition-all"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
