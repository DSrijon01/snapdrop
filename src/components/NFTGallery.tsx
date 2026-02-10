"use client";

import { useConnection, useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { FC, useEffect, useState, useMemo } from "react";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { fetchAllDigitalAssetByOwner, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey as toPublicKey } from "@metaplex-foundation/umi";
import { motion, AnimatePresence } from "framer-motion";
import { ListingModal } from "./ListingModal";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { IDL, PROGRAM_ID, findListingAddress, findEscrowAddress } from "@/utils/program";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

interface NFT {
    name: string;
    image: string;
    mint?: string;
    uri?: string;
    description?: string;
    json?: {
        name?: string;
        image?: string;
        description?: string;
        symbol?: string;
        attributes?: Array<{ trait_type: string; value: string }>;
    };
    ownerName?: string;
    ownerAddress?: string;
    isListed?: boolean;
    listingPrice?: number;
}

const USER_NAMES = ["CryptoKing", "SolanaSurfer", "NFTHunter", "PixelPioneer", "ChainWizard", "MetaMogul", "BlockBaron", "TokenTitan"];

const generateRandomOwner = () => {
    const name = USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)];
    const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let addr = "";
    for (let i = 0; i < 4; i++) addr += chars.charAt(Math.floor(Math.random() * chars.length));
    addr += "...";
    for (let i = 0; i < 4; i++) addr += chars.charAt(Math.floor(Math.random() * chars.length));
    return { name, addr };
};

