"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { fetchCandyMachine, mintV2, mplCandyMachine, fetchCandyGuard } from "@metaplex-foundation/mpl-candy-machine";
import { publicKey as umiPublicKey, transactionBuilder, generateSigner } from "@metaplex-foundation/umi";
import { setComputeUnitLimit, setComputeUnitPrice } from "@metaplex-foundation/mpl-toolbox";
import { PublicKey, SystemProgram, ComputeBudgetProgram as SolanaComputeBudgetProgram } from "@solana/web3.js";
import { withSolanaRetry, parseSolanaErrorMessage } from "@/utils/solanaRetry";
import { useSsNftGallery } from '@/hooks/useSsNftGallery';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { fetchDigitalAsset, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { getTokenMetadataWithCache } from "@/hooks/useTokenMetadata";
import { resolveNftImageUrl, getFallbackImage, handleImageFallback } from "@/utils/nftImageResolver";
import { NFT3DViewer } from "@/components/features/nft-marketplace/NFT3DViewer";
import { Box, Sparkles, ShieldCheck, Check, Layers, Info, X, Zap, ExternalLink, Copy, ArrowRight, ArrowLeft } from "lucide-react";

export interface NFTDetail {
    image: string;
    price: number;
    mintAddress: string;
    name?: string;
}

export interface CarouselItem {
  id: string;
  type: "candymachine" | "direct";
  title: string;
  subtitle?: string;
  images: string[];
  price?: number; // Only needed for candy machine summary
  candyMachineId?: string;
  totalMinted?: number;
  maxSupply?: number;
  collection?: string;
  nfts?: NFTDetail[];
  adminWallet?: string;
}

const initialCards: CarouselItem[] = [];

const getDisplayOffset = (index: number, currIndex: number, total: number) => {
    if (total === 0) return 0;
    const offset = index - currIndex;
    let displayOffset = offset;
    if (offset > total / 2) displayOffset -= total;
    if (offset < -total / 2) displayOffset += total;
    return displayOffset;
};

export const StackedNFTGallery = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const { program } = useSsNftGallery();
    const [cards, setCards] = useState<CarouselItem[]>(initialCards);
    const [currentIndex, setCurrentIndex] = useState(0);
    const prevCurrentIndexRef = useRef(currentIndex);
    useEffect(() => {
        prevCurrentIndexRef.current = currentIndex;
    }, [currentIndex]);
    const prevCurrentIndex = prevCurrentIndexRef.current;
    const [expandedCard, setExpandedCard] = useState<CarouselItem | null>(null);
    const [selectedNFT, setSelectedNFT] = useState<NFTDetail | null>(null);
    const [viewer3DNft, setViewer3DNft] = useState<any | null>(null);
    const [isMinting, setIsMinting] = useState(false);
    const [status, setStatus] = useState("");
    const [mobileModalTab, setMobileModalTab] = useState<'gallery' | 'details'>('gallery');
    const [copiedMint, setCopiedMint] = useState(false);

    const handleOpenCard = (card: CarouselItem) => {
        setExpandedCard(card);
        if (card.nfts && card.nfts.length > 0) {
            setSelectedNFT(card.nfts[0]);
        } else {
            setSelectedNFT(null);
        }
        setMobileModalTab('gallery');
    };

    const handleCopyMint = (mint: string) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(mint);
            setCopiedMint(true);
            setTimeout(() => setCopiedMint(false), 2000);
        }
    };

    const umi = useMemo(() => {
        const u = createUmi(connection.rpcEndpoint)
            .use(mplCandyMachine())
            .use(mplTokenMetadata());
        if (wallet.wallet?.adapter) {
            u.use(walletAdapterIdentity(wallet.wallet.adapter));
        }
        return u;
    }, [connection.rpcEndpoint, wallet.wallet]);

    // Load custom deployed NFTs from localStorage AND On-Chain Gallery Listings
    useEffect(() => {
        let isMounted = true;
        
        const fetchOnChainListings = async () => {
            if (!program) return [];
            try {
                const listings = await program.account.galleryListing.all();
                const groupedListings = new Map<string, CarouselItem>();
                
                await Promise.allSettled(
                    listings.map(async (listing: any) => {
                        try {
                            const mintPubkey = listing.account.mint;
                            const meta = await getTokenMetadataWithCache(mintPubkey, connection, umi);
                            const title = meta?.name || "Treasury NFT";
                            const imageUrl = resolveNftImageUrl(meta?.image, title);
                            
                            const adminStr = listing.account.admin.toBase58();
                            const baseName = title.split('#')[0].trim() || "Treasury";
                            const groupId = `${adminStr}-${baseName}`;
                            
                            const nftDetail = {
                                image: imageUrl,
                                price: listing.account.price.toNumber() / 1e9,
                                mintAddress: mintPubkey.toBase58(),
                                name: title,
                            };

                            if (groupedListings.has(groupId)) {
                                const group = groupedListings.get(groupId)!;
                                group.images.push(imageUrl);
                                group.nfts!.push(nftDetail);
                            } else {
                                groupedListings.set(groupId, {
                                    id: `onchain-${groupId}`,
                                    type: "direct",
                                    title: `${baseName} Series`,
                                    subtitle: "On-Chain Treasury Stack",
                                    collection: "Treasury Vault",
                                    images: [imageUrl],
                                    nfts: [nftDetail],
                                    adminWallet: adminStr,
                                });
                            }
                        } catch (e) {
                            console.error("Failed to fetch asset for mint", listing.account.mint.toBase58(), e);
                        }
                    })
                );
                return Array.from(groupedListings.values());
            } catch (e) {
                console.error("Failed to fetch on-chain listings", e);
                return [];
            }
        };

        const handleStorage = async () => {
            try {
                // 1. Fetch Local Storage Cards (Candy Machines, etc)
                let localCards: CarouselItem[] = [];
                const stored = localStorage.getItem("street_sync_nft_gallery");
                if (stored) {
                    localCards = JSON.parse(stored);
                    // Filter out old simulated "direct" ones if we are fetching real on-chain ones now
                    localCards = localCards.filter(c => c.type !== 'direct');

                    // Fetch real-time candy machine stats in parallel
                    await Promise.allSettled(
                        localCards.map(async (card) => {
                            if (card.type === 'candymachine' && card.candyMachineId) {
                                try {
                                    const cm = await fetchCandyMachine(umi, umiPublicKey(card.candyMachineId));
                                    card.totalMinted = Number(cm.itemsRedeemed);
                                    card.maxSupply = Number(cm.data.itemsAvailable);
                                } catch (e) {
                                    console.error("Failed to fetch CM details", e);
                                }
                            }
                        })
                    );
                }

                // If fresh browser / no local cards found, auto-load deployed Candy Machine from environment
                const defaultCmId = process.env.NEXT_PUBLIC_CANDY_MACHINE_ID || "DdU4yDWH7UgAboiEYe8D5ZQm5z7ES2n5wvgNKNYxQMF1";
                if (localCards.length === 0 && defaultCmId) {
                    try {
                        const cm = await fetchCandyMachine(umi, umiPublicKey(defaultCmId));
                        const coverImg = getFallbackImage("Devdutta Series", defaultCmId);
                        localCards.push({
                            id: `cm-${defaultCmId}`,
                            type: "candymachine",
                            title: "Devdutta Collection",
                            subtitle: "Official Street Sync Drop",
                            images: [coverImg],
                            price: 0.05,
                            candyMachineId: defaultCmId,
                            totalMinted: Number(cm.itemsRedeemed),
                            maxSupply: Number(cm.data.itemsAvailable),
                            collection: "Devdutta Series",
                        });
                    } catch (cmErr) {
                        console.warn("Failed to auto-load default Candy Machine:", cmErr);
                    }
                }
                
                // 2. Fetch On-Chain Escrowed NFTs
                const onChainCards = await fetchOnChainListings();
                
                if (isMounted) {
                    setCards([...onChainCards, ...localCards, ...initialCards]);
                }
            } catch (e) {
                console.error("Failed to parse stored gallery items", e);
            }
        };

        handleStorage(); // Initial load
        window.addEventListener("gallery_updated", handleStorage);
        window.addEventListener("storage", handleStorage);
        
        return () => {
            isMounted = false;
            window.removeEventListener("gallery_updated", handleStorage);
            window.removeEventListener("storage", handleStorage);
        };
    }, [program, umi]);

    // Reset currentIndex if it's out of bounds or NaN
    useEffect(() => {
        if (cards.length === 0) {
            setCurrentIndex(0);
        } else if (isNaN(currentIndex) || currentIndex >= cards.length) {
            setCurrentIndex(0);
        }
    }, [cards.length, currentIndex]);

    // Slideshow Effect
    useEffect(() => {
        if (expandedCard || cards.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => {
                const nextVal = (prev + 1) % cards.length;
                return isNaN(nextVal) ? 0 : nextVal;
            });
        }, 4000);
        return () => clearInterval(interval);
    }, [cards.length, expandedCard]);

    // Reset selected NFT when modal opens/closes
    useEffect(() => {
        setSelectedNFT(null);
        setStatus("");
    }, [expandedCard]);

    const handleMintCM = async (candyMachineIdStr: string) => {
        if (!wallet.connected || !wallet.publicKey) {
            setStatus("Please connect your wallet first!");
            return;
        }

        setIsMinting(true);
        setStatus("Initializing mint...");

        try {
            const candyMachineId = umiPublicKey(candyMachineIdStr);
            const candyMachine = await fetchCandyMachine(umi, candyMachineId);
            const candyGuard = await fetchCandyGuard(umi, candyMachine.mintAuthority);
            
            let paymentDestination: any = umiPublicKey("9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu");
            if (candyGuard.guards.solPayment.__option === 'Some') {
                paymentDestination = candyGuard.guards.solPayment.value.destination;
            }
            
            setStatus("Confirm Transaction...");
            const nftMint = generateSigner(umi);

            await withSolanaRetry(async () => {
                await transactionBuilder()
                    .add(setComputeUnitPrice(umi, { microLamports: 100_000 }))
                    .add(setComputeUnitLimit(umi, { units: 800_000 }))
                    .add(mintV2(umi, {
                        candyMachine: candyMachine.publicKey,
                        candyGuard: candyMachine.mintAuthority,
                        collectionMint: candyMachine.collectionMint,
                        collectionUpdateAuthority: candyMachine.authority,
                        nftMint,
                        tokenStandard: candyMachine.tokenStandard,
                        mintArgs: {
                            solPayment: { destination: paymentDestination },
                        },
                    }))
                    .sendAndConfirm(umi, {
                        send: { skipPreflight: true, maxRetries: 5 },
                        confirm: { commitment: "confirmed" }
                    });
            });

            setStatus("Mint successful!");
        } catch (error: any) {
            console.error("Mint failed:", error);
            setStatus(`Mint failed: ${error.message || "Unknown error"}`);
        } finally {
            setIsMinting(false);
        }
    };

    const handleBuyDirect = async (mintAddress: string) => {
        if (!wallet.connected || !wallet.publicKey) {
            setStatus("Please connect your wallet first!");
            return;
        }

        const nftToBuy = expandedCard?.nfts?.find(n => n.mintAddress === mintAddress);
        if (!nftToBuy) {
            setStatus("NFT not found in collection.");
            return;
        }

        if (!expandedCard?.adminWallet) {
            setStatus("Missing admin wallet reference for this stack.");
            return;
        }

        setIsMinting(true);
        setStatus("Initiating purchase...");

        try {
            if (!program) throw new Error("Program not loaded");

            const adminPubkey = new PublicKey(expandedCard.adminWallet);
            const mintPubkey = new PublicKey(mintAddress);

            const [listingPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("gallery_listing"), mintPubkey.toBuffer(), adminPubkey.toBuffer()],
                program.programId
            );

            const [escrowPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("gallery_vault"), mintPubkey.toBuffer(), adminPubkey.toBuffer()],
                program.programId
            );

            const buyerTokenAccount = await getAssociatedTokenAddress(mintPubkey, wallet.publicKey);

            // Check if Buyer ATA exists
            const buyerTokenAccountInfo = await connection.getAccountInfo(buyerTokenAccount);
            const preInstructions: any[] = [
                SolanaComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
                SolanaComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
            ];

            if (!buyerTokenAccountInfo) {
                console.log("[StackedNFTGallery] Adding buyer ATA creation instruction...");
                preInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        buyerTokenAccount,
                        wallet.publicKey,
                        mintPubkey
                    )
                );
            }

            setStatus("Confirm Transaction in your wallet...");
            
            await withSolanaRetry(async () => {
                return await program.methods.buyNft()
                    .accounts({
                        buyer: wallet.publicKey,
                        admin: adminPubkey,
                        mint: mintPubkey,
                        listingAccount: listingPda,
                        escrowTokenAccount: escrowPda,
                        buyerTokenAccount: buyerTokenAccount,
                        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                    } as any)
                    .preInstructions(preInstructions)
                    .rpc({ skipPreflight: true });
            });

            setStatus("Purchase successful!");

            // Remove purchased NFT from local storage to update UI
            const stored = localStorage.getItem("street_sync_nft_gallery");
            if (stored) {
                let parsed: CarouselItem[] = JSON.parse(stored);
                parsed = parsed.map(card => {
                    if (card.id === expandedCard?.id && card.nfts) {
                        return {
                            ...card,
                            nfts: card.nfts.filter(nft => nft.mintAddress !== mintAddress)
                        };
                    }
                    return card;
                });
                // Remove card entirely if no NFTs left
                parsed = parsed.filter(card => card.type === 'candymachine' || (card.nfts && card.nfts.length > 0));
                
                localStorage.setItem("street_sync_nft_gallery", JSON.stringify(parsed));
                window.dispatchEvent(new Event("gallery_updated"));
                
                // Update local state directly so it reflects immediately in the modal
                if (expandedCard) {
                    const updatedExpanded = {
                        ...expandedCard,
                        nfts: expandedCard.nfts?.filter(nft => nft.mintAddress !== mintAddress) || []
                    };
                    setExpandedCard(updatedExpanded);
                }
            }

            setSelectedNFT(null);
        } catch (error: any) {
            console.error("Purchase failed:", error);
            setStatus(`Purchase failed: ${parseSolanaErrorMessage(error)}`);
        } finally {
            setIsMinting(false);
        }
    };

    if (cards.length === 0) {
        return (
            <div className="w-full flex flex-col items-center justify-center min-h-[280px] md:min-h-[320px] py-4 relative overflow-hidden bg-card/30 rounded-3xl border border-border">
                <div className="text-center mb-2 relative z-10">
                    <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-foreground mb-0.5">
                        Exclusive Drops
                    </h2>
                    <p className="text-muted-foreground text-[10px] md:text-xs max-w-lg mx-auto">
                        Swipe through our curated collections. Select an exclusive drop to mint or purchase directly.
                    </p>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
                    <div className="bg-muted/40 p-4 rounded-full border border-border mb-3">
                        <svg className="w-8 h-8 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                        No active exclusive drops or collections found at the moment. Deployed candy machines or listed treasury NFTs will appear here.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col items-center justify-center min-h-[280px] md:min-h-[320px] py-4 relative overflow-hidden bg-card/30 rounded-3xl border border-border isolate">
            
            <div className="text-center mb-2 relative z-10">
                <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-foreground mb-0.5">
                    Exclusive Drops
                </h2>
                <p className="text-muted-foreground text-[10px] md:text-xs max-w-lg mx-auto">
                    Swipe through our curated collections. Select an exclusive drop to mint or purchase directly.
                </p>
            </div>

            <div className="relative w-full h-[200px] md:h-[260px] flex items-center justify-center perspective-1000 mt-2">
                {/* Navigation Arrows */}
                {cards.length > 1 && (
                    <>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length); }}
                            className="absolute left-2 sm:left-6 z-20 p-2 md:p-3 rounded-full bg-black/40 hover:bg-primary text-white backdrop-blur-md transition-all border border-white/10 hover:scale-110"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % cards.length); }}
                            className="absolute right-2 sm:right-6 z-20 p-2 md:p-3 rounded-full bg-black/40 hover:bg-primary text-white backdrop-blur-md transition-all border border-white/10 hover:scale-110"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </>
                )}

                <AnimatePresence>
                    {cards.map((card, index) => {
                        const newDisplayOffset = getDisplayOffset(index, currentIndex, cards.length);
                        const oldDisplayOffset = getDisplayOffset(index, prevCurrentIndex, cards.length);
                        const isJumping = Math.abs(newDisplayOffset - oldDisplayOffset) > 1.5;
                        const displayOffset = newDisplayOffset;

                        const isCenter = displayOffset === 0;
                        const absOffset = Math.abs(displayOffset);
                        
                        const isSoldOut = card.type === 'candymachine' 
                            ? (card.totalMinted !== undefined && card.maxSupply !== undefined && card.totalMinted >= card.maxSupply)
                            : (card.nfts && card.nfts.length === 0);

                        return (
                            <motion.div
                                key={card.id}
                                className="absolute w-[140px] h-[190px] md:w-[170px] md:h-[230px]"
                                initial={false}
                                animate={{
                                    x: `${displayOffset * 105}%`,
                                    scale: absOffset === 0 ? 1 : absOffset === 1 ? 0.85 : 0.7,
                                    zIndex: 10 - absOffset,
                                    opacity: absOffset >= 2 ? 0 : 1 - absOffset * 0.4,
                                    filter: `blur(${absOffset * 2}px)`,
                                    visibility: absOffset >= 2 ? "hidden" : "visible",
                                    pointerEvents: absOffset >= 2 ? "none" : "auto",
                                }}
                                transition={isJumping ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
                                onClick={() => {
                                    if (isCenter) handleOpenCard(card);
                                    else setCurrentIndex(index);
                                }}
                            >
                                <div className="relative w-full h-full pt-10">
                                    {isSoldOut && isCenter && (
                                        <div className="absolute inset-x-0 bottom-10 z-30 flex items-center justify-center pointer-events-none">
                                            <span className="text-red-500 font-black font-display text-sm md:text-xl uppercase tracking-widest border-2 border-red-500 px-3 py-1 md:px-4 md:py-2 transform -rotate-12 bg-black/80 backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.5)]">Sold Out</span>
                                        </div>
                                    )}
                                    {card.images.map((img, i) => (
                                        <div
                                            key={i}
                                            className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-card"
                                            style={{
                                                zIndex: 10 - i,
                                                transform: `translateY(${i * -30}px) scale(${1 - i * 0.08})`,
                                                transformOrigin: "bottom center",
                                                opacity: 1 - i * 0.25,
                                                boxShadow: i > 0 ? '0 -10px 30px rgba(0,0,0,0.5)' : '0 20px 50px rgba(0,0,0,0.5)',
                                                filter: isSoldOut ? 'grayscale(80%)' : 'none'
                                            }}
                                        >
                                            <img 
                                                src={resolveNftImageUrl(img, `${card.title} - Layer ${i}`)} 
                                                alt={`${card.title} - Layer ${i}`} 
                                                className="w-full h-full object-cover" 
                                                onError={(e) => {
                                                    handleImageFallback(e, `${card.title} - Layer ${i}`);
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                                            
                                            {i === 0 && (
                                                <div className="absolute bottom-0 left-0 right-0 p-3 text-white text-center">
                                                    <div className="inline-block px-1.5 py-0.5 bg-white/10 backdrop-blur-md rounded-full text-[8px] font-bold uppercase tracking-widest mb-1 border border-white/20">
                                                        {card.subtitle}
                                                    </div>
                                                    <h3 className="text-sm md:text-base font-black font-display uppercase tracking-tight mb-1 leading-none text-shadow">{card.title}</h3>
                                                    {isCenter && card.type === 'candymachine' && !isSoldOut && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="text-xs font-mono font-black text-primary mt-1"
                                                        >
                                                            {card.price} SOL
                                                        </motion.div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Pagination / Navigation dots */}
            {cards.length > 1 && (
                <div className="flex items-center gap-1.5 mt-4 z-10 max-w-full overflow-x-auto no-scrollbar px-4 py-1">
                    {cards.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-1.5 rounded-full transition-all duration-300 shrink-0 ${idx === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
                        />
                    ))}
                </div>
            )}

            {/* Expanded Modal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {expandedCard && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-2xl"
                            onClick={() => setExpandedCard(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 30, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.95, y: 30, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                className="w-full max-w-6xl h-[92vh] md:h-[82vh] rounded-[1.75rem] md:rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9),0_0_50px_rgba(168,85,247,0.18)] border border-white/15 bg-zinc-950 text-white flex flex-col relative select-none"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Atmospheric Cyber Background Elements */}
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary via-purple-500 to-transparent z-30" />
                                <div className="absolute -top-32 -left-32 w-80 h-80 bg-purple-600/25 rounded-full blur-[100px] pointer-events-none" />
                                <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none" />
                                <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
                                <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

                                {/* Top Cyber Header Bar */}
                                <div className="px-4 sm:px-6 md:px-8 py-3.5 md:py-4 border-b border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-between z-20 shrink-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            <span>Live Vault</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="text-base sm:text-lg md:text-2xl font-black font-display uppercase tracking-tight text-white truncate leading-tight">
                                                {expandedCard.collection || expandedCard.title}
                                            </h2>
                                            <p className="text-[10px] sm:text-xs text-white/60 font-mono flex items-center gap-2 truncate">
                                                <span>{expandedCard.type === 'candymachine' ? 'Candy Machine Drop' : `${expandedCard.nfts?.length || 0} Assets in Vault`}</span>
                                                {expandedCard.subtitle && (
                                                    <>
                                                        <span className="text-white/20">•</span>
                                                        <span className="text-primary font-bold">{expandedCard.subtitle}</span>
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                        {/* Mobile Tab Switcher for Direct Collection */}
                                        {expandedCard.type !== 'candymachine' && (
                                            <div className="flex md:hidden items-center bg-white/5 p-0.5 rounded-xl border border-white/10 text-[11px] font-mono font-bold">
                                                <button
                                                    type="button"
                                                    onClick={() => setMobileModalTab('gallery')}
                                                    className={`px-2.5 py-1 rounded-lg transition-all ${mobileModalTab === 'gallery' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-white/60 hover:text-white'}`}
                                                >
                                                    Vault ({expandedCard.nfts?.length || 0})
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setMobileModalTab('details')}
                                                    className={`px-2.5 py-1 rounded-lg transition-all ${mobileModalTab === 'details' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-white/60 hover:text-white'}`}
                                                >
                                                    Terminal
                                                </button>
                                            </div>
                                        )}

                                        {/* Close Button */}
                                        <button 
                                            type="button"
                                            className="p-2 sm:p-2.5 bg-white/5 hover:bg-white/15 text-white/70 hover:text-white rounded-full transition-all border border-white/10 hover:border-white/25 active:scale-95 shadow-lg"
                                            onClick={() => setExpandedCard(null)}
                                            title="Close Gallery"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Modal Body */}
                                {expandedCard.type === 'candymachine' ? (
                                    /* CANDY MACHINE VIEW */
                                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
                                        {/* Candy Machine Left: Mystery Cover */}
                                        <div className="md:w-1/2 h-[35%] md:h-full relative overflow-hidden bg-black/40 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-white/10">
                                            <div className="relative w-full max-w-[340px] aspect-square rounded-2xl overflow-hidden border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] group">
                                                <div className="absolute -inset-2 bg-gradient-to-tr from-primary/30 to-purple-500/30 rounded-2xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />
                                                <img 
                                                    src={resolveNftImageUrl(expandedCard.images[0], expandedCard.title)} 
                                                    alt={expandedCard.title} 
                                                    className="w-full h-full object-cover relative z-10 group-hover:scale-105 transition-transform duration-700" 
                                                    onError={(e) => handleImageFallback(e, expandedCard.title)}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                                                <div className="absolute bottom-4 left-4 right-4 z-20">
                                                    <span className="inline-block px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                                                        Blind Mint Portal
                                                    </span>
                                                    <h3 className="text-xl font-black font-display uppercase tracking-tight text-white">
                                                        {expandedCard.title}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Candy Machine Right: Stats & Mint CTA */}
                                        <div className="md:w-1/2 h-[65%] md:h-full p-6 md:p-10 flex flex-col justify-between overflow-y-auto custom-scrollbar bg-zinc-950/70">
                                            <div className="space-y-6">
                                                <div>
                                                    <h3 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-white mb-2">
                                                        Metaplex Blind Mint
                                                    </h3>
                                                    <p className="text-white/60 text-sm leading-relaxed">
                                                        Blind mint a random verifiable digital collectible from the {expandedCard.title} collection on the Solana blockchain with instant wallet delivery.
                                                    </p>
                                                </div>

                                                {/* Stats Cards */}
                                                <div className="grid grid-cols-2 gap-3.5">
                                                    <div className="bg-white/5 p-4 md:p-5 rounded-2xl border border-white/10 relative overflow-hidden">
                                                        <p className="text-[10px] font-mono text-white/50 uppercase tracking-wider font-bold mb-1">Mint Progress</p>
                                                        <p className="text-2xl md:text-3xl font-mono font-black text-white">
                                                            {expandedCard.totalMinted ?? 0} <span className="text-xs font-sans font-normal text-white/40">/ {expandedCard.maxSupply ?? "?"}</span>
                                                        </p>
                                                        {expandedCard.totalMinted !== undefined && expandedCard.maxSupply && (
                                                            <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                                                                <div 
                                                                    className="bg-gradient-to-r from-primary to-emerald-400 h-full rounded-full transition-all duration-500" 
                                                                    style={{ width: `${Math.min(100, (expandedCard.totalMinted / expandedCard.maxSupply) * 100)}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="bg-white/5 p-4 md:p-5 rounded-2xl border border-white/10">
                                                        <p className="text-[10px] font-mono text-white/50 uppercase tracking-wider font-bold mb-1">Price Per Mint</p>
                                                        <p className="text-2xl md:text-3xl font-mono font-black text-primary">
                                                            {expandedCard.price} <span className="text-xs font-sans font-normal text-white/50">SOL</span>
                                                        </p>
                                                        <p className="text-[10px] font-mono text-emerald-400 mt-2 flex items-center gap-1">
                                                            <ShieldCheck size={12} /> Instant Delivery
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Security & Guarantees */}
                                                <div className="space-y-2 text-xs font-mono text-white/70 bg-white/[0.03] p-4 rounded-xl border border-white/5">
                                                    <div className="flex items-center gap-2">
                                                        <Check size={14} className="text-emerald-400 shrink-0" />
                                                        <span>Provably fair Metaplex Candy Machine v2</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Check size={14} className="text-emerald-400 shrink-0" />
                                                        <span>Direct-to-wallet on-chain minting</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Mint CTA */}
                                            <div className="pt-6 border-t border-white/10 mt-6">
                                                {expandedCard.totalMinted !== undefined && expandedCard.maxSupply !== undefined && expandedCard.totalMinted >= expandedCard.maxSupply ? (
                                                    <button 
                                                        disabled 
                                                        className="w-full py-4 bg-red-500/20 text-red-500 rounded-2xl font-black text-base uppercase tracking-widest cursor-not-allowed border border-red-500/40"
                                                    >
                                                        Sold Out
                                                    </button>
                                                ) : (
                                                    <button 
                                                        className="w-full py-4 bg-gradient-to-r from-primary via-emerald-400 to-primary text-zinc-950 font-black text-base uppercase tracking-wider rounded-2xl shadow-[0_0_30px_rgba(var(--primary),0.3)] hover:shadow-[0_0_40px_rgba(var(--primary),0.5)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
                                                        onClick={() => handleMintCM(expandedCard.candyMachineId!)}
                                                        disabled={isMinting}
                                                    >
                                                        <Zap size={18} className="fill-current" />
                                                        <span>{isMinting ? "Processing Transaction..." : `Mint Random NFT (${expandedCard.price} SOL)`}</span>
                                                    </button>
                                                )}
                                                {status && (
                                                    <div className="mt-3 text-center text-xs font-mono font-bold bg-white/5 p-3 rounded-xl border border-white/10 text-white animate-in fade-in">
                                                        {status}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* DIRECT COLLECTION VIEW */
                                    <div className="flex-1 flex overflow-hidden relative z-10">
                                        {/* DESKTOP VIEW: Split Side-by-Side (md:flex) */}
                                        <div className="hidden md:flex w-full h-full">
                                            {/* Desktop Left: Scrollable Vault Grid (56%) */}
                                            <div className="w-[56%] h-full flex flex-col border-r border-white/10 bg-black/20 relative">
                                                <div className="px-6 py-2.5 bg-black/30 border-b border-white/5 flex items-center justify-between text-xs font-mono text-white/60">
                                                    <span className="flex items-center gap-1.5">
                                                        <Sparkles size={13} className="text-primary" />
                                                        Click an NFT to load in holographic terminal
                                                    </span>
                                                    <span className="text-white/40">{expandedCard.nfts?.length || 0} Items</span>
                                                </div>

                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 p-6 overflow-y-auto custom-scrollbar flex-1 pb-16">
                                                    {expandedCard.nfts && expandedCard.nfts.length === 0 ? (
                                                        <div className="col-span-full py-16 text-center text-white/50 font-mono text-sm">
                                                            This collection is completely sold out.
                                                        </div>
                                                    ) : (
                                                        expandedCard.nfts?.map((nft) => {
                                                            const isSelected = selectedNFT?.mintAddress === nft.mintAddress;
                                                            const displayName = nft.name || `${expandedCard.collection || expandedCard.title} #${nft.mintAddress.slice(0, 4)}`;
                                                            return (
                                                                <motion.div
                                                                    key={nft.mintAddress}
                                                                    whileHover={{ y: -3, scale: 1.01 }}
                                                                    whileTap={{ scale: 0.98 }}
                                                                    onClick={() => setSelectedNFT(nft)}
                                                                    className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border bg-zinc-900/60 backdrop-blur-md shadow-lg ${
                                                                        isSelected 
                                                                            ? 'border-primary ring-2 ring-primary/60 shadow-[0_0_25px_rgba(var(--primary),0.3)] bg-zinc-900/90' 
                                                                            : 'border-white/10 hover:border-white/30 hover:bg-zinc-900/80'
                                                                    }`}
                                                                >
                                                                    {/* 3D Inspect Pill */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedNFT(nft);
                                                                            setViewer3DNft({
                                                                                name: displayName,
                                                                                image: nft.image,
                                                                                mint: nft.mintAddress,
                                                                                price: nft.price,
                                                                                description: `On-chain treasury asset from ${expandedCard.title || "Street Sync"}.`,
                                                                            });
                                                                        }}
                                                                        className="absolute top-2.5 left-2.5 z-10 px-2 py-1 bg-black/80 hover:bg-primary text-white hover:text-black rounded-lg backdrop-blur-md border border-white/20 text-[10px] font-mono font-bold flex items-center gap-1 transition-all shadow-md group-hover:scale-105"
                                                                        title="Inspect in 3D"
                                                                    >
                                                                        <Box size={11} />
                                                                        <span>3D</span>
                                                                    </button>

                                                                    {/* Selected Checkmark */}
                                                                    {isSelected && (
                                                                        <div className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg font-black animate-in zoom-in-50">
                                                                            <Check size={14} strokeWidth={3} />
                                                                        </div>
                                                                    )}

                                                                    {/* NFT Image */}
                                                                    <div className="aspect-square w-full overflow-hidden bg-zinc-950/80 relative">
                                                                        <img
                                                                            src={resolveNftImageUrl(nft.image, displayName)}
                                                                            alt={displayName}
                                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                            onError={(e) => handleImageFallback(e, displayName)}
                                                                        />
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                                                                    </div>

                                                                    {/* Card Info */}
                                                                    <div className="p-3 bg-zinc-900/90 border-t border-white/5 flex items-center justify-between">
                                                                        <div className="min-w-0 pr-2">
                                                                            <p className="text-[11px] font-mono text-white/50 truncate">#{nft.mintAddress.slice(0, 6)}</p>
                                                                            <p className="text-xs font-bold text-white truncate">{displayName}</p>
                                                                        </div>
                                                                        <div className="text-right shrink-0">
                                                                            <span className="text-[9px] font-mono text-white/40 uppercase block">Price</span>
                                                                            <span className="text-xs font-mono font-black text-primary">{nft.price} SOL</span>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>

                                            {/* Desktop Right: Holographic Terminal (44%) */}
                                            <div className="w-[44%] h-full flex flex-col p-6 lg:p-8 bg-zinc-950/70 overflow-y-auto custom-scrollbar relative justify-between">
                                                {selectedNFT ? (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-bold">
                                                                <ShieldCheck size={14} />
                                                                <span>VERIFIED ON-CHAIN ASSET</span>
                                                            </div>
                                                            <span className="text-xs font-mono text-white/40">PDA Escrow</span>
                                                        </div>

                                                        <div>
                                                            <h3 className="text-2xl font-black font-display uppercase tracking-tight text-white">
                                                                {selectedNFT.name || `${expandedCard.collection || expandedCard.title} #${selectedNFT.mintAddress.slice(0, 4)}`}
                                                            </h3>
                                                            {/* Mint Hash with Copy */}
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                <span className="text-xs font-mono text-white/60 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                                                                    {selectedNFT.mintAddress.slice(0, 10)}...{selectedNFT.mintAddress.slice(-6)}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopyMint(selectedNFT.mintAddress)}
                                                                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10 transition-all text-xs flex items-center gap-1 font-mono"
                                                                    title="Copy Mint Address"
                                                                >
                                                                    {copiedMint ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                                                    <span>{copiedMint ? "Copied" : "Copy"}</span>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Hero Artwork Frame */}
                                                        <div className="my-4 relative max-w-[280px] lg:max-w-[320px] mx-auto w-full aspect-square rounded-2xl overflow-hidden border border-white/15 shadow-[0_0_40px_rgba(0,0,0,0.8)] group">
                                                            <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 to-purple-600/30 rounded-2xl blur-xl opacity-40 group-hover:opacity-75 transition-opacity pointer-events-none" />
                                                            <img
                                                                src={resolveNftImageUrl(selectedNFT.image, selectedNFT.name || 'NFT Asset')}
                                                                alt={selectedNFT.mintAddress}
                                                                className="w-full h-full object-cover relative z-10"
                                                                onError={(e) => handleImageFallback(e, selectedNFT.name || 'NFT Asset')}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setViewer3DNft({
                                                                    name: selectedNFT.name || `${expandedCard.collection || expandedCard.title} #${selectedNFT.mintAddress.slice(0, 4)}`,
                                                                    image: selectedNFT.image,
                                                                    mint: selectedNFT.mintAddress,
                                                                    price: selectedNFT.price,
                                                                    description: `On-chain treasury asset from ${expandedCard.title || "Street Sync"}.`,
                                                                })}
                                                                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-xl bg-black/80 hover:bg-primary text-white hover:text-black font-mono font-bold text-xs backdrop-blur-md border border-white/20 hover:border-primary/50 shadow-xl flex items-center gap-1.5 transition-all"
                                                            >
                                                                <Box size={14} />
                                                                <span>Inspect in 3D</span>
                                                            </button>
                                                        </div>

                                                        {/* Feature Specs */}
                                                        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono font-semibold my-4">
                                                            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/80">
                                                                <span className="text-emerald-400 block mb-0.5">● Escrow</span>
                                                                <span>PDA Locked</span>
                                                            </div>
                                                            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/80">
                                                                <span className="text-primary block mb-0.5">● Settlement</span>
                                                                <span>Instant Claim</span>
                                                            </div>
                                                            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/80">
                                                                <span className="text-purple-400 block mb-0.5">● Interactive</span>
                                                                <span>3D Ready</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="my-auto text-center p-8 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                                                        <p className="text-sm font-mono text-white/60">
                                                            Select an asset from the vault to inspect details.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Bottom Buy CTA */}
                                                <div className="pt-4 border-t border-white/10 mt-auto">
                                                    {selectedNFT && (
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="text-xs font-mono uppercase tracking-wider text-white/50 font-bold">Total Price</span>
                                                            <span className="text-2xl lg:text-3xl font-mono font-black text-primary flex items-center gap-1">
                                                                {selectedNFT.price} <span className="text-sm font-sans font-normal text-white/50">SOL</span>
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    {expandedCard.nfts && expandedCard.nfts.length === 0 ? (
                                                        <button 
                                                            disabled 
                                                            className="w-full py-4 bg-red-500/20 text-red-500 rounded-2xl font-black text-base uppercase tracking-widest cursor-not-allowed border border-red-500/40"
                                                        >
                                                            Sold Out
                                                        </button>
                                                    ) : !selectedNFT ? (
                                                        <button 
                                                            disabled 
                                                            className="w-full py-4 bg-white/5 text-white/30 rounded-2xl font-black text-base uppercase tracking-widest cursor-not-allowed border border-white/10 font-mono"
                                                        >
                                                            Select an NFT Above
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            type="button"
                                                            className="w-full py-4 rounded-2xl font-black text-base uppercase tracking-wider bg-gradient-to-r from-primary via-emerald-400 to-primary text-zinc-950 hover:shadow-[0_0_35px_rgba(var(--primary),0.4)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                                                            onClick={() => handleBuyDirect(selectedNFT.mintAddress)}
                                                            disabled={isMinting}
                                                        >
                                                            <Zap size={18} className="fill-current" />
                                                            <span>{isMinting ? "Processing Transaction..." : `Buy Now (${selectedNFT.price} SOL)`}</span>
                                                        </button>
                                                    )}

                                                    {status && (
                                                        <div className="mt-3 text-center text-xs font-mono font-bold bg-white/5 p-2.5 rounded-xl border border-white/10 text-white animate-in fade-in">
                                                            {status}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* MOBILE VIEW: Full-Height Tabs (md:hidden) */}
                                        <div className="flex md:hidden w-full h-full flex-col relative overflow-hidden">
                                            {mobileModalTab === 'gallery' ? (
                                                /* Mobile Tab 1: Scrollable 2-Column Gallery */
                                                <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 pb-28">
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        {expandedCard.nfts && expandedCard.nfts.length === 0 ? (
                                                            <div className="col-span-full py-16 text-center text-white/50 font-mono text-xs">
                                                                Collection is sold out.
                                                            </div>
                                                        ) : (
                                                            expandedCard.nfts?.map((nft) => {
                                                                const isSelected = selectedNFT?.mintAddress === nft.mintAddress;
                                                                const displayName = nft.name || `${expandedCard.collection || expandedCard.title} #${nft.mintAddress.slice(0, 4)}`;
                                                                return (
                                                                    <div
                                                                        key={nft.mintAddress}
                                                                        onClick={() => setSelectedNFT(nft)}
                                                                        className={`relative rounded-xl overflow-hidden border bg-zinc-900/80 active:scale-95 transition-all shadow-md ${
                                                                            isSelected 
                                                                                ? 'border-primary ring-2 ring-primary/50 shadow-primary/30' 
                                                                                : 'border-white/10'
                                                                        }`}
                                                                    >
                                                                        {/* 3D button */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedNFT(nft);
                                                                                setViewer3DNft({
                                                                                    name: displayName,
                                                                                    image: nft.image,
                                                                                    mint: nft.mintAddress,
                                                                                    price: nft.price,
                                                                                    description: `On-chain treasury asset from ${expandedCard.title || "Street Sync"}.`,
                                                                                });
                                                                            }}
                                                                            className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/80 text-white rounded-md text-[9px] font-mono font-bold flex items-center gap-1 border border-white/20"
                                                                        >
                                                                            <Box size={10} />
                                                                            <span>3D</span>
                                                                        </button>

                                                                        {isSelected && (
                                                                            <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black">
                                                                                <Check size={12} strokeWidth={3} />
                                                                            </div>
                                                                        )}

                                                                        <div className="aspect-square w-full bg-zinc-950 relative">
                                                                            <img
                                                                                src={resolveNftImageUrl(nft.image, displayName)}
                                                                                alt={displayName}
                                                                                className="w-full h-full object-cover"
                                                                                onError={(e) => handleImageFallback(e, displayName)}
                                                                            />
                                                                        </div>

                                                                        <div className="p-2 bg-zinc-900/90 border-t border-white/5 flex items-center justify-between">
                                                                            <span className="text-[10px] font-mono text-white/70 truncate mr-1">#{nft.mintAddress.slice(0, 4)}</span>
                                                                            <span className="text-xs font-mono font-black text-primary">{nft.price} SOL</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>

                                                    {/* Floating HUD at Bottom of Mobile Gallery */}
                                                    {selectedNFT && (
                                                        <motion.div
                                                            initial={{ y: 60, opacity: 0 }}
                                                            animate={{ y: 0, opacity: 1 }}
                                                            className="fixed bottom-4 left-4 right-4 p-3 bg-zinc-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.9)] flex items-center justify-between z-30 gap-2"
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <img
                                                                    src={resolveNftImageUrl(selectedNFT.image, selectedNFT.name || 'NFT')}
                                                                    alt="Thumb"
                                                                    className="w-10 h-10 rounded-xl object-cover border border-white/20 shrink-0"
                                                                    onError={(e) => handleImageFallback(e, selectedNFT.name || 'NFT')}
                                                                />
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-white truncate leading-tight">
                                                                        {selectedNFT.name || `#${selectedNFT.mintAddress.slice(0, 6)}`}
                                                                    </p>
                                                                    <p className="text-xs font-mono font-black text-primary">
                                                                        {selectedNFT.price} SOL
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setViewer3DNft({
                                                                        name: selectedNFT.name || `${expandedCard.collection || expandedCard.title} #${selectedNFT.mintAddress.slice(0, 4)}`,
                                                                        image: selectedNFT.image,
                                                                        mint: selectedNFT.mintAddress,
                                                                        price: selectedNFT.price,
                                                                        description: `On-chain treasury asset from ${expandedCard.title || "Street Sync"}.`,
                                                                    })}
                                                                    className="p-2 rounded-xl bg-white/10 text-white border border-white/15 text-xs font-mono font-bold flex items-center gap-1"
                                                                    title="Inspect in 3D"
                                                                >
                                                                    <Box size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setMobileModalTab('details')}
                                                                    className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs font-mono flex items-center gap-1 shadow-md active:scale-95"
                                                                >
                                                                    <span>Details & Buy</span>
                                                                    <ArrowRight size={13} />
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </div>
                                            ) : (
                                                /* Mobile Tab 2: Full Mobile Terminal */
                                                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col justify-between">
                                                    <div className="space-y-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => setMobileModalTab('gallery')}
                                                            className="flex items-center gap-1 text-xs font-mono font-bold text-primary hover:underline mb-1"
                                                        >
                                                            <ArrowLeft size={14} />
                                                            <span>Back to Vault Showcase</span>
                                                        </button>

                                                        {selectedNFT ? (
                                                            <>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                                                        <ShieldCheck size={12} /> Verified On-Chain
                                                                    </span>
                                                                    <span className="text-[10px] font-mono text-white/50">PDA Escrow</span>
                                                                </div>

                                                                <h3 className="text-xl font-black font-display uppercase tracking-tight text-white leading-tight">
                                                                    {selectedNFT.name || `${expandedCard.collection || expandedCard.title} #${selectedNFT.mintAddress.slice(0, 4)}`}
                                                                </h3>

                                                                {/* Artwork Frame */}
                                                                <div className="relative w-full max-w-[240px] mx-auto aspect-square rounded-2xl overflow-hidden border border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
                                                                    <img
                                                                        src={resolveNftImageUrl(selectedNFT.image, selectedNFT.name || 'NFT Asset')}
                                                                        alt={selectedNFT.mintAddress}
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => handleImageFallback(e, selectedNFT.name || 'NFT Asset')}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setViewer3DNft({
                                                                            name: selectedNFT.name || `${expandedCard.collection || expandedCard.title} #${selectedNFT.mintAddress.slice(0, 4)}`,
                                                                            image: selectedNFT.image,
                                                                            mint: selectedNFT.mintAddress,
                                                                            price: selectedNFT.price,
                                                                            description: `On-chain treasury asset from ${expandedCard.title || "Street Sync"}.`,
                                                                        })}
                                                                        className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-xl bg-black/80 text-white font-mono font-bold text-xs backdrop-blur-md border border-white/20 flex items-center gap-1"
                                                                    >
                                                                        <Box size={13} />
                                                                        <span>3D Interactive</span>
                                                                    </button>
                                                                </div>

                                                                {/* Mint Address Chip */}
                                                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                                                    <span className="text-[10px] font-mono text-white/50 uppercase font-bold">Mint Hash</span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-mono text-white/80">
                                                                            {selectedNFT.mintAddress.slice(0, 8)}...{selectedNFT.mintAddress.slice(-4)}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleCopyMint(selectedNFT.mintAddress)}
                                                                            className="p-1 rounded bg-white/10 text-white/80"
                                                                            title="Copy Mint"
                                                                        >
                                                                            {copiedMint ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Specs */}
                                                                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono">
                                                                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                                                                        <span className="text-white/40 block">Settlement</span>
                                                                        <span className="text-emerald-400 font-bold">Instant Transfer</span>
                                                                    </div>
                                                                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                                                                        <span className="text-white/40 block">Storage</span>
                                                                        <span className="text-primary font-bold">Solana PDA</span>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="py-12 text-center text-white/50 font-mono text-xs">
                                                                No asset selected. Return to the vault gallery to pick one.
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Mobile Terminal Buy CTA */}
                                                    <div className="pt-4 border-t border-white/10 mt-6">
                                                        {selectedNFT && (
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className="text-xs font-mono uppercase tracking-wider text-white/50 font-bold">Total</span>
                                                                <span className="text-2xl font-mono font-black text-primary">
                                                                    {selectedNFT.price} SOL
                                                                </span>
                                                            </div>
                                                        )}

                                                        {selectedNFT ? (
                                                            <button 
                                                                type="button"
                                                                className="w-full py-4 rounded-2xl font-black text-base uppercase tracking-wider bg-gradient-to-r from-primary via-emerald-400 to-primary text-zinc-950 font-display flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
                                                                onClick={() => handleBuyDirect(selectedNFT.mintAddress)}
                                                                disabled={isMinting}
                                                            >
                                                                <Zap size={18} className="fill-current" />
                                                                <span>{isMinting ? "Processing..." : `Buy Now (${selectedNFT.price} SOL)`}</span>
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                type="button"
                                                                onClick={() => setMobileModalTab('gallery')}
                                                                className="w-full py-4 rounded-2xl font-bold text-sm bg-white/10 text-white font-mono"
                                                            >
                                                                Choose an NFT
                                                            </button>
                                                        )}

                                                        {status && (
                                                            <div className="mt-3 text-center text-xs font-mono font-bold bg-white/5 p-2.5 rounded-xl border border-white/10 text-white animate-in fade-in">
                                                                {status}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
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
        </div>
    );
};
