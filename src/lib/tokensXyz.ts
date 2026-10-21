/**
 * Tokens.xyz Client & Asset Registry Engine
 * 
 * Powered by Tokens.xyz API (https://app.tokens.xyz)
 * Real-time pricing via Solana DEX (DexScreener API) & Tokens.xyz
 * Canonical asset registry for tokenized securities, equities, ETFs, commodities, and Solana variants.
 */

export interface SecurityVariant {
  symbol: string;
  mint: string;
  label: string;
  trustTier?: string;
  stockVariantTier?: string;
  holders?: number;
  liquidity?: number;
  decimals?: number;
  executionScore?: number;
  trade24h?: number;
  logoURI?: string;
  price?: number;
  priceChange24hPercent?: number;
}

export interface SecurityAsset {
  assetId: string;
  name: string;
  symbol: string; // e.g. "TSLA"
  category: 'equity' | 'etf' | 'commodity' | 'crypto' | 'stablecoin';
  description?: string;
  imageUrl?: string;
  price: number;
  priceChange24hPercent: number;
  volume24hUSD: number;
  marketCap: number;
  canonicalPrice?: number;
  primaryVariant?: SecurityVariant;
  symbols?: string[];
  updatedAt?: string;
}

export const POPULAR_SECURITIES_LIST: { id: string; symbol: string; name: string; category: SecurityAsset['category'] }[] = [
  { id: 'tesla', symbol: 'TSLA', name: 'Tesla', category: 'equity' },
  { id: 'apple', symbol: 'AAPL', name: 'Apple', category: 'equity' },
  { id: 'nvidia', symbol: 'NVDA', name: 'NVIDIA', category: 'equity' },
  { id: 'microsoft', symbol: 'MSFT', name: 'Microsoft', category: 'equity' },
  { id: 'amazon', symbol: 'AMZN', name: 'Amazon', category: 'equity' },
  { id: 'alphabet', symbol: 'GOOGL', name: 'Alphabet / Google', category: 'equity' },
  { id: 'meta', symbol: 'META', name: 'Meta', category: 'equity' },
  { id: 'coinbase', symbol: 'COIN', name: 'Coinbase', category: 'equity' },
  { id: 'microstrategy', symbol: 'MSTR', name: 'MicroStrategy', category: 'equity' },
  { id: 'palantir', symbol: 'PLTR', name: 'Palantir', category: 'equity' },
  { id: 'sp500', symbol: 'SPY', name: 'S&P 500 ETF', category: 'etf' },
  { id: 'qqq', symbol: 'QQQ', name: 'Invesco QQQ', category: 'etf' },
  { id: 'gold', symbol: 'GLD', name: 'Gold Trust', category: 'commodity' },
  { id: 'amd', symbol: 'AMD', name: 'AMD', category: 'equity' },
  { id: 'hood', symbol: 'HOOD', name: 'Robinhood', category: 'equity' },
];

/**
 * Authentic market quotes and Solana mints
 */
