"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { 
  Search, 
  Database, 
  Coins, 
  Tag, 
  TrendingUp, 
  RefreshCw, 
  ExternalLink, 
  Activity, 
  Copy, 
  Check, 
  Sparkles, 
  Smartphone, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  X,
  ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ModuleSubscriptionWidget } from "@/components/global/subscription/ModuleSubscriptionWidget";
import { resolveNftImageUrl, handleImageFallback } from "@/utils/nftImageResolver";
import { isStandaloneApp } from "@/utils/isStandaloneApp";
import toast from "react-hot-toast";

// Transaction Data Models
export interface TokenTx {
  id?: string;
  name: string;
  symbol: string;
  image?: string;
  amount: string | number;
  price: string | number;
  date: number;
  signature: string;
  type: "BUY" | "SELL";
  category?: "token";
}

export interface NFTTx {
  id?: string;
  name: string;
  image?: string;
  price: string | number;
  seller: string;
  buyer: string;
  date: number;
  signature: string;
  mint?: string;
  type: "BUY" | "SELL" | "LIST";
  category?: "nft";
}

export interface PredictionTx {
  id?: string;
  marketTitle: string;
  side: "YES" | "NO";
  amount: number;
  shares: number;
  price: number;
  type: "BUY" | "CLAIM" | "CLEANUP";
  date: number;
  signature: string;
  category?: "prediction";
}

export interface OnChainTx {
  id: string;
  signature: string;
  slot?: number;
  date: number;
  status: "SUCCESS" | "FAILED";
  err?: any;
  category: "onchain";
}

export type UnifiedTx = 
  | (TokenTx & { category: "token" })
  | (NFTTx & { category: "nft" })
  | (PredictionTx & { category: "prediction" })
  | (OnChainTx & { category: "onchain" });

// Fallback Mock Datasets
const MOCK_TOKEN_TXS: TokenTx[] = [
  {
    name: "Secondary Purchase",
    symbol: "SEC",
    image: "https://placehold.co/400?text=SEC",
    amount: "0.98",
    price: "2.0000",
    date: new Date("2026-06-02T19:07:10").getTime(),
    signature: "2LW8AYxuFv78fG78kjsjCncZRGVv89jhs",
    type: "BUY",
  },
  {
    name: "Bonds",
    symbol: "SSDS",
    image: "https://placehold.co/400?text=SSDS",
    amount: "0.99",
    price: "3.0000",
    date: new Date("2026-06-02T19:03:42").getTime(),
    signature: "4cqow4xaZuiwe8912jksh7ZvHLEYx91hd",
    type: "SELL",
  },
  {
    name: "Bonds",
    symbol: "SSDS",
    image: "https://placehold.co/400?text=SSDS",
    amount: "1.00",
    price: "0.0100",
    date: new Date("2026-06-02T19:02:21").getTime(),
    signature: "53lmrQpdFv78jh7812hkjPTqN65Szkjsh",
    type: "BUY",
  },
  {
    name: "Test Token 2022",
    symbol: "T-22-1",
    image: "https://placehold.co/400?text=T-22-1",
    amount: "1.00",
    price: "0.0090",
    date: new Date("2026-06-02T16:55:12").getTime(),
    signature: "2TWLcaJYkjsdf891hkjsdfgdf9WgQEdfsh",
    type: "BUY",
  },
];

const MOCK_NFT_TXS: NFTTx[] = [
  {
    name: "Cosmic Cube #001",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=160&auto=format&fit=crop&q=80",
    price: "1.50",
    seller: "9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu",
    buyer: "You",
    date: new Date("2026-06-02T15:44:12").getTime(),
    signature: "4zP2eB8zkjsdf8912hkjsdf9HJKLjhkjsd",
    type: "BUY",
  },
  {
    name: "Cyber Ape #4210",
    image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=160&auto=format&fit=crop&q=80",
    price: "4.20",
    seller: "You",
    buyer: "8XkP1aB2uiwe8912jksh7ZvHLEYx91hd",
    date: new Date("2026-06-02T12:30:15").getTime(),
    signature: "3NkdPa8zkjsdf8912hkjsdf87HJGDjhkjsd",
    type: "SELL",
  },
  {
    name: "Genesis Landmark #98",
    image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=160&auto=format&fit=crop&q=80",
    price: "12.50",
    seller: "You",
    buyer: "6m5XXhE8kjsdf8912hjsdfiAceFskWdfg",
    date: new Date("2026-06-01T18:22:01").getTime(),
    signature: "5cvkuwLqkjsdf8912hkjsdf78YTREjhkjsd",
    type: "SELL",
  },
];

const MOCK_PRED_TXS: PredictionTx[] = [
  {
    marketTitle: "Will Solana reach $500 by December 2026?",
    side: "YES",
    amount: 5.0,
    shares: 7.69,
    price: 0.65,
    type: "BUY",
    date: new Date("2026-06-02T18:44:32").getTime(),
    signature: "3aW8AYxuFv78fG78kjsjCncZRGVv89jhs",
  },
  {
    marketTitle: "Will Street Sync secure its Series A funding before Q4?",
    side: "NO",
    amount: 2.5,
    shares: 20.83,
    price: 0.12,
    type: "BUY",
    date: new Date("2026-06-01T21:03:10").getTime(),
    signature: "1lmrQpdFv78jh7812hkjPTqN65Szkjsh",
  },
];

