/**
 * Street Sync - Jupiter Swap API & Routing Simulation Engine
 * 
 * Powered by official Jupiter Developer API (api.jup.ag)
 * Provides real-time market routing, quote aggregation, and interactive 
 * swap simulation for Devnet demo and testing environments.
 */

export interface TokenInfo {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logoURI: string;
}

export const POPULAR_TOKENS: TokenInfo[] = [
  {
    symbol: "SOL",
    name: "Solana",
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9,
    logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
    logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
  },
  {
    symbol: "JUP",
    name: "Jupiter",
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    decimals: 6,
    logoURI: "https://static.jup.ag/jup/icon.png",
  },
  {
    symbol: "BONK",
    name: "Bonk",
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    decimals: 5,
    logoURI: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
  },
  {
    symbol: "RAY",
    name: "Raydium",
    mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    decimals: 6,
    logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png",
  },
];

export interface JupiterRoutePlan {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
  };
  percent: number;
}

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: JupiterRoutePlan[];
  contextSlot: number;
  timeTaken: number;
  swapUsdValue?: string;
}

export interface SwapSimulationReceipt {
  signature: string;
  timestamp: string;
  inputToken: TokenInfo;
  outputToken: TokenInfo;
  inputAmount: number;
  outputAmount: number;
  exchangeRate: number;
  routeSteps: string[];
  priceImpact: string;
  networkFeeSOL: number;
  contextSlot: number;
}

export function getJupiterApiKey(): string {
  let key = process.env.NEXT_PUBLIC_JUPITER_API_KEY || "";
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("street_sync_jup_api_key");
    if (local && local.trim()) {
      key = local.trim();
    }
  }
  // Default to provided verified production key
  return key || "jup_c424485f4dc05d12d4a719840d3eaebeaf65be9e2640f9d499b23962b684cff3";
}

export function setJupiterApiKey(key: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("street_sync_jup_api_key", key.trim());
  }
}

/**
 * Queries real-time swap routes and quote rates from Jupiter API
 */
export async function fetchJupiterQuote(
  inputMint: string,
  outputMint: string,
  amountAtomic: string | number,
  slippageBps: number = 50
): Promise<JupiterQuoteResponse> {
  const apiKey = getJupiterApiKey();
  const url = `https://api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountAtomic}&slippageBps=${slippageBps}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Jupiter Quote API error (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * Generates an authentic simulated transaction receipt based on live Jupiter quote data.
 */
export async function simulateJupiterSwap(
  quote: JupiterQuoteResponse,
  inputToken: TokenInfo,
  outputToken: TokenInfo,
  inputAmountHuman: number
): Promise<SwapSimulationReceipt> {
  // Simulate network flight time (600ms - 900ms)
  await new Promise((resolve) => setTimeout(resolve, 750));

  const outAtomic = BigInt(quote.outAmount);
  const outHuman = Number(outAtomic) / Math.pow(10, outputToken.decimals);
  const rate = outHuman / inputAmountHuman;

  // Extract distinct AMM labels in the route plan (e.g. Kipseli, Orca, Raydium)
  const routeSteps = quote.routePlan && quote.routePlan.length > 0
    ? quote.routePlan.map((r) => r.swapInfo.label)
    : ["Jupiter Smart Router"];

  // Generate realistic Solana tx signature format
  const characters = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let randomSig = "";
  for (let i = 0; i < 88; i++) {
    randomSig += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return {
    signature: randomSig,
    timestamp: new Date().toLocaleTimeString(),
    inputToken,
    outputToken,
    inputAmount: inputAmountHuman,
    outputAmount: outHuman,
    exchangeRate: rate,
    routeSteps,
    priceImpact: (Number(quote.priceImpactPct || 0) * 100).toFixed(4) + "%",
    networkFeeSOL: 0.000005,
    contextSlot: quote.contextSlot || 450631000 + Math.floor(Math.random() * 1000),
  };
}
