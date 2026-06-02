"use client";

import { FC, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { useLaunchpad, TokenListingAccount } from "@/hooks/useLaunchpad";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { BN } from "@coral-xyz/anchor";
import { TokenBadge } from "../../global/wallet/TokenBadge";
import toast from "react-hot-toast";
import { PublicKey } from "@solana/web3.js";

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

const PurchaseHistoryItem = ({ history }: { history: any }) => {
    const mintPubkey = new PublicKey(history.mint);
    const { metadata, loading } = useTokenMetadata(mintPubkey);

    const name = metadata?.name || history.name || "Unknown Token";
    const symbol = metadata?.symbol || history.symbol || "UNK";
    const image = metadata?.image || history.image || "";
    const isSell = history.type === "SELL";

    return (
        <div className="bg-background/40 hover:bg-background/80 border border-border/60 hover:border-primary/20 p-4 rounded-2xl flex gap-3 transition-all duration-300 group text-left">
            {loading ? (
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse shrink-0" />
            ) : image ? (
                <img src={image} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0 bg-muted border border-border" />
            ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-mono shrink-0">
                    No Img
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="truncate">
                        <h5 className="font-bold text-foreground truncate text-sm font-display uppercase tracking-tight">
                            {loading ? "Loading..." : name}
                        </h5>
                        <p className="text-[10px] font-mono text-muted-foreground">
                            {loading ? "..." : symbol}
                        </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isSell 
                            ? "text-red-400 bg-red-500/10 border border-red-500/20" 
                            : "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                    }`}>
                        {isSell ? "SELL" : "BUY"}
                    </span>
                </div>
                
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/30 text-xs">
                    <div>
                        <span className="text-[9px] text-muted-foreground block uppercase">Amount</span>
                        <span className="font-mono font-bold text-foreground">{history.amount}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-[9px] text-muted-foreground block uppercase">
                            {isSell ? "Listed" : "Paid"}
                        </span>
                        <span className={`font-bold ${isSell ? "text-red-400" : "text-primary"}`}>{history.price} SOL</span>
                    </div>
                </div>

                <div className="flex justify-between items-center mt-2 text-[10px] text-muted-foreground">
                    <span>{new Date(history.date).toLocaleTimeString()}</span>
                    <a 
                        href={`https://solscan.io/tx/${history.signature}?cluster=devnet`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline flex items-center gap-1 group-hover:text-blue-300 transition-colors"
                    >
                        <span>Solscan</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                </div>
            </div>
        </div>
    );
};

export const SellTokens: FC = () => {
    const { tokenListings, fetchTokenListings, buyTokenSecondary, cancelTokenSecondary, loading } = useLaunchpad();
    const { publicKey, connected } = useWallet();
    const [searchTerm, setSearchTerm] = useState("");
    const [activeOperationId, setActiveOperationId] = useState<string | null>(null);
    const [operationType, setOperationType] = useState<'buy' | 'cancel' | null>(null);
    const [completedListingIds, setCompletedListingIds] = useState<string[]>([]);
    const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const loadPurchaseHistory = () => {
        try {
            const stored = localStorage.getItem("street_sync_token_purchases");
            if (stored) {
                setPurchaseHistory(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to load purchase history", e);
        }
    };

    useEffect(() => {
        fetchTokenListings();
        loadPurchaseHistory();

        const handleUpdate = () => {
            loadPurchaseHistory();
        };
        window.addEventListener("token_purchases_updated", handleUpdate);
        return () => {
            window.removeEventListener("token_purchases_updated", handleUpdate);
        };
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

            // Dispatch global event for instant UI updates
            window.dispatchEvent(new Event("token_purchases_updated"));

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
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
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
                    {/* Toggle Sidebar Button */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all uppercase tracking-wide w-full sm:w-auto justify-center ${
                            isSidebarOpen 
                                ? 'bg-primary/10 border-primary/30 text-primary' 
                                : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        {isSidebarOpen ? "Hide Live Feed" : "Show Live Feed"}
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
                {/* Main Content Area */}
                <div className="flex-1 w-full">
                    {filteredListings.length === 0 ? (
                        <div className="text-center p-20 text-muted-foreground border border-dashed border-border rounded-3xl">
                            No active secondary token listings available.
                        </div>
                    ) : (
                        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSidebarOpen ? 'xl:grid-cols-3' : 'lg:grid-cols-4'} gap-6`}>
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

                {/* Sidebar - Recent Activity */}
                <AnimatePresence initial={false}>
                    {isSidebarOpen && (
                        <motion.div
                            initial={{ opacity: 0, x: 50, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 50, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="w-full lg:w-96 shrink-0 bg-card border border-border rounded-3xl p-6 shadow-xl sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3 shrink-0">
                                <h3 className="text-lg font-black font-display uppercase tracking-tight flex items-center gap-2">
                                    <span className="w-1.5 h-5 bg-primary rounded-full animate-pulse"/>
                                    Live Market Feed
                                </h3>
                                <button 
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-lg transition-colors"
                                    title="Close Feed"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {purchaseHistory.length > 0 ? (
                                <div className="overflow-y-auto pr-1 space-y-4 flex-1 custom-scrollbar">
                                    {purchaseHistory.map((history, i) => (
                                        <PurchaseHistoryItem key={i} history={history} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground italic text-sm">
                                    <svg className="w-12 h-12 text-muted-foreground/30 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                    No live activity recorded yet.
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
