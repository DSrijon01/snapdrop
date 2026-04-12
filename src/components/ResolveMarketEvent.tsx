import { FC, useState, useEffect } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import idl from '../idl/e_plays.json';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

type MarketStateData = {
    pubkey: PublicKey;
    title: string;
    expiryTs: number;
    resolved: boolean;
    totalYesShares: number;
    totalNoShares: number;
    adminKey: string;
};

export const ResolveMarketEvent: FC = () => {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const anchorWallet = useAnchorWallet();

    const [markets, setMarkets] = useState<MarketStateData[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState<string | null>(null);
    const [status, setStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);

    const fetchAdminMarkets = async () => {
        if (!publicKey) return;
        
        try {
            setLoading(true);
            const dummyWallet = {
                publicKey,
                signTransaction: async () => { throw new Error('Not implemented') },
                signAllTransactions: async () => { throw new Error('Not implemented') },
            };
            
            const provider = new AnchorProvider(connection, (window as any).solana || dummyWallet, { preflightCommitment: 'confirmed' });
            const program = new Program(idl as Idl, provider);

            const allMarkets = await (program.account as any).marketState.all();
            
            // Filter: Must be unresolved AND Must be owned by connected Admin Wallet
            const activeAdminMarkets = allMarkets
                .map((account: any) => {
                    const data = account.account;
                    return {
                        pubkey: account.publicKey,
                        title: data.title,
                        expiryTs: data.expiryTs.toNumber(),
                        resolved: data.resolved,
                        totalYesShares: data.totalYesShares.toNumber() / 1e9,
                        totalNoShares: data.totalNoShares.toNumber() / 1e9,
                        adminKey: data.admin.toBase58(),
                    };
                })
                .filter((m: MarketStateData) => !m.resolved && m.adminKey === publicKey.toBase58());

            setMarkets(activeAdminMarkets);
        } catch (error) {
            console.error("Failed to fetch markets:", error);
            setStatus({ type: 'error', message: "Failed to fetch active Devnet markets from blockchain." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminMarkets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicKey, connection]);

    const handleResolve = async (marketPubkey: PublicKey, isYes: boolean) => {
        if (!anchorWallet || !publicKey) {
            setStatus({ type: 'error', message: "Please connect your wallet." });
            return;
        }

        try {
            setResolvingId(marketPubkey.toBase58());
            setStatus(null);

            const provider = new AnchorProvider(connection, anchorWallet, { preflightCommitment: 'confirmed' });
            const program = new Program(idl as Idl, provider);

            const signature = await (program.methods as any).resolveMarket(isYes)
                .accounts({
                    admin: publicKey,
                    marketState: marketPubkey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            setStatus({ type: 'success', message: `Market successfully resolved as ${isYes ? 'YES' : 'NO'}! TX: ${signature}` });
            
            // Remove the resolved market from UI instantly
            setMarkets(prev => prev.filter(m => m.pubkey.toBase58() !== marketPubkey.toBase58()));

        } catch (error: any) {
            console.error("Failed to resolve market:", error);
            
            let errorMsg = error.message || "Unknown error";
            if (error.logs) {
                // Pinpoint specific standard custom anchor errors from logs if present
                console.error("TX Logs:", error.logs);
                if (error.logs.some((l: string) => l.includes("MarketNotExpiredYet"))) {
                    errorMsg = "Blockchain rejected request: The event countdown timer has not technically expired yet!";
                } else {
                    errorMsg = `${errorMsg}. Logs: ${error.logs[error.logs.length - 1]}`;
                }
            }

            setStatus({ type: 'error', message: `Resolution Failed: ${errorMsg}` });
        } finally {
            setResolvingId(null);
        }
    };

    return (
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-black font-display uppercase tracking-tight mb-2">Resolve Events</h2>
            <p className="text-muted-foreground mb-8 text-sm">Dictate the final outcome for your deployed E-Plays prediction markets. This triggers the exact Pari-Mutuel payout mechanism.</p>
            
            {status && (
                <div className={`p-4 mb-6 rounded-lg font-bold text-sm ${
                    status.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'
                } break-all`}>
                    {status.message}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : markets.length === 0 ? (
                <div className="text-center py-12 border border-border border-dashed rounded-lg">
                    <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm">No Unresolved Markets Found.</p>
                    <p className="text-xs text-muted-foreground mt-2">You either have 0 active events, or they are already processed.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {markets.map((market) => {
                        const isResolvingThis = resolvingId === market.pubkey.toBase58();
                        const isExpired = Date.now() / 1000 >= market.expiryTs;

                        return (
                            <div key={market.pubkey.toBase58()} className="border border-border p-5 rounded-lg flex flex-col justify-between hover:border-primary/50 transition-colors">
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-xs font-mono font-bold bg-muted px-2 py-1 text-muted-foreground rounded">
                                            {market.pubkey.toBase58().slice(0, 4)}...{market.pubkey.toBase58().slice(-4)}
                                        </span>
                                        {!isExpired && market.expiryTs !== 0 ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-sm uppercase tracking-widest border border-yellow-500/20">
                                                <AlertTriangle className="w-3 h-3" /> Ends in {Math.ceil((market.expiryTs - (Date.now() / 1000)) / 60)}m
                                            </span>
                                        ) : market.expiryTs === 0 ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-sm uppercase tracking-widest border border-border">
                                                Manual Expiry
                                            </span>
                                        ) : null}
                                    </div>
                                    <h3 className="text-lg font-bold leading-tight mb-4">{market.title}</h3>
                                    
                                    <div className="flex gap-4 text-sm font-mono text-muted-foreground mb-6 bg-muted/30 p-3 rounded border border-border/50">
                                        <div className="flex-1">
                                            <span className="block text-xs uppercase opacity-70 mb-1">Total YES Pool</span>
                                            <span className="font-bold text-foreground">◎ {market.totalYesShares.toFixed(2)}</span>
                                        </div>
                                        <div className="flex-1">
                                            <span className="block text-xs uppercase opacity-70 mb-1">Total NO Pool</span>
                                            <span className="font-bold text-foreground">◎ {market.totalNoShares.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleResolve(market.pubkey, true)}
                                        disabled={isResolvingThis}
                                        className="flex-1 py-3 flex items-center justify-center gap-2 bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20 transition-all font-bold tracking-tight rounded disabled:opacity-50"
                                    >
                                        {isResolvingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                        TRUE WIN
                                    </button>
                                    <button
                                        onClick={() => handleResolve(market.pubkey, false)}
                                        disabled={isResolvingThis}
                                        className="flex-1 py-3 flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all font-bold tracking-tight rounded disabled:opacity-50"
                                    >
                                        {isResolvingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                        FALSE WIN
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
