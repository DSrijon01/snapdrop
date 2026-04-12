import { FC, useState } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import idl from '../idl/e_plays.json';
import { Text, Calendar, Loader2 } from 'lucide-react';

export const CreateMarketEvent: FC = () => {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const anchorWallet = useAnchorWallet();

    const [title, setTitle] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);

    // Using Native Wrapped SOL for collateral by default
    const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

    const handleCreateMarket = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus(null);

        // Validation
        if (!title.trim()) {
            setStatus({ type: 'error', message: "Market title cannot be empty." });
            return;
        }

        if (title.length > 100) {
            setStatus({ type: 'error', message: "Market title exceeds 100 characters." });
            return;
        }

        // Optional Expiry Date logic
        let expiryTimestamp = 0;

        if (expiryDate) {
            expiryTimestamp = Math.floor(new Date(expiryDate).getTime() / 1000);
            const currentTimestamp = Math.floor(Date.now() / 1000);

            if (expiryTimestamp <= currentTimestamp) {
                setStatus({ type: 'error', message: "Expiry date must be in the future." });
                return;
            }
        }

        if (!anchorWallet || !publicKey) {
            setStatus({ type: 'error', message: "Please connect your wallet." });
            return;
        }

        try {
            setLoading(true);
            
            const provider = new AnchorProvider(connection, anchorWallet, {
                preflightCommitment: 'confirmed'
            });
            const program = new Program(idl as Idl, provider);

            // Show logic for deriving the marketState PDA
            const [marketState] = PublicKey.findProgramAddressSync(
                [Buffer.from("market"), Buffer.from(title)],
                program.programId
            );

            // We explicitly calculate the other PDAs to pass into Anchor
            const [yesMint] = PublicKey.findProgramAddressSync(
                [Buffer.from("yes_mint"), marketState.toBuffer()],
                program.programId
            );
            
            const [noMint] = PublicKey.findProgramAddressSync(
                [Buffer.from("no_mint"), marketState.toBuffer()],
                program.programId
            );
            
            const [vault] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault"), marketState.toBuffer()],
                program.programId
            );

            // RPC Transaction Calls Batched
            const ix1 = await (program.methods as any).initMarket(title, new BN(expiryTimestamp))
                .accounts({
                    admin: publicKey,
                    marketState: marketState,
                    systemProgram: SystemProgram.programId,
                })
                .instruction();

            const ix2 = await (program.methods as any).initYesMint(title)
                .accounts({
                    admin: publicKey,
                    marketState: marketState,
                    yesMint: yesMint,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .instruction();

            const ix3 = await (program.methods as any).initNoMint(title)
                .accounts({
                    admin: publicKey,
                    marketState: marketState,
                    noMint: noMint,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .instruction();

            const ix4 = await (program.methods as any).initVault(title)
                .accounts({
                    admin: publicKey,
                    marketState: marketState,
                    collateralMint: WSOL_MINT,
                    vault: vault,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .instruction();

            const tx = new Transaction().add(ix1).add(ix2).add(ix3).add(ix4);
            
            const signature = await provider.sendAndConfirm(tx, [], { commitment: 'confirmed' });

            setStatus({ type: 'success', message: `Market Created Successfully! TX: ${signature}` });
            setTitle('');
            setExpiryDate('');
        } catch (error: any) {
            console.error("Failed to create market:", error);
            setStatus({ type: 'error', message: error.message || "Failed to initialize market. Are you on devnet?" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-black font-display uppercase tracking-tight mb-2">Create New Event</h2>
            <p className="text-muted-foreground mb-8 text-sm">Deploy an AMM pari-mutuel prediction market onto Solana Devnet.</p>
            
            {status && (
                <div className={`p-4 mb-6 rounded-lg font-bold text-sm ${
                    status.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'
                }`}>
                    {status.message}
                </div>
            )}

            <form onSubmit={handleCreateMarket} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                        <Text className="w-4 h-4" /> Market Title
                    </label>
                    <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Will Solana reach $500 by December 2026?"
                        className="w-full bg-background border border-border p-4 text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-colors focus:outline-none placeholder:text-muted-foreground/40"
                    />
                    <div className="flex justify-end mt-1">
                        <span className={`text-xs font-mono font-bold ${title.length > 100 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {title.length} / 100
                        </span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2 flex flex-col gap-1">
                        <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Expiry Date & Time (Optional)</span>
                        <span className="text-xs font-normal opacity-70 normal-case tracking-normal">Leave blank for indefinite/manual Admin resolution.</span>
                    </label>
                    <input 
                        type="datetime-local" 
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full bg-background border border-border p-4 text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-colors focus:outline-none"
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading || !title}
                    className="w-full py-4 mt-4 bg-primary text-primary-foreground font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary-hover shadow-[4px_4px_0px_0px_rgba(32,129,226,0.3)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-border"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Transaction Pending...
                        </>
                    ) : (
                        "Launch Market on Solana"
                    )}
                </button>
            </form>
        </div>
    );
};
