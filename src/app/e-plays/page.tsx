'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, AlertCircle, Clock, ShoppingCart, RefreshCcw, Loader2 } from 'lucide-react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import idl from '@/idl/e_plays.json';

// === Types ===
type Market = {
  id: string;
  title: string;
  volume: string;
  yesPrice: number;
  noPrice: number;
  category: string;
  // Raw Blockchain Data
  marketStatePubkey: PublicKey;
  yesMint: PublicKey;
  noMint: PublicKey;
  vault: PublicKey;
};

type Position = {
  id: string;
  marketName: string;
  position: 'Yes' | 'No';
  shares: number;
  avgPrice: number;
  currentValue: number;
};

// Mock portfolio stays for now
const PORTFOLIO_POSITIONS: Position[] = [];

// WSOL Mint (Hardcoded for Native SOL Collateral)
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

export default function EPlaysPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const anchorWallet = useAnchorWallet();

  const [activeTab, setActiveTab] = useState<'markets' | 'portfolio'>('markets');
  const [selectedTrade, setSelectedTrade] = useState<{ market: Market; side: 'yes' | 'no' } | null>(null);
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy');
  const [tradeAmount, setTradeAmount] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txStatus, setTxStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  // Live Blockchain State
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        const dummyWallet = {
            publicKey,
            signTransaction: async () => { throw new Error('Not implemented') },
            signAllTransactions: async () => { throw new Error('Not implemented') },
        };
        const provider = new AnchorProvider(connection, (window as any).solana || dummyWallet, { preflightCommitment: 'confirmed' });
        const program = new Program(idl as Idl, provider);

        const marketAccounts = await (program.account as any).marketState.all();
        
        const mappedMarkets: Market[] = marketAccounts.map((account: any) => {
          const accData = account.account as any;
          const totalYes = accData.totalYesShares.toNumber();
          const totalNo = accData.totalNoShares.toNumber();
          
          let yesPrice = 0.50; // Default to 50/50 if no shares minted yet
          let noPrice = 0.50;
          
          if (totalYes + totalNo > 0) {
              yesPrice = totalYes / (totalYes + totalNo);
              noPrice = totalNo / (totalYes + totalNo);
          }

          // Convert lamports to human readable total volume (9 decimals for WSOL)
          const totalVolume = (totalYes + totalNo) / 10**9;

          return {
            id: account.publicKey.toBase58(),
            title: accData.title,
            volume: `$${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 1 })} Vol`,
            yesPrice,
            noPrice,
            category: 'Pari-Mutuel',
            marketStatePubkey: account.publicKey,
            yesMint: accData.yesMint,
            noMint: accData.noMint,
            vault: accData.vault,
          };
        });

        setMarkets(mappedMarkets);
      } catch (error) {
        console.error("Failed to fetch markets from Anchor:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, [connection, publicKey]);

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
    if (!publicKey || !anchorWallet) {
        setTxStatus({ type: 'error', message: 'Please connect your wallet first.' });
        return;
    }
    if (!selectedTrade) return;

    const amountNum = parseFloat(tradeAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
        setTxStatus({ type: 'error', message: 'Enter a valid amount.' });
        return;
    }

    try {
        setIsSubmitting(true);
        setTxStatus(null);

        const provider = new AnchorProvider(connection, anchorWallet, { preflightCommitment: 'confirmed' });
        const program = new Program(idl as Idl, provider);

        const market = selectedTrade.market;
        const isYes = selectedTrade.side === 'yes';
        
        // 1. Identify Mint
        const targetMint = isYes ? market.yesMint : market.noMint;

        // 2. Format Amount (9 Decimals for WSOL/Native)
        const formattedAmount = new BN(amountNum * 1e9);

        // 3. Derive Associated Token Accounts
        const buyerCollateral = getAssociatedTokenAddressSync(WSOL_MINT, publicKey, false);
        const userTokenAccount = getAssociatedTokenAddressSync(targetMint, publicKey, false);

        const tx = new Transaction();

        // We must wrap their Native SOL into WSOL dynamically
        tx.add(
            createAssociatedTokenAccountIdempotentInstruction(
                publicKey,
                buyerCollateral,
                publicKey,
                WSOL_MINT
            )
        );

        tx.add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: buyerCollateral,
                lamports: Number(formattedAmount),
            })
        );
        
        tx.add(createSyncNativeInstruction(buyerCollateral));

        // Inject Idempotent ATA creation incase they've never bought this token side
        tx.add(
            createAssociatedTokenAccountIdempotentInstruction(
                publicKey,
                userTokenAccount,
                publicKey,
                targetMint
            )
        );

        // 5. Append the buy_shares instruction
        const buyIx = await (program.methods as any)
            .buyShares(formattedAmount, isYes)
            .accounts({
                buyer: publicKey,
                marketState: market.marketStatePubkey,
                vault: market.vault,
                buyerCollateral: buyerCollateral,
                userMintAccount: userTokenAccount,
                mint: targetMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .instruction();

        tx.add(buyIx);

        // 6. Sign & Send
        const signature = await sendTransaction(tx, connection);
        
        // Note: For a production app, we would wait for confirmation here.
        // For rapid devnet, we'll display the toast immediately.
        setTxStatus({ type: 'success', message: `Order Placed Successfully! TX Hash: ${signature}` });
        
        // Refresh local UI state immediately to feel responsive
        setTradeAmount('');
        
    } catch (error: any) {
        console.error("Order failed:", error);
        
        let errorMsg = error.message || "Unknown error";
        if (error.logs) {
            console.error("Simulation Logs:", error.logs);
            // Optionally append the last log to the UI message for rapid debugging
            errorMsg = `${errorMsg}. Logs: ${error.logs[error.logs.length - 1]}`;
        }

        setTxStatus({ type: 'error', message: `Simulation Failed: ${errorMsg}` });
    } finally {
        setIsSubmitting(false);
    }
  };

  // Calculations
  const currentPrice = selectedTrade 
    ? (selectedTrade.side === 'yes' ? selectedTrade.market.yesPrice : selectedTrade.market.noPrice) 
    : 0;
    
  const amountNum = parseFloat(tradeAmount) || 0;
  const estimatedShares = currentPrice > 0 ? (amountNum / currentPrice) : 0;
  // Based on your 1:1 AMM model architecture, the user directly receives exact amountNum of shares
  const exactSharesReceived = amountNum; 
  const potentialReturn = exactSharesReceived * 1; 

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative overflow-hidden flex flex-col items-center">
      {/* Header & Tabs Toggle */}
      <header className="w-full max-w-7xl px-6 pt-12 pb-8 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-border/40">
        <div>
          <h1 className="text-4xl font-black font-display uppercase tracking-tight flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            E-Plays
          </h1>
          <p className="text-muted-foreground mt-2">Decentralized Prediction Markets</p>
        </div>
        
        <div className="flex bg-muted p-1 border border-border">
          <button
            onClick={() => setActiveTab('markets')}
            className={`px-6 py-2 text-sm font-semibold transition-colors duration-200 uppercase tracking-widest ${
              activeTab === 'markets' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
          >
            Active Markets
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-6 py-2 text-sm font-semibold transition-colors duration-200 uppercase tracking-widest ${
              activeTab === 'portfolio' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
          >
            My Portfolio
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-7xl px-6 py-8 flex-1">
        {activeTab === 'markets' ? (
          <div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="font-mono uppercase tracking-widest text-sm font-bold">Syncing Blockchain Data...</p>
              </div>
            ) : markets.length === 0 ? (
                <div className="text-center py-20 border border-border border-dashed">
                    <p className="text-muted-foreground font-mono uppercase tracking-widest">No active markets found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {markets.map((market) => (
                    <div 
                        key={market.id} 
                        className="bg-card border border-border p-6 hover:border-primary/50 transition-colors duration-300 flex flex-col justify-between group"
                    >
                        <div>
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-mono font-bold uppercase px-2 py-1 bg-muted text-muted-foreground border border-border">
                            {market.category}
                            </span>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {market.volume}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold leading-tight mb-6 group-hover:text-primary transition-colors">
                            {market.title}
                        </h3>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full mt-auto">
                        <button
                            onClick={() => handleOpenDrawer(market, 'yes')}
                            className="flex-1 flex flex-col items-center justify-center py-3 bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20 transition-colors font-bold tracking-tight rounded-none"
                        >
                            <span className="text-sm uppercase mb-1">Buy Yes</span>
                            <span className="text-xl">{(market.yesPrice * 100).toFixed(0)}%</span>
                        </button>
                        <button
                            onClick={() => handleOpenDrawer(market, 'no')}
                            className="flex-1 flex flex-col items-center justify-center py-3 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors font-bold tracking-tight rounded-none"
                        >
                            <span className="text-sm uppercase mb-1">Buy No</span>
                            <span className="text-xl">{(market.noPrice * 100).toFixed(0)}%</span>
                        </button>
                        </div>
                    </div>
                    ))}
                </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto border border-border bg-card">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted border-b border-border text-sm uppercase font-mono tracking-wider">
                  <th className="p-4 font-semibold">Market Name</th>
                  <th className="p-4 font-semibold">Position</th>
                  <th className="p-4 font-semibold text-right">Shares Owned</th>
                  <th className="p-4 font-semibold text-right">Avg Price</th>
                  <th className="p-4 font-semibold text-right">Current Value</th>
                </tr>
              </thead>
              <tbody>
                {PORTFOLIO_POSITIONS.map((pos) => (
                  <tr key={pos.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{pos.marketName}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-bold uppercase ${pos.position === 'Yes' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} border ${pos.position === 'Yes' ? 'border-green-500/20' : 'border-red-500/20'}`}>
                        {pos.position}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono">{pos.shares.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono">${pos.avgPrice.toFixed(2)}</td>
                    <td className="p-4 text-right font-mono text-primary font-bold">${pos.currentValue.toFixed(2)}</td>
                  </tr>
                ))}
                {PORTFOLIO_POSITIONS.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No active positions found. Submit a trade to populate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
              className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-black uppercase font-display tracking-tight flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  Order Ticket
                </h2>
                <button 
                  onClick={closeDrawer}
                  className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
                
                {txStatus && (
                    <div className={`p-4 rounded-lg font-bold text-sm border ${
                        txStatus.type === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'
                    } break-all`}>
                        {txStatus.message}
                    </div>
                )}

                <div>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2 font-mono">Selected Market</p>
                  <h3 className="text-lg font-bold leading-tight">{selectedTrade.market.title}</h3>
                  <div className="mt-3 inline-block px-3 py-1 bg-muted border border-border text-xs font-mono font-bold uppercase">
                    Trading: <span className={selectedTrade.side === 'yes' ? 'text-green-500' : 'text-red-500'}>{selectedTrade.side}</span> @ {(currentPrice * 100).toFixed(0)}% Probability
                  </div>
                </div>

                <div className="flex bg-muted p-1 border border-border">
                  <button
                    onClick={() => setTradeAction('buy')}
                    className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
                      tradeAction === 'buy' 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:bg-background/40'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setTradeAction('sell')}
                    disabled
                    className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors opacity-50 cursor-not-allowed text-muted-foreground hover:bg-background/40`}
                  >
                    Sell (Coming Soon)
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-bold uppercase text-muted-foreground tracking-widest mb-3 font-mono">
                    Amount to Spend (WSOL)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <span className="text-muted-foreground font-mono font-bold">◎</span>
                    </div>
                    <input
                      type="number"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-background border border-border text-foreground text-3xl font-bold py-4 pl-8 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-muted-foreground/30"
                    />
                  </div>
                </div>

                <div className="bg-muted/50 border border-border p-5 space-y-4">
                  <div className="flex justify-between items-center text-sm font-mono border-b border-border/50 pb-4">
                    <span className="text-muted-foreground font-bold uppercase flex items-center gap-2">
                      <RefreshCcw className="w-4 h-4" />
                      1:1 Market Shares Received
                    </span>
                    <span className="font-bold text-foreground">
                      {exactSharesReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  {tradeAction === 'buy' && (
                    <div className="flex justify-between items-center text-sm font-mono border-t border-border/50 pt-4 opacity-75">
                      <span className="text-muted-foreground font-bold uppercase flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-primary" />
                        Est. Payout if {selectedTrade.side.toUpperCase()} Wins
                      </span>
                      <span className="font-bold text-primary text-base">
                        ◎ {currentPrice > 0 ? (exactSharesReceived / currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : exactSharesReceived.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-border bg-background">
                <button 
                  onClick={handlePlaceOrder}
                  disabled={amountNum <= 0 || isSubmitting}
                  className={`w-full flex items-center justify-center gap-2 py-4 text-lg font-black uppercase tracking-widest transition-all ${
                    amountNum > 0 && !isSubmitting
                      ? 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-[4px_4px_0px_0px_rgba(32,129,226,0.3)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]' 
                      : 'bg-muted text-muted-foreground cursor-not-allowed border border-border opacity-70'
                  }`}
                >
                  {isSubmitting ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                  ) : (
                      'Place Order'
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