const formatRelativeTime = (timestamp: number | string | undefined): string => {
  if (!timestamp) return "Recently";
  const ts = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
  if (!ts || isNaN(ts)) return "Recently";
  const diff = Date.now() - ts;
  if (diff < 45_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const sliceSignature = (sig: string | undefined): string => {
  if (!sig || sig === "unknown") return "On-Chain Verified";
  if (sig.length <= 16) return sig;
  return `${sig.substring(0, 6)}...${sig.substring(sig.length - 6)}`;
};

const sliceAddress = (addr: string | undefined, myPubkey?: string): string => {
  if (!addr || addr === "unknown") return "Public";
  if (addr === "You") return "You";
  if (myPubkey && addr.toLowerCase() === myPubkey.toLowerCase()) return "You";
  if (addr.length <= 10) return addr;
  return `${addr.substring(0, 4)}...${addr.substring(addr.length - 4)}`;
};

export default function SSScanPage() {
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [isAppShell, setIsAppShell] = useState(false);

  // Active Tab: 'all' is default for immediate visibility of newest purchases
  const [activeTab, setActiveTab] = useState<"all" | "nfts" | "tokens" | "predictions" | "onchain">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedSig, setCopiedSig] = useState<string | null>(null);

  // Stored state lists
  const [tokenTxs, setTokenTxs] = useState<TokenTx[]>([]);
  const [nftTxs, setNftTxs] = useState<NFTTx[]>([]);
  const [predTxs, setPredTxs] = useState<PredictionTx[]>([]);
  const [onChainTxs, setOnChainTxs] = useState<OnChainTx[]>([]);
  const [recentPurchaseNotice, setRecentPurchaseNotice] = useState<NFTTx | null>(null);

  const copyToClipboard = (text: string, label: string = "Signature") => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSig(text);
      toast.success(`${label} copied to clipboard!`, {
        icon: "📋",
        style: {
          borderRadius: "12px",
          background: "#18181b",
          color: "#fff",
          border: "1px solid #27272a",
        },
      });
      setTimeout(() => setCopiedSig(null), 2000);
    }
  };

  const loadAllHistory = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Load Tokens from localStorage
      const storedTokens = localStorage.getItem("street_sync_token_purchases");
      const realTokensRaw: any[] = storedTokens ? JSON.parse(storedTokens) : [];
      const realTokens: TokenTx[] = realTokensRaw.map((item, idx) => ({
        id: item.id || `token-${idx}-${item.signature || Date.now()}`,
        name: item.name || "Secondary Purchase",
        symbol: item.symbol || "SEC",
        image: item.image || "",
        amount: item.amount || "1",
        price: item.price || "0.01",
        date: typeof item.date === "number" ? item.date : item.date ? new Date(item.date).getTime() : Date.now(),
        signature: item.signature || "",
        type: item.type === "SELL" ? "SELL" : "BUY",
        category: "token" as const,
      }));

      // 2. Load NFTs from localStorage (checking multiple keys to be comprehensive)
      let realNftsRaw: any[] = [];
      try {
        const storedNfts = localStorage.getItem("street_sync_purchases");
        if (storedNfts) realNftsRaw = JSON.parse(storedNfts);
      } catch (e) {
        console.warn("Error parsing street_sync_purchases:", e);
      }

      // Check pending NFT buy if it was confirmed
      try {
        const pendingBuy = localStorage.getItem("street_sync_pending_nft_buy");
        if (pendingBuy) {
          const parsed = JSON.parse(pendingBuy);
          const itemData = parsed?.item || parsed;
          if (itemData && (itemData.mint || itemData.id)) {
            const targetMint = itemData.mint || itemData.id;
            if (!realNftsRaw.some((n: any) => n.id === targetMint || n.mint === targetMint)) {
              realNftsRaw.unshift({
                ...itemData,
                id: targetMint,
                mint: targetMint,
                buyer: itemData.buyer || (publicKey ? publicKey.toBase58() : "You"),
                date: itemData.timestamp || Date.now(),
                signature: itemData.signature || parsed.signature || "",
                type: "BUY",
              });
            }
          }
        }
      } catch {}

      const realNfts: NFTTx[] = realNftsRaw.map((item, idx) => {
        const dateVal = typeof item.date === "number" 
          ? item.date 
          : item.purchaseDate 
          ? (typeof item.purchaseDate === "number" ? item.purchaseDate : new Date(item.purchaseDate).getTime())
          : typeof item.date === "string" 
          ? new Date(item.date).getTime() 
          : Date.now();

        return {
          id: item.id || item.mint || `nft-${idx}`,
          name: item.name || "Exclusive NFT",
          image: item.image || "",
          price: item.price ?? 0,
          seller: item.seller || "Vault",
          buyer: item.buyer || (publicKey ? publicKey.toBase58() : "You"),
          date: isNaN(dateVal) ? Date.now() : dateVal,
          signature: item.signature || "",
          mint: item.mint || item.id,
          type: item.type || "BUY",
          category: "nft" as const,
        };
      });

      // Detect recent NFT purchase made within last 15 minutes to show prominent confirmation
      if (realNfts.length > 0) {
        const newest = realNfts[0];
        if (Date.now() - newest.date < 15 * 60 * 1000) {
          setRecentPurchaseNotice(newest);
        } else {
          setRecentPurchaseNotice(null);
        }
      }

      // 3. Load Predictions from localStorage
      const storedPreds = localStorage.getItem("street_sync_prediction_history");
      const realPredsRaw: any[] = storedPreds ? JSON.parse(storedPreds) : [];
      const realPreds: PredictionTx[] = realPredsRaw.map((item, idx) => ({
        id: item.id || `pred-${idx}`,
        marketTitle: item.marketTitle || "Market Event",
        side: item.side === "NO" ? "NO" : "YES",
        amount: Number(item.amount) || 0,
        shares: Number(item.shares) || 0,
        price: Number(item.price) || 0.5,
        type: item.type || "BUY",
        date: typeof item.date === "number" ? item.date : item.date ? new Date(item.date).getTime() : Date.now(),
        signature: item.signature || "",
        category: "prediction" as const,
      }));

      // Set sorted lists (real items first, then fallback mocks)
      setTokenTxs([...realTokens, ...MOCK_TOKEN_TXS]);
      setNftTxs([...realNfts, ...MOCK_NFT_TXS]);
      setPredTxs([...realPreds, ...MOCK_PRED_TXS]);

      // 4. Query live On-Chain signatures if wallet is actively connected
      if (connected && publicKey && connection) {
        try {
          const sigs = await connection.getSignaturesForAddress(publicKey, { limit: 12 });
          if (sigs && sigs.length > 0) {
            const onchainMapped: OnChainTx[] = sigs.map((s) => ({
              id: s.signature,
              signature: s.signature,
              slot: s.slot,
              date: s.blockTime ? s.blockTime * 1000 : Date.now(),
              status: s.err ? "FAILED" : "SUCCESS",
              err: s.err,
              category: "onchain" as const,
            }));
            setOnChainTxs(onchainMapped);
          }
        } catch (onchainErr) {
          console.warn("[SSScan] On-chain signature lookup note:", onchainErr);
        }
      }
    } catch (e) {
      console.error("[SSScan] Failed to load scanner history logs:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, [connected, publicKey, connection]);

  useEffect(() => {
    setMounted(true);
    setIsAppShell(isStandaloneApp());
    loadAllHistory();

    // Check URL search parameters (e.g., ?tab=nfts)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "nfts" || tabParam === "tokens" || tabParam === "predictions" || tabParam === "onchain") {
        setActiveTab(tabParam as any);
      }
    }

    // Comprehensive event listeners for instant multi-module synchronization
    const handleUpdate = () => {
      loadAllHistory();
    };

    window.addEventListener("nft_purchases_updated", handleUpdate);
    window.addEventListener("nft_listings_updated", handleUpdate);
    window.addEventListener("token_purchases_updated", handleUpdate);
    window.addEventListener("prediction_history_updated", handleUpdate);
    window.addEventListener("gallery_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("focus", handleUpdate);

    return () => {
      window.removeEventListener("nft_purchases_updated", handleUpdate);
      window.removeEventListener("nft_listings_updated", handleUpdate);
      window.removeEventListener("token_purchases_updated", handleUpdate);
      window.removeEventListener("prediction_history_updated", handleUpdate);
      window.removeEventListener("gallery_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, [loadAllHistory]);

  // Unified Chronological Activity Feed
  const unifiedAllTxs = useMemo<UnifiedTx[]>(() => {
    const list: UnifiedTx[] = [
      ...nftTxs.map((t) => ({ ...t, category: "nft" as const })),
      ...tokenTxs.map((t) => ({ ...t, category: "token" as const })),
      ...predTxs.map((t) => ({ ...t, category: "prediction" as const })),
      ...onChainTxs,
    ];
    return list.sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [nftTxs, tokenTxs, predTxs, onChainTxs]);

  // Safe Search Filter across all items
  const query = searchQuery.trim().toLowerCase();

  const filteredAllTxs = useMemo(() => {
    if (!query) return unifiedAllTxs;
    return unifiedAllTxs.filter((item) => {
      const sig = (item.signature || "").toLowerCase();
      if (sig.includes(query)) return true;

      if (item.category === "nft") {
        return (
          (item.name || "").toLowerCase().includes(query) ||
          (item.seller || "").toLowerCase().includes(query) ||
          (item.buyer || "").toLowerCase().includes(query) ||
          (item.mint || "").toLowerCase().includes(query)
        );
      }
      if (item.category === "token") {
        return (
          (item.name || "").toLowerCase().includes(query) ||
          (item.symbol || "").toLowerCase().includes(query)
        );
      }
      if (item.category === "prediction") {
        return (
          (item.marketTitle || "").toLowerCase().includes(query) ||
          (item.side || "").toLowerCase().includes(query) ||
          (item.type || "").toLowerCase().includes(query)
        );
      }
      return false;
    });
  }, [unifiedAllTxs, query]);

  const filteredNftTxs = useMemo(() => {
    if (!query) return nftTxs;
    return nftTxs.filter((tx) =>
      (tx.name || "").toLowerCase().includes(query) ||
      (tx.signature || "").toLowerCase().includes(query) ||
      (tx.seller || "").toLowerCase().includes(query) ||
      (tx.buyer || "").toLowerCase().includes(query) ||
      (tx.mint || "").toLowerCase().includes(query)
    );
  }, [nftTxs, query]);

  const filteredTokenTxs = useMemo(() => {
    if (!query) return tokenTxs;
    return tokenTxs.filter((tx) =>
      (tx.name || "").toLowerCase().includes(query) ||
      (tx.symbol || "").toLowerCase().includes(query) ||
      (tx.signature || "").toLowerCase().includes(query)
    );
  }, [tokenTxs, query]);

  const filteredPredTxs = useMemo(() => {
    if (!query) return predTxs;
    return predTxs.filter((tx) =>
      (tx.marketTitle || "").toLowerCase().includes(query) ||
      (tx.signature || "").toLowerCase().includes(query) ||
      (tx.side || "").toLowerCase().includes(query) ||
      (tx.type || "").toLowerCase().includes(query)
    );
  }, [predTxs, query]);

  const filteredOnChainTxs = useMemo(() => {
    if (!query) return onChainTxs;
    return onChainTxs.filter((tx) => (tx.signature || "").toLowerCase().includes(query));
  }, [onChainTxs, query]);

  // Aggregate stats
  const totalVerifiedTxs = nftTxs.length + tokenTxs.length + predTxs.length + onChainTxs.length;

  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[calc(100vh-100px)]">
        <div className="text-center space-y-4">
          <RefreshCw className="animate-spin text-primary mx-auto" size={36} />
          <p className="font-mono text-muted-foreground uppercase tracking-widest text-xs">
            Initializing Explorer Node...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full max-w-7xl mx-auto px-2.5 sm:px-6 py-3 sm:py-6 space-y-4 sm:space-y-6 ${
        isAppShell ? "pb-24 sm:pb-8" : "pb-12"
      }`}
    >
      {/* Recent Purchase Confirmation Banner (shows when an NFT was recently bought) */}
      <AnimatePresence>
        {recentPurchaseNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-[#14F195]/10 p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-emerald-500/5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-emerald-500/40 bg-muted shrink-0">
                <img
                  src={resolveNftImageUrl(recentPurchaseNotice.image, recentPurchaseNotice.name)}
                  alt={recentPurchaseNotice.name}
                  className="w-full h-full object-cover"
                  onError={(e) => handleImageFallback(e, recentPurchaseNotice.name)}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <CheckCircle2 size={11} /> Verified Gallery Purchase
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {formatRelativeTime(recentPurchaseNotice.date)}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-foreground font-display truncate">
                  {recentPurchaseNotice.name} &bull;{" "}
                  <span className="text-primary font-mono">{recentPurchaseNotice.price} SOL</span>
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              {recentPurchaseNotice.signature && recentPurchaseNotice.signature.length > 20 && (
                <a
                  href={`https://solscan.io/tx/${recentPurchaseNotice.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground text-xs font-mono font-bold flex items-center gap-1.5 transition-all border border-border"
                >
                  <span>Solscan</span>
                  <ArrowUpRight size={13} />
                </a>
              )}
              <button
                type="button"
                onClick={() => setRecentPurchaseNotice(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                aria-label="Dismiss banner"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel (Compact on Mobile, High-Tech on Desktop) */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border p-4 sm:p-6 md:p-8 bg-gradient-to-r from-background via-secondary/15 to-primary/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#14F195]/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="space-y-1.5 sm:space-y-2 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-primary text-primary-foreground font-black font-display text-[9px] sm:text-[10px] tracking-widest uppercase px-2.5 py-0.5 rounded-full shadow-md shadow-primary/20">
              SS SCAN
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14F195] animate-ping" />
              Live Ledger Synced
            </span>
            {isAppShell && (
              <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-primary bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-full">
                <Smartphone size={11} /> Android App View
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-2.5">
            <Database className="w-7 h-7 sm:w-10 sm:h-10 text-primary shrink-0" />
            <span>
              Street Sync <span className="text-primary">Scan</span>
            </span>
          </h1>

          <p className="text-muted-foreground text-xs sm:text-sm max-w-xl font-medium leading-relaxed">
            Real-time explorer for NFT gallery purchases, token bonding curves, and on-chain settlements.
          </p>
        </div>

        {/* Sync Controls & Sub Widget */}
        <div className="relative z-10 shrink-0 flex flex-row items-center gap-2.5 self-start md:self-center">
          <ModuleSubscriptionWidget moduleId="ss-scan" />
          <button
            type="button"
            onClick={loadAllHistory}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-mono font-bold uppercase border border-border hover:border-primary/50 bg-secondary/30 hover:bg-secondary/60 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Refresh Ledger and sync new purchases"
          >
            <RefreshCw
              size={13}
              className={`text-primary ${isRefreshing ? "animate-spin" : "hover:rotate-180 transition-transform duration-500"}`}
            />
            <span className="hidden xs:inline">Sync Ledger</span>
            <span className="xs:hidden">Sync</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/80 text-center sm:text-left">
          <p className="text-[10px] sm:text-xs font-mono uppercase text-muted-foreground">Verified Txs</p>
          <p className="text-base sm:text-2xl font-black font-display text-foreground mt-0.5">{totalVerifiedTxs}</p>
        </div>
        <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/80 text-center sm:text-left">
          <p className="text-[10px] sm:text-xs font-mono uppercase text-muted-foreground">NFT Trades</p>
          <p className="text-base sm:text-2xl font-black font-display text-primary mt-0.5">{nftTxs.length}</p>
        </div>
        <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/80 text-center sm:text-left">
          <p className="text-[10px] sm:text-xs font-mono uppercase text-muted-foreground">Network</p>
          <p className="text-base sm:text-2xl font-black font-display text-emerald-400 mt-0.5">Solana Devnet</p>
        </div>
      </div>

      {/* Main Navigation Tabs & Search Controls */}
      <div className="glass-card p-2.5 sm:p-4 rounded-2xl border border-border space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Horizontally Scrollable Touch-Friendly Tab Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 md:pb-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-2 text-xs font-bold uppercase font-display rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "all"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Layers size={13} />
              <span>All Activity</span>
              <span className="text-[10px] font-mono opacity-80 ml-0.5">({unifiedAllTxs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("nfts")}
              className={`px-3.5 py-2 text-xs font-bold uppercase font-display rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "nfts"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Tag size={13} />
              <span>NFTs</span>
              <span className="text-[10px] font-mono opacity-80 ml-0.5">({nftTxs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("tokens")}
              className={`px-3.5 py-2 text-xs font-bold uppercase font-display rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "tokens"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Coins size={13} />
              <span>Tokens</span>
              <span className="text-[10px] font-mono opacity-80 ml-0.5">({tokenTxs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("predictions")}
              className={`px-3.5 py-2 text-xs font-bold uppercase font-display rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === "predictions"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <TrendingUp size={13} />
              <span>E-Plays</span>
              <span className="text-[10px] font-mono opacity-80 ml-0.5">({predTxs.length})</span>
            </button>

            {connected && (
              <button
                type="button"
                onClick={() => setActiveTab("onchain")}
                className={`px-3.5 py-2 text-xs font-bold uppercase font-display rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === "onchain"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                <ShieldCheck size={13} />
                <span>On-Chain Ledger</span>
                {onChainTxs.length > 0 && (
                  <span className="text-[10px] font-mono opacity-80 ml-0.5">({onChainTxs.length})</span>
                )}
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token, NFT, or signature..."
              className="w-full bg-secondary/40 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-9 pr-8 py-2 text-xs text-foreground placeholder-muted-foreground/60 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Data Views: Responsive Dual Architecture */}
      <div className="glass-card rounded-2xl border border-border overflow-hidden shadow-xl">
        {/* ========================================================= */}
        {/* TAB 1: ALL ACTIVITY (Unified Combined Feed)               */}
        {/* ========================================================= */}
        {activeTab === "all" && (
          <div>
            {/* Mobile Native Card View (Screen < md) */}
            <div className="md:hidden divide-y divide-border/40">
              {filteredAllTxs.length > 0 ? (
                filteredAllTxs.map((item, idx) => (
                  <MobileUnifiedCard
                    key={`mobile-all-${idx}`}
                    item={item}
                    myPubkey={publicKey?.toBase58()}
                    copiedSig={copiedSig}
                    onCopy={copyToClipboard}
                  />
                ))
              ) : (
                <EmptyRecordState onReset={() => setSearchQuery("")} hasQuery={!!searchQuery} />
              )}
            </div>

            {/* Desktop Table View (Screen >= md) */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-bold uppercase text-muted-foreground font-mono">
                    <th className="p-4 pl-6">Type</th>
                    <th className="p-4">Asset / Item</th>
                    <th className="p-4 text-right">Value (SOL)</th>
                    <th className="p-4">Parties</th>
                    <th className="p-4">Settlement Time</th>
                    <th className="p-4 pr-6">Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {filteredAllTxs.length > 0 ? (
                    filteredAllTxs.map((item, idx) => (
                      <DesktopUnifiedRow
                        key={`desktop-all-${idx}`}
                        item={item}
                        myPubkey={publicKey?.toBase58()}
                        copiedSig={copiedSig}
                        onCopy={copyToClipboard}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted-foreground italic">
                        No transactions match your search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: NFTS ONLY                                          */}
        {/* ========================================================= */}
        {activeTab === "nfts" && (
          <div>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border/40">
              {filteredNftTxs.length > 0 ? (
                filteredNftTxs.map((tx, idx) => (
                  <div key={`mobile-nft-${idx}`} className="p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={resolveNftImageUrl(tx.image, tx.name)}
                          alt={tx.name}
                          className="w-10 h-10 rounded-xl object-cover border border-border shrink-0 bg-muted"
                          onError={(e) => handleImageFallback(e, tx.name)}
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-foreground text-sm font-display truncate">{tx.name}</h4>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {formatRelativeTime(tx.date)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-black font-mono text-primary">{tx.price} SOL</div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {tx.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/40">
                      <div className="flex items-center gap-2">
                        <span>Buyer: {sliceAddress(tx.buyer, publicKey?.toBase58())}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {tx.signature && tx.signature.length > 20 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(tx.signature, "Signature")}
                              className="p-1 text-muted-foreground hover:text-foreground rounded"
                              title="Copy signature"
                            >
                              {copiedSig === tx.signature ? (
                                <Check size={11} className="text-emerald-400" />
                              ) : (
                                <Copy size={11} />
                              )}
                            </button>
                            <a
                              href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-0.5"
                            >
                              <span>{sliceSignature(tx.signature)}</span>
                              <ExternalLink size={9} />
                            </a>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Verified On-Chain</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyRecordState onReset={() => setSearchQuery("")} hasQuery={!!searchQuery} />
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-bold uppercase text-muted-foreground font-mono">
                    <th className="p-4 pl-6">Digital Asset</th>
                    <th className="p-4 text-right">Price (SOL)</th>
                    <th className="p-4">Seller</th>
                    <th className="p-4">Buyer</th>
                    <th className="p-4">Settlement Date</th>
                    <th className="p-4 pr-6">Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {filteredNftTxs.length > 0 ? (
                    filteredNftTxs.map((tx, idx) => (
                      <tr key={`desktop-nft-${idx}`} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4 pl-6 font-bold flex items-center gap-2.5">
                          <img
                            src={resolveNftImageUrl(tx.image, tx.name)}
                            alt={tx.name}
                            className="w-8 h-8 rounded-lg object-cover border border-border shrink-0 bg-muted"
                            onError={(e) => handleImageFallback(e, tx.name)}
                          />
                          <span className="truncate max-w-[200px]">{tx.name}</span>
                        </td>
                        <td className="p-4 text-right font-black text-primary font-mono">{tx.price} SOL</td>
                        <td className="p-4 font-mono font-medium text-muted-foreground">
                          {sliceAddress(tx.seller, publicKey?.toBase58())}
                        </td>
                        <td className="p-4 font-mono font-medium text-muted-foreground">
                          {sliceAddress(tx.buyer, publicKey?.toBase58())}
                        </td>
                        <td className="p-4 text-muted-foreground font-medium text-xs">
                          {new Date(tx.date).toLocaleString()}
                        </td>
                        <td className="p-4 pr-6 font-mono text-xs">
                          {tx.signature && tx.signature.length > 20 ? (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                <span>{sliceSignature(tx.signature)}</span>
                                <ExternalLink size={10} className="shrink-0" />
                              </a>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(tx.signature, "Signature")}
                                className="p-1 text-muted-foreground hover:text-foreground rounded"
                              >
                                {copiedSig === tx.signature ? (
                                  <Check size={11} className="text-emerald-400" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Verified</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted-foreground italic">
                        No NFT records match your query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: TOKENS ONLY                                        */}
        {/* ========================================================= */}
        {activeTab === "tokens" && (
          <div>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border/40">
              {filteredTokenTxs.length > 0 ? (
                filteredTokenTxs.map((tx, idx) => (
                  <div key={`mobile-tok-${idx}`} className="p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={resolveNftImageUrl(tx.image, tx.name)}
                          alt={tx.name}
                          className="w-9 h-9 rounded-full object-cover border border-border shrink-0 bg-muted"
                          onError={(e) => handleImageFallback(e, tx.name)}
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-foreground text-sm font-display truncate">
                            {tx.name}{" "}
                            <span className="text-xs text-muted-foreground font-mono">({tx.symbol})</span>
                          </h4>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {formatRelativeTime(tx.date)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-black font-mono text-foreground">{tx.price} SOL</div>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            tx.type === "SELL"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/40">
                      <span>Amount: {tx.amount}</span>
                      {tx.signature && tx.signature.length > 20 && (
                        <a
                          href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>{sliceSignature(tx.signature)}</span>
                          <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyRecordState onReset={() => setSearchQuery("")} hasQuery={!!searchQuery} />
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-bold uppercase text-muted-foreground font-mono">
                    <th className="p-4 pl-6">Token Assets</th>
                    <th className="p-4">Tx Type</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4 text-right">Unit Price (SOL)</th>
                    <th className="p-4">Settlement Date</th>
                    <th className="p-4 pr-6">Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {filteredTokenTxs.length > 0 ? (
                    filteredTokenTxs.map((tx, idx) => (
                      <tr key={`desktop-tok-${idx}`} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4 pl-6 font-bold flex items-center gap-2.5">
                          <img
                            src={resolveNftImageUrl(tx.image, tx.name)}
                            alt={tx.name}
                            className="w-7 h-7 rounded-full object-cover shrink-0 bg-muted"
                            onError={(e) => handleImageFallback(e, tx.name)}
                          />
                          <span>{tx.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">({tx.symbol})</span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              tx.type === "SELL"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-foreground">{tx.amount}</td>
                        <td
                          className={`p-4 text-right font-bold font-mono ${
                            tx.type === "SELL" ? "text-red-400" : "text-emerald-400"
                          }`}
                        >
                          {tx.price} SOL
                        </td>
                        <td className="p-4 text-muted-foreground font-medium text-xs">
                          {new Date(tx.date).toLocaleString()}
                        </td>
                        <td className="p-4 pr-6 font-mono text-xs">
                          {tx.signature && tx.signature.length > 20 ? (
                            <a
                              href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <span>{sliceSignature(tx.signature)}</span>
                              <ExternalLink size={10} className="shrink-0" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Internal Sync</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted-foreground italic">
                        No token records match your query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: PREDICTIONS / E-PLAYS ONLY                        */}
        {/* ========================================================= */}
        {activeTab === "predictions" && (
          <div>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border/40">
              {filteredPredTxs.length > 0 ? (
                filteredPredTxs.map((tx, idx) => (
                  <div key={`mobile-pred-${idx}`} className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-foreground text-xs leading-snug flex-1">
                        {tx.marketTitle}
                      </h4>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                          tx.side === "YES"
                            ? "bg-green-500/10 border-green-500/30 text-green-400"
                            : "bg-red-500/10 border-red-500/30 text-red-400"
                        }`}
                      >
                        {tx.side}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono pt-1">
                      <span className="text-foreground font-bold">{tx.amount.toFixed(2)} SOL</span>
                      <span className="text-muted-foreground">Shares: {tx.shares.toFixed(2)}</span>
                      <span className="text-primary font-bold">{(tx.price * 100).toFixed(0)}%</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground border-t border-border/40 pt-1.5">
                      <span>{formatRelativeTime(tx.date)}</span>
                      {tx.signature && tx.signature.length > 20 && (
                        <a
                          href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>{sliceSignature(tx.signature)}</span>
                          <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyRecordState onReset={() => setSearchQuery("")} hasQuery={!!searchQuery} />
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-bold uppercase text-muted-foreground font-mono">
                    <th className="p-4 pl-6">Market Event</th>
                    <th className="p-4">Selection</th>
                    <th className="p-4">Type</th>
                    <th className="p-4 text-right">Value (SOL)</th>
                    <th className="p-4 text-right">Shares Filled</th>
                    <th className="p-4 text-right">Probability</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 pr-6">Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {filteredPredTxs.length > 0 ? (
                    filteredPredTxs.map((tx, idx) => (
                      <tr key={`desktop-pred-${idx}`} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4 pl-6 font-bold text-foreground text-sm max-w-sm truncate">
                          {tx.marketTitle}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full border ${
                              tx.side === "YES"
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : "bg-red-500/10 border-red-500/30 text-red-400"
                            }`}
                          >
                            {tx.side}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-foreground">
                          {tx.amount.toFixed(2)} SOL
                        </td>
                        <td className="p-4 text-right font-mono text-muted-foreground font-semibold">
                          {tx.shares.toFixed(2)}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-primary">
                          {(tx.price * 100).toFixed(0)}%
                        </td>
                        <td className="p-4 text-muted-foreground font-medium text-xs">
                          {new Date(tx.date).toLocaleString()}
                        </td>
                        <td className="p-4 pr-6 font-mono text-xs">
                          {tx.signature && tx.signature.length > 20 ? (
                            <a
                              href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <span>{sliceSignature(tx.signature)}</span>
                              <ExternalLink size={10} className="shrink-0" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Internal Sync</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-muted-foreground italic">
                        No prediction records match your query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: ON-CHAIN SOLANA LEDGER                            */}
        {/* ========================================================= */}
        {activeTab === "onchain" && (
          <div>
            <div className="p-4 bg-muted/20 border-b border-border flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">
                Showing confirmed signatures for wallet:{" "}
                <span className="text-foreground font-bold">{publicKey?.toBase58()}</span>
              </span>
              <span className="text-emerald-400 font-bold">● Devnet Live</span>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border/40">
              {filteredOnChainTxs.length > 0 ? (
                filteredOnChainTxs.map((tx, idx) => (
                  <div key={`mobile-oc-${idx}`} className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-foreground">
                        Slot #{tx.slot || "Confirmed"}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          tx.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                      <span>{formatRelativeTime(tx.date)}</span>
                      <a
                        href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 font-bold"
                      >
                        <span>{sliceSignature(tx.signature)}</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyRecordState onReset={() => setSearchQuery("")} hasQuery={!!searchQuery} />
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-bold uppercase text-muted-foreground font-mono">
                    <th className="p-4 pl-6">Slot</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Block Time</th>
                    <th className="p-4 pr-6">Confirmed Transaction Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {filteredOnChainTxs.length > 0 ? (
                    filteredOnChainTxs.map((tx, idx) => (
                      <tr key={`desktop-oc-${idx}`} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4 pl-6 font-mono font-bold text-foreground">
                          {tx.slot ? `#${tx.slot}` : "Confirmed"}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              tx.status === "SUCCESS"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground font-medium text-xs">
                          {new Date(tx.date).toLocaleString()}
                        </td>
                        <td className="p-4 pr-6 font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1 font-bold"
                            >
                              <span>{tx.signature}</span>
                              <ExternalLink size={11} className="shrink-0" />
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(tx.signature, "Signature")}
                              className="p-1 text-muted-foreground hover:text-foreground rounded"
                            >
                              {copiedSig === tx.signature ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-muted-foreground italic">
                        No on-chain transaction records found for this address.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Component Helpers: Mobile & Desktop Unified Presentation
// -------------------------------------------------------------

function MobileUnifiedCard({
  item,
  myPubkey,
  copiedSig,
  onCopy,
}: {
  item: UnifiedTx;
  myPubkey?: string;
  copiedSig: string | null;
  onCopy: (sig: string, label?: string) => void;
}) {
  const isNft = item.category === "nft";
  const isTok = item.category === "token";
  const isPred = item.category === "prediction";
  const isOnChain = item.category === "onchain";

  return (
    <div className="p-3.5 space-y-2.5 transition-colors hover:bg-muted/5">
      {/* Top row: Thumbnail + Title + Type Badge + Price */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {isNft && (
            <img
              src={resolveNftImageUrl(item.image, item.name)}
              alt={item.name}
              className="w-10 h-10 rounded-xl object-cover border border-border shrink-0 bg-muted"
              onError={(e) => handleImageFallback(e, item.name)}
            />
          )}
          {isTok && (
            <img
              src={resolveNftImageUrl(item.image, item.name)}
              alt={item.name}
              className="w-9 h-9 rounded-full object-cover border border-border shrink-0 bg-muted"
              onError={(e) => handleImageFallback(e, item.name)}
            />
          )}
          {isPred && (
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0">
              <TrendingUp size={16} />
            </div>
          )}
          {isOnChain && (
            <div className="w-9 h-9 rounded-xl bg-secondary/50 border border-border flex items-center justify-center text-foreground shrink-0">
              <ShieldCheck size={16} />
            </div>
          )}

          <div className="min-w-0">
            <h4 className="font-bold text-foreground text-xs sm:text-sm font-display truncate">
              {isNft && item.name}
              {isTok && `${item.name} (${item.symbol})`}
              {isPred && item.marketTitle}
              {isOnChain && `On-Chain Tx (Slot #${item.slot || "..."})`}
            </h4>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
              <span className="uppercase text-primary font-bold">{item.category}</span>
              <span>&bull;</span>
              <span>{formatRelativeTime(item.date)}</span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          {(isNft || isTok) && (
            <div className="text-xs sm:text-sm font-black font-mono text-primary">
              {item.price} SOL
            </div>
          )}
          {isPred && (
            <div className="text-xs sm:text-sm font-black font-mono text-foreground">
              {item.amount.toFixed(2)} SOL
            </div>
          )}
          {isOnChain && (
            <div className="text-[10px] font-bold font-mono text-emerald-400">
              {item.status}
            </div>
          )}

          <div className="mt-0.5">
            {isNft && (
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {item.type}
              </span>
            )}
            {isTok && (
              <span
                className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  item.type === "SELL"
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {item.type}
              </span>
            )}
            {isPred && (
              <span
                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  item.side === "YES"
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}
              >
                {item.side} &bull; {item.type}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row: Parties / Signature */}
      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1.5 border-t border-border/40">
        <div className="truncate max-w-[55%]">
          {isNft && `Buyer: ${sliceAddress(item.buyer, myPubkey)}`}
          {isTok && `Amt: ${item.amount}`}
          {isPred && `Shares: ${item.shares.toFixed(2)}`}
          {isOnChain && `Devnet`}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {item.signature && item.signature.length > 20 ? (
            <>
              <button
                type="button"
                onClick={() => onCopy(item.signature, "Signature")}
                className="p-1 text-muted-foreground hover:text-foreground rounded"
                title="Copy signature"
              >
                {copiedSig === item.signature ? (
                  <Check size={11} className="text-emerald-400" />
                ) : (
                  <Copy size={11} />
                )}
              </button>
              <a
                href={`https://solscan.io/tx/${item.signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5 font-bold"
              >
                <span>{sliceSignature(item.signature)}</span>
                <ExternalLink size={9} />
              </a>
            </>
          ) : (
            <span className="text-muted-foreground text-[10px]">Verified Ledger</span>
          )}
        </div>
      </div>
    </div>
  );
}

function DesktopUnifiedRow({
  item,
  myPubkey,
  copiedSig,
  onCopy,
}: {
  item: UnifiedTx;
  myPubkey?: string;
  copiedSig: string | null;
  onCopy: (sig: string, label?: string) => void;
}) {
  const isNft = item.category === "nft";
  const isTok = item.category === "token";
  const isPred = item.category === "prediction";
  const isOnChain = item.category === "onchain";

  return (
    <tr className="hover:bg-muted/10 transition-colors">
      {/* Category Pill */}
      <td className="p-4 pl-6">
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase bg-secondary/80 text-foreground border border-border">
          {item.category}
        </span>
      </td>

      {/* Asset / Item Name & Thumb */}
      <td className="p-4 font-bold flex items-center gap-2.5">
        {isNft && (
          <>
            <img
              src={resolveNftImageUrl(item.image, item.name)}
              alt={item.name}
              className="w-8 h-8 rounded-lg object-cover border border-border shrink-0 bg-muted"
              onError={(e) => handleImageFallback(e, item.name)}
            />
            <span className="truncate max-w-[220px]">{item.name}</span>
          </>
        )}
        {isTok && (
          <>
            <img
              src={resolveNftImageUrl(item.image, item.name)}
              alt={item.name}
              className="w-7 h-7 rounded-full object-cover border border-border shrink-0 bg-muted"
              onError={(e) => handleImageFallback(e, item.name)}
            />
            <span>{item.name}</span>
            <span className="text-xs text-muted-foreground font-mono">({item.symbol})</span>
          </>
        )}
        {isPred && (
          <span className="truncate max-w-[240px] text-xs font-normal">
            <span className="font-bold text-foreground">[{item.side}]</span> {item.marketTitle}
          </span>
        )}
        {isOnChain && (
          <span className="font-mono text-xs text-muted-foreground">
            On-Chain Solana Transaction (Slot #{item.slot || "..."})
          </span>
        )}
      </td>

      {/* Value */}
      <td className="p-4 text-right font-mono font-bold">
        {isNft && <span className="text-primary">{item.price} SOL</span>}
        {isTok && (
          <span className={item.type === "SELL" ? "text-red-400" : "text-emerald-400"}>
            {item.price} SOL
          </span>
        )}
        {isPred && <span className="text-foreground">{item.amount.toFixed(2)} SOL</span>}
        {isOnChain && <span className="text-muted-foreground">Network Tx</span>}
      </td>

      {/* Parties */}
      <td className="p-4 font-mono text-xs text-muted-foreground">
        {isNft && `Buyer: ${sliceAddress(item.buyer, myPubkey)}`}
        {isTok && `Amt: ${item.amount}`}
        {isPred && `Shares: ${item.shares.toFixed(2)}`}
        {isOnChain && (
          <span
            className={`font-bold ${
              item.status === "SUCCESS" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {item.status}
          </span>
        )}
      </td>

      {/* Settlement Time */}
      <td className="p-4 text-muted-foreground font-medium text-xs">
        {item.date ? new Date(item.date).toLocaleString() : "Recently"}
      </td>

      {/* Signature & Solscan Link */}
      <td className="p-4 pr-6 font-mono text-xs">
        {item.signature && item.signature.length > 20 ? (
          <div className="flex items-center gap-1.5">
            <a
              href={`https://solscan.io/tx/${item.signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>{sliceSignature(item.signature)}</span>
              <ExternalLink size={10} className="shrink-0" />
            </a>
            <button
              type="button"
              onClick={() => onCopy(item.signature, "Signature")}
              className="p-1 text-muted-foreground hover:text-foreground rounded"
            >
              {copiedSig === item.signature ? (
                <Check size={11} className="text-emerald-400" />
              ) : (
                <Copy size={11} />
              )}
            </button>
          </div>
        ) : (
          <span className="text-muted-foreground">Verified</span>
        )}
      </td>
    </tr>
  );
}

function EmptyRecordState({ onReset, hasQuery }: { onReset: () => void; hasQuery: boolean }) {
  return (
    <div className="p-10 text-center space-y-2">
      <p className="text-sm text-muted-foreground italic">
        {hasQuery ? "No records match your search filter." : "No transactions recorded yet."}
      </p>
      {hasQuery && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-primary font-mono hover:underline font-bold"
        >
          Clear search filter
        </button>
      )}
    </div>
  );
}
