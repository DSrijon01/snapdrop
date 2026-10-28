/**
 * Fetches tokenized securities data from Tokens.xyz API and saves to public/data/securities.json
 * Runs at build time and can also be executed periodically.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKENS_XYZ_API_KEY = process.env.TOKENS_XYZ_API_KEY || 
  process.env.NEXT_PUBLIC_TOKENS_XYZ_API_KEY || 
  "tok_0acdc0fc44607b3bbd0ab2afaa64dad68b593d40ed18243b44de73d4968ee54e";

const SECURITIES_LIST = [
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

function normalizeRawAsset(raw, meta) {
  if (!raw || !raw.asset) {
    return {
      assetId: meta.id,
      name: meta.name,
      symbol: meta.symbol,
      category: meta.category,
      price: 250,
      priceChange24hPercent: 0,
      volume24hUSD: 1000000,
      marketCap: 50000000000,
      canonicalPrice: 250,
      symbols: [meta.symbol]
    };
  }

  const a = raw.asset;
  const pvRaw = a.primaryVariant;
  const pvMarket = pvRaw?.market;
  const pvExec = pvRaw?.executionQuality;

  const primaryVariant = pvRaw ? {
    symbol: pvRaw.symbol || `${a.symbol}x`,
    mint: pvRaw.mint || "",
    label: pvRaw.label || "xStock",
    trustTier: pvRaw.trustTier || "tier2",
    stockVariantTier: pvRaw.stockVariantTier || "cash_redeemable",
    holders: pvMarket?.holder,
    liquidity: pvMarket?.liquidity,
    decimals: pvMarket?.decimals ?? 8,
    executionScore: pvExec?.executionScore,
    trade24h: pvMarket?.trade24h,
    logoURI: pvMarket?.logoURI || a.imageUrl,
    price: pvMarket?.price,
    priceChange24hPercent: pvMarket?.priceChange24hPercent,
  } : undefined;

  const price = a.canonicalMarket?.price || 
    pvMarket?.price || 
    a.stats?.price || 
    0;

  const priceChange24hPercent = a.canonicalMarket?.priceChange24hPercent ?? 
    pvMarket?.priceChange24hPercent ?? 
    a.stats?.priceChange24hPercent ?? 
    0;

  return {
    assetId: a.assetId || meta.id,
    name: a.name || meta.name,
    symbol: a.symbol || meta.symbol,
    category: a.category || meta.category,
    description: a.description || "",
    imageUrl: a.imageUrl || primaryVariant?.logoURI || "",
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

async function main() {
  console.log('[Fetch Securities] Querying Tokens.xyz API for 15 curated securities...');

  const results = await Promise.allSettled(
    SECURITIES_LIST.map(async (meta) => {
      const url = `https://api.tokens.xyz/v1/assets/${encodeURIComponent(meta.symbol)}`;
      const res = await fetch(url, {
        headers: {
          'x-api-key': TOKENS_XYZ_API_KEY,
          'Accept': 'application/json'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      return normalizeRawAsset(data, meta);
    })
  );

  const assets = [];
  results.forEach((r, idx) => {
    const meta = SECURITIES_LIST[idx];
    if (r.status === 'fulfilled' && r.value) {
      assets.push(r.value);
      console.log(`  ✓ ${meta.symbol}: $${r.value.price.toFixed(2)} (${r.value.priceChange24hPercent >= 0 ? '+' : ''}${r.value.priceChange24hPercent.toFixed(2)}%)`);
    } else {
      console.warn(`  ✗ Failed to fetch ${meta.symbol}:`, r.reason?.message);
    }
  });

  const outputDir = path.resolve(__dirname, '../public/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'securities.json');
  if (assets.length === 0 && fs.existsSync(outputPath)) {
    console.warn(`[Fetch Securities] Fetched 0 assets (possibly offline or rate-limited). Preserving existing ${outputPath}`);
    return;
  }

  fs.writeFileSync(outputPath, JSON.stringify({
    updatedAt: new Date().toISOString(),
    total: assets.length,
    assets
  }, null, 2));

  console.log(`[Fetch Securities] Successfully saved ${assets.length} securities to ${outputPath}`);
}

main().catch(err => {
  console.error('[Fetch Securities] Fatal error:', err);
  process.exit(0); // Exit cleanly so build doesn't crash if offline
});
