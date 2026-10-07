"use client";

import { FC, useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, Idl, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction, ComputeBudgetProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { createConfirmedProvider, parseSolanaErrorMessage } from '@/utils/solanaRetry';
import idl from '../../../idl/e_plays.json';
import { 
    Text, 
    Calendar, 
    Loader2, 
    CheckCircle2, 
    AlertCircle, 
    ExternalLink, 
    ArrowRight, 
    Zap, 
    Coins, 
    ShieldCheck, 
    Clock, 
    Sparkles, 
    RefreshCw,
    Droplets
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateMarketEventProps {
    onSwitchToResolve?: () => void;
}

interface DeployedMarketSummary {
    pubkey: string;
    title: string;
    expiryTs: number;
    resolved: boolean;
    tx?: string;
}

export const CreateMarketEvent: FC<CreateMarketEventProps> = ({ onSwitchToResolve }) => {
    const { connection } = useConnection();
    const { publicKey, wallet } = useWallet();
    const anchorWallet = useAnchorWallet();

    const [title, setTitle] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'error' | 'success', message: string, tx?: string } | null>(null);

    // Desktop helper states
    const [solBalance, setSolBalance] = useState<number | null>(null);
    const [isAirDropping, setIsAirDropping] = useState(false);
    const [checkingDuplicate, setCheckingDuplicate] = useState(false);
    const [isDuplicateTitle, setIsDuplicateTitle] = useState(false);
    const [deployedMarkets, setDeployedMarkets] = useState<DeployedMarketSummary[]>([]);
    const [loadingRecent, setLoadingRecent] = useState(false);

    const isDemo = wallet?.adapter.name === 'Street Sync Demo';
    const cleanTitle = title.trim();

    // Fetch user SOL balance
    const fetchBalance = useCallback(async () => {
        if (!publicKey) {
            setSolBalance(null);
            return;
        }
        try {
            const lamports = await connection.getBalance(publicKey, 'confirmed');
            setSolBalance(lamports / LAMPORTS_PER_SOL);
        } catch (e) {
            console.warn("Failed to fetch balance in CreateMarketEvent:", e);
        }
    }, [connection, publicKey]);

    // Fetch recently deployed markets by this wallet
    const fetchRecentMarkets = useCallback(async () => {
        if (!publicKey) return;
        setLoadingRecent(true);
        try {
            const dummyWallet = {
                publicKey,
                signTransaction: async (tx: any) => tx,
                signAllTransactions: async (txs: any[]) => txs,
            };
            const provider = createConfirmedProvider(connection, (window as any).solana || dummyWallet);
            const program = new Program(idl as Idl, provider);

            const all = await (program.account as any).marketState.all();
            const myMarkets: DeployedMarketSummary[] = all
                .filter((acc: any) => acc.account.admin.toBase58() === publicKey.toBase58())
                .map((acc: any) => ({
                    pubkey: acc.publicKey.toBase58(),
                    title: acc.account.title,
                    expiryTs: acc.account.expiryTs?.toNumber ? acc.account.expiryTs.toNumber() : Number(acc.account.expiryTs || 0),
                    resolved: acc.account.resolved,
                }))
                .reverse();

            // Also check localStorage custom demo markets
            const customStored = JSON.parse(localStorage.getItem('street_sync_custom_markets') || '[]');
            const customForWallet = customStored
                .filter((cm: any) => cm.adminKey === publicKey.toBase58() || isDemo)
                .map((cm: any) => ({
                    pubkey: cm.id,
                    title: cm.title,
                    expiryTs: cm.expiryTs || 0,
                    resolved: cm.resolved || false,
                }));

            // Merge unique by pubkey
            const merged = [...customForWallet, ...myMarkets].filter(
                (item, idx, self) => idx === self.findIndex(t => t.pubkey === item.pubkey || t.title === item.title)
            );

            setDeployedMarkets(merged.slice(0, 5));
        } catch (e) {
            console.warn("Failed to fetch recent markets:", e);
        } finally {
            setLoadingRecent(false);
        }
    }, [connection, publicKey, isDemo]);

    useEffect(() => {
        fetchBalance();
        fetchRecentMarkets();
    }, [fetchBalance, fetchRecentMarkets]);

    // Check if title already exists on-chain as user finishes typing
    useEffect(() => {
        let isCancelled = false;
        if (!cleanTitle || cleanTitle.length < 3) {
            setIsDuplicateTitle(false);
            setCheckingDuplicate(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setCheckingDuplicate(true);
                const programId = new PublicKey((idl as any).metadata?.address || "77vsiKoC6gxYZwbds54Qgqah1du7oDFYPEW84ykAQ7Y4");
                const [marketState] = PublicKey.findProgramAddressSync(
                    [Buffer.from("market"), Buffer.from(cleanTitle)],
                    programId
                );
                const info = await connection.getAccountInfo(marketState, 'confirmed');
                if (!isCancelled) {
                    setIsDuplicateTitle(!!info);
                }
            } catch (err) {
                console.warn("Duplicate title check error:", err);
            } finally {
                if (!isCancelled) setCheckingDuplicate(false);
            }
        }, 400);

        return () => {
            isCancelled = true;
            clearTimeout(timer);
        };
    }, [cleanTitle, connection]);

    // Devnet Airdrop request helper
    const handleRequestAirdrop = async () => {
        if (!publicKey) return;
        setIsAirDropping(true);
        try {
            toast.loading("Requesting 1 SOL Devnet airdrop...", { id: 'airdrop' });
            const sig = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
            toast.success("1 SOL Airdropped successfully!", { id: 'airdrop' });
            fetchBalance();
        } catch (e: any) {
            console.error("Airdrop failed:", e);
            toast.error("Devnet faucet busy. Please try solfaucet.com or wait a moment.", { id: 'airdrop' });
        } finally {
            setIsAirDropping(false);
        }
    };

    // Quick Title Presets
    const titlePresets = [
        "Will Solana break $300 by Dec 2026?",
        "Will Street Sync hit 50,000 active users in Q3?",
        "Will Solana achieve over 10,000 TPS in 2026?",
        "Will Bitcoin break $150,000 by year end?"
    ];

    // Quick Expiry Presets
    const setPresetExpiryHours = (hours: number) => {
        const d = new Date(Date.now() + hours * 3600 * 1000);
        // Format as YYYY-MM-DDTHH:mm for datetime-local input
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setExpiryDate(formatted);
    };

    const handleCreateMarket = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus(null);

        // Validation
        if (!cleanTitle) {
            setStatus({ type: 'error', message: "Market title cannot be empty." });
            return;
        }

        if (cleanTitle.length > 100) {
            setStatus({ type: 'error', message: "Market title exceeds 100 characters limit." });
            return;
        }

        let expiryTimestamp = 0;
        if (expiryDate) {
            expiryTimestamp = Math.floor(new Date(expiryDate).getTime() / 1000);
            const currentTimestamp = Math.floor(Date.now() / 1000);

            if (expiryTimestamp <= currentTimestamp) {
                setStatus({ type: 'error', message: "Expiry date must be in the future." });
                return;
            }
        }

        if (!publicKey || (!anchorWallet && !isDemo)) {
            setStatus({ type: 'error', message: "Please connect your Solana wallet to launch." });
            return;
        }

        try {
            setLoading(true);

            const programId = new PublicKey((idl as any).metadata?.address || "77vsiKoC6gxYZwbds54Qgqah1du7oDFYPEW84ykAQ7Y4");

            // Derive PDAs
            const [marketState] = PublicKey.findProgramAddressSync(
                [Buffer.from("market"), Buffer.from(cleanTitle)],
                programId
            );

            // 1. DEMO MODE
            if (isDemo) {
                const demoMarketObj = {
                    id: marketState.toBase58(),
                    title: cleanTitle,
                    volume: "◎ 0.0 Vol",
                    yesPrice: 0.50,
                    noPrice: 0.50,
                    category: cleanTitle.toLowerCase().includes("solana") ? "Solana Ecosystem" : "Prediction Market",
                    resolved: false,
                    outcome: null,
                    totalYesShares: 0,
                    totalNoShares: 0,
                    expiryTs: expiryTimestamp || 0,
                    marketStatePubkey: marketState,
                    yesMint: PublicKey.default,
                    noMint: PublicKey.default,
                    vault: marketState,
                    adminKey: publicKey.toBase58(),
                };

                const existingCustom = JSON.parse(localStorage.getItem('street_sync_custom_markets') || '[]');
                localStorage.setItem('street_sync_custom_markets', JSON.stringify([demoMarketObj, ...existingCustom]));

                window.dispatchEvent(new CustomEvent('prediction_markets_updated', { detail: demoMarketObj }));
                toast.success(`Market created in Street Sync Demo Mode!`);

                setStatus({
                    type: 'success',
                    message: `Market "${cleanTitle}" launched successfully in Demo Mode! Market PDA: ${marketState.toBase58().slice(0, 8)}...`
                });

                setTitle('');
                setExpiryDate('');
                fetchRecentMarkets();
                return;
            }

            // 2. DUPLICATE TITLE CHECK (Instant upfront check to avoid failing on-chain)
            const existingAccount = await connection.getAccountInfo(marketState, 'confirmed');
            if (existingAccount) {
                setStatus({
                    type: 'error',
                    message: `A market with the title "${cleanTitle}" already exists on Solana Devnet. Please append a tag or version (e.g. "[v2]" or "[2026]") to ensure a unique PDA.`
                });
                setLoading(false);
                return;
            }

            // 3. BALANCE CHECK (~0.008 SOL needed for account rent & tx fees)
            const currentLamports = await connection.getBalance(publicKey, 'confirmed');
            const currentSol = currentLamports / LAMPORTS_PER_SOL;
            if (currentSol < 0.008) {
                setStatus({
                    type: 'error',
                    message: `Insufficient Devnet SOL (${currentSol.toFixed(4)} SOL). Creating a market requires at least ~0.008 SOL for rent-exempt account initialization of the Market State and YES/NO SPL Mints.`
                });
                setLoading(false);
                return;
            }

            // 4. PREPARE INSTRUCTIONS
            const provider = createConfirmedProvider(connection, anchorWallet!);
            const program = new Program(idl as Idl, provider);

            const [yesMint] = PublicKey.findProgramAddressSync(
                [Buffer.from("yes_mint"), marketState.toBuffer()],
                program.programId
            );

            const [noMint] = PublicKey.findProgramAddressSync(
                [Buffer.from("no_mint"), marketState.toBuffer()],
                program.programId
            );

            const ix1 = await (program.methods as any).initMarket(cleanTitle, new BN(expiryTimestamp))
                .accounts({
                    admin: publicKey,
                    marketState: marketState,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();

            const ix2 = await (program.methods as any).initYesMint(cleanTitle)
                .accounts({
                    admin: publicKey,
                    marketState: marketState,
                    yesMint: yesMint,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .instruction();

            const ix3 = await (program.methods as any).initNoMint(cleanTitle)
                .accounts({
                    admin: publicKey,
                    marketState: marketState,
                    noMint: noMint,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .instruction();

            // 5. FETCH FRESH BLOCKHASH & ASSEMBLE TX
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

            const tx = new Transaction({
                feePayer: publicKey,
                recentBlockhash: blockhash,
            })
            .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 450_000 }))
            .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }))
            .add(ix1)
            .add(ix2)
            .add(ix3);

            // 6. SIMULATE TRANSACTION BEFORE WALLET PROMPT (Catches any error immediately)
            const simulation = await connection.simulateTransaction(tx);
            if (simulation.value.err) {
                console.error("Simulation failed:", simulation.value);
                const logError = simulation.value.logs?.find(l => l.includes("Error") || l.includes("panicked") || l.includes("already in use"));
                const errDetail = logError || parseSolanaErrorMessage(simulation.value.err) || JSON.stringify(simulation.value.err);
                throw new Error(`Simulation failed: ${errDetail}`);
            }

            // 7. SIGN WITH WALLET ONCE (Zero repetitive wallet prompt loops!)
            toast.loading("Awaiting wallet approval in Phantom...", { id: 'create-tx' });
            const signedTx = await anchorWallet!.signTransaction(tx);
            const rawTx = signedTx.serialize();

            // 8. BROADCAST RAW TRANSACTION
            toast.loading("Broadcasting transaction to Solana Devnet...", { id: 'create-tx' });
            const signature = await connection.sendRawTransaction(rawTx, {
                skipPreflight: false,
                maxRetries: 3,
            });

            // 9. CONFIRM TRANSACTION WITH EXPIRATION GUARD
            toast.loading("Confirming on-chain state...", { id: 'create-tx' });
            try {
                const conf = await connection.confirmTransaction({
                    signature,
                    blockhash,
                    lastValidBlockHeight
                }, 'confirmed');

                if (conf.value.err) {
                    throw new Error(`Transaction execution error: ${JSON.stringify(conf.value.err)}`);
                }
            } catch (confErr: any) {
                // If confirmation timed out, verify signature status before showing error
                console.warn("confirmTransaction timeout, checking signature status:", confErr);
                const sigStatus = await connection.getSignatureStatus(signature);
                if (sigStatus.value?.err) {
                    throw new Error(`Transaction failed: ${JSON.stringify(sigStatus.value.err)}`);
                }
            }

            toast.success("Market Launched Successfully!", { id: 'create-tx' });

            setStatus({ 
                type: 'success', 
                message: `Prediction Market Deployed Successfully onto Solana Devnet!`,
                tx: signature
            });

            // Save new market locally for instant recognition
            const newMarketObj = {
                id: marketState.toBase58(),
                title: cleanTitle,
                volume: "◎ 0.0 Vol",
                yesPrice: 0.50,
                noPrice: 0.50,
                category: cleanTitle.toLowerCase().includes("solana") ? "Solana Ecosystem" : "Prediction Market",
                resolved: false,
                outcome: null,
                totalYesShares: 0,
                totalNoShares: 0,
                expiryTs: expiryTimestamp || 0,
                marketStatePubkey: marketState,
                yesMint: yesMint,
                noMint: noMint,
                vault: marketState,
                adminKey: publicKey.toBase58(),
            };

            const existingCustom = JSON.parse(localStorage.getItem('street_sync_custom_markets') || '[]');
            localStorage.setItem('street_sync_custom_markets', JSON.stringify([newMarketObj, ...existingCustom]));

            // Dispatch global synchronization event
            window.dispatchEvent(new CustomEvent('prediction_markets_updated', { detail: newMarketObj }));

            setTitle('');
            setExpiryDate('');
            fetchBalance();
            fetchRecentMarkets();

        } catch (error: any) {
            console.error("Failed to create market:", error);
            toast.dismiss('create-tx');
            const msg = parseSolanaErrorMessage(error) || error?.message || "Failed to initialize market. Are you on devnet?";
            setStatus({ type: 'error', message: msg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Main Form Card */}
            <div className="bg-card border border-border rounded-2xl p-8 shadow-sm relative overflow-hidden backdrop-blur-sm">
                {/* Background glow accent */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />

                {/* Header with Network & Balance Pills */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border mb-6">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <h2 className="text-2xl font-black font-display uppercase tracking-tight text-foreground">
                                Launch Prediction Market
                            </h2>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Devnet AMM
                            </span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                            Deploy a full-fidelity Pari-Mutuel prediction market contract with dedicated YES/NO SPL token mints.
                        </p>
                    </div>

                    {/* Desktop Wallet & Balance Indicators */}
                    <div className="flex items-center gap-2 self-start md:self-auto">
                        {publicKey ? (
                            <div className="flex items-center gap-2 bg-muted/40 border border-border px-3 py-1.5 rounded-xl text-xs font-mono">
                                <Coins className="w-3.5 h-3.5 text-primary" />
                                <span className="text-muted-foreground">Balance:</span>
                                <span className="font-bold text-foreground">
                                    {solBalance !== null ? `${solBalance.toFixed(3)} SOL` : '...'}
                                </span>
                                {solBalance !== null && solBalance < 0.05 && !isDemo && (
                                    <button
                                        type="button"
                                        onClick={handleRequestAirdrop}
                                        disabled={isAirDropping}
                                        className="ml-1 text-[10px] font-bold uppercase tracking-wider bg-primary/20 hover:bg-primary/30 text-primary px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                                        title="Request 1 Devnet SOL"
                                    >
                                        {isAirDropping ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Droplets className="w-2.5 h-2.5" />}
                                        Airdrop
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" /> Connect Wallet
                            </div>
                        )}
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
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        ) : (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-2">
                            <p className="font-bold">{status.message}</p>
                            {status.tx && (
                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                    <a
                                        href={`https://explorer.solana.com/tx/${status.tx}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-mono font-bold text-primary hover:underline"
                                    >
                                        Explorer: {status.tx.slice(0, 10)}...{status.tx.slice(-8)}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                    {onSwitchToResolve && (
                                        <button
                                            type="button"
                                            onClick={onSwitchToResolve}
                                            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-3 py-1 rounded-lg transition-colors"
                                        >
                                            Go to Resolve Tab <ArrowRight className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <form onSubmit={handleCreateMarket} className="space-y-6">
                    {/* Market Title Field */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Text className="w-3.5 h-3.5 text-primary" /> Market Title & Question
                            </label>
                            <span className={`text-xs font-mono font-bold ${
                                title.length > 100 ? 'text-red-400' : 'text-muted-foreground'
                            }`}>
                                {title.length} / 100
                            </span>
                        </div>
                        
                        <div className="relative">
                            <input 
                                type="text" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Will Solana break $300 by Dec 2026?"
                                className={`w-full bg-background border p-4 rounded-xl text-foreground text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                                    isDuplicateTitle 
                                        ? 'border-amber-500/60 focus:ring-amber-500/30' 
                                        : 'border-border focus:ring-primary/30 focus:border-primary'
                                }`}
                            />
                            {checkingDuplicate && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Checking PDA...
                                </div>
                            )}
                        </div>

                        {/* Duplicate Warning */}
                        {isDuplicateTitle && (
                            <div className="mt-2 text-xs text-amber-400 flex items-center gap-1.5 font-medium bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>
                                    A market with this exact title already exists on Solana Devnet. Please modify or add a version tag (e.g. &quot;{cleanTitle} v2&quot;) to create a new unique PDA.
                                </span>
                            </div>
                        )}

                        {/* Preset Quick Chips */}
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mr-1">
                                Suggestions:
                            </span>
                            {titlePresets.map((preset, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setTitle(preset)}
                                    className="text-xs bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg border border-border/60 transition-colors text-left"
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Expiry Date Field with Quick Presets */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-primary" /> Expiry Date & Countdown (Optional)
                            </label>
                            <span className="text-[11px] text-muted-foreground">
                                Leave blank for indefinite / manual resolution
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input 
                                type="datetime-local" 
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                className="w-full bg-background border border-border p-4 rounded-xl text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all focus:outline-none"
                            />

                            {/* Preset Duration Buttons */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setExpiryDate('')}
                                    className={`px-3 py-2 text-xs font-bold uppercase rounded-lg border transition-all ${
                                        !expiryDate ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    Manual Expiry
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPresetExpiryHours(24)}
                                    className="px-3 py-2 text-xs font-bold uppercase rounded-lg border bg-muted/40 border-border text-muted-foreground hover:bg-muted transition-all"
                                >
                                    +24 Hours
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPresetExpiryHours(24 * 7)}
                                    className="px-3 py-2 text-xs font-bold uppercase rounded-lg border bg-muted/40 border-border text-muted-foreground hover:bg-muted transition-all"
                                >
                                    +7 Days
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPresetExpiryHours(24 * 30)}
                                    className="px-3 py-2 text-xs font-bold uppercase rounded-lg border bg-muted/40 border-border text-muted-foreground hover:bg-muted transition-all"
                                >
                                    +30 Days
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Protocol Transparency Box */}
                    <div className="bg-muted/30 border border-border/80 rounded-xl p-4 text-xs space-y-2 font-mono">
                        <div className="flex items-center justify-between text-muted-foreground font-sans">
                            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
                                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> On-Chain Deployment Architecture
                            </span>
                            <span className="text-[11px]">Devnet Program: 77vsiKoC...AQ7Y4</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-[11px] text-muted-foreground border-t border-border/40">
                            <div>
                                <span className="block opacity-60 text-[10px]">MARKET STATE</span>
                                <span className="font-bold text-foreground">PDA Seeded</span>
                            </div>
                            <div>
                                <span className="block opacity-60 text-[10px]">YES MINT</span>
                                <span className="font-bold text-foreground">Decimals = 9</span>
                            </div>
                            <div>
                                <span className="block opacity-60 text-[10px]">NO MINT</span>
                                <span className="font-bold text-foreground">Decimals = 9</span>
                            </div>
                            <div>
                                <span className="block opacity-60 text-[10px]">EST. RENT</span>
                                <span className="font-bold text-foreground">~0.0051 SOL</span>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button 
                        type="submit" 
                        disabled={loading || !cleanTitle || isDuplicateTitle || title.length > 100}
                        className="w-full py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:bg-primary-hover shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-primary/30"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Deploying Market on Solana...
                            </>
                        ) : isDuplicateTitle ? (
                            "Title Already Exists — Make It Unique"
                        ) : (
                            <>
                                <Zap className="w-5 h-5 fill-current" />
                                Launch Market on Solana Devnet
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Recently Deployed by this Wallet Section */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <h3 className="text-base font-bold uppercase tracking-tight text-foreground font-display">
                            Recent Markets by Connected Wallet
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={fetchRecentMarkets}
                        disabled={loadingRecent}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                        <RefreshCw className={`w-3 h-3 ${loadingRecent ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {loadingRecent ? (
                    <div className="py-8 flex justify-center items-center">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : deployedMarkets.length === 0 ? (
                    <div className="text-center py-8 border border-border border-dashed rounded-xl">
                        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                            No prediction markets deployed by this wallet yet.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {deployedMarkets.map((market) => (
                            <div key={market.pubkey} className="py-3 flex items-center justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-bold truncate text-foreground">
                                        {market.title}
                                    </h4>
                                    <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground mt-0.5">
                                        <span>PDA: {market.pubkey.slice(0, 6)}...{market.pubkey.slice(-4)}</span>
                                        <span>•</span>
                                        <span className={market.resolved ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                                            {market.resolved ? "Resolved" : "Active / Unresolved"}
                                        </span>
                                    </div>
                                </div>

                                {onSwitchToResolve && !market.resolved && (
                                    <button
                                        type="button"
                                        onClick={onSwitchToResolve}
                                        className="shrink-0 text-xs font-bold uppercase tracking-wider bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg border border-border transition-colors flex items-center gap-1"
                                    >
                                        Resolve <ArrowRight className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