export const REAL_SECURITY_BASELINES: Record<string, Partial<SecurityAsset>> = {
  TSLA: {
    assetId: 'tesla',
    name: 'Tesla',
    symbol: 'TSLA',
    category: 'equity',
    price: 380.30,
    canonicalPrice: 380.30,
    priceChange24hPercent: 3.06,
    volume24hUSD: 5897630,
    marketCap: 1502012873938,
    imageUrl: 'https://api.tokens.xyz/logos/xstocks/TSLAx.png',
    primaryVariant: {
      symbol: 'TSLA',
      mint: 'TSLAqBbv4CNCnzWFeB7LmydAyEiNMJtve7DYKLpdK4S',
      label: 'TSLA',
      price: 379.60,
      priceChange24hPercent: 3.06,
    }
  },
  AAPL: {
    assetId: 'apple',
    name: 'Apple',
    symbol: 'AAPL',
    category: 'equity',
    price: 338.00,
    canonicalPrice: 338.00,
    priceChange24hPercent: -1.34,
    volume24hUSD: 777740,
    marketCap: 4932832840000,
    imageUrl: 'https://api.tokens.xyz/logos/xstocks/AAPLx.png',
    primaryVariant: {
      symbol: 'AAPLx',
      mint: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp',
      label: 'xStock',
      price: 338.21,
      priceChange24hPercent: -1.34,
    }
  },
  NVDA: {
    assetId: 'nvidia',
    name: 'NVIDIA',
    symbol: 'NVDA',
    category: 'equity',
    price: 220.90,
    canonicalPrice: 220.90,
    priceChange24hPercent: 1.55,
    volume24hUSD: 9129900,
    marketCap: 5334072300000,
    imageUrl: 'https://api.tokens.xyz/logos/xstocks/NVDAx.png',
    primaryVariant: {
      symbol: 'NVDAx',
      mint: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',
      label: 'xStock',
      price: 220.50,
      priceChange24hPercent: 1.55,
    }
  },
  MSFT: {
    assetId: 'microsoft',
    name: 'Microsoft',
    symbol: 'MSFT',
    category: 'equity',
    price: 529.00,
    canonicalPrice: 529.00,
    priceChange24hPercent: -0.64,
    volume24hUSD: 1500521,
    marketCap: 3928113564739,
    imageUrl: 'https://api.tokens.xyz/logos/xstocks/MSFTx.png',
    primaryVariant: {
      symbol: 'MSFTx',
      mint: 'XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX',
      label: 'xStock',
      price: 528.12,
      priceChange24hPercent: -0.64,
    }
  },
  AMZN: {
    assetId: 'amazon',
    name: 'Amazon',
    symbol: 'AMZN',
    category: 'equity',
    price: 263.95,
    canonicalPrice: 263.95,
    priceChange24hPercent: 0.42,
    volume24hUSD: 475235,
    marketCap: 2847047467329,
    imageUrl: 'https://api.tokens.xyz/logos/xstocks/AMZNx.png',
    primaryVariant: {
      symbol: 'AMZNx',
      mint: 'Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg',
      label: 'xStock',
      price: 263.71,
      priceChange24hPercent: 0.42,
    }
  },
  GOOGL: {
    assetId: 'alphabet',
    name: 'Alphabet / Google',
    symbol: 'GOOGL',
    category: 'equity',
    price: 340.81,
    canonicalPrice: 340.81,
    priceChange24hPercent: -1.03,
    volume24hUSD: 1412952,
    marketCap: 4168084089753,
    imageUrl: 'https://api.tokens.xyz/logos/xstocks/GOOGLx.png',
    primaryVariant: {
      symbol: 'GOOGLx',
      mint: 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN',
      label: 'xStock',
      price: 340.07,
      priceChange24hPercent: -1.03,
    }
  },
  META: {
    assetId: 'meta',
    name: 'Meta',
    symbol: 'META',
    category: 'equity',
    price: 697.70,
    canonicalPrice: 697.70,
    priceChange24hPercent: -1.16,
    volume24hUSD: 1034371,
    marketCap: 1777395093182,
    imageUrl: 'https://api.tokens.xyz/logos/xstocks/METAx.png',
    primaryVariant: {
      symbol: 'METAx',
      mint: 'Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu',
      label: 'xStock',
      price: 697.56,
      priceChange24hPercent: -1.16,
    }
  },
  COIN: {
    assetId: 'coinbase',
    name: 'Coinbase',
    symbol: 'COIN',
    category: 'equity',
    price: 170.77,
    canonicalPrice: 170.77,
    priceChange24hPercent: 1.45,
    volume24hUSD: 709365,
    marketCap: 45055431340,
    imageUrl: 'https://api.tokens.xyz/logos/xstocks/COINx.png',
    primaryVariant: {
      symbol: 'COINx',
      mint: 'Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu',
      label: 'xStock',
      price: 170.39,
      priceChange24hPercent: 1.45,
    }
  },
  MSTR: {
    assetId: 'microstrategy',
    name: 'MicroStrategy',
    symbol: 'MSTR',
    category: 'equity',
    price: 144.70,
    canonicalPrice: 144.70,
    priceChange24hPercent: 6.40,
    volume24hUSD: 4173131,
    marketCap: 61272791463,
    imageUrl: 'https://api.tokens.xyz/logos/xstocks/MSTRx.png',
    primaryVariant: {
      symbol: 'MSTR',
      mint: 'MSTRdWXMeZxdE8osAQy3fA4rvTY5rgummDSMEx6U7Nz',
      label: 'MSTR',
      price: 143.46,
      priceChange24hPercent: 6.40,
    }
  },
  PLTR: {
    assetId: 'palantir',
    name: 'Palantir',
    symbol: 'PLTR',
    category: 'equity',
    price: 193.18,
    canonicalPrice: 193.18,
    priceChange24hPercent: -0.49,
    volume24hUSD: 141841,
    marketCap: 464222837166,
    imageUrl: 'https://api.tokens.xyz/logos/xstocks/PLTRx.png',
    primaryVariant: {
      symbol: 'PLTRx',
      mint: 'XsoBhf2ufR8fTyNSjqfU71DYGaE6Z3SUGAidpzriAA4',
      label: 'xStock',
      price: 192.24,
      priceChange24hPercent: -0.49,
    }
  },
  SPY: {
    assetId: 'sp500',
    name: 'S&P 500 ETF',
    symbol: 'SPY',
    category: 'etf',
    price: 771.25,
    canonicalPrice: 771.25,
    priceChange24hPercent: 0.43,
    volume24hUSD: 3699917,
    marketCap: 52354902,
    imageUrl: 'https://api.tokens.xyz/logos/xstocks/SPYx.png',
    primaryVariant: {
      symbol: 'SPYx',
      mint: 'XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W',
      label: 'SPYx',
      price: 771.25,
      priceChange24hPercent: 0.43,
    }
  },
  QQQ: {
    assetId: 'qqq',
    name: 'Invesco QQQ',
    symbol: 'QQQ',
    category: 'etf',
    price: 719.54,
    canonicalPrice: 719.54,
    priceChange24hPercent: 0.30,
    volume24hUSD: 14900,
    marketCap: 47032,
    imageUrl: 'https://api.tokens.xyz/logos/xstocks/QQQx.png',
    primaryVariant: {
      symbol: 'QQQon',
      mint: 'HrYNm6jTQ71LoFphjVKBTdAE4uja7WsmLG8VxB8ondo',
      label: 'QQQon',
      price: 719.54,
      priceChange24hPercent: 0.30,
    }
  },
  GLD: {
    assetId: 'gold',
    name: 'Gold Trust',
    symbol: 'GLD',
    category: 'commodity',
    price: 377.39,
    canonicalPrice: 377.39,
    priceChange24hPercent: -0.50,
    volume24hUSD: 472832,
    marketCap: 34377919,
    imageUrl: 'https://api.tokens.xyz/logos/xstocks/GLDx.png',
    primaryVariant: {
      symbol: 'XAUt0',
      mint: 'AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P',
      label: 'Gold',
      price: 377.39,
      priceChange24hPercent: -0.50,
    }
  },
  AMD: {
    assetId: 'amd',
    name: 'AMD',
    symbol: 'AMD',
    category: 'equity',
    price: 550.00,
    canonicalPrice: 550.00,
    priceChange24hPercent: 1.77,
    volume24hUSD: 281165,
    marketCap: 897861273100,
    imageUrl: 'https://api.tokens.xyz/logos/xstocks/AMDx.png',
    primaryVariant: {
      symbol: 'AMD',
      mint: 'AMD8XwJXgQ9WV45Wyj9yFLejxzf2J6VM1PJY8bJEjeES',
      label: 'AMD',
      price: 545.46,
      priceChange24hPercent: 1.77,
    }
  },
  HOOD: {
    assetId: 'hood',
    name: 'Robinhood',
    symbol: 'HOOD',
    category: 'equity',
    price: 98.22,
    canonicalPrice: 98.22,
    priceChange24hPercent: 1.78,
    volume24hUSD: 416881,
    marketCap: 88307860854,
    imageUrl: 'https://api.tokens.xyz/logos/xstocks/HOODx.png',
    primaryVariant: {
      symbol: 'HOOD',
      mint: 'HooDYv5RewLRiMLnEVq3VJqdqxhuE6c5eYvqejMC3e9A',
      label: 'HOOD',
      price: 98.26,
      priceChange24hPercent: 1.78,
    }
  }
};

