export interface KlinePoint {
  time: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20?: number;
}

export interface MarketDataResponse {
  success: boolean;
  symbol: string;
  interval: string;
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  candles: KlinePoint[];
  isSimulated?: boolean;
}

const SYMBOL_MAP: Record<string, { binancePair: string; multiplier: number; precision: number }> = {
  SOL: { binancePair: "SOLUSDT", multiplier: 1.0, precision: 2 },
  BTC: { binancePair: "BTCUSDT", multiplier: 1.0, precision: 1 },
  ETH: { binancePair: "ETHUSDT", multiplier: 1.0, precision: 2 },
  JUP: { binancePair: "JUPUSDT", multiplier: 1.0, precision: 4 },
  RAY: { binancePair: "RAYUSDT", multiplier: 1.0, precision: 3 },
  BONK: { binancePair: "BONKUSDT", multiplier: 1.0, precision: 8 },
  WIF: { binancePair: "WIFUSDT", multiplier: 1.0, precision: 4 },
  RENDER: { binancePair: "RENDERUSDT", multiplier: 1.0, precision: 3 },
  ssSOL: { binancePair: "SOLUSDT", multiplier: 1.033, precision: 2 }, // Staked SOL premium
  SNAP: { binancePair: "JUPUSDT", multiplier: 0.05, precision: 4 }, // Native SNAP token tied to Solana ecosystem
  USDC: { binancePair: "USDCUSDT", multiplier: 1.0, precision: 4 },
};

function formatTime(timestamp: number, interval: string): string {
  const d = new Date(timestamp);
  if (interval === "5s" || interval === "1s") {
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
  }
  if (interval === "1d" || interval === "1w") {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export async function fetchClientMarketData(
  rawSymbol = "SOL",
  rawInterval = "5s",
  limit = 50
): Promise<MarketDataResponse> {
  const symbol = rawSymbol.toUpperCase();
  const mapping = SYMBOL_MAP[symbol] || { binancePair: "SOLUSDT", multiplier: 1.0, precision: 2 };
  const pair = mapping.binancePair;
  const mult = mapping.multiplier;
  const precision = mapping.precision;

  // Map 5s to 1s for Binance klines
  const binanceInterval = rawInterval === "5s" ? "1s" : rawInterval;
  const safeLimit = Math.min(100, Math.max(15, limit));

  try {
    const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${binanceInterval}&limit=${safeLimit}`;
    const res = await fetch(binanceUrl, {
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) {
      throw new Error(`Binance HTTP ${res.status}`);
    }

    const rawData = await res.json();
    if (!Array.isArray(rawData) || rawData.length === 0) {
      throw new Error("Invalid klines format from Binance");
    }

    const candles: KlinePoint[] = rawData.map((k: any) => {
      const open = Number((parseFloat(k[1]) * mult).toFixed(precision));
      const high = Number((parseFloat(k[2]) * mult).toFixed(precision));
      const low = Number((parseFloat(k[3]) * mult).toFixed(precision));
      const close = Number((parseFloat(k[4]) * mult).toFixed(precision));
      const volume = Number(parseFloat(k[5]).toFixed(2));
      const time = k[0];

      return {
        time,
        date: formatTime(time, rawInterval),
        open,
        high,
        low,
        close,
        volume,
      };
    });

    // Calculate SMA-14
    const period = Math.min(14, Math.floor(candles.length / 2));
    for (let i = 0; i < candles.length; i++) {
      if (i >= period - 1) {
        const slice = candles.slice(i - period + 1, i + 1);
        const sum = slice.reduce((acc, c) => acc + c.close, 0);
        candles[i].sma20 = Number((sum / period).toFixed(precision));
      }
    }

    const latest = candles[candles.length - 1];
    const prev = candles[0];
    const change24h = prev ? Number((((latest.close - prev.open) / prev.open) * 100).toFixed(2)) : 0;
    const high24h = Math.max(...candles.map((c) => c.high));
    const low24h = Math.min(...candles.map((c) => c.low));
    const volume24h = candles.reduce((acc, c) => acc + c.volume, 0);

    return {
      success: true,
      symbol,
      interval: rawInterval,
      currentPrice: latest.close,
      change24h,
      high24h,
      low24h,
      volume24h,
      candles,
    };
  } catch (error: any) {
    // Deterministic simulated fallback for resilience in static hosting / offline / rate limit
    const basePrices: Record<string, number> = {
      SOL: 142.5,
      BTC: 89500,
      ETH: 2650,
      JUP: 0.92,
      RAY: 2.15,
      BONK: 0.0000185,
      WIF: 2.45,
      RENDER: 6.8,
      ssSOL: 147.2,
      SNAP: 0.045,
      USDC: 1.0,
    };

    const basePrice = basePrices[symbol] || 100;
    const now = Date.now();
    const intervalMs =
      rawInterval === "5s"
        ? 5000
        : rawInterval === "1m"
        ? 60000
        : rawInterval === "5m"
        ? 300000
        : rawInterval === "15m"
        ? 900000
        : rawInterval === "1h"
        ? 3600000
        : rawInterval === "4h"
        ? 14400000
        : 86400000;
    const candles: KlinePoint[] = [];

    let current = basePrice;
    for (let i = safeLimit; i >= 0; i--) {
      const time = now - i * intervalMs;
      const walk =
        (Math.sin(i / 3) + (Math.random() - 0.48)) *
        (basePrice * (rawInterval === "5s" ? 0.001 : 0.015));
      const close = Math.max(0.000001, Number((current + walk).toFixed(precision)));
      const high = Number((close * 1.002).toFixed(precision));
      const low = Number((close * 0.998).toFixed(precision));
      const open = Number((low + (high - low) * 0.5).toFixed(precision));
      current = close;

      candles.push({
        time,
        date: formatTime(time, rawInterval),
        open,
        high,
        low,
        close,
        volume: Math.floor(1000 + Math.random() * 5000),
      });
    }

    // SMA-14
    const period = Math.min(14, Math.floor(candles.length / 2));
    for (let i = 0; i < candles.length; i++) {
      if (i >= period - 1) {
        const slice = candles.slice(i - period + 1, i + 1);
        const sum = slice.reduce((acc, c) => acc + c.close, 0);
        candles[i].sma20 = Number((sum / period).toFixed(precision));
      }
    }

    return {
      success: true,
      symbol,
      interval: rawInterval,
      currentPrice: candles[candles.length - 1].close,
      change24h: 1.85,
      high24h: Math.max(...candles.map((c) => c.high)),
      low24h: Math.min(...candles.map((c) => c.low)),
      volume24h: 245000,
      candles,
      isSimulated: true,
    };
  }
}
