"use client";

import { FC, useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, Idl } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import { createConfirmedProvider, parseSolanaErrorMessage } from '@/utils/solanaRetry';
import idl from '../../../idl/e_plays.json';
import { 
    Loader2, 
    CheckCircle, 
    XCircle, 
    AlertTriangle, 
    RefreshCw, 
    ExternalLink, 
    CheckCircle2, 
    Coins, 
    Clock, 
    Filter 
} from 'lucide-react';
import toast from 'react-hot-toast';

type MarketStateData = {
    pubkey: PublicKey;
    title: string;
    expiryTs: number;
    resolved: boolean;
    totalYesShares: number;
    totalNoShares: number;
    adminKey: string;
    isCustom?: boolean;
};

export const ResolveMarketEvent: FC = () => {
    const { connection } = useConnection();
    const { publicKey, wallet } = useWallet();
    const anchorWallet = useAnchorWallet();

    const [markets, setMarkets] = useState<MarketStateData[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [status, setStatus] = useState<{ type: 'error' | 'success', message: string, tx?: string } | null>(null);
    const [filter, setFilter] = useState<'all' | 'mine'>('mine');

    const isDemo = wallet?.adapter.name === 'Street Sync Demo';

    const fetchAdminMarkets = useCallback(async () => {
        if (!publicKey) {
            setMarkets([]);
            setLoading(false);
            return;
        }
        
        try {
            setLoading(true);
            const dummyWallet = {
                publicKey,
                signTransaction: async (tx: any) => tx,
                signAllTransactions: async (txs: any[]) => txs,
            };
            
            const provider = createConfirmedProvider(connection, (window as any).solana || dummyWallet);
            const program = new Program(idl as Idl, provider);

            let onChainFormatted: MarketStateData[] = [];
            try {
                const allMarkets = await (program.account as any).marketState.all();
                onChainFormatted = allMarkets.map((account: any) => {
                    const data = account.account;
                    return {
                        pubkey: account.publicKey,
                        title: data.title,
                        expiryTs: data.expiryTs?.toNumber ? data.expiryTs.toNumber() : Number(data.expiryTs || 0),
                        resolved: data.resolved,
                        totalYesShares: (data.totalYesShares?.toNumber ? data.totalYesShares.toNumber() : Number(data.totalYesShares || 0)) / 1e9,
                        totalNoShares: (data.totalNoShares?.toNumber ? data.totalNoShares.toNumber() : Number(data.totalNoShares || 0)) / 1e9,
                        adminKey: data.admin.toBase58(),
                        isCustom: false,
                    };
                });
            } catch (rpcErr) {
                console.warn("Could not fetch on-chain markets, checking local custom markets:", rpcErr);
            }

            // Also load custom/demo markets from localStorage
            let customFormatted: MarketStateData[] = [];
            try {
                const storedCustom = JSON.parse(localStorage.getItem('street_sync_custom_markets') || '[]');
                customFormatted = storedCustom.map((cm: any) => ({
                    pubkey: new PublicKey(cm.marketStatePubkey || cm.id),
                    title: cm.title,
                    expiryTs: cm.expiryTs || 0,
                    resolved: cm.resolved || false,
                    totalYesShares: (cm.totalYesShares || 0) / 1e9,
                    totalNoShares: (cm.totalNoShares || 0) / 1e9,
                    adminKey: cm.adminKey || publicKey.toBase58(),
                    isCustom: true,
                }));
            } catch (storageErr) {
                console.warn("Could not read local custom markets:", storageErr);
            }

            // Combine and deduplicate
            const combined = [...customFormatted, ...onChainFormatted].filter(
                (m, idx, arr) => idx === arr.findIndex(t => t.pubkey.toBase58() === m.pubkey.toBase58() || t.title === m.title)
            );

            // Filter: Must be unresolved AND owned by connected Admin Wallet (or show all in admin preview)
            const activeMarkets = combined.filter((m: MarketStateData) => {
                if (m.resolved) return false;
                if (filter === 'mine') {
                    return m.adminKey === publicKey.toBase58() || isDemo;
                }
                return true;
            });

            setMarkets(activeMarkets);
        } catch (error) {
            console.error("Failed to fetch markets:", error);
            setStatus({ type: 'error', message: "Failed to fetch active Devnet markets from blockchain." });
        } finally {
            setLoading(false);
        }
    }, [connection, publicKey, isDemo, filter]);

    useEffect(() => {
        fetchAdminMarkets();
    }, [fetchAdminMarkets]);

    // Listen for market creation/updates globally
    useEffect(() => {
        const handleSync = () => {
            fetchAdminMarkets();
        };
        window.addEventListener('prediction_markets_updated', handleSync);
        return () => window.removeEventListener('prediction_markets_updated', handleSync);
    }, [fetchAdminMarkets]);

    const handleResolve = async (market: MarketStateData, isYes: boolean) => {
        if (!publicKey || (!anchorWallet && !isDemo)) {
            setStatus({ type: 'error', message: "Please connect your wallet first." });
            return;
        }

        const marketPubkey = market.pubkey;
        setResolvingId(marketPubkey.toBase58());
        setStatus(null);

        try {
            // 1. DEMO MODE OR CUSTOM LOCAL MARKET
            if (isDemo || market.isCustom) {
                toast.loading(`Resolving market as ${isYes ? 'YES' : 'NO'} in Demo Mode...`, { id: 'resolve-tx' });
                
                // Update local storage
                try {
                    const stored = JSON.parse(localStorage.getItem('street_sync_custom_markets') || '[]');
                    const updated = stored.map((item: any) => {
                        if (item.id === marketPubkey.toBase58() || item.title === market.title) {
                            return { ...item, resolved: true, outcome: isYes };
                        }
                        return item;
                    });
                    localStorage.setItem('street_sync_custom_markets', JSON.stringify(updated));
                } catch (e) {
                    console.error("Failed updating demo market in storage", e);
                }

                // Global event dispatch
                window.dispatchEvent(new CustomEvent('prediction_markets_updated', {
                    detail: { pubkey: marketPubkey.toBase58(), title: market.title, resolved: true, outcome: isYes }
                }));

                toast.success(`Market resolved as ${isYes ? 'YES' : 'NO'}!`, { id: 'resolve-tx' });
                setStatus({
                    type: 'success',
                    message: `Market "${market.title}" resolved successfully as ${isYes ? 'YES (TRUE)' : 'NO (FALSE)'} in Demo Mode!`
                });

                setMarkets(prev => prev.filter(m => m.pubkey.toBase58() !== marketPubkey.toBase58()));
                return;
            }

            // 2. ON-CHAIN SOLANA EXECUTION
            const provider = createConfirmedProvider(connection, anchorWallet!);
            const program = new Program(idl as Idl, provider);

            const ix = await (program.methods as any).resolveMarket(isYes)
                .accounts({
                    admin: publicKey,
                    marketState: marketPubkey,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

            const tx = new Transaction({
                feePayer: publicKey,
                recentBlockhash: blockhash,
            })
            .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }))
            .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }))
            .add(ix);

            // Simulate transaction upfront
            const sim = await connection.simulateTransaction(tx);
            if (sim.value.err) {
                console.error("Resolve simulation error:", sim.value);
                const logErr = sim.value.logs?.find(l => l.includes("Error") || l.includes("panicked"));
                throw new Error(`Simulation failed: ${logErr || JSON.stringify(sim.value.err)}`);
            }

            // Prompt wallet signature ONCE
            toast.loading("Awaiting wallet approval in Phantom...", { id: 'resolve-tx' });
            const signedTx = await anchorWallet!.signTransaction(tx);
            const rawTx = signedTx.serialize();

            // Broadcast
            toast.loading("Broadcasting resolution to Devnet...", { id: 'resolve-tx' });
            const signature = await connection.sendRawTransaction(rawTx, {
                skipPreflight: false,
                maxRetries: 3,
            });

            // Confirm
            toast.loading("Confirming settlement on-chain...", { id: 'resolve-tx' });
            try {
                const conf = await connection.confirmTransaction({
                    signature,
                    blockhash,
                    lastValidBlockHeight
                }, 'confirmed');
                if (conf.value.err) {
                    throw new Error(`Resolution error: ${JSON.stringify(conf.value.err)}`);
                }
            } catch (confErr: any) {
                console.warn("confirmTransaction warning during resolve, polling signature:", confErr);
                const status = await connection.getSignatureStatus(signature);
                if (status.value?.err) {
                    throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
                }
            }

            toast.success(`Market Resolved as ${isYes ? 'YES' : 'NO'}!`, { id: 'resolve-tx' });

            setStatus({ 
                type: 'success', 
                message: `Market successfully settled on-chain as ${isYes ? 'YES (TRUE)' : 'NO (FALSE)'}!`,
                tx: signature
            });
            
            // Dispatch update globally
            window.dispatchEvent(new CustomEvent('prediction_markets_updated', {
                detail: { pubkey: marketPubkey.toBase58(), title: market.title, resolved: true, outcome: isYes }
            }));

            // Remove resolved market from UI
            setMarkets(prev => prev.filter(m => m.pubkey.toBase58() !== marketPubkey.toBase58()));

        } catch (error: any) {
            console.error("Failed to resolve market:", error);
            toast.dismiss('resolve-tx');
            const msg = parseSolanaErrorMessage(error) || error?.message || "Unknown error occurred while resolving.";
            setStatus({ type: 'error', message: `Resolution Failed: ${msg}` });
        } finally {
            setResolvingId(null);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header Card */}
            <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border mb-6">
                    <div>
                        <h2 className="text-2xl font-black font-display uppercase tracking-tight text-foreground">
                            Resolve Prediction Markets
                        </h2>
                        <p className="text-muted-foreground text-xs mt-1">
                            Dictate official market outcomes (YES / NO). This activates the immutable Pari-Mutuel winner payout claim mechanism.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setFilter(filter === 'mine' ? 'all' : 'mine')}
                            className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold uppercase tracking-wider bg-muted/40 hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors"
                        >
                            <Filter className="w-3.5 h-3.5 text-primary" />
                            {filter === 'mine' ? "Showing: My Markets" : "Showing: All Devnet"}
                        </button>

                        <button
                            type="button"
                            onClick={fetchAdminMarkets}
                            disabled={loading}
                            className="p-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
                            title="Refresh markets"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Status Notice */}
                {status && (
                    <div className={`p-4 mb-6 rounded-xl font-medium text-sm flex items-start gap-3 border transition-all ${
                        status.type === 'error' 
                            ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    }`}>
                        {status.type === 'error' ? (
                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        ) : (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-1">
                            <p className="font-bold">{status.message}</p>
                            {status.tx && (
                                <a
                                    href={`https://explorer.solana.com/tx/${status.tx}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-mono font-bold text-primary hover:underline pt-1"
                                >
                                    View Resolution TX: {status.tx.slice(0, 8)}...{status.tx.slice(-8)}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Markets Grid */}
                {loading ? (
                    <div className="flex flex-col justify-center items-center py-16 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                            Scanning Devnet Prediction Markets...
                        </span>
                    </div>
                ) : markets.length === 0 ? (
                    <div className="text-center py-16 border border-border border-dashed rounded-2xl">
                        <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3">
                            <Clock className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-foreground font-display font-bold uppercase tracking-wider text-sm">
                            No Unresolved Markets Found
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                            All events deployed by this wallet have either already been resolved or no events are currently active.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {markets.map((market) => {
                            const isResolvingThis = resolvingId === market.pubkey.toBase58();
                            const isExpired = market.expiryTs > 0 && (Date.now() / 1000 >= market.expiryTs);

                            return (
                                <div 
                                    key={market.pubkey.toBase58()} 
                                    className="border border-border/80 bg-background/60 hover:border-primary/50 transition-all rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden"
                                >
                                    <div>
                                        {/* Card Header */}
                                        <div className="flex justify-between items-start gap-2 mb-3">
                                            <span className="text-[11px] font-mono font-bold bg-muted px-2.5 py-1 text-muted-foreground rounded-lg">
                                                PDA: {market.pubkey.toBase58().slice(0, 4)}...{market.pubkey.toBase58().slice(-4)}
                                            </span>

                                            {market.expiryTs === 0 ? (
                                                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase tracking-wider border border-border">
                                                    Manual Expiry
                                                </span>
                                            ) : isExpired ? (
                                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-500/20">
                                                    Countdown Ended
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-wider border border-amber-500/20">
                                                    <Clock className="w-3 h-3" />
                                                    Ends in {Math.ceil((market.expiryTs - (Date.now() / 1000)) / 60)}m
                                                </span>
                                            )}
                                        </div>

                                        {/* Market Title */}
                                        <h3 className="text-base font-bold text-foreground leading-snug mb-4">
                                            {market.title}
                                        </h3>
                                        
                                        {/* Pool Distribution */}
                                        <div className="grid grid-cols-2 gap-3 text-xs font-mono text-muted-foreground mb-6 bg-muted/30 p-3 rounded-xl border border-border/50">
                                            <div>
                                                <span className="block text-[10px] uppercase tracking-wider opacity-70 mb-0.5">YES Pool</span>
                                                <span className="font-bold text-foreground text-sm">◎ {market.totalYesShares.toFixed(2)}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] uppercase tracking-wider opacity-70 mb-0.5">NO Pool</span>
                                                <span className="font-bold text-foreground text-sm">◎ {market.totalNoShares.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleResolve(market, true)}
                                            disabled={isResolvingThis}
                                            className="flex-1 py-3 flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all font-bold tracking-tight rounded-xl text-xs disabled:opacity-50"
                                        >
                                            {isResolvingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            SETTLE YES (TRUE)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleResolve(market, false)}
                                            disabled={isResolvingThis}
                                            className="flex-1 py-3 flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-all font-bold tracking-tight rounded-xl text-xs disabled:opacity-50"
                                        >
                                            {isResolvingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                            SETTLE NO (FALSE)
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