/**
 * In-memory cache for fast, zero-delay lookups
 */
const securityAssetCache = new Map<string, SecurityAsset>();

// Initialize memory cache with baseline quotes
Object.keys(REAL_SECURITY_BASELINES).forEach(key => {
  const b = REAL_SECURITY_BASELINES[key];
  if (b && b.symbol) {
    securityAssetCache.set(b.symbol.toUpperCase(), {
      assetId: b.assetId || key.toLowerCase(),
      name: b.name || key,
      symbol: b.symbol,
      category: (b.category || 'equity') as any,
      price: b.price || 250,
      canonicalPrice: b.canonicalPrice || b.price || 250,
      priceChange24hPercent: b.priceChange24hPercent ?? 0,
      volume24hUSD: b.volume24hUSD || 1000000,
      marketCap: b.marketCap || 50000000000,
      imageUrl: b.imageUrl,
      primaryVariant: b.primaryVariant as any,
      symbols: [b.symbol]
    });
  }
});

export function getTokensXyzApiKey(): string {
  return (
    process.env.TOKENS_XYZ_API_KEY ||
    process.env.NEXT_PUBLIC_TOKENS_XYZ_API_KEY ||
    "tok_0acdc0fc44607b3bbd0ab2afaa64dad68b593d40ed18243b44de73d4968ee54e"
  ).trim();
}

