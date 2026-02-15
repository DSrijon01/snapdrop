import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { FC, useEffect, useState, useMemo } from 'react';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Program, AnchorProvider, Idl, BN } from '@coral-xyz/anchor';
import idl from '../idl/launchpad.json';
import { useTokenMetadata } from '@/hooks/useTokenMetadata';

// Admin Wallet Address
const ADMIN_WALLET = "9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu";

type TokenAccountInfo = {
    mint: PublicKey;
    amount: bigint;
    decimals: number;
    programId: PublicKey;
};

export const AdminDashboard: FC = () => {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const anchorWallet = useAnchorWallet();
    const [tokens, setTokens] = useState<TokenAccountInfo[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Anchor Program Setup
    const provider = useMemo(() => {
        if (!anchorWallet) return null;
        return new AnchorProvider(connection, anchorWallet, {
            preflightCommitment: 'confirmed',
        });
    }, [connection, anchorWallet]);

    const program = useMemo(() => {
        if (!provider) return null;
        return new Program(idl as Idl, provider);
    }, [provider]);

    useEffect(() => {
        if (publicKey && publicKey.toString() === ADMIN_WALLET) {
            fetchWalletTokens();
        }
    }, [publicKey, connection]);

    const fetchWalletTokens = async () => {
        if (!publicKey) return;
        setLoading(true);
        try {
            // Fetch Standard SPL Tokens
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
                programId: TOKEN_PROGRAM_ID,
            });

            // Fetch Token-2022 Tokens
            const token2022Accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
                programId: TOKEN_2022_PROGRAM_ID,
            });

            const allTokens: TokenAccountInfo[] = [
                ...tokenAccounts.value,
                ...token2022Accounts.value
            ].map(item => ({
                mint: new PublicKey(item.account.data.parsed.info.mint),
                amount: BigInt(item.account.data.parsed.info.tokenAmount.amount),
                decimals: item.account.data.parsed.info.tokenAmount.decimals,
                programId: item.account.owner, // Program ID of the account (Token or Token2022)
            }));
            
            console.log("All Raw Tokens:", allTokens);

            // Filter out tokens with 0 balance
            // Filter out potential NFTs: Decimals = 0 AND Amount = 1
            const filteredTokens = allTokens.filter(t => {
                const isNft = t.decimals === 0 && t.amount === 1n;
                return t.amount > 0 && !isNft;
            });
            
            console.log("Filtered Tokens:", filteredTokens);
            setTokens(filteredTokens);
        } catch (e) {
            console.error("Error fetching tokens", e);
        } finally {
            setLoading(false);
        }
    };

    const handleListToken = async (token: TokenAccountInfo) => {
        if (!program || !publicKey) return;

        try {
            const mint = token.mint;
            
            // Derive PDAs
            const [curvePda] = PublicKey.findProgramAddressSync(
                [Buffer.from("bonding_curve"), mint.toBuffer()],
                program.programId
            );
            
            const vaultPda = getAssociatedTokenAddressSync(
                mint,
                curvePda,
                true,
                token.programId
            );

            const creatorTokenAccount = getAssociatedTokenAddressSync(
                mint,
                publicKey,
                false,
                token.programId
            );

            // Dynamic Calculation based on User Balance
            // We list the ENTIRE balance the user has.
            const realToken = new BN(token.amount.toString()); 
            
            // Set Virtual Token Reserves to be Real + 20% (to create a price offset)
            // If real is 1000, virtual is 1250.
            // Using BN for safety
            const virtualToken = realToken.add(realToken.div(new BN(4))); // + 25%

            // Virtual SOL to set initial market cap target
            // Flat 30 SOL for now, or could scale? keeping 30 SOL is fine for devnet.
            const virtualSol = new BN(30 * 1_000_000_000);

            const tx = await program.methods
                .initializeCurve(virtualSol, virtualToken, realToken)
                .accounts({
                    curve: curvePda,
                    creator: publicKey,
                    mint: mint,
                    vault: vaultPda,
                    creatorTokenAccount: creatorTokenAccount,
                    tokenProgram: token.programId,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
            
            alert(`Token Listed Successfully! TX: ${tx}`);
            // Optionally refresh tokens or remove from list if logic dictates
        } catch (e: any) {
            console.error("Listing failed", e);
            alert(`Listing failed! ${e.message || JSON.stringify(e)}`);
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-3xl font-bold mb-6 text-foreground font-display uppercase italic">Admin Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                   <p>Loading your tokens...</p>
                ) : tokens.length === 0 ? (
                   <p>No tokens found in this wallet.</p>
                ) : (
                    tokens.map((token) => (
                        <TokenCard key={token.mint.toBase58()} token={token} onList={() => handleListToken(token)} />
                    ))
                )}
            </div>
        </div>
    );
};

const TokenCard: FC<{ token: TokenAccountInfo, onList: () => void }> = ({ token, onList }) => {
    const { metadata, loading } = useTokenMetadata(token.mint);
    
    const name = metadata?.name;
    const symbol = metadata?.symbol;
    const image = metadata?.image;

    return (
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
                 {loading ? (
                    <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                 ) : image ? (
                    <img src={image} alt={name} className="w-12 h-12 rounded-full object-cover bg-muted" />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        No Img
                    </div>
                )}
                <div>
                     <h3 className="font-bold text-lg">{name || "Unknown Token"}</h3>
                     <p className="text-sm text-muted-foreground">{symbol || "UNK"}</p>
                </div>
            </div>
            
            <div className="text-sm text-muted-foreground break-all">
                Mint: {token.mint.toBase58()}
            </div>
            <div className="text-sm">
                Balance: {(Number(token.amount) / Math.pow(10, token.decimals)).toLocaleString()}
            </div>
             <div className="text-xs text-blue-400">
                {token.programId.equals(TOKEN_2022_PROGRAM_ID) ? "Token-2022" : "SPL Token"}
            </div>

            <button 
                onClick={onList}
                className="mt-auto bg-primary text-primary-foreground font-bold py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors uppercase"
            >
                List Now
            </button>
        </div>
    );
};
