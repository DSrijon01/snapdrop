"use client";

import { FC, useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useConnection, useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { findListingAddress, findEscrowAddress, PROGRAM_ID, IDL } from "@/utils/program";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { NFT3DViewer } from "./NFT3DViewer";

// Metaplex Imports
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplTokenMetadata, fetchDigitalAsset } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey as toPublicKey } from "@metaplex-foundation/umi";

export const ForSale: FC = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    // State for Real On-Chain Listings
    const [activeListings, setActiveListings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selected3DItem, setSelected3DItem] = useState<any | null>(null);

    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const baseWallet = useWallet(); // For Umi
    const [isBuying, setIsBuying] = useState<number | null>(null);

    // Initialize Umi
    const umi = useMemo(() => {
        return createUmi(connection.rpcEndpoint)
            .use(walletAdapterIdentity(baseWallet))
            .use(mplTokenMetadata());
    }, [connection.rpcEndpoint, baseWallet]);

    // FETCH REAL LISTINGS
    useEffect(() => {
        const fetchListings = async () => {
             setIsLoading(true);
             try {
                // 1. Setup Anchor Provider (Read-Only is fine if wallet not connected, but let's assume connected or read-only provider)
                // If wallet is null, we can't use AnchorProvider standard constructor easily without a mock wallet.
                // For public view, we need a read-only provider.
                const provider = new AnchorProvider(connection, wallet || { publicKey: PublicKey.default, signTransaction: async () => {}, signAllTransactions: async () => {} } as any, {});
                
                
                // Use imported constants
                const program = new Program(IDL as any, provider as any);

                // 2. Fetch ALL Listing Accounts
                console.log("Fetching all street_sync listings...");
                // Cast to any because the IDL type inference is complex without full generation
                const accountClient = (program.account as any).listingAccount;
                const accounts = await accountClient.all();
                console.log(`Found ${accounts.length} listings.`);

                // 3. Resolve Metadata for each listing
                const resolvedItems = await Promise.all(accounts.map(async (acc: any) => {
                    const data = acc.account as any;
                    const mintAddr = data.mint.toBase58();
                    const sellerAddr = data.seller.toBase58();
                    const priceSol = data.price.toNumber() / LAMPORTS_PER_SOL;
                    
                    // Fetch Metadata via Umi
                    let name = "Unknown NFT";
                    let image = "https://placehold.co/400?text=No+Image";
                    let rank = 0;

                    try {
                        const asset = await fetchDigitalAsset(umi, toPublicKey(mintAddr));
                        name = asset.metadata.name;
                        
                        // Fetch JSON URI
                        if (asset.metadata.uri) {
                             const resp = await fetch(asset.metadata.uri);
                             const json = await resp.json();
                             if (json.image) image = json.image;
                        }
                    } catch (err) {
                        console.error(`Failed to fetch metadata for ${mintAddr}`, err);
                    }

                    return {
                        id: mintAddr, // Use Mint as ID
                        mint: mintAddr,
                        seller: sellerAddr,
                        price: priceSol,
                        name: name,
                        image: image,
                        rank: Math.floor(Math.random() * 5000), // Random rank if not in metadata
                        pda: acc.publicKey
                    };
                }));

                setActiveListings(resolvedItems);

             } catch (err) {
                 console.error("Error fetching listings:", err);
             } finally {
                 setIsLoading(false);
             }
        };

        fetchListings();
        
        // Poll every 10 seconds for updates
        const interval = setInterval(fetchListings, 10000);
        return () => clearInterval(interval);

    }, [connection, wallet, umi]);

    // Filter and Sort items
    const filteredItems = activeListings.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        if (sortOrder === 'asc') {
            return a.price - b.price;
        } else {
            return b.price - a.price;
        }
    });

    const handleBuy = async (item: any) => {
        if (!wallet) {
            alert("Please connect your wallet!");
            return;
        }
        setIsBuying(item.id);

        try {
            const mintPubkey = new PublicKey(item.mint);
            const sellerPubkey = new PublicKey(item.seller); 
            
            const provider = new AnchorProvider(connection, wallet, {});
            
            
            // Use imported constants
            const program = new Program(IDL as any, provider as any);

            const [listingPDA] = findListingAddress(mintPubkey, sellerPubkey);
            const [escrowPDA] = findEscrowAddress(mintPubkey, sellerPubkey);
            
            // --- VALIDATION: Check if Listing Exists On-Chain ---
            const listingAccountInfo = await connection.getAccountInfo(listingPDA);
            if (!listingAccountInfo) {
                alert("Error: This listing is no longer available.");
                // Refresh list
                setIsBuying(null);
                return;
            }

            const buyerTokenAccount = await getAssociatedTokenAddress(mintPubkey, wallet.publicKey);
            
            // Check if ATA exists
            const buyerTokenAccountInfo = await connection.getAccountInfo(buyerTokenAccount);
            const preInstructions = [];
            
            if (!buyerTokenAccountInfo) {
                console.log("Creating Buyer ATA...");
                preInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        buyerTokenAccount,
                        wallet.publicKey,
                        mintPubkey
                    )
                );
            }

            const TREASURY_WALLET = new PublicKey("9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu");

            const signature = await program.methods
                .buyNft()
                .accounts({
                    buyer: wallet.publicKey,
                    seller: sellerPubkey,
                    treasury: TREASURY_WALLET,
                    mint: mintPubkey,
                    listingAccount: listingPDA,
                    escrowTokenAccount: escrowPDA,
                    buyerTokenAccount: buyerTokenAccount,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
                })
                .preInstructions(preInstructions)
                .rpc();

            await connection.confirmTransaction(signature, "confirmed");
            
            // --- STATE UPDATE: Add to Purchases (for the buyer) ---
            // We still use localStorage for "My Purchases" history as we don't have an indexer
            const purchaseItem = { ...item, buyer: wallet.publicKey.toBase58(), purchaseDate: Date.now() };
            const existingPurchases = JSON.parse(localStorage.getItem('street_sync_purchases') || '[]');
            localStorage.setItem('street_sync_purchases', JSON.stringify([purchaseItem, ...existingPurchases]));

            // Dispatch event to update Gallery
            window.dispatchEvent(new Event('storage'));

            alert(`Purchase Successful! Signature: ${signature}`);
            
            // Refresh listings
            // fetchListings(); // triggered by interval or re-render

        } catch (error) {
            console.error("Buy failed:", error);
            alert("Purchase failed. See console.");
        } finally {
            setIsBuying(null);
        }
    };

    const toggleSort = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    if (isLoading) {
         return (
             <div className="container mx-auto p-20 flex flex-col items-center justify-center min-h-[40vh] animate-pulse">
                 <div className="w-16 h-16 bg-muted rounded-full mb-4"></div>
                 <h3 className="text-xl font-bold text-muted-foreground font-display">Syncing Blockchain...</h3>
             </div>
         );
    }

    if (activeListings.length === 0) {
        return (
             <div className="container mx-auto p-4 md:p-6 flex flex-col items-center justify-center min-h-[40vh] text-center animate-in fade-in duration-700">
                <div className="bg-muted/30 p-8 rounded-full mb-6">
                    <svg className="w-16 h-16 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <h3 className="text-2xl font-black text-foreground font-display uppercase italic mb-2">No Active Listings</h3>
                <p className="text-muted-foreground max-w-md">
                    Be the first to list an item from your Stream! Listings from all users will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <NFT3DViewer 
                isOpen={!!selected3DItem} 
                onClose={() => setSelected3DItem(null)} 
                item={selected3DItem}
            />

            {/* Header / Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between sticky top-[146px] z-30 bg-background/80 backdrop-blur-xl p-4 rounded-2xl border border-border shadow-xl">
                {/* Search */}
                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search listings..."
                        className="w-full bg-muted border border-border rounded-xl py-3 pl-10 pr-4 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all font-display"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <button 
                        onClick={toggleSort}
                        className="px-4 py-2.5 bg-muted hover:bg-muted/80 border border-border rounded-xl text-sm font-bold text-foreground whitespace-nowrap transition-colors flex items-center gap-2 font-display uppercase tracking-wide"
                    >
                        Price: {sortOrder === 'asc' ? 'Low to High' : 'High to Low'}
                        <svg className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    
                     <div className="h-8 w-px bg-border mx-1" />

                     {/* View Toggles */}
                     <div className="flex bg-muted rounded-xl p-1 border border-border">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                     </div>
                </div>
            </div>

            {/* Grid */}
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'flex flex-col'} gap-6`}>
                {filteredItems.map((item) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-xl transition-all duration-300 ${viewMode === 'list' ? 'flex flex-row items-center h-48' : ''}`}
                    >
                        {/* Image */}
                        <div className={`overflow-hidden relative ${viewMode === 'list' ? 'w-48 h-full aspect-square' : 'aspect-square w-full'}`}>
                            <div className="absolute top-3 left-3 z-10 bg-black/50 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                                <span className="text-[10px] uppercase font-bold text-white tracking-widest">P2P Listing</span>
                            </div>

                            <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                        </div>

                        {/* Info */}
                        <div className={`p-4 ${viewMode === 'list' ? 'flex-1 flex flex-row items-center justify-between' : ''}`}>
                            <div className={viewMode === 'list' ? 'flex flex-col gap-2' : ''}>
                                <div className={`flex justify-between items-start mb-2 ${viewMode === 'list' ? 'flex-col gap-1 items-start' : ''}`}>
                                    <h3 className="font-bold text-foreground text-lg font-display uppercase">{item.name}</h3>
                                    <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-1 rounded border border-border">#{item.rank}</span>
                                </div>
                            </div>
                            
                            <div className={`${viewMode === 'list' ? 'flex flex-col items-end gap-2' : 'mt-4 pt-4 border-t border-border flex items-end justify-between'}`}>
                                <div>
                                    <div className="text-foreground font-bold text-lg flex items-center gap-1">
                                        {item.price} <span className="text-xs text-muted-foreground font-normal">SOL</span>
                                    </div>
                                </div>
                                {
                                    item.seller && wallet && item.seller === wallet.publicKey.toBase58() ? (
                                        <button 
                                            disabled
                                            className="text-xs text-muted-foreground font-bold bg-muted px-2 py-1 rounded border border-border cursor-not-allowed"
                                        >
                                            You Listed This
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleBuy(item)}
                                            disabled={isBuying === item.id}
                                            className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
                                        >
                                            {isBuying === item.id ? "..." : "Buy Now"}
                                        </button>
                                    )
                                }
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