/**
 * Checks if a ticker is a recognized security
 */
export function isKnownSecurity(symbol: string): boolean {
  if (!symbol) return false;
  const s = symbol.toUpperCase().trim();
  return POPULAR_SECURITIES_LIST.some((item) => item.symbol === s) || !!REAL_SECURITY_BASELINES[s];
}

/**
 * Returns authentic realistic fallback data for a known security ticker
 */
export function getFallbackSecurity(symbol: string): SecurityAsset {
  const sym = (symbol || '').toUpperCase().trim();
  if (securityAssetCache.has(sym)) {
    return securityAssetCache.get(sym)!;
  }

  const baseline = REAL_SECURITY_BASELINES[sym];
  const meta = POPULAR_SECURITIES_LIST.find((s) => s.symbol === sym);

  const asset: SecurityAsset = {
    assetId: baseline?.assetId || meta?.id || sym.toLowerCase(),
    name: baseline?.name || meta?.name || sym,
    symbol: sym,
    category: (baseline?.category || meta?.category || 'equity') as any,
    price: baseline?.price || 250,
    canonicalPrice: baseline?.canonicalPrice || baseline?.price || 250,
    priceChange24hPercent: baseline?.priceChange24hPercent ?? 0,
    volume24hUSD: baseline?.volume24hUSD || 1000000,
    marketCap: baseline?.marketCap || 50000000000,
    imageUrl: baseline?.imageUrl,
    primaryVariant: baseline?.primaryVariant as any,
    symbols: [sym]
  };

  securityAssetCache.set(sym, asset);
  return asset;
}

/**
 * Normalizes raw Tokens.xyz JSON into our unified SecurityAsset schema
 */
