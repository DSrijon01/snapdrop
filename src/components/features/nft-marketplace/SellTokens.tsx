"use client";

import { FC, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { useLaunchpad, TokenListingAccount } from "@/hooks/useLaunchpad";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { BN } from "@coral-xyz/anchor";
import { TokenBadge } from "../../global/wallet/TokenBadge";
import toast from "react-hot-toast";

const SecondaryListingItem = ({ 
    listing, 
    onBuy, 
    onCancel, 
    isBuying, 
    isCanceling, 
    walletAddress 
}: { 
    listing: TokenListingAccount; 
    onBuy: () => void; 
    onCancel: () => void; 
    isBuying: boolean; 
    isCanceling: boolean; 
    walletAddress?: string; 
}) => {
    const { metadata, loading } = useTokenMetadata(listing.account.mint);
    
    const decimals = listing.decimals ?? 9;
    const amount = Number(listing.account.amount) / Math.pow(10, decimals);
    const priceSol = Number(listing.account.price) / 1_000_000_000;
    const isSeller = walletAddress && listing.account.seller.toBase58() === walletAddress;
    const isToken2022 = listing.isToken2022 || metadata?.isToken2022;

    const [displayAmount, setDisplayAmount] = useState<string>("...");
    
    useEffect(() => {
        const amt = Number(listing.account.amount) / Math.pow(10, decimals);
        setDisplayAmount(amt.toLocaleString(undefined, { maximumFractionDigits: 9 }));
    }, [listing, decimals]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-xl transition-all duration-300 flex flex-col"
        >
            <div className="aspect-square w-full bg-muted relative overflow-hidden shrink-0">
                {metadata?.image ? (
                    <img src={metadata.image} alt={metadata.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground animate-pulse">Loading Image...</div>
                )}
                
                <div className="absolute top-3 right-3 z-10 flex gap-2">
                    {isToken2022 ? (
                        <TokenBadge type="TOKEN_2022" />
                    ) : (
                        <TokenBadge type="SPL" />
                    )}
                </div>
            </div>

            <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-foreground text-lg font-display uppercase truncate max-w-[150px]" title={metadata?.name}>{metadata?.name || "Loading..."}</h3>
                        <p className="text-xs font-mono text-muted-foreground">{metadata?.symbol || "..."}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase block">Amount</span>
                        <span className="font-mono font-bold text-foreground">{displayAmount}</span>
                    </div>
                </div>

                {metadata?.extensions && metadata.extensions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {metadata.extensions.map((ext: number) => (
                            <TokenBadge key={ext} type="EXTENSION" extensionType={ext} />
                        ))}
                    </div>
                )}

                <div className="flex justify-between items-end mt-auto pt-4 border-t border-border/50">
                    <div>
                        <div className="text-[10px] text-muted-foreground uppercase">Total Price</div>
                        <div className="font-bold text-lg text-primary">{priceSol.toFixed(4)} SOL</div>
                    </div>
                    
                    <div>
                        {isSeller ? (
                            <button
                                onClick={onCancel}
                                disabled={isCanceling}
                                className="px-4 py-2 bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                            >
                                {isCanceling ? "..." : "Cancel"}
                            </button>
                        ) : (
                            <button
                                onClick={onBuy}
                                disabled={isBuying || !walletAddress}
                                className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                            >
                                {isBuying ? "..." : "Buy Now"}
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="mt-2 text-[9px] text-muted-foreground font-mono truncate text-left">
                    Seller: {listing.account.seller.toBase58().slice(0, 4)}...{listing.account.seller.toBase58().slice(-4)}
                </div>
            </div>
        </motion.div>
    );
};

export const SellTokens: FC = () => {
    const { tokenListings, fetchTokenListings, buyTokenSecondary, cancelTokenSecondary, loading } = useLaunchpad();
    const { publicKey, connected } = useWallet();
    const [searchTerm, setSearchTerm] = useState("");
    const [activeOperationId, setActiveOperationId] = useState<string | null>(null);
    const [operationType, setOperationType] = useState<'buy' | 'cancel' | null>(null);
    const [completedListingIds, setCompletedListingIds] = useState<string[]>([]);

    useEffect(() => {
        fetchTokenListings();
    }, []);

    const handleBuy = async (listing: TokenListingAccount) => {
        if (!connected || !publicKey) {
            toast.error("Connect wallet first!");
            return;
        }
        setActiveOperationId(listing.publicKey.toBase58());
        setOperationType('buy');
        try {
            const tx = await buyTokenSecondary(listing);
            console.log("Secondary Token Bought successfully. TX:", tx);
            
            // Fetch metadata to store in purchase history
            let tokenName = "Unknown Token";
            let tokenSymbol = "UNK";
            let tokenImage = "";
            try {
                const mintInfo = await fetch(`https://api.devnet.solana.com`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        id: 1,
                        method: "getAccountInfo",
                        params: [listing.account.mint.toBase58(), { encoding: "jsonParsed" }]
                    })
                });
                // We'll rely on localstorage saving with basic details
            } catch(e){}

            // Add to localStorage purchases
            const purchaseInfo = {
                mint: listing.account.mint.toBase58(),
                amount: (Number(listing.account.amount) / Math.pow(10, listing.decimals ?? 9)).toLocaleString(),
                price: (Number(listing.account.price) / 1e9).toFixed(4),
                name: "Secondary Purchase",
                symbol: "SEC",
                image: "",
                date: Date.now(),
                signature: tx
            };
            const existing = JSON.parse(localStorage.getItem("street_sync_token_purchases") || "[]");
            localStorage.setItem("street_sync_token_purchases", JSON.stringify([purchaseInfo, ...existing]));

            toast.success(`Purchase successful! TX: ${tx.slice(0, 10)}...${tx.slice(-10)}`);
            setCompletedListingIds(prev => [...prev, listing.publicKey.toBase58()]);
            fetchTokenListings();
        } catch (e: any) {
            console.error("Secondary purchase failed:", e);
            toast.error(`Purchase failed: ${e.message || e}`);
        } finally {
            setActiveOperationId(null);
            setOperationType(null);
        }
    };

    const handleCancel = async (listing: TokenListingAccount) => {
        if (!connected || !publicKey) return;
        setActiveOperationId(listing.publicKey.toBase58());
        setOperationType('cancel');
        try {
            const tx = await cancelTokenSecondary(listing);
            console.log("Secondary listing canceled successfully. TX:", tx);
            toast.success(`Listing canceled successfully! TX: ${tx.slice(0, 10)}...${tx.slice(-10)}`);
            setCompletedListingIds(prev => [...prev, listing.publicKey.toBase58()]);
            fetchTokenListings();
        } catch (e: any) {
            console.error("Cancel failed:", e);
            toast.error(`Cancel failed: ${e.message || e}`);
        } finally {
            setActiveOperationId(null);
            setOperationType(null);
        }
    };

    const filteredListings = tokenListings.filter((listing) => 
        !completedListingIds.includes(listing.publicKey.toBase58()) &&
        (listing.account.mint.toBase58().toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.account.seller.toBase58().toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading && tokenListings.length === 0) {
        return <div className="text-center p-10 text-muted-foreground">Loading active listings...</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between p-4 rounded-2xl border border-border bg-card shadow-md">
                <h2 className="text-2xl font-black font-display uppercase italic">Secondary Token Market</h2>
                
                {/* Search */}
                <div className="relative w-full md:w-80">
                    <input
                        type="text"
                        placeholder="Search mint / seller..."
                        className="w-full bg-muted border border-border rounded-xl py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredListings.length === 0 ? (
                <div className="text-center p-20 text-muted-foreground border border-dashed border-border rounded-3xl">
                    No active secondary token listings available.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredListings.map((listing) => (
                        <SecondaryListingItem
                            key={listing.publicKey.toBase58()}
                            listing={listing}
                            onBuy={() => handleBuy(listing)}
                            onCancel={() => handleCancel(listing)}
                            isBuying={activeOperationId === listing.publicKey.toBase58() && operationType === 'buy'}
                            isCanceling={activeOperationId === listing.publicKey.toBase58() && operationType === 'cancel'}
                            walletAddress={publicKey?.toBase58()}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
