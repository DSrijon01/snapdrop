import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { FC, useEffect, useState, useMemo } from 'react';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Program, AnchorProvider, Idl, BN } from '@coral-xyz/anchor';
import idl from '../../../idl/launchpad.json';
import { useTokenMetadata } from '@/hooks/useTokenMetadata';
import { TokenGenerator } from './TokenGenerator';
import { Token2022Studio } from './Token2022Studio';
import { CreateMarketEvent } from './CreateMarketEvent';
import { ResolveMarketEvent } from './ResolveMarketEvent';
import { NFTStudio } from './NFTStudio';
import { TreasuryNFTs } from './TreasuryNFTs';
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
    const [nfts, setNfts] = useState<TokenAccountInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'tokens' | 'generator' | 'token2022' | 'nftstudio' | 'eplays' | 'eplays-resolve' | 'treasury-nfts'>('tokens');
    
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
                const isNft = t.decimals === 0 && t.amount === BigInt(1);
                return t.amount > 0 && !isNft;
            });

            const nftTokens = allTokens.filter(t => {
                return t.decimals === 0 && t.amount === BigInt(1);
            });
            
            console.log("Filtered Tokens:", filteredTokens);
            setTokens(filteredTokens);
            setNfts(nftTokens);
        } catch (e) {
            console.error("Error fetching tokens", e);
        } finally {
            setLoading(false);
        }
    };

    const handleListToken = async (
        token: TokenAccountInfo,
        launchType: 'curve' | 'fixed' = 'curve',
        pricePerTokenSol?: number,
        launchSupplyTokens?: number
    ) => {
        if (!program || !publicKey) return;

        try {
            const mint = token.mint;
            
            const creatorTokenAccount = getAssociatedTokenAddressSync(
                mint,
                publicKey,
                false,
                token.programId
            );

            if (launchType === 'fixed') {
                const priceSol = pricePerTokenSol || 0.01;
                const pricePerTokenLamports = new BN(priceSol * 1_000_000_000);
                
                const supplyTokens = launchSupplyTokens || (Number(token.amount) / Math.pow(10, token.decimals));
                const totalLaunchSupply = new BN(Math.floor(supplyTokens * Math.pow(10, token.decimals)));

                const [vaultPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("fixed_price_vault"), mint.toBuffer()],
                    program.programId
                );

                const vaultAta = getAssociatedTokenAddressSync(
                    mint,
                    vaultPda,
                    true,
                    token.programId
                );

                console.log("Initializing fixed price vault:", {
                    priceSol,
                    supplyTokens,
                    vaultPda: vaultPda.toBase58(),
                    vaultAta: vaultAta.toBase58(),
                });

                const tx = await program.methods
                    .initializeFixedPriceVault(pricePerTokenLamports, totalLaunchSupply)
                    .accounts({
                        vaultAccount: vaultPda,
                        creator: publicKey,
                        mint: mint,
                        vault: vaultAta,
                        creatorTokenAccount: creatorTokenAccount,
                        tokenProgram: token.programId,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();

                alert(`Fixed-Price Vault Initialized successfully! TX: ${tx}`);
                fetchWalletTokens();
            } else {
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
                fetchWalletTokens();
            }
        } catch (e: any) {
            console.error("Listing failed", e);
            alert(`Listing failed! ${e.message || JSON.stringify(e)}`);
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-3xl font-bold mb-6 text-foreground font-display uppercase italic">Admin Dashboard</h2>
            
            <div className="flex gap-4 mb-8">
                <button 
                    onClick={() => setActiveTab('tokens')}
                    className={`px-6 py-2 rounded-full font-bold uppercase transition-colors ${
                        activeTab === 'tokens' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                >
                    Treasury Tokens
                </button>
                <button 
                    onClick={() => setActiveTab('generator')}
                    className={`px-6 py-2 rounded-full font-bold uppercase transition-colors ${
                        activeTab === 'generator' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                >
                    Token Generator
                </button>
                <button 
                    onClick={() => setActiveTab('treasury-nfts')}
                    className={`px-6 py-2 rounded-full font-bold uppercase transition-colors ${
                        activeTab === 'treasury-nfts' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                >
                    Treasury NFTs
                </button>
                <button 
                    onClick={() => setActiveTab('token2022')}
                    className={`px-6 py-2 rounded-full font-bold uppercase transition-colors ${
                        activeTab === 'token2022' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                >
                    Token-2022 Studio
                </button>
                <button 
                    onClick={() => setActiveTab('nftstudio')}
                    className={`px-6 py-2 rounded-full font-bold uppercase transition-colors ${
                        activeTab === 'nftstudio' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                >
                    NFT Studio
                </button>
                <button 
                    onClick={() => setActiveTab('eplays')}
                    className={`px-6 py-2 rounded-full font-bold uppercase transition-colors ${
                        activeTab === 'eplays' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                >
                    Create E-Plays
                </button>
                <button 
                    onClick={() => setActiveTab('eplays-resolve')}
                    className={`px-6 py-2 rounded-full font-bold uppercase transition-colors ${
                        activeTab === 'eplays-resolve' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                >
                    Resolve E-Plays
                </button>
            </div>

            {activeTab === 'tokens' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading ? (
                       <p>Loading your tokens...</p>
                    ) : tokens.length === 0 ? (
                       <p>No tokens found in this wallet.</p>
                    ) : (
                         tokens.map((token) => (
                             <TokenCard key={token.mint.toBase58()} token={token} onList={(launchType, priceSol, supplyTokens) => handleListToken(token, launchType, priceSol, supplyTokens)} />
                         ))
                    )}
                </div>
            ) : activeTab === 'generator' ? (
                <TokenGenerator onListNow={handleListToken} />
            ) : activeTab === 'token2022' ? (
                <Token2022Studio onListNow={handleListToken} />
            ) : activeTab === 'nftstudio' ? (
                <NFTStudio />
            ) : activeTab === 'eplays' ? (
                <CreateMarketEvent />
            ) : activeTab === 'treasury-nfts' ? (
                <TreasuryNFTs nfts={nfts} />
            ) : (
                <ResolveMarketEvent />
            )}
        </div>
    );
};

const TokenCard: FC<{ 
    token: TokenAccountInfo, 
    onList: (launchType: 'curve' | 'fixed', priceSol?: number, supplyTokens?: number) => void 
}> = ({ token, onList }) => {
    const { metadata, loading } = useTokenMetadata(token.mint);
    const [launchType, setLaunchType] = useState<'curve' | 'fixed'>('curve');
    const [priceSol, setPriceSol] = useState(0.01);
    const maxSupply = Number(token.amount) / Math.pow(10, token.decimals);
    const [supplyTokens, setSupplyTokens] = useState(maxSupply);
    
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
                Balance: {maxSupply.toLocaleString()}
            </div>
             <div className="text-xs text-blue-400">
                {token.programId.equals(TOKEN_2022_PROGRAM_ID) ? "Token-2022" : "SPL Token"}
            </div>

            {/* Launch Config Form */}
            <div className="space-y-3 p-3 bg-muted/40 rounded-lg border border-border/50 text-xs">
                <div>
                    <label className="block text-muted-foreground font-bold mb-1 uppercase tracking-wider">Launch Type</label>
                    <select 
                        value={launchType}
                        onChange={(e) => setLaunchType(e.target.value as any)}
                        className="w-full bg-background border border-border rounded p-1.5 font-bold"
                    >
                        <option value="curve">Bonding Curve (Legacy)</option>
                        <option value="fixed">Fixed-Price Raise (V2)</option>
                    </select>
                </div>

                {launchType === 'fixed' && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                        <div>
                            <label className="block text-muted-foreground font-bold mb-1 uppercase tracking-wider">Price (SOL)</label>
                            <input 
                                type="number"
                                step="0.001"
                                value={priceSol}
                                onChange={(e) => setPriceSol(parseFloat(e.target.value))}
                                className="w-full bg-background border border-border rounded p-1.5 font-mono font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-muted-foreground font-bold mb-1 uppercase tracking-wider">Supply</label>
                            <input 
                                type="number"
                                max={maxSupply}
                                value={supplyTokens}
                                onChange={(e) => setSupplyTokens(parseFloat(e.target.value))}
                                className="w-full bg-background border border-border rounded p-1.5 font-mono font-bold"
                            />
                        </div>
                    </div>
                )}
            </div>

            <button 
                onClick={() => onList(launchType, priceSol, supplyTokens)}
                className="mt-auto bg-primary text-primary-foreground font-bold py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors uppercase"
            >
                List Now
            </button>
        </div>
    );
};