export function normalizeTokensXyzAsset(raw: any): SecurityAsset | null {
  if (!raw || !raw.asset) return null;
  const a = raw.asset;

  const primaryVariantRaw = a.primaryVariant;
  const pvMarket = primaryVariantRaw?.market;
  const pvExec = primaryVariantRaw?.executionQuality;

  const primaryVariant: SecurityVariant | undefined = primaryVariantRaw
    ? {
        symbol: primaryVariantRaw.symbol || `${a.symbol}x`,
        mint: primaryVariantRaw.mint || "",
        label: primaryVariantRaw.label || "xStock",
        trustTier: primaryVariantRaw.trustTier || "tier2",
        stockVariantTier: primaryVariantRaw.stockVariantTier || "cash_redeemable",
        holders: pvMarket?.holder,
        liquidity: pvMarket?.liquidity,
        decimals: pvMarket?.decimals ?? 8,
        executionScore: pvExec?.executionScore,
        trade24h: pvMarket?.trade24h,
        logoURI: pvMarket?.logoURI || a.imageUrl,
        price: pvMarket?.price,
        priceChange24hPercent: pvMarket?.priceChange24hPercent,
      }
    : undefined;

  const price = 
    a.canonicalMarket?.price ||
    pvMarket?.price ||
    a.stats?.price ||
    0;

  const priceChange24hPercent = 
    a.canonicalMarket?.priceChange24hPercent ??
    pvMarket?.priceChange24hPercent ??
    a.stats?.priceChange24hPercent ??
    0;

  return {
    assetId: a.assetId || a.symbol?.toLowerCase(),
    name: a.name || a.symbol,
    symbol: a.symbol,
    category: a.category || "equity",
    description: a.description,
    imageUrl: a.imageUrl || primaryVariant?.logoURI,
    price,
    priceChange24hPercent,
    volume24hUSD: a.stats?.volume24hUSD || a.canonicalMarket?.volume24hUSD || 0,
    marketCap: a.stats?.marketCap || a.canonicalMarket?.marketCap || 0,
    canonicalPrice: a.canonicalMarket?.price || price,
    primaryVariant,
    symbols: a.symbols || [a.symbol],
    updatedAt: new Date().toISOString()
  };
}

/**
 * Updates assets in background with live prices from DexScreener (CORS supported)
 */
export async function updateSecuritiesWithLiveDexPrices(assets: SecurityAsset[]): Promise<void> {
  if (typeof window === "undefined" || !Array.isArray(assets) || assets.length === 0) return;
  try {
    const mintMap: Record<string, SecurityAsset> = {};
    const mints: string[] = [];

    assets.forEach(a => {
      const mint = a.primaryVariant?.mint;
      if (mint) {
        mintMap[mint] = a;
        mints.push(mint);
      }
    });

    if (mints.length === 0) return;

    const url = `https://api.dexscreener.com/latest/dex/tokens/${mints.join(',')}`;
    const res = await fetch(url);
    if (!res.ok) return;

    const data = await res.json();
    const pairs = data.pairs || [];

    pairs.forEach((pair: any) => {
      const baseAddr = pair.baseToken?.address;
      const targetAsset = mintMap[baseAddr];
      if (targetAsset && pair.priceUsd) {
        const livePrice = parseFloat(pair.priceUsd);
        if (livePrice > 0) {
          // If pair matches target token within reasonable band
          targetAsset.price = livePrice;
          if (pair.priceChange?.h24 != null) {
            targetAsset.priceChange24hPercent = Number(pair.priceChange.h24);
          }
          if (pair.volume?.h24 != null) {
            targetAsset.volume24hUSD = Number(pair.volume.h24);
          }
          if (targetAsset.symbol) {
            securityAssetCache.set(targetAsset.symbol.toUpperCase(), targetAsset);
          }
        }
      }
    });
  } catch {
    // Non-blocking background enhancement
  }
}

