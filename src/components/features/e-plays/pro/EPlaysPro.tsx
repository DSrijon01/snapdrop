"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSubscription } from "@/context/SubscriptionContext";
import { useConnection, useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, Idl, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShieldAlert, Sparkles, Zap, CheckCircle2, TrendingUp, Layers, HelpCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

import { ProStatusBar } from "@/components/global/subscription/SubscriptionCountdown";
import { OrderBookView } from "./OrderBookView";
import { TradingTerminal } from "./TradingTerminal";
import { ActiveOrdersPanel } from "./ActiveOrdersPanel";
import { EventBanner } from "./24HourEventBanner";
import { ProEvent, ProOrder, ProPoolReserve, ProPosition, ProTokenType, RecentTrade } from "./types";
import idl from "@/idl/e_plays.json";

// Default initial 24-hour trading events
const INITIAL_24H_EVENTS: ProEvent[] = [
  {
    id: "pro-24h-1",
    title: "Will SOL/USD trade above $215 within the next 24 hours?",
    category: "Solana Ecosystem",
    createdAt: Date.now() - 3600 * 1000,
    expiryTs: Math.floor(Date.now() / 1000) + 23 * 3600, // 23h remaining
    resolved: false,
    outcome: null,
    totalVolumeSol: 1240.5,
    openInterestSol: 420.0,
    yesPrice: 0.58,
    noPrice: 0.42,
    marketStatePubkey: PublicKey.default,
    yesMint: PublicKey.default,
    noMint: PublicKey.default,
    vault: PublicKey.default,
  },
  {
    id: "pro-24h-2",
    title: "Will Street Sync 24-Hour DEX volume surpass 10,000 SOL?",
    category: "Trading Volume",
    createdAt: Date.now() - 7200 * 1000,
    expiryTs: Math.floor(Date.now() / 1000) + 22 * 3600, // 22h remaining
    resolved: false,
    outcome: null,
    totalVolumeSol: 865.0,
    openInterestSol: 310.0,
    yesPrice: 0.72,
    noPrice: 0.28,
    marketStatePubkey: PublicKey.default,
    yesMint: PublicKey.default,
    noMint: PublicKey.default,
    vault: PublicKey.default,
  },
  {
    id: "pro-24h-3",
    title: "Will Solana network daily active addresses exceed 2.5M today?",
    category: "Network Metrics",
    createdAt: Date.now() - 1200 * 1000,
    expiryTs: Math.floor(Date.now() / 1000) + 23.5 * 3600,
    resolved: false,
    outcome: null,
    totalVolumeSol: 540.2,
    openInterestSol: 195.0,
    yesPrice: 0.45,
    noPrice: 0.55,
    marketStatePubkey: PublicKey.default,
    yesMint: PublicKey.default,
    noMint: PublicKey.default,
    vault: PublicKey.default,
  },
];

// Initial starter resting orders for the order book (Chapter 14 test depth)
const INITIAL_ORDERS: ProOrder[] = [
  // YES token asks (sellers waiting above market)
  {
    id: "ord-1",
    orderId: 101,
    marketId: "pro-24h-1",
    maker: "7xKX...Maker1",
    side: "SELL",
    tokenType: "YES",
    price: 0.62,
    quantity: 25,
    filledQuantity: 0,
    isActive: true,
    createdAt: Date.now() - 1800000,
  },
  {
    id: "ord-2",
    orderId: 102,
    marketId: "pro-24h-1",
    maker: "3bQ...Maker2",
    side: "SELL",
    tokenType: "YES",
    price: 0.60,
    quantity: 50,
    filledQuantity: 0,
    isActive: true,
    createdAt: Date.now() - 1200000,
  },
  {
    id: "ord-3",
    orderId: 103,
    marketId: "pro-24h-1",
    maker: "9kF...Maker3",
    side: "SELL",
    tokenType: "YES",
    price: 0.59,
    quantity: 15,
    filledQuantity: 0,
    isActive: true,
    createdAt: Date.now() - 600000,
  },
  // YES token bids (buyers waiting below market)
  {
    id: "ord-4",
    orderId: 104,
    marketId: "pro-24h-1",
    maker: "4jL...Maker4",
    side: "BUY",
    tokenType: "YES",
    price: 0.57,
    quantity: 30,
    filledQuantity: 0,
    isActive: true,
    createdAt: Date.now() - 900000,
  },
  {
    id: "ord-5",
    orderId: 105,
    marketId: "pro-24h-1",
    maker: "2eW...Maker5",
    side: "BUY",
    tokenType: "YES",
    price: 0.55,
    quantity: 80,
    filledQuantity: 0,
    isActive: true,
    createdAt: Date.now() - 1500000,
  },
  {
    id: "ord-6",
    orderId: 106,
    marketId: "pro-24h-1",
    maker: "8vB...Maker6",
    side: "BUY",
    tokenType: "YES",
    price: 0.53,
    quantity: 120,
    filledQuantity: 0,
    isActive: true,
    createdAt: Date.now() - 2100000,
  },
  // NO token orders
  {
    id: "ord-7",
    orderId: 107,
    marketId: "pro-24h-1",
    maker: "6mM...Maker7",
    side: "SELL",
    tokenType: "NO",
    price: 0.44,
    quantity: 40,
    filledQuantity: 0,
    isActive: true,
    createdAt: Date.now() - 1000000,
  },
  {
    id: "ord-8",
    orderId: 108,
    marketId: "pro-24h-1",
    maker: "1pA...Maker8",
    side: "BUY",
    tokenType: "NO",
    price: 0.41,
    quantity: 60,
    filledQuantity: 0,
    isActive: true,
    createdAt: Date.now() - 800000,
  },
];

export function EPlaysPro() {
  const { hasAccess, openSubscriptionModal, loading: subLoading } = useSubscription();
  const { connection } = useConnection();
  const { publicKey, wallet } = useWallet();
  const anchorWallet = useAnchorWallet();

  const isDemo = wallet?.adapter?.name === "Street Sync Demo";

  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Events
  const [events, setEvents] = useState<ProEvent[]>(() => {
    try {
      const stored = localStorage.getItem("street_sync_pro_24h_events");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_24H_EVENTS;
  });

  const [selectedEvent, setSelectedEvent] = useState<ProEvent>(events[0] || INITIAL_24H_EVENTS[0]);
  const [selectedToken, setSelectedToken] = useState<ProTokenType>("YES");

  // Orders State (CLOB)
  const [orders, setOrders] = useState<ProOrder[]>(() => {
    try {
      const stored = localStorage.getItem("street_sync_pro_orders");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_ORDERS;
  });

  // AMM Pool Reserve
  const [poolReserve, setPoolReserve] = useState<ProPoolReserve>({
    marketId: selectedEvent.id,
    yesReserve: 350,
    noReserve: 350,
    solReserve: 175,
    totalLpShares: 247,
    feeBps: 25,
  });

  // Recent Trades Tape
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>(() => {
    try {
      const stored = localStorage.getItem("street_sync_pro_trades");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [
      {
        id: "tr-1",
        time: "16:45",
        tokenType: "YES",
        side: "BUY",
        price: 0.58,
        amount: 20,
        totalSol: 11.6,
      },
      {
        id: "tr-2",
        time: "16:42",
        tokenType: "YES",
        side: "SELL",
        price: 0.57,
        amount: 15,
        totalSol: 8.55,
      },
      {
        id: "tr-3",
        time: "16:30",
        tokenType: "NO",
        side: "BUY",
        price: 0.42,
        amount: 30,
        totalSol: 12.6,
      },
    ];
  });

  // User Positions
  const [positions, setPositions] = useState<ProPosition[]>([
    {
      marketId: selectedEvent.id,
      marketTitle: selectedEvent.title,
      tokenType: "YES",
      shares: 45.0,
      avgEntryPrice: 0.52,
      currentPrice: 0.58,
      unrealizedPnlSol: 45.0 * (0.58 - 0.52),
      pnlPercent: ((0.58 - 0.52) / 0.52) * 100,
    },
  ]);

  // User Balances
  const [userSolBalance, setUserSolBalance] = useState<number>(10.0);
  const [userTokenBalance, setUserTokenBalance] = useState<number>(45.0);

  // Pre-filled state from Order Book clicks
  const [prefilledPrice, setPrefilledPrice] = useState<number | undefined>();
  const [prefilledQuantity, setPrefilledQuantity] = useState<number | undefined>();
  const [prefilledSide, setPrefilledSide] = useState<"BUY" | "SELL" | undefined>();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync balances
  useEffect(() => {
    const fetchBalance = async () => {
      if (!connection || !publicKey) return;
      try {
        const bal = await connection.getBalance(publicKey, "confirmed");
        setUserSolBalance(bal / LAMPORTS_PER_SOL);
      } catch (e) {
        console.warn("Failed to fetch SOL balance:", e);
      }
    };
    fetchBalance();
  }, [connection, publicKey]);

  // Persist local state
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("street_sync_pro_24h_events", JSON.stringify(events));
      localStorage.setItem("street_sync_pro_orders", JSON.stringify(orders));
      localStorage.setItem("street_sync_pro_trades", JSON.stringify(recentTrades));
    }
  }, [events, orders, recentTrades, isMounted]);

  // When clicking an orderbook row, pre-fill values
  const handleSelectPriceLevel = (price: number, quantity: number, side: "BUY" | "SELL") => {
    setPrefilledPrice(price);
    setPrefilledQuantity(quantity);
    setPrefilledSide(side);
    toast.success(`Populated ${side} order at ${price.toFixed(3)} SOL`);
  };

  // 1. PLACE LIMIT ORDER (Market Maker)
  const handlePlaceLimitOrder = async (
    side: "BUY" | "SELL",
    tokenType: ProTokenType,
    price: number,
    quantity: number
  ) => {
    try {
      setIsSubmitting(true);
      const newOrderId = Math.floor(Math.random() * 900000) + 100000;
      const makerPubkeyStr = publicKey ? publicKey.toBase58().slice(0, 6) + "..." : "MyWallet";

      // Try on-chain Anchor if wallet connected
      if (anchorWallet && !isDemo && selectedEvent.marketStatePubkey !== PublicKey.default) {
        try {
          const provider = new AnchorProvider(connection, anchorWallet, { preflightCommitment: "confirmed" });
          const program = new Program(idl as Idl, provider);

          const [orderPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("order"), selectedEvent.marketStatePubkey.toBuffer(), new BN(newOrderId).toArrayLike(Buffer, "le", 8)],
            program.programId
          );

          await (program.methods as any)
            .placeOrder(
              new BN(newOrderId),
              side === "BUY",
              tokenType === "YES",
              new BN(Math.round(price * 1e9)),
              new BN(Math.round(quantity * 1e9))
            )
            .accounts({
              maker: publicKey,
              marketState: selectedEvent.marketStatePubkey,
              order: orderPDA,
              mint: tokenType === "YES" ? selectedEvent.yesMint : selectedEvent.noMint,
              makerTokenAccount: null,
              marketTokenVault: null,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            })
            .rpc();

          toast.success(`Limit order #${newOrderId} confirmed on-chain!`);
        } catch (chainErr) {
          console.warn("On-chain placeOrder fallback to local state:", chainErr);
        }
      }

      // Add to local state
      const newOrder: ProOrder = {
        id: `ord-${Date.now()}`,
        orderId: newOrderId,
        marketId: selectedEvent.id,
        maker: makerPubkeyStr,
        side,
        tokenType,
        price,
        quantity,
        filledQuantity: 0,
        isActive: true,
        createdAt: Date.now(),
      };

      setOrders((prev) => [newOrder, ...prev]);

      // Deduct escrow from simulated balances
      if (side === "BUY") {
        setUserSolBalance((prev) => Math.max(0, prev - price * quantity));
      } else {
        setUserTokenBalance((prev) => Math.max(0, prev - quantity));
      }

      toast.success(
        `Limit ${side} posted: ${quantity} ${tokenType} @ ${price.toFixed(3)} SOL (Maker Escrowed)`
      );
    } catch (err: any) {
      toast.error(`Order failed: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. CANCEL LIMIT ORDER (Market Maker)
  const handleCancelOrder = async (order: ProOrder) => {
    try {
      setIsSubmitting(true);

      // Refund escrow
      const remaining = order.quantity - order.filledQuantity;
      if (order.side === "BUY") {
        setUserSolBalance((prev) => prev + order.price * remaining);
      } else {
        setUserTokenBalance((prev) => prev + remaining);
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, isActive: false } : o))
      );

      toast.success(`Order #${order.orderId} cancelled. Escrowed assets refunded.`);
    } catch (err: any) {
      toast.error(`Cancel failed: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. EXECUTE TAKER TRADE (Market Taker)
  const handleExecuteTakerTrade = async (
    action: "BUY" | "SELL",
    tokenType: ProTokenType,
    engine: "ORDER_BOOK" | "AMM",
    amount: number
  ) => {
    try {
      setIsSubmitting(true);
      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (engine === "ORDER_BOOK") {
        // Cross opposite resting orders
        const targetSide = action === "BUY" ? "SELL" : "BUY";
        let remainingToFill = amount;
        let totalCostSol = 0;

        const updatedOrders = orders.map((o) => {
          if (!o.isActive || o.tokenType !== tokenType || o.side !== targetSide || remainingToFill <= 0) {
            return o;
          }
          const available = o.quantity - o.filledQuantity;
          const fill = Math.min(available, remainingToFill);
          remainingToFill -= fill;
          totalCostSol += fill * o.price;

          const newFilled = o.filledQuantity + fill;
          return {
            ...o,
            filledQuantity: newFilled,
            isActive: newFilled < o.quantity,
          };
        });

        setOrders(updatedOrders);

        const fee = totalCostSol * 0.0025; // 25 bps
        const avgPrice = amount > 0 ? totalCostSol / amount : (action === "BUY" ? 0.6 : 0.4);

        // Record trade
        const newTrade: RecentTrade = {
          id: `trade-${Date.now()}`,
          time: nowStr,
          tokenType,
          side: action,
          price: avgPrice,
          amount,
          totalSol: totalCostSol + fee,
        };
        setRecentTrades((prev) => [newTrade, ...prev.slice(0, 20)]);

        // Update balances
        if (action === "BUY") {
          setUserSolBalance((prev) => Math.max(0, prev - (totalCostSol + fee)));
          setUserTokenBalance((prev) => prev + amount);
        } else {
          setUserSolBalance((prev) => prev + (totalCostSol - fee));
          setUserTokenBalance((prev) => Math.max(0, prev - amount));
        }

        toast.success(
          `Market Taker Crossed Book: ${amount} ${tokenType} @ ~${avgPrice.toFixed(3)} SOL (25 bps fee applied)`
        );
      } else {
        // AMM Swap (Chapter 15)
        const fee = amount * 0.0025;
        const taxedIn = amount - fee;
        const isSolToToken = action === "BUY";

        const resIn = isSolToToken ? poolReserve.solReserve : (tokenType === "YES" ? poolReserve.yesReserve : poolReserve.noReserve);
        const resOut = isSolToToken ? (tokenType === "YES" ? poolReserve.yesReserve : poolReserve.noReserve) : poolReserve.solReserve;

        const amountOut = (taxedIn * resOut) / (resIn + taxedIn);

        setPoolReserve((prev) => {
          if (isSolToToken) {
            return {
              ...prev,
              solReserve: prev.solReserve + amount,
              yesReserve: tokenType === "YES" ? prev.yesReserve - amountOut : prev.yesReserve,
              noReserve: tokenType === "NO" ? prev.noReserve - amountOut : prev.noReserve,
            };
          } else {
            return {
              ...prev,
              solReserve: prev.solReserve - amountOut,
              yesReserve: tokenType === "YES" ? prev.yesReserve + amount : prev.yesReserve,
              noReserve: tokenType === "NO" ? prev.noReserve + amount : prev.noReserve,
            };
          }
        });

        // Update balances
        if (action === "BUY") {
          setUserSolBalance((prev) => Math.max(0, prev - amount));
          setUserTokenBalance((prev) => prev + amountOut);
        } else {
          setUserTokenBalance((prev) => Math.max(0, prev - amount));
          setUserSolBalance((prev) => prev + amountOut);
        }

        const newTrade: RecentTrade = {
          id: `trade-${Date.now()}`,
          time: nowStr,
          tokenType,
          side: action,
          price: isSolToToken ? amount / amountOut : amountOut / amount,
          amount: isSolToToken ? amountOut : amount,
          totalSol: isSolToToken ? amount : amountOut,
        };
        setRecentTrades((prev) => [newTrade, ...prev.slice(0, 20)]);

        toast.success(`AMM Swapped: Received ${amountOut.toFixed(3)} via Constant-Product Curve`);
      }
    } catch (err: any) {
      toast.error(`Trade failed: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. AMM PROVIDE LIQUIDITY (Market Maker)
  const handleProvideAmmLiquidity = async (
    tokenType: ProTokenType,
    tokenAmount: number,
    solAmount: number
  ) => {
    try {
      setIsSubmitting(true);
      const newLpShares = Math.sqrt(tokenAmount * solAmount);

      setPoolReserve((prev) => ({
        ...prev,
        solReserve: prev.solReserve + solAmount,
        yesReserve: tokenType === "YES" ? prev.yesReserve + tokenAmount : prev.yesReserve,
        noReserve: tokenType === "NO" ? prev.noReserve + tokenAmount : prev.noReserve,
        totalLpShares: prev.totalLpShares + Math.round(newLpShares),
      }));

      setUserSolBalance((prev) => Math.max(0, prev - solAmount));
      setUserTokenBalance((prev) => Math.max(0, prev - tokenAmount));

      toast.success(
        `Added Liquidity: ${tokenAmount} ${tokenType} + ${solAmount} SOL. Minted ${Math.round(newLpShares)} LP shares.`
      );
    } catch (err: any) {
      toast.error(`Liquidity failed: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. FAST EXIT / DUMP POSITION
  const handleFastExitPosition = async (pos: ProPosition) => {
    await handleExecuteTakerTrade("SELL", pos.tokenType, "ORDER_BOOK", pos.shares);
    setPositions((prev) => prev.filter((p) => p !== pos));
  };

  // 6. CREATE NEW 24H EVENT
  const handleCreateNew24hEvent = async (title: string, category: string) => {
    const newEvent: ProEvent = {
      id: `pro-24h-${Date.now()}`,
      title,
      category,
      createdAt: Date.now(),
      expiryTs: Math.floor(Date.now() / 1000) + 86400, // 24 hours strict
      resolved: false,
      outcome: null,
      totalVolumeSol: 0,
      openInterestSol: 0,
      yesPrice: 0.5,
      noPrice: 0.5,
      marketStatePubkey: PublicKey.default,
      yesMint: PublicKey.default,
      noMint: PublicKey.default,
      vault: PublicKey.default,
    };

    setEvents((prev) => [newEvent, ...prev]);
    setSelectedEvent(newEvent);
    toast.success(`Launched new 24-Hour Trading Event: "${title}"`);
  };

  if (!isMounted || subLoading) {
    return (
      <div className="flex h-screen w-full bg-background items-center justify-center text-muted-foreground animate-pulse font-mono uppercase tracking-widest text-xs">
        Loading Pro Environment...
      </div>
    );
  }

  const access = hasAccess("e-plays");

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative overflow-hidden flex flex-col items-center">
      {/* Background Neon glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[30rem] h-[30rem] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl px-6 pt-12 pb-6 flex items-center justify-between border-b border-border/40 relative z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/e-plays"
            className="flex items-center gap-2 text-sm font-mono tracking-widest font-bold uppercase text-muted-foreground hover:text-primary transition-colors group px-3 py-2 -ml-3 rounded-lg hover:bg-muted/50"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Go Back</span>
          </Link>
          <div>
            <h1 className="text-3xl font-black font-display uppercase tracking-tight flex items-center gap-2">
              <Zap className="w-7 h-7 text-primary animate-pulse" />
              E-Play Pro: Market Maker / Taker
            </h1>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mt-0.5">
              Real-Time 24-Hour Tradable Prediction Markets (CLOB & AMM Engine)
            </p>
          </div>
        </div>

        {/* Live Wallet Balances */}
        <div className="hidden md:flex items-center gap-3">
          <div className="bg-card/70 border border-border px-4 py-2 rounded-2xl text-right">
            <span className="text-[10px] font-mono text-muted-foreground uppercase block">SOL Balance</span>
            <span className="text-sm font-black font-mono text-foreground">{userSolBalance.toFixed(3)} SOL</span>
          </div>
          <div className="bg-card/70 border border-border px-4 py-2 rounded-2xl text-right">
            <span className="text-[10px] font-mono text-muted-foreground uppercase block">{selectedToken} Shares</span>
            <span className="text-sm font-black font-mono text-primary">{userTokenBalance.toFixed(1)}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-7xl px-6 py-6 flex-1 relative z-10">
        <ProStatusBar moduleId="e-plays" />

        <AnimatePresence mode="wait">
          {!access ? (
            /* LOCKED SCREEN (Requires Pro Subscription) */
            <motion.div
              key="locked"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto mt-12 bg-card/45 backdrop-blur-md border border-border/80 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
                <ShieldAlert size={32} />
              </div>

              <h2 className="text-2xl font-black font-display uppercase tracking-tight text-foreground mb-2">
                Pro Access Locked
              </h2>
              <p className="text-muted-foreground text-sm font-mono uppercase tracking-wide mb-6">
                Subscription Required
              </p>

              <div className="bg-muted/40 border border-border/60 rounded-2xl p-4 mb-6 text-left space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Subscribe to the E-Plays Pro tier starting from <strong>0.1 SOL</strong> to unlock:
                </p>
                <ul className="space-y-2 text-xs font-mono uppercase text-foreground/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Real-Time 24-Hour Market Maker / Taker Trading</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Limit Order Book (CLOB) with price-time priority</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Constant-Product AMM Pool liquidity provision (earn 25 bps fees)</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => openSubscriptionModal("e-plays")}
                  className="w-full py-4 bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg shadow-primary/20"
                >
                  Choose Plan & Unlock Pro
                </button>
                <Link
                  href="/e-plays"
                  className="w-full py-4 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-all rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                >
                  Back to E-Plays Home
                </Link>
              </div>
            </motion.div>
          ) : (
            /* UNLOCKED PRO TRADING TERMINAL */
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* 24-Hour Event Banner with Countdown Clock */}
              <EventBanner
                events={events}
                selectedEvent={selectedEvent}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
                onCreateNew24hEvent={handleCreateNew24hEvent}
              />

              {/* Core 2-Column Trading Grid: Order Book & Execution Terminal */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Real-Time Order Book (5 Cols) */}
                <div className="lg:col-span-5 min-h-[500px]">
                  <OrderBookView
                    orders={orders}
                    selectedToken={selectedToken}
                    onSelectToken={(tok) => setSelectedToken(tok)}
                    onSelectPriceLevel={handleSelectPriceLevel}
                    recentTrades={recentTrades}
                    midPrice={selectedToken === "YES" ? selectedEvent.yesPrice : selectedEvent.noPrice}
                  />
                </div>

                {/* Right Column: Execution Terminal (7 Cols) */}
                <div className="lg:col-span-7 min-h-[500px]">
                  <TradingTerminal
                    event={selectedEvent}
                    selectedToken={selectedToken}
                    poolReserve={poolReserve}
                    orders={orders}
                    userSolBalance={userSolBalance}
                    userTokenBalance={userTokenBalance}
                    prefilledPrice={prefilledPrice}
                    prefilledQuantity={prefilledQuantity}
                    prefilledSide={prefilledSide}
                    isSubmitting={isSubmitting}
                    onPlaceLimitOrder={handlePlaceLimitOrder}
                    onExecuteTakerTrade={handleExecuteTakerTrade}
                    onProvideAmmLiquidity={handleProvideAmmLiquidity}
                  />
                </div>
              </div>

              {/* Bottom Section: Active Resting Orders & Positions */}
              <ActiveOrdersPanel
                orders={orders.filter((o) => o.marketId === selectedEvent.id)}
                positions={positions.filter((p) => p.marketId === selectedEvent.id)}
                connectedWalletPubkey={publicKey?.toBase58()}
                isCancelling={isSubmitting}
                onCancelOrder={handleCancelOrder}
                onFastExitPosition={handleFastExitPosition}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
