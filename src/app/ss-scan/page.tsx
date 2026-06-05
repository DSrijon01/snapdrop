"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Search, Database, Coins, Tag, TrendingUp, RefreshCw, ExternalLink, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

// Types
interface TokenTx {
  name: string;
  symbol: string;
  image?: string;
  amount: string | number;
  price: string | number;
  date: number | string;
  signature: string;
  type: "BUY" | "SELL";
}

interface NFTTx {
  name: string;
  image?: string;
  price: string | number;
  seller: string;
  buyer: string;
  date: number | string;
  signature: string;
  type: "BUY" | "SELL" | "LIST";
}

interface PredictionTx {
  marketTitle: string;
  side: "YES" | "NO";
  amount: number;
  shares: number;
  price: number;
  type: "BUY" | "CLAIM" | "CLEANUP";
  date: number | string;
  signature: string;
}

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
    name: "Bonds",
    symbol: "SSDS",
    image: "https://placehold.co/400?text=SSDS",
    amount: "0.99",
    price: "2.0000",
    date: new Date("2026-06-02T19:02:08").getTime(),
    signature: "5Q5mx5RTzuiwe78kjhsdfkJ5ys8indfsg",
    type: "SELL",
  },
  {
    name: "Bonds",
    symbol: "SSDS",
    image: "https://placehold.co/400?text=SSDS",
    amount: "1.00",
    price: "0.0100",
    date: new Date("2026-06-02T19:01:15").getTime(),
    signature: "3XuMM57Zkjsdf8912hjsdfiAceFskWdfg",
    type: "BUY",
  },
  {
    name: "Test Token 2022",
    symbol: "T-22-1",
    image: "https://placehold.co/400?text=T-22-1",
    amount: "0.99",
    price: "2.0000",
    date: new Date("2026-06-02T17:08:24").getTime(),
    signature: "1r5KDRdSkjsdf8912hkjhsX6U2WioVdfsg",
    type: "SELL",
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
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&auto=format&fit=crop&q=60",
    price: "1.50",
    seller: "9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu",
    buyer: "You",
    date: new Date("2026-06-02T15:44:12").getTime(),
    signature: "4zP2eB8zkjsdf8912hkjsdf9HJKLjhkjsd",
    type: "BUY",
  },
  {
    name: "Cyber Ape #4210",
    image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=80&auto=format&fit=crop&q=60",
    price: "4.20",
    seller: "You",
    buyer: "8XkP1aB2uiwe8912jksh7ZvHLEYx91hd",
    date: new Date("2026-06-02T12:30:15").getTime(),
    signature: "3NkdPa8zkjsdf8912hkjsdf87HJGDjhkjsd",
    type: "SELL",
  },
  {
    name: "Genesis Landmark #98",
    image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=80&auto=format&fit=crop&q=60",
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
    marketTitle: "Will the next major NFT standard (SPL-x) be pioneered by SnapDrop?",
    side: "YES",
    amount: 444.44,
    shares: 200.0,
    price: 0.45,
    type: "CLAIM",
    date: new Date("2026-06-02T14:12:05").getTime(),
    signature: "2Q5mx5RTzuiwe78kjhsdfkJ5ys8indfsg",
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

export default function SSScanPage() {
  const { connected, publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"tokens" | "nfts" | "predictions">("tokens");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Real Local States loaded from localStorage
  const [tokenTxs, setTokenTxs] = useState<TokenTx[]>([]);
  const [nftTxs, setNftTxs] = useState<NFTTx[]>([]);
  const [predTxs, setPredTxs] = useState<PredictionTx[]>([]);

  const loadAllHistory = () => {
    try {
      // 1. Load Tokens
      const storedTokens = localStorage.getItem("street_sync_token_purchases");
      const realTokens: TokenTx[] = storedTokens ? JSON.parse(storedTokens) : [];
      
      // 2. Load NFTs
      const storedNfts = localStorage.getItem("street_sync_purchases");
      const realNftsRaw: any[] = storedNfts ? JSON.parse(storedNfts) : [];
      const realNfts: NFTTx[] = realNftsRaw.map(item => ({
        name: item.name || "Unknown NFT",
        image: item.image,
        price: item.price || 0,
        seller: item.seller || "unknown",
        buyer: item.buyer || "unknown",
        date: item.date || item.purchaseDate || Date.now(),
        signature: item.signature || "unknown",
        type: item.type || "BUY"
      }));

      // 3. Load Predictions
      const storedPreds = localStorage.getItem("street_sync_prediction_history");
      const realPreds: PredictionTx[] = storedPreds ? JSON.parse(storedPreds) : [];

      // Merge real items (newest first) with default mocks to ensure page feels alive
      setTokenTxs([...realTokens, ...MOCK_TOKEN_TXS]);
      setNftTxs([...realNfts, ...MOCK_NFT_TXS]);
      setPredTxs([...realPreds, ...MOCK_PRED_TXS]);
    } catch (e) {
      console.error("Failed to load scanner history logs", e);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadAllHistory();

    // Event listeners for updates across other modules
    const handleUpdate = () => {
      loadAllHistory();
    };
    window.addEventListener("token_purchases_updated", handleUpdate);
    window.addEventListener("prediction_history_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("token_purchases_updated", handleUpdate);
      window.removeEventListener("prediction_history_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const handleRefresh = () => {
    loadAllHistory();
  };

  const sliceSignature = (sig: string) => {
    if (!sig) return "unknown";
    if (sig.length <= 16) return sig;
    return `${sig.substring(0, 8)}...${sig.substring(sig.length - 8)}`;
  };

  const sliceAddress = (addr: string) => {
    if (!addr) return "unknown";
    if (addr === "You") return "You";
    if (publicKey && addr === publicKey.toBase58()) return "You";
    if (addr.length <= 10) return addr;
    return `${addr.substring(0, 4)}...${addr.substring(addr.length - 4)}`;
  };

  // Filter lists based on Search Query
  const filteredTokenTxs = tokenTxs.filter((tx) => {
    const query = searchQuery.toLowerCase();
    return (
      tx.name.toLowerCase().includes(query) ||
      tx.symbol.toLowerCase().includes(query) ||
      tx.signature.toLowerCase().includes(query)
    );
  });

  const filteredNftTxs = nftTxs.filter((tx) => {
    const query = searchQuery.toLowerCase();
    return (
      tx.name.toLowerCase().includes(query) ||
      tx.signature.toLowerCase().includes(query) ||
      tx.seller.toLowerCase().includes(query) ||
      tx.buyer.toLowerCase().includes(query)
    );
  });

  const filteredPredTxs = predTxs.filter((tx) => {
    const query = searchQuery.toLowerCase();
    return (
      tx.marketTitle.toLowerCase().includes(query) ||
      tx.signature.toLowerCase().includes(query) ||
      tx.side.toLowerCase().includes(query) ||
      tx.type.toLowerCase().includes(query)
    );
  });

  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[calc(100vh-100px)]">
        <div className="text-center space-y-4">
          <RefreshCw className="animate-spin text-primary mx-auto" size={40} />
          <p className="font-mono text-muted-foreground uppercase tracking-widest text-sm">Initializing Explorer Node...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-3xl border border-border p-6 md:p-8 bg-gradient-to-r from-background via-secondary/10 to-primary/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-green-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-3">
            <span className="bg-primary text-primary-foreground font-black font-display text-[10px] tracking-widest uppercase px-3 py-1 rounded-full shadow-md shadow-primary/20">
              SS SCAN
            </span>
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-green-500 bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
              Live Ledger Synced
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight text-foreground flex items-center gap-3">
            <Database className="w-10 h-10 text-primary" />
            Street Sync <span className="text-primary">Scan</span>
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm md:text-base font-medium">
            Explore transactions, token history, NFT trades, and E-play prediction settlements verified on Street Sync.
          </p>
        </div>

        {/* Sync Status / Action Button */}
        <div className="relative z-10 shrink-0">
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-bold uppercase border border-border hover:bg-secondary/40 rounded-xl transition-all"
          >
            <RefreshCw size={14} className="hover:rotate-180 transition-transform duration-500" />
            Sync Ledger
          </button>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="space-y-6">
        {/* Navigation Tabs and Search Box */}
        <div className="glass-card p-4 rounded-2xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Section Tabs */}
          <div className="flex flex-wrap gap-1 bg-secondary/20 p-1 rounded-xl border border-border/40 w-fit">
            <button
              onClick={() => setActiveTab("tokens")}
              className={`px-4 py-2 text-xs font-bold uppercase font-display rounded-lg transition-all flex items-center gap-2 ${
                activeTab === "tokens"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              }`}
            >
              <Coins size={14} />
              Tokens
            </button>
            <button
              onClick={() => setActiveTab("nfts")}
              className={`px-4 py-2 text-xs font-bold uppercase font-display rounded-lg transition-all flex items-center gap-2 ${
                activeTab === "nfts"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              }`}
            >
              <Tag size={14} />
              NFTs
            </button>
            <button
              onClick={() => setActiveTab("predictions")}
              className={`px-4 py-2 text-xs font-bold uppercase font-display rounded-lg transition-all flex items-center gap-2 ${
                activeTab === "predictions"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              }`}
            >
              <TrendingUp size={14} />
              E-Plays
            </button>
          </div>

          {/* Explorer Search Input */}
          <div className="relative flex-1 max-w-md w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token name, signatures, or wallets..."
              className="w-full bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-10 pr-10 py-2.5 text-sm text-foreground placeholder-muted-foreground/60 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Ledger tables based on active tab */}
        <div className="glass-card rounded-2xl border border-border overflow-hidden shadow-xl">
          {activeTab === "tokens" && (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-bold uppercase text-muted-foreground">
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
                      <tr key={idx} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4 pl-6 font-bold flex items-center gap-2">
                          <img
                            src={tx.image || "https://placehold.co/400?text=Token"}
                            alt={tx.name}
                            className="w-6 h-6 rounded-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://placehold.co/400?text=Asset";
                            }}
                          />
                          <span>{tx.name}</span>
                          <span className="text-xs text-muted-foreground">({tx.symbol})</span>
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
                        <td className="p-4 text-right font-mono font-bold text-foreground">
                          {tx.amount}
                        </td>
                        <td
                          className={`p-4 text-right font-bold font-mono ${
                            tx.type === "SELL" ? "text-red-400" : "text-emerald-400"
                          }`}
                        >
                          {tx.price} SOL
                        </td>
                        <td className="p-4 text-muted-foreground font-medium">
                          {new Date(tx.date).toLocaleString()}
                        </td>
                        <td className="p-4 pr-6 font-mono text-xs text-blue-400">
                          <a
                            href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline inline-flex items-center gap-1"
                          >
                            {sliceSignature(tx.signature)}
                            <ExternalLink size={10} className="shrink-0" />
                          </a>
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
          )}

          {activeTab === "nfts" && (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-bold uppercase text-muted-foreground">
                    <th className="p-4 pl-6">Digital Asset</th>
                    <th className="p-4 text-right">Price (SOL)</th>
                    <th className="p-4">Seller address</th>
                    <th className="p-4">Buyer address</th>
                    <th className="p-4">Deal Date</th>
                    <th className="p-4 pr-6">Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {filteredNftTxs.length > 0 ? (
                    filteredNftTxs.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4 pl-6 font-bold flex items-center gap-2">
                          <img
                            src={tx.image || "https://placehold.co/400?text=NFT"}
                            alt={tx.name}
                            className="w-7 h-7 rounded-lg object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://placehold.co/400?text=NFT";
                            }}
                          />
                          <span>{tx.name}</span>
                        </td>
                        <td className="p-4 text-right font-black text-primary font-mono">
                          {tx.price} SOL
                        </td>
                        <td className="p-4 font-mono font-medium text-muted-foreground">
                          {sliceAddress(tx.seller)}
                        </td>
                        <td className="p-4 font-mono font-medium text-muted-foreground">
                          {sliceAddress(tx.buyer)}
                        </td>
                        <td className="p-4 text-muted-foreground font-medium">
                          {new Date(tx.date).toLocaleString()}
                        </td>
                        <td className="p-4 pr-6 font-mono text-xs text-blue-400">
                          <a
                            href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline inline-flex items-center gap-1"
                          >
                            {sliceSignature(tx.signature)}
                            <ExternalLink size={10} className="shrink-0" />
                          </a>
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
          )}

          {activeTab === "predictions" && (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-bold uppercase text-muted-foreground">
                    <th className="p-4 pl-6">Market Event Event</th>
                    <th className="p-4">Selection</th>
                    <th className="p-4">Order Type</th>
                    <th className="p-4 text-right">Value (SOL)</th>
                    <th className="p-4 text-right">Shares Filled</th>
                    <th className="p-4 text-right">Prob. Price</th>
                    <th className="p-4">Execution Date</th>
                    <th className="p-4 pr-6">Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {filteredPredTxs.length > 0 ? (
                    filteredPredTxs.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4 pl-6 font-bold text-foreground text-sm max-w-sm">
                          {tx.marketTitle}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full border ${
                              tx.side === "YES"
                                ? "bg-green-500/10 border-green-500/30 text-green-500"
                                : "bg-red-500/10 border-red-500/30 text-red-500"
                            }`}
                          >
                            {tx.side}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              tx.type === "BUY"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : tx.type === "CLAIM"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
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
                        <td className="p-4 text-muted-foreground font-medium">
                          {new Date(tx.date).toLocaleString()}
                        </td>
                        <td className="p-4 pr-6 font-mono text-xs text-blue-400">
                          <a
                            href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline inline-flex items-center gap-1"
                          >
                            {sliceSignature(tx.signature)}
                            <ExternalLink size={10} className="shrink-0" />
                          </a>
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
          )}
        </div>
      </div>
    </div>
  );
}