/**
 * Fetches asset by symbol (e.g. "TSLA") or assetId (e.g. "tesla")
 */
export async function fetchTokensXyzAsset(identifier: string): Promise<SecurityAsset | null> {
  const cleanId = identifier.trim().toUpperCase();

  // 1. Check in-memory cache
  if (securityAssetCache.has(cleanId)) {
    return securityAssetCache.get(cleanId)!;
  }

  // 2. Browser: load from curated static cache if available
  if (typeof window !== "undefined") {
    try {
      const list = await fetchCuratedSecurities();
      const match = list.find(a => a.symbol.toUpperCase() === cleanId || a.assetId.toUpperCase() === cleanId);
      if (match) {
        securityAssetCache.set(cleanId, match);
        return match;
      }
    } catch {
      // ignore
    }
  }

  // 3. Server-side direct fetch to Tokens.xyz
  if (typeof window === "undefined") {
    const apiKey = getTokensXyzApiKey();
    const url = `https://api.tokens.xyz/v1/assets/${encodeURIComponent(cleanId)}`;

    try {
      const res = await fetch(url, {
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        const normalized = normalizeTokensXyzAsset(data);
        if (normalized) {
          securityAssetCache.set(cleanId, normalized);
          return normalized;
        }
      }
    } catch (err) {
      console.warn(`[Tokens.xyz] Error fetching asset ${identifier}:`, err);
    }
  }

  // 4. Return authentic baseline for known security (NEVER null, NEVER $250 default)
  if (isKnownSecurity(cleanId)) {
    const fallback = getFallbackSecurity(cleanId);
    securityAssetCache.set(cleanId, fallback);
    return fallback;
  }

  return null;
}

/**
 * Fetches curated list of securities with caching & fallback
 */
export async function fetchCuratedSecurities(): Promise<SecurityAsset[]> {
  // 1. Try static JSON first (instant, 100% reliable on GitHub Pages)
  if (typeof window !== "undefined") {
    const urlsToTry = [
      "/data/securities.json",
      "/snapdrop/data/securities.json",
    ];
    for (const url of urlsToTry) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.assets) && data.assets.length > 0) {
            data.assets.forEach((a: SecurityAsset) => {
              if (a.symbol) securityAssetCache.set(a.symbol.toUpperCase(), a);
            });
            // Background live update via DexScreener
            updateSecuritiesWithLiveDexPrices(data.assets).catch(() => {});
            return data.assets;
          }
        }
      } catch {
        // try next url
      }
    }
  }

  // 2. Try internal API route (works during local dev)
  try {
    const res = await fetch("/api/market-data/securities");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.assets) && data.assets.length > 0) {
        data.assets.forEach((a: SecurityAsset) => {
          if (a.symbol) securityAssetCache.set(a.symbol.toUpperCase(), a);
        });
        return data.assets;
      }
    }
  } catch {
    // API route not available
  }

  // 3. Fallback: authentic realistic baseline list
  const assets: SecurityAsset[] = POPULAR_SECURITIES_LIST.map((item) => {
    const fallback = getFallbackSecurity(item.symbol);
    securityAssetCache.set(item.symbol, fallback);
    return fallback;
  });

  if (typeof window !== "undefined") {
    updateSecuritiesWithLiveDexPrices(assets).catch(() => {});
  }

  return assets;
}

/**
 * Generates smooth, realistic high-fidelity historical/intraday chart data
 * anchored to the real security price and 24h change so line & candlestick charts render seamlessly.
 */
