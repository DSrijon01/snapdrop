import { PublicKey } from "@solana/web3.js";

export type ProOrderSide = "BUY" | "SELL"; // BUY = Bid (paying quote SOL), SELL = Ask (selling base token)
export type ProTokenType = "YES" | "NO";

export interface ProOrder {
  id: string;
  orderId: number;
  marketId: string;
  maker: string;
  side: ProOrderSide;
  tokenType: ProTokenType;
  price: number; // In SOL (e.g. 0.45)
  quantity: number; // Base shares (e.g. 10)
  filledQuantity: number;
  isActive: boolean;
  createdAt: number;
  orderStatePubkey?: PublicKey;
}

export interface ProPoolReserve {
  marketId: string;
  yesReserve: number; // Total YES tokens in AMM pool
  noReserve: number;  // Total NO tokens in AMM pool
  solReserve: number; // Total SOL in AMM pool
  totalLpShares: number;
  feeBps: number; // 25 bps = 0.25%
}

export interface ProEvent {
  id: string;
  title: string;
  category: string;
  createdAt: number;
  expiryTs: number; // Expiry timestamp (creation + 86400 for 24h)
  resolved: boolean;
  outcome: boolean | null;
  totalVolumeSol: number;
  openInterestSol: number;
  yesPrice: number; // Implied probability 0..1
  noPrice: number;  // Implied probability 0..1
  marketStatePubkey: PublicKey;
  yesMint: PublicKey;
  noMint: PublicKey;
  vault: PublicKey;
  poolStatePubkey?: PublicKey;
}

export interface ProPosition {
  marketId: string;
  marketTitle: string;
  tokenType: ProTokenType;
  shares: number;
  avgEntryPrice: number;
  currentPrice: number;
  unrealizedPnlSol: number;
  pnlPercent: number;
}

export interface RecentTrade {
  id: string;
  time: string;
  tokenType: ProTokenType;
  side: "BUY" | "SELL";
  price: number;
  amount: number;
  totalSol: number;
  txHash?: string;
}
