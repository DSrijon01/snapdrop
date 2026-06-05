"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { FC, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { motion, AnimatePresence } from "framer-motion";
import { TokenListingModal } from "./TokenListingModal";

type TokenAccountInfo = {
    mint: PublicKey;
    amount: bigint;
    decimals: number;
    programId: PublicKey;
};

interface Props {
    refreshTrigger?: number;
}

// Global in-memory cache for user's token balances to prevent redundant RPC fetches on tab switch
const walletTokensCache: Record<string, TokenAccountInfo[]> = {};

export const TokensGallery: FC<Props> = ({ refreshTrigger = 0 }) => {
    const { connection } = useConnection();
    const { publicKey, connected } = useWallet();
    const [tokens, setTokens] = useState<TokenAccountInfo[]>(publicKey ? (walletTokensCache[publicKey.toBase58()] || []) : []);
    const [loading, setLoading] = useState(publicKey ? !walletTokensCache[publicKey.toBase58()] : false);
    const [selectedTokenForListing, setSelectedTokenForListing] = useState<TokenAccountInfo | null>(null);

    useEffect(() => {
        if (connected && publicKey) {
            fetchWalletTokens();
        } else {
            setTokens([]);
        }
    }, [publicKey, connected, refreshTrigger]);

    const fetchWalletTokens = async () => {
        if (!publicKey) return;
        const walletKey = publicKey.toBase58();
        if (!walletTokensCache[walletKey]) {
            setLoading(true);
        }
        try {
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
                programId: TOKEN_PROGRAM_ID,
            });

            const token2022Accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
                programId: TOKEN_2022_PROGRAM_ID,
            });

            const allTokens = [
                ...tokenAccounts.value,
                ...token2022Accounts.value
            ].map(item => ({
                mint: new PublicKey(item.account.data.parsed.info.mint),
                amount: BigInt(item.account.data.parsed.info.tokenAmount.amount),
                decimals: item.account.data.parsed.info.tokenAmount.decimals,
                programId: item.account.owner,
            }));

            // Filter for actual fungible tokens (ignore NFTs/SFTs which have decimals = 0)
            const filteredTokens = allTokens.filter(t => {
                return t.amount > 0 && t.decimals > 0;
            });

            setTokens(filteredTokens);
            walletTokensCache[walletKey] = filteredTokens;
        } catch (e) {
            console.error("Error fetching tokens", e);
            if (!walletTokensCache[walletKey]) {
                setTokens([]);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!connected || !publicKey) {
        return (
            <div className="text-center text-muted-foreground py-10 italic">
                Connect wallet to view your token portfolio.
            </div>
        );
    }

    return (
        <div className="space-y-8 p-1 sm:p-2">
            <div>
                <h4 className="text-lg font-black text-foreground uppercase tracking-tight font-display mb-4">
                    Your Token Balances
                </h4>
                
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-32 bg-white/5 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : tokens.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {tokens.map((token) => (
                            <TokenRow 
                                key={token.mint.toBase58()} 
                                token={token} 
                                onListForSale={() => setSelectedTokenForListing(token)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-10 italic bg-card/40 rounded-2xl border border-border">
                        No fungible tokens found in your wallet.
                    </div>
                )}
            </div>



            {/* Token Listing Modal */}
            <AnimatePresence>
                {selectedTokenForListing && (
                    <TokenListingModal 
                        isOpen={!!selectedTokenForListing}
                        onClose={() => setSelectedTokenForListing(null)}
                        token={selectedTokenForListing}
                        onListComplete={() => {
                            fetchWalletTokens();
                            setSelectedTokenForListing(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const TokenRow: FC<{ token: TokenAccountInfo; onListForSale: () => void }> = ({ token, onListForSale }) => {
    const { metadata, loading } = useTokenMetadata(token.mint);
    const balance = Number(token.amount) / Math.pow(10, token.decimals);

    return (
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between gap-4 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3">
                {loading ? (
                    <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                ) : metadata?.image ? (
                    <img 
                        src={metadata.image} 
                        alt={metadata.name} 
                        className="w-10 h-10 rounded-full object-cover bg-muted border border-border" 
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/400?text=No+Image";
                        }}
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-mono">
                        No Img
                    </div>
                )}
                <div className="overflow-hidden">
                    <h5 className="font-bold text-foreground truncate font-display uppercase tracking-tight">
                        {loading ? "Loading..." : metadata?.name || "Unknown Token"}
                    </h5>
                    <p className="text-xs font-mono text-muted-foreground">
                        {loading ? "..." : metadata?.symbol || "UNK"}
                    </p>
                </div>
            </div>

            <div className="flex justify-between items-end border-t border-border/50 pt-3 mt-1">
                <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-display tracking-wider">Balance</span>
                    <span className="font-mono font-bold text-foreground text-sm">
                        {balance.toLocaleString(undefined, { maximumFractionDigits: token.decimals })}
                    </span>
                </div>
                <div className="text-right">
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase inline-block border bg-muted/40 text-muted-foreground border-border mb-2">
                        {token.programId.equals(TOKEN_2022_PROGRAM_ID) ? "Token-2022" : "SPL"}
                    </span>
                    <button 
                        onClick={onListForSale}
                        className="block text-xs bg-primary hover:bg-primary/95 text-primary-foreground font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all shadow-sm shadow-primary/10"
                    >
                        List For Sale
                    </button>
                </div>
            </div>
        </div>
    );
};
