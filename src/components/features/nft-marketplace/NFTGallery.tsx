"use client";

import { useConnection, useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { FC, useEffect, useState, useMemo } from "react";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { fetchAllDigitalAssetByOwner, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey as toPublicKey } from "@metaplex-foundation/umi";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ListingModal } from "./ListingModal";
import { NFT3DViewer } from "./NFT3DViewer";
import { Box, ShieldCheck, Check, Copy, ExternalLink, X, ArrowUpRight, Sparkles } from "lucide-react";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { withSolanaRetry, createConfirmedProvider } from "@/utils/solanaRetry";
import { IDL, PROGRAM_ID, findListingAddress, findEscrowAddress } from "@/utils/program";
import { PublicKey, SystemProgram, ComputeBudgetProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { getTokenMetadataWithCache } from "@/hooks/useTokenMetadata";
import { resolveNftImageUrl, getFallbackImage, handleImageFallback, fetchJsonWithGatewayFailover } from "@/utils/nftImageResolver";
import { resumePendingTransactions } from "@/utils/pendingTransactions";

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
    { name: "Cosmic Cube #001", image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&h=400&fit=crop", ownerName: "CosmicTraveler", ownerAddress: "Cosm...9x1", mint: "MockMintAddress1" },
    { name: "Neon Genesis", image: "https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?w=400&h=400&fit=crop", ownerName: "NeonKnight", ownerAddress: "Neon...7z2", mint: "MockMintAddress2" },
    { name: "Abstract Thought", image: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=400&fit=crop", ownerName: "AbstractArt", ownerAddress: "Abst...3y8", mint: "MockMintAddress3" },
    { name: "Pixel Punk", image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop", ownerName: "PixelPunk", ownerAddress: "Pixe...1a9", mint: "MockMintAddress4" },
];

// Global in-memory cache for user's wallet NFTs to prevent redundant RPC fetches on tab switch
const walletNftsCache: Record<string, NFT[]> = {};

interface Props {
    refreshTrigger?: number;
}

export const NFTGallery: FC<Props> = ({ refreshTrigger = 0 }) => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const anchorWallet = useAnchorWallet();
    const [nfts, setNfts] = useState<NFT[]>(wallet.publicKey ? (walletNftsCache[wallet.publicKey.toBase58()] || []) : []);
    const [loading, setLoading] = useState(wallet.publicKey ? !walletNftsCache[wallet.publicKey.toBase58()] : false);
    const [selectedNft, setSelectedNft] = useState<NFT | null>(null);
    const [viewer3DNft, setViewer3DNft] = useState<any | null>(null);
    const [listingNft, setListingNft] = useState<NFT | null>(null);
    const [delistingId, setDelistingId] = useState<string | null>(null);
    const [copiedMint, setCopiedMint] = useState(false);

    const handleCopyMint = (mint: string) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(mint);
            setCopiedMint(true);
            setTimeout(() => setCopiedMint(false), 2000);
        }
    };

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
            
            // Use Confirmed AnchorProvider with anchorWallet
            const provider = createConfirmedProvider(connection, anchorWallet);
            const program = new Program(IDL as any, provider as any);
            
            // Use shared utils for PDA derivation
            const [listingPDA] = findListingAddress(mintPubkey, wallet.publicKey);
            const [escrowPDA] = findEscrowAddress(mintPubkey, wallet.publicKey);
            
            const sellerTokenAccount = await getAssociatedTokenAddress(mintPubkey, wallet.publicKey);

            // --- CRITICAL FIX: Ensure Seller ATA exists ---
            const sellerTokenAccountInfo = await connection.getAccountInfo(sellerTokenAccount);
            const preInstructions: any[] = [
                ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
            ];

            if (!sellerTokenAccountInfo) {
                console.log("Seller ATA missing. Recreating...");
                // Import this at top if missing: import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";
                preInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        anchorWallet.publicKey,
                        sellerTokenAccount,
                        anchorWallet.publicKey,
                        mintPubkey
                    )
                );
            }

             console.log("Canceling listing for:", {
                mint: mintPubkey.toBase58(),
                seller: anchorWallet.publicKey.toBase58(),
                listingPDA: listingPDA.toBase58(),
                escrowPDA: escrowPDA.toBase58(),
                sellerTokenAccount: sellerTokenAccount.toBase58()
             });

             const signature = await withSolanaRetry(async () => {
                return await program.methods
                    .cancelListing()
                    .accounts({
                        seller: anchorWallet.publicKey,
                        mint: mintPubkey,
                        listingAccount: listingPDA,
                        escrowTokenAccount: escrowPDA,
                        sellerTokenAccount: sellerTokenAccount,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                    })
                    .preInstructions(preInstructions)
                    .rpc({ skipPreflight: true });
             });
            
            console.log("Cancel signature:", signature);
            alert("Delisted successfully (Listing Cancelled)!");
            
            // Refresh
            window.dispatchEvent(new Event('storage')); // Trigger refresh
            window.dispatchEvent(new Event('nft_listings_updated')); // Trigger marketplace refresh
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
            if (!wallet.publicKey) return;
            const walletKey = wallet.publicKey.toBase58();
            if (!walletNftsCache[walletKey]) {
                setLoading(true);
            }
            try {
                const owner = toPublicKey(walletKey);
                
                // 1. Fetch Items in Wallet
                const assets = await fetchAllDigitalAssetByOwner(umi, owner);
                // Filter to ensure we only process assets with 0 decimals (actual NFTs / SFTs)
                const nftAssets = assets.filter((asset: any) => asset.mint.decimals === 0);
                const walletNfts = await Promise.all(nftAssets.map(async (asset: any) => {
                    let json = undefined;
                    const cleanName = (asset.metadata.name || "").replace(/\0/g, "").trim();
                    if (asset.metadata.uri) {
                         try {
                             json = await fetchJsonWithGatewayFailover(asset.metadata.uri);
                         } catch (unknownError) { console.error("Failed to load metadata json", unknownError); }
                    }
                    const rawImg = json?.image || "";
                    const resolvedImg = resolveNftImageUrl(rawImg, cleanName || "NFT");
                    return {
                        name: cleanName || "NFT",
                        uri: asset.metadata.uri,
                        mint: asset.publicKey,
                        image: resolvedImg,
                        description: json?.description || "",
                        json: {
                            ...json,
                            name: cleanName || json?.name || "NFT",
                            image: resolvedImg,
                        },
                        ownerName: "Me",
                        ownerAddress: walletKey,
                        isListed: false
                    } as NFT;
                }));

                // 2. Fetch "My Listings" (Items in Escrow)
                const provider = createConfirmedProvider(connection, wallet as any);
                const program = new Program(IDL as any, provider as any);
                
                // Fetch all listings
                 const accountClient = (program.account as any).listingAccount;
                 const allListings = await accountClient.all([
                    {
                        memcmp: {
                            offset: 8, // Discriminator
                            bytes: walletKey // Seller is first field
                        }
                    }
                 ]);
                 
                 const listedNfts = await Promise.all(allListings.map(async (acc: any) => {
                    const data = acc.account;
                    const mintAddr = data.mint.toBase58();
                    // Fetch metadata for mint
                    try {
                        const meta = await getTokenMetadataWithCache(new PublicKey(mintAddr), connection, umi);
                        if (!meta) return null;
                        const cleanName = (meta.name || "").replace(/\0/g, "").trim();
                        const resolvedImg = resolveNftImageUrl(meta.image, cleanName || "Listed NFT");
                        return {
                            name: cleanName || "NFT",
                            image: resolvedImg,
                            mint: mintAddr,
                            description: meta.description,
                            json: {
                                name: cleanName || "NFT",
                                image: resolvedImg,
                                description: meta.description,
                                symbol: meta.symbol
                            },
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

                // Optimistically include recently listed NFTs by this user from localStorage
                try {
                    const localUserListings = JSON.parse(localStorage.getItem('street_sync_user_listings') || '[]');
                    for (const ul of localUserListings) {
                        if (ul.seller === walletKey && !availableNfts.some(n => n.mint === ul.mint)) {
                            availableNfts.unshift({
                                name: ul.name,
                                image: ul.image,
                                mint: ul.mint,
                                uri: "",
                                json: { name: ul.name, image: ul.image },
                                ownerName: "Me (Listed)",
                                ownerAddress: "Escrow",
                                isListed: true,
                                listingPrice: ul.price,
                            } as NFT);
                        }
                    }
                } catch (e) {}

                setNfts(availableNfts);
                walletNftsCache[walletKey] = availableNfts;
            } catch (error) {
                console.error("Error fetching NFTs:", error);
                // Fallback to empty if we don't have cache
                if (!walletNftsCache[walletKey]) {
                    setNfts([]);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchNFTs();

        const handleUpdate = () => {
            if (wallet.publicKey) {
                delete walletNftsCache[wallet.publicKey.toBase58()];
                fetchNFTs();
            }
        };

        window.addEventListener('nft_listings_updated', handleUpdate);
        window.addEventListener('nft_purchases_updated', handleUpdate);
        window.addEventListener('storage', handleUpdate);
        return () => {
            window.removeEventListener('nft_listings_updated', handleUpdate);
            window.removeEventListener('nft_purchases_updated', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, [wallet.publicKey, umi, refreshTrigger]);

    // Universal mobile deeplink resumption for NFT transactions
    useEffect(() => {
        const handleResumption = async () => {
            const resumed = await resumePendingTransactions(connection);
            if (resumed && wallet.publicKey) {
                delete walletNftsCache[wallet.publicKey.toBase58()];
                window.dispatchEvent(new Event('nft_purchases_updated'));
            }
        };

        handleResumption();
        window.addEventListener("phantom_mobile_tx_signed", handleResumption);
        window.addEventListener("phantom_mobile_tx_sent", handleResumption);
        window.addEventListener("phantom_mobile_signed", handleResumption);
        return () => {
            window.removeEventListener("phantom_mobile_tx_signed", handleResumption);
            window.removeEventListener("phantom_mobile_tx_sent", handleResumption);
            window.removeEventListener("phantom_mobile_signed", handleResumption);
        };
    }, [connection, wallet.publicKey]);

    // Render preview cards if wallet not connected or no NFTs minted yet
    const isDisconnected = !wallet.publicKey;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 p-1 sm:p-2">
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
                        {/* 3D View Button */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setViewer3DNft({
                                    name: nft.name || nft.json?.name || "NFT",
                                    image: resolveNftImageUrl(nft.json?.image || nft.image, nft.name || "NFT"),
                                    mint: nft.mint,
                                    description: nft.description || nft.json?.description,
                                    attributes: nft.json?.attributes,
                                    price: nft.listingPrice,
                                });
                            }}
                            className="absolute top-2.5 right-2.5 z-20 px-2 py-1 bg-black/60 hover:bg-primary text-white hover:text-primary-foreground backdrop-blur-md border border-white/15 hover:border-primary/50 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 transition-all shadow-md group/btn"
                            title="View in 3D"
                            aria-label="View in 3D"
                        >
                            <Box size={11} className="text-primary group-hover/btn:text-primary-foreground transition-colors" />
                            <span>3D</span>
                        </button>

                        <img 
                            src={resolveNftImageUrl(nft.json?.image || nft.image, nft.name || "NFT")} 
                            alt={nft.name || nft.json?.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            onError={(e) => {
                                handleImageFallback(e, nft.name || nft.json?.name || "NFT");
                            }}
                        />
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                        {/* Content */}
                        <div className="absolute inset-0 p-2.5 flex flex-col justify-end">
                            <h4 className="text-white font-bold truncate text-xs sm:text-sm drop-shadow-md font-display mb-1">{nft.name || nft.json?.name || `NFT #${i}`}</h4>
                            
                            {/* Attribute Badge */}
                            {nft.json?.attributes && (
                                <div className="mb-1.5 hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                                    <span className="bg-white/10 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold text-gray-300 border border-white/5">
                                        {nft.json.attributes.length} Attrs
                                    </span>
                                </div>
                            )}

                            {/* Owner Info */}
                            <div className="hidden sm:flex items-center gap-1.5 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground">
                                    {nft.ownerName?.[0] || "U"}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-white font-semibold leading-none">{nft.ownerName || "Unknown"}</span>
                                    <span className="text-[8px] text-gray-400 font-mono font-bold leading-none tracking-tight">{nft.ownerAddress || "Wallet"}</span>
                                </div>
                            </div>

                            <button className="hidden sm:block w-full py-1.5 bg-gradient-to-r from-primary to-primary/80 rounded-lg text-primary-foreground text-[10px] font-bold uppercase tracking-wider transform scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all shadow-lg shadow-primary/20">
                                Details
                            </button>
                        </div>
                    </motion.div>
                ))
            ) : (
                // Empty State / Mock Stream
                <>
                    <div className="col-span-full mb-4 p-5 rounded-2xl bg-card/90 border border-primary/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl backdrop-blur-md">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <h4 className="text-lg font-black text-foreground tracking-tight uppercase italic font-display">
                                    {isDisconnected ? "Preview Collection • 3D Holographic Mode" : "Your Collection"}
                                </h4>
                            </div>
                            <p className="text-xs text-muted-foreground font-light max-w-xl">
                                {isDisconnected 
                                    ? "Connect wallet to view and manage your on-chain NFTs. Click any '3D' button on the cards below to launch the interactive 3D viewer."
                                    : "You don't have any NFTs yet. Mint one to start your collection. Previewing available 3D assets below:"
                                }
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setViewer3DNft({
                                name: MOCK_NFTS[0].name,
                                image: MOCK_NFTS[0].image,
                                mint: MOCK_NFTS[0].mint,
                                description: "Interactive 3D Holographic NFT collectible from Street Sync.",
                                rank: 1,
                            })}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-mono font-bold rounded-xl flex items-center gap-2 shrink-0 shadow-lg shadow-primary/20 transition-all hover:scale-105"
                        >
                            <Box size={14} />
                            <span>Launch 3D Viewer</span>
                        </button>
                    </div>

                    {MOCK_NFTS.map((nft, i) => (
                        <div key={`mock-${i}`} className="group relative aspect-square overflow-hidden rounded-2xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-[0_0_20px_rgba(var(--primary),0.15)]">
                            {/* 3D View Button (Mock) */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setViewer3DNft({
                                        name: nft.name,
                                        image: nft.image,
                                        mint: nft.mint,
                                        description: "Preview collectible from Street Sync collection.",
                                        rank: i + 1,
                                    });
                                }}
                                className="absolute top-2.5 right-2.5 z-20 px-2 py-1 bg-black/60 hover:bg-primary text-white hover:text-primary-foreground backdrop-blur-md border border-white/15 hover:border-primary/50 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 transition-all shadow-md group/btn"
                                title="View in 3D"
                                aria-label="View in 3D"
                            >
                                <Box size={11} className="text-primary group-hover/btn:text-primary-foreground transition-colors" />
                                <span>3D</span>
                            </button>

                            <img 
                                src={nft.image} 
                                alt={nft.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 grayscale group-hover:grayscale-0"
                                onError={(e) => {
                                    handleImageFallback(e, nft.name);
                                }}
                            />
                            
                            {/* Owner Info Mock */}
                            <div className="flex items-center gap-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 absolute bottom-1 left-1 z-10 w-[calc(100%-8px)]">
                                <div className="bg-black/80 backdrop-blur-md p-1.5 rounded-lg border border-white/10 flex items-center gap-1.5 w-full">
                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground">
                                        {(nft as any).ownerName?.[0] || "U"}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-white font-bold leading-none">{(nft as any).ownerName || "Unknown"}</span>
                                        <span className="text-[8px] text-gray-400 font-mono font-bold leading-none tracking-tight">{(nft as any).ownerAddress || "Wallet"}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                        </div>
                    ))}
                </>
            )}


            {/* Details Modal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {selectedNft && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md"
                            onClick={() => setSelectedNft(null)}
                        >
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 25 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 25 }}
                                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                className="w-full max-w-4xl h-[92vh] md:h-[82vh] max-h-[820px] rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-border bg-card text-foreground flex flex-col relative select-none"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Top Header Bar */}
                                <div className="px-4 sm:px-6 md:px-8 py-3.5 border-b border-border bg-card/90 backdrop-blur-md flex items-center justify-between z-20 shrink-0">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono font-bold uppercase tracking-wider shrink-0">
                                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                            <span>Verified Asset</span>
                                        </div>
                                        {selectedNft.json?.symbol && (
                                            <span className="text-muted-foreground text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted border border-border shrink-0">
                                                {selectedNft.json.symbol}
                                            </span>
                                        )}
                                        <h3 className="text-sm sm:text-base font-bold text-foreground truncate hidden sm:block">
                                            {selectedNft.name || selectedNft.json?.name}
                                        </h3>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setViewer3DNft({
                                                    name: selectedNft.name,
                                                    image: resolveNftImageUrl(selectedNft.json?.image || selectedNft.image, selectedNft.name),
                                                    mint: selectedNft.mint,
                                                    description: selectedNft.description,
                                                    attributes: selectedNft.json?.attributes,
                                                    price: selectedNft.listingPrice,
                                                });
                                            }}
                                            className="px-2.5 py-1.5 bg-muted hover:bg-primary text-foreground hover:text-primary-foreground border border-border hover:border-primary/50 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                            title="Inspect in 3D"
                                        >
                                            <Box size={13} />
                                            <span className="hidden sm:inline">3D View</span>
                                        </button>

                                        <button 
                                            type="button"
                                            onClick={() => setSelectedNft(null)}
                                            className="p-2 sm:p-2.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-full transition-all border border-border active:scale-95 shadow-sm"
                                            title="Close Modal"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Modal Content: Desktop Split & Mobile Scrollable Flow */}
                                <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative z-10">
                                    {/* Left Pane (Desktop): Hero Artwork */}
                                    <div className="hidden md:flex md:w-[48%] h-full flex-col items-center justify-center p-8 bg-muted/20 border-r border-border relative overflow-hidden">
                                        <div className="relative w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden border border-border shadow-md bg-muted group">
                                            <img 
                                                src={resolveNftImageUrl(selectedNft.json?.image || selectedNft.image, selectedNft.name)} 
                                                alt={selectedNft.name}
                                                className="w-full h-full object-cover relative z-10 group-hover:scale-105 transition-transform duration-500"
                                                onError={(e) => {
                                                    handleImageFallback(e, selectedNft.name);
                                                }}
                                            />
                                            {/* 3D button overlay */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setViewer3DNft({
                                                        name: selectedNft.name,
                                                        image: resolveNftImageUrl(selectedNft.json?.image || selectedNft.image, selectedNft.name),
                                                        mint: selectedNft.mint,
                                                        description: selectedNft.description,
                                                        attributes: selectedNft.json?.attributes,
                                                        price: selectedNft.listingPrice,
                                                    });
                                                }}
                                                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-xl bg-background/90 hover:bg-primary text-foreground hover:text-primary-foreground font-mono font-bold text-xs backdrop-blur-md border border-border hover:border-primary/50 shadow-md flex items-center gap-1.5 transition-all"
                                            >
                                                <Box size={14} />
                                                <span>Interactive 3D</span>
                                            </button>
                                        </div>

                                        {/* Mint Hash chip below image */}
                                        {selectedNft.mint && (
                                            <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-xl bg-muted border border-border text-xs font-mono">
                                                <span className="text-muted-foreground">Mint:</span>
                                                <span className="text-foreground font-bold">{selectedNft.mint.slice(0, 8)}...{selectedNft.mint.slice(-6)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyMint(selectedNft.mint!)}
                                                    className="p-1 rounded hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
                                                    title="Copy Mint"
                                                >
                                                    {copiedMint ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Pane (Desktop) & Full Content (Mobile) */}
                                    <div className="w-full md:w-[52%] h-full overflow-y-auto custom-scrollbar p-5 sm:p-7 md:p-8 flex flex-col justify-between space-y-6 pb-24 md:pb-8 bg-card">
                                        <div className="space-y-5">
                                            {/* Mobile Artwork Preview */}
                                            <div className="md:hidden">
                                                <div className="relative w-full max-w-[260px] mx-auto aspect-square rounded-2xl overflow-hidden border border-border shadow-md bg-muted group my-2">
                                                    <img 
                                                        src={resolveNftImageUrl(selectedNft.json?.image || selectedNft.image, selectedNft.name)} 
                                                        alt={selectedNft.name}
                                                        className="w-full h-full object-cover relative z-10"
                                                        onError={(e) => {
                                                            handleImageFallback(e, selectedNft.name);
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setViewer3DNft({
                                                                name: selectedNft.name,
                                                                image: resolveNftImageUrl(selectedNft.json?.image || selectedNft.image, selectedNft.name),
                                                                mint: selectedNft.mint,
                                                                description: selectedNft.description,
                                                                attributes: selectedNft.json?.attributes,
                                                                price: selectedNft.listingPrice,
                                                            });
                                                        }}
                                                        className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-xl bg-background/90 hover:bg-primary text-foreground hover:text-primary-foreground font-mono font-bold text-xs backdrop-blur-md border border-border flex items-center gap-1.5 shadow-md"
                                                    >
                                                        <Box size={13} />
                                                        <span>Interactive 3D</span>
                                                    </button>
                                                </div>

                                                {selectedNft.mint && (
                                                    <div className="flex items-center justify-center gap-2 mt-2 text-[11px] font-mono">
                                                        <span className="text-muted-foreground">Mint:</span>
                                                        <span className="text-foreground font-bold bg-muted px-2 py-0.5 rounded-lg border border-border">
                                                            {selectedNft.mint.slice(0, 8)}...{selectedNft.mint.slice(-6)}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyMint(selectedNft.mint!)}
                                                            className="p-1 rounded bg-muted border border-border text-muted-foreground hover:text-foreground"
                                                            title="Copy Mint"
                                                        >
                                                            {copiedMint ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Title */}
                                            <div>
                                                <h2 className="text-2xl sm:text-3xl font-black text-foreground leading-tight font-display uppercase tracking-tight">
                                                    {selectedNft.name || selectedNft.json?.name}
                                                </h2>
                                                {selectedNft.isListed && selectedNft.listingPrice && (
                                                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-primary/10 border border-primary/20">
                                                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Listed For</span>
                                                        <span className="text-base font-mono font-black text-primary">{selectedNft.listingPrice} SOL</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Description */}
                                            <div>
                                                <h4 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                    <Sparkles size={12} className="text-primary" />
                                                    <span>Description</span>
                                                </h4>
                                                <p className="text-foreground leading-relaxed text-xs sm:text-sm bg-muted p-4 rounded-xl border border-border">
                                                    {selectedNft.description || selectedNft.json?.description || "No description provided."}
                                                </p>
                                            </div>

                                            {/* Attributes Grid */}
                                            {selectedNft.json?.attributes && selectedNft.json.attributes.length > 0 && (
                                                <div>
                                                    <h4 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-2.5 flex items-center justify-between">
                                                        <span>Attributes</span>
                                                        <span className="text-muted-foreground font-mono">({selectedNft.json.attributes.length})</span>
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                                        {selectedNft.json.attributes.map((attr, idx) => (
                                                            <div key={idx} className="p-2.5 bg-muted rounded-xl border border-border hover:border-primary/40 transition-colors">
                                                                <p className="text-[9px] text-muted-foreground font-mono uppercase font-bold truncate mb-0.5">{attr.trait_type}</p>
                                                                <p className="text-xs text-foreground font-bold truncate" title={attr.value}>{attr.value}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Security specs badge */}
                                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                                                <div className="p-2.5 rounded-xl bg-muted border border-border">
                                                    <span className="text-muted-foreground block mb-0.5">Asset Type</span>
                                                    <span className="text-foreground font-bold">Metaplex Digital Asset</span>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-muted border border-border">
                                                    <span className="text-muted-foreground block mb-0.5">Network</span>
                                                    <span className="text-primary font-bold">Solana Devnet</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="pt-4 border-t border-border mt-auto space-y-2.5">
                                            <div className="flex flex-col sm:flex-row gap-2.5">
                                                <a 
                                                    href={`https://solscan.io/token/${selectedNft.mint || ''}?cluster=devnet`} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="flex-1 py-3 px-4 rounded-xl bg-muted hover:bg-muted/80 border border-border text-foreground font-bold text-xs font-mono transition-all flex items-center justify-center gap-2 hover:border-border/80 active:scale-98"
                                                >
                                                    <span>View on Solscan</span>
                                                    <ArrowUpRight size={14} className="text-muted-foreground" />
                                                </a>

                                                {selectedNft.isListed ? (
                                                    <button 
                                                        onClick={() => handleDelist(selectedNft)}
                                                        disabled={!!delistingId}
                                                        className="flex-1 py-3 px-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-bold text-xs uppercase tracking-wider font-mono transition-all disabled:opacity-50 active:scale-98 shadow-md"
                                                    >
                                                        {delistingId === selectedNft.mint ? "Delisting Asset..." : "Delist Item"}
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => setListingNft(selectedNft)}
                                                        className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-black text-xs uppercase tracking-wider font-display transition-all shadow-md active:scale-98 hover:scale-[1.01]"
                                                    >
                                                        List for Sale
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* 3D NFT Viewer Modal */}
            <NFT3DViewer 
                isOpen={!!viewer3DNft}
                onClose={() => setViewer3DNft(null)}
                item={viewer3DNft}
            />

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