// Mock data for display when no NFTs found or for preview
const MOCK_NFTS = [
    { name: "Cosmic Cube #001", image: "https://images.unsplash.com/photo-1614726365206-3532c1c696e9?w=400&h=400&fit=crop", ownerName: "CosmicTraveler", ownerAddress: "Cosm...9x1", mint: "MockMintAddress1" },
    { name: "Neon Genesis", image: "https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?w=400&h=400&fit=crop", ownerName: "NeonKnight", ownerAddress: "Neon...7z2", mint: "MockMintAddress2" },
    { name: "Abstract Thought", image: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=400&fit=crop", ownerName: "AbstractArt", ownerAddress: "Abst...3y8", mint: "MockMintAddress3" },
    { name: "Pixel Punk", image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop", ownerName: "PixelPunk", ownerAddress: "Pixe...1a9", mint: "MockMintAddress4" },
];

interface Props {
    refreshTrigger?: number;
}

export const NFTGallery: FC<Props> = ({ refreshTrigger = 0 }) => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const anchorWallet = useAnchorWallet();
    const [nfts, setNfts] = useState<NFT[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
    const [listingNft, setListingNft] = useState<NFT | null>(null);
    const [delistingId, setDelistingId] = useState<string | null>(null);

    const handleListComplete = (price: number, signature: string) => {
        // In a real app, we'd update the backend state here.
        // For this showcase, we update local View state to reflect the chain change
        if (listingNft && wallet.publicKey) {
            const newItem = {
                id: Date.now(), // Unique ID
                name: listingNft.name || listingNft.json?.name,
                image: listingNft.image || listingNft.json?.image,
                price: price,
                rank: Math.floor(Math.random() * 5000), // Mock rank
                mint: listingNft.mint,
                isListed: true,
                seller: wallet.publicKey.toBase58(), 
                // NO KEYS STORED - SAFE
            };
            
            // We only need to hide it from "Your Stream" locally for immediate feedback.
            // The "For Sale" tab will pick it up from the blockchain automatically.
            
            // Dispatch event to notify components if needed (optional)
            window.dispatchEvent(new Event('storage'));
            
            // Immediately remove from local view to simulate "Moving to Escrow"
            setNfts(prev => prev.filter(n => n.mint !== listingNft.mint));
        }

        console.log(`Listed for ${price} SOL. Signature: ${signature}`);
        setListingNft(null);
        setSelectedNft(null);
    };

    const handleDelist = async (nft: NFT) => {
        if (!anchorWallet || !wallet.publicKey || !nft.mint) return;
        
        // Removed native confirm to improve UX
        // if (!confirm("Are you sure you want to delist this item?")) return;

        setDelistingId(nft.mint);
        try {
            const mintPubkey = new PublicKey(nft.mint);
            
            // Use AnchorProvider with anchorWallet
            const provider = new AnchorProvider(connection, anchorWallet, {});
            const program = new Program(IDL as any, provider as any);
            
            // Use shared utils for PDA derivation
            const [listingPDA] = findListingAddress(mintPubkey, wallet.publicKey);
            const [escrowPDA] = findEscrowAddress(mintPubkey, wallet.publicKey);
            
            const sellerTokenAccount = await getAssociatedTokenAddress(mintPubkey, wallet.publicKey);

            // --- CRITICAL FIX: Ensure Seller ATA exists ---
            const sellerTokenAccountInfo = await connection.getAccountInfo(sellerTokenAccount);
            const preInstructions = [];

            if (!sellerTokenAccountInfo) {
                console.log("Seller ATA missing. Recreating...");
                // Import this at top if missing: import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";
                preInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        sellerTokenAccount,
                        wallet.publicKey,
                        mintPubkey
                    )
                );
            }

             console.log("Canceling listing for:", {
                mint: mintPubkey.toBase58(),
                seller: wallet.publicKey.toBase58(),
                listingPDA: listingPDA.toBase58(),
                escrowPDA: escrowPDA.toBase58(),
                sellerTokenAccount: sellerTokenAccount.toBase58()
             });

             const signature = await program.methods
                .cancelListing()
                .accounts({
                    seller: wallet.publicKey,
                    mint: mintPubkey,
                    listingAccount: listingPDA,
                    escrowTokenAccount: escrowPDA,
                    sellerTokenAccount: sellerTokenAccount,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .preInstructions(preInstructions)
                .rpc();
            
            console.log("Cancel signature:", signature);
            await connection.confirmTransaction(signature, "confirmed");
            alert("Delisted successfully (Listing Cancelled)!");
            
            // Refresh
            window.dispatchEvent(new Event('storage')); // Trigger refresh
            // Manually update local state
            setNfts(prev => prev.filter(n => n.mint !== nft.mint)); // Remove from listed view (it will reappear in owned view on refresh)

        } catch (e: any) {
            console.error("Delist failed detailed:", e);
            if (e.logs) {
                console.error("Program Logs:", e.logs);
            }
            alert(`Failed to delist: ${e.message || "Unknown error"}. Check console for details.`);
        } finally {
            setDelistingId(null);
        }
    };

    // ... (Initialize Umi) ...
    const umi = useMemo(() => {
        return createUmi(connection.rpcEndpoint)
            .use(walletAdapterIdentity(wallet))
            .use(mplTokenMetadata());
    }, [connection.rpcEndpoint, wallet]);

    useEffect(() => {
        if (!wallet.publicKey) {
            setNfts([]);
            return;
        }

        const fetchNFTs = async () => {
            setLoading(true);
            try {
                // Force a small delay
                await new Promise(r => setTimeout(r, 2000));
                
                const owner = toPublicKey(wallet.publicKey!.toBase58());
                
                // 1. Fetch Items in Wallet
                const assets = await fetchAllDigitalAssetByOwner(umi, owner);
                const walletNfts = await Promise.all(assets.map(async (asset: any) => {
                    let json = undefined;
                    if (asset.metadata.uri) {
                         try {
                             const response = await fetch(asset.metadata.uri);
                             json = await response.json();
                         } catch (unknownError) { console.error("Failed to load metadata json", unknownError); }
                    }
                    return {
                        name: asset.metadata.name,
                        uri: asset.metadata.uri,
                        mint: asset.publicKey,
                        image: json?.image || "",
                        description: json?.description || "",
                        json,
                        ownerName: "Me",
                        ownerAddress: wallet.publicKey!.toBase58(),
                        isListed: false
                    } as NFT;
                }));

                // 2. Fetch "My Listings" (Items in Escrow)
                const provider = new AnchorProvider(connection, wallet as any, {});
                const program = new Program(IDL as any, provider as any);
                
                // Fetch all listings
                 const accountClient = (program.account as any).listingAccount;
                 const allListings = await accountClient.all([
                    {
                        memcmp: {
                            offset: 8, // Discriminator
                            bytes: wallet.publicKey!.toBase58() // Seller is first field
                        }
                    }
                 ]);
                 
                 const listedNfts = await Promise.all(allListings.map(async (acc: any) => {
                    const data = acc.account;
                    const mintAddr = data.mint.toBase58();
                    // Fetch metadata for mint
                    try {
                        const asset = await import("@metaplex-foundation/mpl-token-metadata").then(m => m.fetchDigitalAsset(umi, toPublicKey(mintAddr)));
                        let json = undefined;
                        if (asset.metadata.uri) {
                             const r = await fetch(asset.metadata.uri);
                             json = await r.json();
                        }
                        return {
                            name: asset.metadata.name,
                            image: json?.image || "",
                            mint: mintAddr,
                            description: json?.description,
                            json,
                            ownerName: "Me (Listed)",
                            ownerAddress: "Escrow",
                            isListed: true,
                            listingPrice: data.price.toNumber() / 1000000000
                        } as NFT;
                    } catch (e) {
                        return null;
                    }
                 }));

                const validListedNfts = listedNfts.filter(n => n !== null) as NFT[];
                
                // Combine
                let availableNfts = [...validListedNfts, ...walletNfts];

                // --- LEGACY LOCAL STORAGE REMOVED ---
                // We now rely purely on on-chain data.
                // If you bought an item, it is transferred to your wallet.
                // 'fetchAllDigitalAssetByOwner' will pick it up automatically in the next fetch cycle.

                setNfts(availableNfts);
            } catch (error) {
                console.error("Error fetching NFTs:", error);
                // Fallback to mock for demo if fetch fails
                setNfts([]); 
            } finally {
                setLoading(false);
            }
        };

        fetchNFTs();
    }, [wallet.publicKey, umi, refreshTrigger]);

    if (!wallet.publicKey) return (
        <div className="text-center text-muted-foreground py-10 italic">
            Connect wallet to view your Street Sync stream.
        </div>
    );

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-lg" />
                ))
            ) : nfts.length > 0 ? (
                nfts.map((nft, i) => (
                    <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group relative aspect-square overflow-hidden rounded-xl bg-card border border-border hover:border-primary/50 transition-all cursor-pointer shadow-lg hover:shadow-primary/20"
                        onClick={() => setSelectedNft(nft)}
                    >
                        <img 
                            src={nft.json?.image || nft.image || "https://placehold.co/400x400/121212/pink?text=NFT"} 
                            alt={nft.name || nft.json?.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                        {/* Content */}
                        <div className="absolute inset-0 p-4 flex flex-col justify-end translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <h4 className="text-white font-bold truncate text-lg mb-1 drop-shadow-md font-display">{nft.name || nft.json?.name || `NFT #${i}`}</h4>
                            
                            {/* Attribute Badge */}
                            {nft.json?.attributes && (
                                <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                                    <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-gray-300 border border-white/5">
                                        {nft.json.attributes.length} Attributes
                                    </span>
                                </div>
                            )}

                            {/* Owner Info */}
                            <div className="flex items-center gap-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                                    {nft.ownerName?.[0] || "U"}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-white font-semibold leading-none">{nft.ownerName || "Unknown"}</span>
                                    <span className="text-[10px] text-gray-400 font-mono font-bold leading-none tracking-tight">{nft.ownerAddress || "Wallet"}</span>
                                </div>
                            </div>

                            <button className="w-full py-2 bg-gradient-to-r from-primary to-primary/80 rounded-lg text-primary-foreground text-xs font-bold uppercase tracking-wider transform scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all shadow-lg shadow-primary/20">
                                See Details
                            </button>
                        </div>
                    </motion.div>
                ))
            ) : (
                // Empty State / Mock Stream
                <>
                    <div className="col-span-full mb-4 p-6 rounded-2xl bg-card/80 border border-border flex flex-col items-start gap-2 shadow-lg">
                        <h4 className="text-xl font-black text-foreground tracking-tight uppercase italic font-display">Your Collection</h4>
                        <p className="text-sm text-muted-foreground font-light">
                            You don&apos;t have any NFTs yet. Mint one to start your collection. Here is a <span className="text-primary font-bold">preview</span>.
                        </p>
                    </div>

                    {MOCK_NFTS.map((nft, i) => (
                        <div key={`mock-${i}`} className="group relative aspect-square overflow-hidden rounded-2xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-[0_0_20px_rgba(var(--primary),0.15)]">
                            <img 
                                src={nft.image} 
                                alt={nft.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 grayscale group-hover:grayscale-0"
                            />
                            
                            {/* Owner Info Mock */}
                            <div className="flex items-center gap-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 absolute bottom-2 left-2 z-10 w-[calc(100%-16px)]">
                                <div className="bg-black/80 backdrop-blur-md p-2 rounded-xl border border-white/10 flex items-center gap-2 w-full">
                                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                                        {(nft as any).ownerName?.[0] || "U"}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-white font-bold leading-none">{(nft as any).ownerName || "Unknown"}</span>
                                        <span className="text-[10px] text-gray-400 font-mono font-bold leading-none tracking-tight">{(nft as any).ownerAddress || "Wallet"}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                        </div>
                    ))}
                </>
            )}


            {/* Details Modal */}
            <AnimatePresence>
                {selectedNft && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setSelectedNft(null)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-card border border-border rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-2xl"
                        >
                            <button 
                                onClick={() => setSelectedNft(null)}
                                className="absolute top-4 right-4 z-10 p-2 bg-background/50 hover:bg-foreground/10 rounded-full text-foreground transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>

                            {/* Image Section */}
                            <div className="w-full md:w-1/2 bg-gray-100 aspect-square md:aspect-auto relative group">
                                <img 
                                    src={selectedNft.json?.image || selectedNft.image} 
                                    alt={selectedNft.name}
                                    className="w-full h-full object-contain"
                                />
                            </div>

                             <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto bg-card custom-scrollbar">
                                <div className="flex items-center gap-2 mb-2">
                                     <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 uppercase tracking-wider">
                                        Verified Collection
                                    </div>
                                    {selectedNft.json?.symbol && (
                                        <span className="text-muted-foreground text-xs font-mono font-bold tracking-tight">{selectedNft.json.symbol}</span>
                                    )}
                                </div>
                               
                                <h2 className="text-3xl font-black text-foreground mb-4 leading-tight font-display uppercase tracking-tight">{selectedNft.name || selectedNft.json?.name}</h2>
                                
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                                            Description
                                        </h3>
                                        <p className="text-foreground leading-relaxed text-sm bg-muted p-4 rounded-xl border border-border">
                                            {selectedNft.description || selectedNft.json?.description || "No description provided."}
                                        </p>
                                    </div>

                                    {selectedNft.json?.attributes && (
                                        <div>
                                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                                                Attributes <span className="text-foreground">({selectedNft.json.attributes.length})</span>
                                            </h3>
                                            <div className="grid grid-cols-2 gap-2">
                                                {selectedNft.json.attributes.map((attr, idx) => (
                                                    <div key={idx} className="p-3 bg-muted rounded-lg border border-border hover:border-muted-foreground/30 transition-colors group">
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 group-hover:text-foreground transition-colors">{attr.trait_type}</p>
                                                        <p className="text-sm text-foreground font-bold truncate" title={attr.value}>{attr.value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Action Buttons */}
                                    <div className="pt-4 flex flex-col gap-3">
                                        <div className="flex gap-3">
                                            <a 
                                                href={`https://solscan.io/token/${selectedNft.mint || ''}?cluster=devnet`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="flex-1 py-3 rounded-xl bg-muted border border-border text-foreground font-bold text-center text-sm hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <span>View on Solscan</span>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                            </a>
                                            
                                            {/* List Button (Scope A: Only if owner - simulated check for now as we are the owner of what we fetch) */}
                                            {/* Logic: fetchAllDigitalAssetByOwner fetches OUR assets, so we are always the owner */}
                                            {/* List or Delist Button */}
                                            {selectedNft.isListed ? (
                                                <div className="flex-1 flex flex-col gap-1">
                                                     <button 
                                                        onClick={() => handleDelist(selectedNft)}
                                                        disabled={!!delistingId}
                                                        className="w-full py-3 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-bold text-sm uppercase tracking-wide shadow-lg shadow-destructive/20 transition-all disabled:opacity-50"
                                                    >
                                                        {delistingId === selectedNft.mint ? "Delisting..." : "Delist Item"}
                                                    </button>
                                                    <p className="text-[10px] text-center text-muted-foreground font-bold">
                                                        *Gas fees only
                                                    </p>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => setListingNft(selectedNft)}
                                                    className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-sm uppercase tracking-wide shadow-lg shadow-primary/20 transition-all"
                                                >
                                                    List for Sale
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Listing Modal */}
            {listingNft && (
                <ListingModal 
                    isOpen={!!listingNft} 
                    onClose={() => setListingNft(null)} 
                    nft={listingNft}
                    onListComplete={handleListComplete}
                />
            )}
        </div>
    );
};
