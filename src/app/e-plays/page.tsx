'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, AlertCircle, Clock, ShoppingCart, Loader2, Coins, ArrowUpRight, Award, Trash2, ShieldAlert } from 'lucide-react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';
import idl from '@/idl/e_plays.json';
import toast from 'react-hot-toast';
import { ModuleSubscriptionWidget } from '@/components/global/subscription/ModuleSubscriptionWidget';

// === Types ===
type Market = {
  id: string;
  title: string;
  volume: string;
  yesPrice: number;
  noPrice: number;
  category: string;
  resolved: boolean;
  outcome: boolean | null;
  totalYesShares: number;
  totalNoShares: number;
  // Raw Blockchain Data
  marketStatePubkey: PublicKey;
  yesMint: PublicKey;
  noMint: PublicKey;
  vault: PublicKey;
};

type Position = {
  id: string;
  marketId: string;
  marketName: string;
  position: 'Yes' | 'No';
  shares: number;
  avgPrice: number;
  currentValue: number;
  isResolved: boolean;
  isWinner: boolean;
  mintPubkey: PublicKey;
  userMintAccount: PublicKey;
  market: Market;
};

export default function EPlaysPage() {
  const { connection } = connectionObj();
  function connectionObj() {
    return useConnection();
  }
  const { publicKey, sendTransaction, wallet } = useWallet();
  const anchorWallet = useAnchorWallet();

  const logPredictionTransaction = (tx: {
    marketId: string;
    marketTitle: string;
    side: "YES" | "NO";
    amount: number;
    shares: number;
    price: number;
    type: "BUY" | "CLAIM" | "CLEANUP";
    signature: string;
  }) => {
    try {
      const existing = JSON.parse(localStorage.getItem("street_sync_prediction_history") || "[]");
      const newItem = {
        ...tx,
        date: Date.now()
      };
      localStorage.setItem("street_sync_prediction_history", JSON.stringify([newItem, ...existing]));
      window.dispatchEvent(new Event("prediction_history_updated"));
    } catch (e) {
      console.error("Failed to log prediction transaction", e);
    }
  };

  const isDemo = wallet?.adapter.name === 'Street Sync Demo';

  const [activeTab, setActiveTab] = useState<'markets' | 'portfolio'>('markets');
  const [selectedTrade, setSelectedTrade] = useState<{ market: Market; side: 'yes' | 'no' } | null>(null);
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy');
  const [tradeAmount, setTradeAmount] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txStatus, setTxStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  // Live Blockchain State
  const [markets, setMarkets] = useState<Market[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  // Default Mock Markets if blockchain fetch fails or has 0 markets (perfect for offline pitch showcase)
  const MOCK_FALLBACK_MARKETS: Market[] = [
    {
      id: "mock-1",
      title: "Will Solana reach $500 by December 2026?",
      volume: "$142,500 Vol",
      yesPrice: 0.65,
      noPrice: 0.35,
      category: "Solana DeFi",
      resolved: false,
      outcome: null,
      totalYesShares: 92500 * 1e9,
      totalNoShares: 50000 * 1e9,
      marketStatePubkey: PublicKey.default,
      yesMint: PublicKey.default,
      noMint: PublicKey.default,
      vault: PublicKey.default,
    },
    {
      id: "mock-2",
      title: "Will Street Sync secure its Series A funding before Q4?",
      volume: "$94,200 Vol",
      yesPrice: 0.88,
      noPrice: 0.12,
      category: "Funding Events",
      resolved: false,
      outcome: null,
      totalYesShares: 82896 * 1e9,
      totalNoShares: 11304 * 1e9,
      marketStatePubkey: PublicKey.default,
      yesMint: PublicKey.default,
      noMint: PublicKey.default,
      vault: PublicKey.default,
    },
    {
      id: "mock-3",
      title: "Will the next major NFT standard (SPL-x) be pioneered by SnapDrop?",
      volume: "$48,100 Vol",
      yesPrice: 0.45,
      noPrice: 0.55,
      category: "Technology",
      resolved: true,
      outcome: true, // YES won
      totalYesShares: 21645 * 1e9,
      totalNoShares: 26455 * 1e9,
      marketStatePubkey: PublicKey.default,
      yesMint: PublicKey.default,
      noMint: PublicKey.default,
      vault: PublicKey.default,
    }
  ];

  const fetchMarketsAndPositions = useCallback(async () => {
    try {
      setLoading(true);
      
      // Setup Anchor Provider
      const dummyWallet = {
          publicKey: publicKey || PublicKey.default,
          signTransaction: async (tx: any) => tx,
          signAllTransactions: async (txs: any[]) => txs,
      };
      const provider = new AnchorProvider(connection, (window as any).solana || dummyWallet, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as Idl, provider);

      let onChainMarkets: Market[] = [];
      try {
        const marketAccounts = await (program.account as any).marketState.all();
        onChainMarkets = marketAccounts.map((account: any) => {
          const accData = account.account as any;
          const totalYes = accData.totalYesShares.toNumber();
          const totalNo = accData.totalNoShares.toNumber();
          
          let yesPrice = 0.50; 
          let noPrice = 0.50;
          
          if (totalYes + totalNo > 0) {
              yesPrice = totalYes / (totalYes + totalNo);
              noPrice = totalNo / (totalYes + totalNo);
          }

          const totalVolume = (totalYes + totalNo) / 1e9;

          return {
            id: account.publicKey.toBase58(),
            title: accData.title,
            volume: `◎ ${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 1 })} Vol`,
            yesPrice,
            noPrice,
            category: 'Pari-Mutuel',
            resolved: accData.resolved,
            outcome: accData.outcome,
            totalYesShares: totalYes,
            totalNoShares: totalNo,
            marketStatePubkey: account.publicKey,
            yesMint: accData.yes_mint || accData.yesMint,
            noMint: accData.no_mint || accData.noMint,
            vault: accData.vault,
          };
        });
      } catch (err) {
        console.warn("Failed to fetch on-chain markets, using mock fallback list", err);
      }

      const activeMarkets = onChainMarkets.length > 0 ? onChainMarkets : MOCK_FALLBACK_MARKETS;
      setMarkets(activeMarkets);

      // Fetch user positions from on-chain token accounts
      if (publicKey && !isDemo && onChainMarkets.length > 0) {
        try {
          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
            programId: TOKEN_PROGRAM_ID
          });

          const activePositions: Position[] = [];

          for (const ta of tokenAccounts.value) {
            const data = ta.account.data.parsed.info;
            const mint = data.mint;
            const balance = parseFloat(data.tokenAmount.uiAmount || 0);

            if (balance > 0) {
              const matchedMarket = onChainMarkets.find(m => 
                m.yesMint.toBase58() === mint || m.noMint.toBase58() === mint
              );

              if (matchedMarket) {
                const isYes = matchedMarket.yesMint.toBase58() === mint;
                const avgPrice = isYes ? matchedMarket.yesPrice : matchedMarket.noPrice;
                const isWinner = matchedMarket.resolved && (matchedMarket.outcome === isYes);

                const totalWinningShares = isYes ? matchedMarket.totalYesShares : matchedMarket.totalNoShares;
                const totalPool = matchedMarket.totalYesShares + matchedMarket.totalNoShares;
                const currentValue = matchedMarket.resolved
                  ? (isWinner ? (balance * totalPool / (totalWinningShares || 1)) : 0)
                  : balance; // 1:1 expected value before resolution

                activePositions.push({
                  id: ta.pubkey.toBase58(),
                  marketId: matchedMarket.id,
                  marketName: matchedMarket.title,
                  position: isYes ? 'Yes' : 'No',
                  shares: balance,
                  avgPrice,
                  currentValue,
                  isResolved: matchedMarket.resolved,
                  isWinner,
                  mintPubkey: new PublicKey(mint),
                  userMintAccount: ta.pubkey,
                  market: matchedMarket,
                });
              }
            }
          }
          setPositions(activePositions);
        } catch (posErr) {
          console.error("Failed to load user positions:", posErr);
        }
      } else if (isDemo) {
        // Mock Positions for Demo Mode
        const demoPositions: Position[] = [
          {
            id: "demo-pos-1",
            marketId: "mock-1",
            marketName: "Will Solana reach $500 by December 2026?",
            position: "Yes",
            shares: 150.00,
            avgPrice: 0.65,
            currentValue: 150.00, // 1:1 spent value
            isResolved: false,
            isWinner: false,
            mintPubkey: PublicKey.default,
            userMintAccount: PublicKey.default,
            market: activeMarkets[0],
          },
          {
            id: "demo-pos-2",
            marketId: "mock-3",
            marketName: "Will the next major NFT standard (SPL-x) be pioneered by SnapDrop?",
            position: "Yes",
            shares: 200.00,
            avgPrice: 0.45,
            currentValue: 200.00 / 0.45, // Pari-Mutuel winning distribution: 444.44 SOL
            isResolved: true,
            isWinner: true, // won
            mintPubkey: PublicKey.default,
            userMintAccount: PublicKey.default,
            market: activeMarkets[2],
          }
        ];
        setPositions(demoPositions);
      } else {
        setPositions([]);
      }

    } catch (error) {
      console.error("Error updating predictions dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, isDemo]);

  useEffect(() => {
    fetchMarketsAndPositions();
  }, [fetchMarketsAndPositions]);

  const handleOpenDrawer = (market: Market, side: 'yes' | 'no') => {
    setSelectedTrade({ market, side });
    setTradeAction('buy');
    setTradeAmount('');
    setTxStatus(null);
  };

  const closeDrawer = () => {
    setSelectedTrade(null);
    setTradeAmount('');
    setTxStatus(null);
  };

  const handlePlaceOrder = async () => {
    if (!publicKey || (!anchorWallet && !isDemo)) {
        setTxStatus({ type: 'error', message: 'Please connect your wallet first.' });
        return;
    }
    if (!selectedTrade) return;

    const amountNum = parseFloat(tradeAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
        setTxStatus({ type: 'error', message: 'Enter a valid amount.' });
        return;
    }

    if (isDemo) {
      // Simulate Sandbox transaction success
      setIsSubmitting(true);
      setTxStatus(null);
      setTimeout(() => {
        setIsSubmitting(false);
        setTxStatus({ type: 'success', message: 'Order Placed Successfully! (Demo Simulation Complete)' });
        toast.success("Trade executed locally!");
        
        const sig = `sim-tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        logPredictionTransaction({
          marketId: selectedTrade.market.id,
          marketTitle: selectedTrade.market.title,
          side: selectedTrade.side.toUpperCase() as "YES" | "NO",
          amount: amountNum,
          shares: estimatedShares,
          price: selectedTrade.side === 'yes' ? selectedTrade.market.yesPrice : selectedTrade.market.noPrice,
          type: "BUY",
          signature: sig
        });

        // Update mock local state
        const sideSymbol = selectedTrade.side === 'yes' ? 'Yes' : 'No';
        const newPos: Position = {
          id: `demo-pos-${Date.now()}`,
          marketId: selectedTrade.market.id,
          marketName: selectedTrade.market.title,
          position: sideSymbol,
          shares: amountNum, // 1:1 spent SOL = shares received
          avgPrice: selectedTrade.side === 'yes' ? selectedTrade.market.yesPrice : selectedTrade.market.noPrice,
          currentValue: amountNum,
          isResolved: false,
          isWinner: false,
          mintPubkey: PublicKey.default,
          userMintAccount: PublicKey.default,
          market: selectedTrade.market,
        };
        setPositions(prev => [newPos, ...prev]);
        setTradeAmount('');
      }, 1500);
      return;
    }

    try {
        setIsSubmitting(true);
        setTxStatus(null);

        const provider = new AnchorProvider(connection, anchorWallet!, { preflightCommitment: 'confirmed' });
        const program = new Program(idl as Idl, provider);

        const market = selectedTrade.market;
        const isYes = selectedTrade.side === 'yes';
        
        const targetMint = isYes ? market.yesMint : market.noMint;
        const formattedAmount = new BN(amountNum * 1e9);
        const userTokenAccount = getAssociatedTokenAddressSync(targetMint, publicKey, false);

        const tx = new Transaction();

        // Inject Idempotent ATA creation instruction in case they've never bought this token side
        tx.add(
            createAssociatedTokenAccountIdempotentInstruction(
                publicKey,
                userTokenAccount,
                publicKey,
                targetMint
            )
        );

        // Append the buy_shares instruction (direct SOL transfer)
        const buyIx = await (program.methods as any)
            .buyShares(formattedAmount, isYes)
            .accounts({
                buyer: publicKey,
                marketState: market.marketStatePubkey,
                userMintAccount: userTokenAccount,
                mint: targetMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .instruction();

        tx.add(buyIx);

        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        tx.feePayer = publicKey;

        // Pre-simulate the transaction programmatically to catch exact error messages
        const sim = await connection.simulateTransaction(tx);
        if (sim.value.err) {
            console.error("Local Simulation Logs:", sim.value.logs);
            const logsText = sim.value.logs ? sim.value.logs.join("\n") : "";
            let parsedError = "Unknown simulation error";
            
            if (logsText.includes("custom program error: 0x1772") || logsText.includes("MarketExpired")) {
                parsedError = "Market is expired.";
            } else if (logsText.includes("custom program error: 0x1774")) {
                parsedError = "Invalid YES/NO mint.";
            } else if (logsText.includes("InstructionError")) {
                parsedError = `Transaction failed: ${JSON.stringify(sim.value.err)}`;
            } else {
                parsedError = sim.value.logs ? sim.value.logs[sim.value.logs.length - 1] : JSON.stringify(sim.value.err);
            }
            throw new Error(`${parsedError}`);
        }

        const signature = await sendTransaction(tx, connection);
        setTxStatus({ type: 'success', message: `Order Placed Successfully! TX Hash: ${signature}` });
        toast.success("SOL Trade Executed!");
        
        logPredictionTransaction({
          marketId: market.id,
          marketTitle: market.title,
          side: selectedTrade.side.toUpperCase() as "YES" | "NO",
          amount: amountNum,
          shares: estimatedShares,
          price: currentPrice,
          type: "BUY",
          signature: signature
        });

        setTradeAmount('');
        fetchMarketsAndPositions();
        
    } catch (error: any) {
        console.error("SOL Trade failed:", error);
        let errorMsg = error.message || "Unknown error";
        if (error.logs) {
            console.error("Simulation Logs:", error.logs);
            errorMsg = `${errorMsg}. Logs: ${error.logs[error.logs.length - 1]}`;
        }
        setTxStatus({ type: 'error', message: `Simulation Failed: ${errorMsg}` });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleClaim = async (pos: Position) => {
    if (isDemo) {
      setIsSubmitting(true);
      toast.loading("Simulating payout claim...", { duration: 1000 });
      setTimeout(() => {
        setIsSubmitting(false);
        toast.success(`Claimed ◎ ${(pos.currentValue).toFixed(2)} SOL (2% Platform Fee Paid)`);
        
        const sig = `sim-claim-${Date.now()}`;
        logPredictionTransaction({
          marketId: pos.marketId,
          marketTitle: pos.marketName,
          side: pos.position.toUpperCase() as "YES" | "NO",
          amount: pos.currentValue,
          shares: pos.shares,
          price: pos.avgPrice,
          type: "CLAIM",
          signature: sig
        });

        setPositions(prev => prev.filter(p => p.id !== pos.id));
      }, 1200);
      return;
    }

    try {
      setIsSubmitting(true);
      const provider = new AnchorProvider(connection, anchorWallet!, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as Idl, provider);

      const PLATFORM_WALLET = new PublicKey("9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu");

      const signature = await (program.methods as any)
          .claimWinnings()
          .accounts({
              claimer: publicKey,
              marketState: pos.market.marketStatePubkey,
              userMintAccount: pos.userMintAccount,
              mint: pos.mintPubkey,
              platformWallet: PLATFORM_WALLET,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
          })
          .rpc();

      toast.success(`Winnings claimed successfully! TX Hash: ${signature}`);
      
      logPredictionTransaction({
        marketId: pos.marketId,
        marketTitle: pos.marketName,
        side: pos.position.toUpperCase() as "YES" | "NO",
        amount: pos.currentValue,
        shares: pos.shares,
        price: pos.avgPrice,
        type: "CLAIM",
        signature: signature
      });

      fetchMarketsAndPositions();
    } catch (e: any) {
      console.error("Claim winnings failed:", e);
      toast.error(`Claim failed: ${e.message || e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCleanupLosing = async (pos: Position) => {
    if (isDemo) {
      setIsSubmitting(true);
      toast.loading("Simulating losing shares cleanup...", { duration: 1000 });
      setTimeout(() => {
        setIsSubmitting(false);
        toast.success(`Losing tokens closed. Reclaimed ◎ 0.002 SOL token account rent!`);
        
        const sig = `sim-cleanup-${Date.now()}`;
        logPredictionTransaction({
          marketId: pos.marketId,
          marketTitle: pos.marketName,
          side: pos.position.toUpperCase() as "YES" | "NO",
          amount: 0.002,
          shares: pos.shares,
          price: pos.avgPrice,
          type: "CLEANUP",
          signature: sig
        });

        setPositions(prev => prev.filter(p => p.id !== pos.id));
      }, 1200);
      return;
    }

    try {
      setIsSubmitting(true);
      const provider = new AnchorProvider(connection, anchorWallet!, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as Idl, provider);

      const signature = await (program.methods as any)
          .closeLosingPosition()
          .accounts({
              user: publicKey,
              marketState: pos.market.marketStatePubkey,
              userMintAccount: pos.userMintAccount,
              mint: pos.mintPubkey,
              tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

      toast.success(`Losing position cleaned! Reclaimed rent. TX Hash: ${signature}`);
      
      logPredictionTransaction({
        marketId: pos.marketId,
        marketTitle: pos.marketName,
        side: pos.position.toUpperCase() as "YES" | "NO",
        amount: 0.002,
        shares: pos.shares,
        price: pos.avgPrice,
        type: "CLEANUP",
        signature: signature
      });

      fetchMarketsAndPositions();
    } catch (e: any) {
      console.error("Losing position cleanup failed:", e);
      toast.error(`Cleanup failed: ${e.message || e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations
  const currentPrice = selectedTrade 
    ? (selectedTrade.side === 'yes' ? selectedTrade.market.yesPrice : selectedTrade.market.noPrice) 
    : 0;
    
  const amountNum = parseFloat(tradeAmount) || 0;
  const estimatedShares = amountNum; // 1 SOL = 1 share
  const estimatedPayout = currentPrice > 0 ? (amountNum / currentPrice) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative overflow-hidden flex flex-col items-center">
      {/* Background Neon glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Tabs Toggle */}
      <header className="w-full max-w-7xl px-6 pt-12 pb-8 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-border/40 relative z-10">
        <div>
          <h1 className="text-4xl font-black font-display uppercase tracking-tight flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary animate-pulse" />
            E-Plays
          </h1>
          <p className="text-muted-foreground mt-2 uppercase tracking-widest text-[10px] font-mono border border-border bg-card/45 px-3 py-1.5 rounded-full w-fit">
            Native SOL Pari-Mutuel Prediction Sandbox
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <ModuleSubscriptionWidget moduleId="e-plays" />
          <div className="flex bg-muted/60 p-1 border border-border/60 rounded-xl backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('markets')}
              className={`px-6 py-2.5 text-xs font-black transition-all uppercase tracking-wider rounded-lg ${
                activeTab === 'markets' 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              }`}
            >
              Active Markets
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-6 py-2.5 text-xs font-black transition-all uppercase tracking-wider rounded-lg flex items-center gap-2 ${
                activeTab === 'portfolio' 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
              }`}
            >
              My Positions
              {positions.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-7xl px-6 py-8 flex-1 relative z-10">
        {activeTab === 'markets' ? (
          <div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                <p className="font-mono uppercase tracking-widest text-xs font-bold">Syncing devnet nodes...</p>
              </div>
            ) : markets.filter(m => !m.resolved).length === 0 ? (
                <div className="text-center py-20 border border-border border-dashed rounded-3xl bg-card/25 max-w-md mx-auto">
                    <p className="text-muted-foreground font-mono uppercase tracking-widest text-xs">No active markets found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {markets.filter(m => !m.resolved).map((market) => (
                    <div 
                        key={market.id} 
                        className="bg-card/45 backdrop-blur-md border border-border rounded-3xl p-6 hover:border-primary/50 hover:shadow-2xl transition-all duration-500 flex flex-col justify-between group min-h-[220px]"
                    >
                        <div>
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-secondary text-primary border border-primary/20 rounded">
                              {market.category}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono font-semibold">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              {market.volume}
                            </span>
                        </div>
                        <h3 className="text-lg font-black leading-snug mb-6 text-foreground group-hover:text-primary transition-colors font-display">
                            {market.title}
                        </h3>
                        </div>

                        <div className="flex gap-3 w-full mt-auto">
                        <button
                            onClick={() => handleOpenDrawer(market, 'yes')}
                            className="flex-1 flex flex-col items-center justify-center py-3 bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white transition-all font-bold tracking-tight rounded-xl group/btn"
                        >
                            <span className="text-[10px] uppercase font-mono tracking-widest opacity-80 group-hover/btn:opacity-100">Buy Yes</span>
                            <span className="text-lg font-black font-mono">{(market.yesPrice * 100).toFixed(0)}%</span>
                        </button>
                        <button
                            onClick={() => handleOpenDrawer(market, 'no')}
                            className="flex-1 flex flex-col items-center justify-center py-3 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all font-bold tracking-tight rounded-xl group/btn2"
                        >
                            <span className="text-[10px] uppercase font-mono tracking-widest opacity-80 group-hover/btn2:opacity-100">Buy No</span>
                            <span className="text-lg font-black font-mono">{(market.noPrice * 100).toFixed(0)}%</span>
                        </button>
                        </div>
                    </div>
                    ))}
                </div>
            )}
          </div>
        ) : (
          <div className="bg-card/45 backdrop-blur-md border border-border rounded-3xl overflow-hidden shadow-2xl p-6">
            <h3 className="text-xl font-black font-display uppercase tracking-tight mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              Active Positions
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/60 text-xs uppercase font-mono tracking-wider text-muted-foreground">
                    <th className="p-4 font-semibold">Market Event</th>
                    <th className="p-4 font-semibold">Selection</th>
                    <th className="p-4 font-semibold text-right">Shares Owned</th>
                    <th className="p-4 font-semibold text-right">Winning Probability</th>
                    <th className="p-4 font-semibold text-right">Total Pool</th>
                    <th className="p-4 font-semibold text-right">Winning Calculation</th>
                    <th className="p-4 font-semibold text-center">Settlement Action</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos) => {
                    const isClaimable = pos.isResolved && pos.isWinner;
                    const isLosing = pos.isResolved && !pos.isWinner;
                    
                    const totalPool = (pos.market.totalYesShares + pos.market.totalNoShares) / 1e9;
                    const estPayout = pos.isResolved
                      ? (pos.isWinner ? pos.currentValue : 0)
                      : (pos.avgPrice > 0 ? (pos.shares / pos.avgPrice) : 0);

                    return (
                      <tr key={pos.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-bold text-foreground text-sm max-w-sm">{pos.marketName}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full ${
                            pos.position === 'Yes' 
                              ? 'bg-green-500/10 border-green-500/30 text-green-500' 
                              : 'bg-red-500/10 border-red-500/30 text-red-500'
                          } border`}>
                            {pos.position}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-sm">{pos.shares.toFixed(2)}</td>
                        <td className="p-4 text-right font-mono text-sm">{(pos.avgPrice * 100).toFixed(0)}%</td>
                        <td className="p-4 text-right font-mono text-sm">
                          ◎ {totalPool.toFixed(2)}
                        </td>
                        <td className="p-4 text-right font-mono text-primary font-black text-sm">
                          ◎ {estPayout.toFixed(2)}
                        </td>
                        <td className="p-4 text-center">
                          {isClaimable ? (
                            <button
                                onClick={() => handleClaim(pos)}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-xs font-black uppercase bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-1 mx-auto shadow-lg shadow-green-500/15"
                            >
                              <Award className="w-3.5 h-3.5" />
                              Claim Payout
                            </button>
                          ) : isLosing ? (
                            <button
                                onClick={() => handleCleanupLosing(pos)}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-xs font-black uppercase bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg transition-colors flex items-center gap-1 mx-auto"
                                title="Burn losing tokens & refund 0.002 SOL account rent"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Clean Up Rent
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground font-mono flex items-center justify-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Live Trading
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {positions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-muted-foreground italic font-light text-sm">
                        No prediction shares owned in this wallet. Visit Active Markets to buy.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Slide-Out Trading Interface (Drawer) */}
      <AnimatePresence>
        {selectedTrade && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-card/90 backdrop-blur-md border-l border-border/80 shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-black uppercase font-display tracking-tight flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  Order Ticket
                </h2>
                <button 
                  onClick={closeDrawer}
                  className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
                
                {txStatus && (
                    <div className={`p-4 rounded-xl font-mono text-xs border ${
                        txStatus.type === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'
                    } break-all leading-relaxed`}>
                        {txStatus.message}
                    </div>
                )}

                <div className="bg-background/40 border border-border p-5 rounded-2xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 font-mono">Selected Event</p>
                  <h3 className="text-lg font-black leading-snug text-foreground font-display">{selectedTrade.market.title}</h3>
                  <div className="mt-4 flex gap-3 text-xs font-mono">
                    <span className="px-3 py-1 bg-muted border border-border/50 font-bold uppercase">
                      Trading: <span className={selectedTrade.side === 'yes' ? 'text-green-500' : 'text-red-500'}>{selectedTrade.side}</span>
                    </span>
                    <span className="px-3 py-1 bg-muted border border-border/50 font-bold">
                      Price: {(currentPrice * 100).toFixed(0)}% Probability
                    </span>
                  </div>
                </div>

                <div className="flex bg-muted/60 p-1 border border-border/60 rounded-xl">
                  <button
                    onClick={() => setTradeAction('buy')}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all rounded-lg ${
                      tradeAction === 'buy' 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'text-muted-foreground hover:bg-background/40'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setTradeAction('sell')}
                    disabled
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all opacity-50 cursor-not-allowed text-muted-foreground rounded-lg`}
                  >
                    Sell (Post-Order)
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase text-muted-foreground tracking-widest font-mono">
                    Amount to Spend (SOL)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <span className="text-muted-foreground font-mono font-bold text-xl">◎</span>
                    </div>
                    <input
                      type="number"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-background border border-border text-foreground text-3xl font-black py-4 pl-10 pr-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all rounded-2xl placeholder:text-muted-foreground/30 font-mono"
                    />
                  </div>
                </div>

                <div className="bg-muted/30 border border-border/60 p-5 space-y-4 rounded-2xl">
                  <div className="flex justify-between items-center text-xs font-mono border-b border-border/40 pb-4">
                    <span className="text-muted-foreground font-bold uppercase flex items-center gap-2">
                      Estimated Shares Received
                    </span>
                    <span className="font-black text-foreground text-sm">
                      {estimatedShares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedTrade.side.toUpperCase()}
                    </span>
                  </div>
                  
                  {tradeAction === 'buy' && (
                    <div className="flex justify-between items-center text-xs font-mono border-t border-border/40 pt-4">
                      <span className="text-muted-foreground font-bold uppercase flex items-center gap-2">
                        Est. Payout if {selectedTrade.side.toUpperCase()} Wins
                      </span>
                      <span className="font-black text-primary text-sm flex items-center gap-1">
                        ◎ {estimatedPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SOL
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {isDemo && (
                <div className="px-6 py-2 flex items-center gap-2 text-[10px] font-mono text-amber-500 bg-amber-500/5 border-t border-b border-amber-500/20">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Sandbox Simulator Mode: Trades will execute locally in browser memory.</span>
                </div>
              )}

              <div className="p-6 border-t border-border/60 bg-background/50 backdrop-blur-md">
                <button 
                  onClick={handlePlaceOrder}
                  disabled={amountNum <= 0 || isSubmitting}
                  className={`w-full flex items-center justify-center gap-2 py-4 text-base font-black uppercase tracking-widest transition-all rounded-xl ${
                    amountNum > 0 && !isSubmitting
                      ? 'bg-primary text-primary-foreground hover:bg-primary-hover hover:scale-[1.02] shadow-lg shadow-primary/20' 
                      : 'bg-muted text-muted-foreground cursor-not-allowed border border-border opacity-70'
                  }`}
                >
                  {isSubmitting ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Swapping...</>
                  ) : (
                      'Confirm Buy Trade'
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