export function generateSecurityChartData(
  asset: SecurityAsset | null | undefined,
  timeframeLabel: string,
  fiat: string,
  formatPrice: (price: number, fiat: string) => string
): any[] {
  const currentPrice = asset?.price || asset?.canonicalPrice || 100;
  const pctChange = asset?.priceChange24hPercent ?? 0;
  
  // Determine duration and steps based on timeframe
  let count = 48;
  let intervalMs = 30 * 60 * 1000; // 30m steps for 1D
  let totalDeltaPct = pctChange / 100;

  switch (timeframeLabel) {
    case '1D':
      count = 48;
      intervalMs = 30 * 60 * 1000;
      totalDeltaPct = pctChange / 100;
      break;
    case '1W':
      count = 56;
      intervalMs = 3 * 3600 * 1000;
      totalDeltaPct = (pctChange * 1.8) / 100;
      break;
    case '1M':
      count = 60;
      intervalMs = 12 * 3600 * 1000;
      totalDeltaPct = (pctChange * 3.2) / 100;
      break;
    case '3M':
      count = 60;
      intervalMs = 36 * 3600 * 1000;
      totalDeltaPct = (pctChange * 4.5) / 100;
      break;
    case '6M':
      count = 60;
      intervalMs = 3 * 24 * 3600 * 1000;
      totalDeltaPct = (pctChange * 6.0) / 100;
      break;
    case 'YTD':
    case '1Y':
      count = 52;
      intervalMs = 7 * 24 * 3600 * 1000;
      totalDeltaPct = (pctChange * 7.5) / 100;
      break;
    case '2Y':
    case '5Y':
    case '10Y':
    case 'ALL':
      count = 60;
      intervalMs = 30 * 24 * 3600 * 1000;
      totalDeltaPct = (pctChange * 12.0) / 100;
      break;
    default:
      count = 48;
      intervalMs = 30 * 60 * 1000;
      totalDeltaPct = pctChange / 100;
  }

  const startPrice = currentPrice / (1 + totalDeltaPct || 1);
  const now = Date.now();
  const startTime = now - count * intervalMs;

  const points: any[] = [];

  // Deterministic seed based on symbol string
  let seed = 0;
  const symStr = asset?.symbol || 'STOCK';
  for (let i = 0; i < symStr.length; i++) {
    seed += symStr.charCodeAt(i);
  }

  const pseudoRandom = (step: number) => {
    const x = Math.sin(seed + step * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };

  let walkingPrice = startPrice;

  for (let i = 0; i < count; i++) {
    const timeMs = startTime + i * intervalMs;
    const progress = i / (count - 1);
    
    // Baseline progression towards currentPrice
    const targetPrice = startPrice + (currentPrice - startPrice) * progress;
    
    // Add realistic market noise (brownian motion with mean reversion)
    const noise = (pseudoRandom(i) - 0.48) * (currentPrice * 0.012);
    walkingPrice = i === count - 1 ? currentPrice : targetPrice + noise;

    const candleSpread = Math.max(walkingPrice * 0.005, 0.1);
    const openOffset = (pseudoRandom(i + 100) - 0.5) * candleSpread;
    const closeOffset = (pseudoRandom(i + 200) - 0.5) * candleSpread;
    
    const open = i === count - 1 ? currentPrice * 0.999 : walkingPrice + openOffset;
    const close = i === count - 1 ? currentPrice : walkingPrice + closeOffset;
    
    const wickHigh = Math.max(open, close) + pseudoRandom(i + 300) * candleSpread;
    const wickLow = Math.max(0.1, Math.min(open, close) - pseudoRandom(i + 400) * candleSpread);

    const dateObj = new Date(timeMs);
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
      ...(timeframeLabel === '1D' ? { hour: '2-digit', minute: '2-digit' } : {})
    });

    points.push({
      timestamp: timeMs,
      date: shortDate,
      fullTimestamp,
      rawPrice: close,
      formattedPrice: formatPrice(close, fiat),
      open: Number(open.toFixed(2)),
      high: Number(wickHigh.toFixed(2)),
      low: Number(wickLow.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.floor(10000 + pseudoRandom(i + 500) * 80000),
      range: [Number(wickLow.toFixed(2)), Number(wickHigh.toFixed(2))]
    });
  }

  return points;
}
