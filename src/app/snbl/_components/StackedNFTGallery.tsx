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

    // Auto-select first NFT when modal opens with available NFTs
    useEffect(() => {
        if (expandedCard?.nfts && expandedCard.nfts.length > 0) {
            setSelectedNFT(expandedCard.nfts[0]);
        } else {
            setSelectedNFT(null);
        }
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
                                className="w-full max-w-6xl h-[78dvh] sm:h-[80dvh] md:h-[82vh] max-h-[calc(100dvh-5rem)] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-border bg-card text-foreground flex flex-col relative select-none"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Top Header Bar */}
                                <div className="px-3.5 sm:px-6 md:px-8 py-2.5 sm:py-3.5 md:py-4 border-b border-border bg-card/90 backdrop-blur-md flex items-center justify-between z-20 shrink-0">
                                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
                                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                            <span>Live Vault</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="text-sm sm:text-lg md:text-2xl font-black font-display uppercase tracking-tight text-foreground truncate leading-tight">
                                                {expandedCard.collection || expandedCard.title}
                                            </h2>
                                            <p className="text-[9px] sm:text-xs text-muted-foreground font-mono flex items-center gap-1.5 sm:gap-2 truncate">
                                                <span>{expandedCard.type === 'candymachine' ? 'Candy Machine Drop' : `${expandedCard.nfts?.length || 0} Assets in Vault`}</span>
                                                {expandedCard.subtitle && (
                                                    <>
                                                        <span className="text-muted-foreground/40">•</span>
                                                        <span className="text-primary font-bold">{expandedCard.subtitle}</span>
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                        {/* Mobile Tab Switcher for Direct Collection */}
                                        {expandedCard.type !== 'candymachine' && (
                                            <div className="flex md:hidden items-center bg-muted p-0.5 rounded-xl border border-border text-[11px] font-mono font-bold">
                                                <button
                                                    type="button"
                                                    onClick={() => setMobileModalTab('gallery')}
                                                    className={`px-2.5 py-1 rounded-lg transition-all ${mobileModalTab === 'gallery' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                                >
                                                    Vault ({expandedCard.nfts?.length || 0})
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setMobileModalTab('details')}
                                                    className={`px-2.5 py-1 rounded-lg transition-all ${mobileModalTab === 'details' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                                >
                                                    Terminal
                                                </button>
                                            </div>
                                        )}

                                        {/* Close Button */}
                                        <button 
                                            type="button"
                                            className="p-2 sm:p-2.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-full transition-all border border-border active:scale-95 shadow-sm"
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
                                    <div className="flex-1 flex overflow-hidden relative z-10">
                                        {/* DESKTOP CANDY MACHINE (md:flex) */}
                                        <div className="hidden md:flex w-full h-full">
                                            {/* Desktop Left: Mystery Cover */}
                                            <div className="w-1/2 h-full relative overflow-hidden bg-muted/20 flex items-center justify-center p-8 lg:p-12 border-r border-border">
                                                <div className="relative w-full max-w-[340px] aspect-square rounded-3xl overflow-hidden border border-border shadow-2xl bg-muted group">
                                                    <img 
                                                        src={resolveNftImageUrl(expandedCard.images[0], expandedCard.title)} 
                                                        alt={expandedCard.title} 
                                                        className="w-full h-full object-cover relative z-10 group-hover:scale-105 transition-transform duration-700" 
                                                        onError={(e) => handleImageFallback(e, expandedCard.title)}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                                                    <div className="absolute bottom-5 left-5 right-5 z-20">
                                                        <span className="inline-block px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5 shadow-sm">
                                                            Blind Mint Portal
                                                        </span>
                                                        <h3 className="text-2xl font-black font-display uppercase tracking-tight text-white drop-shadow">
                                                            {expandedCard.title}
                                                        </h3>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Desktop Right: Stats & Mint CTA */}
                                            <div className="w-1/2 h-full p-8 lg:p-10 flex flex-col justify-between overflow-y-auto custom-scrollbar bg-card">
                                                <div className="space-y-6">
                                                    <div>
                                                        <h3 className="text-2xl font-black font-display uppercase tracking-tight text-foreground mb-2">
                                                            Metaplex Blind Mint
                                                        </h3>
                                                        <p className="text-muted-foreground text-sm leading-relaxed">
                                                            Blind mint a random verifiable digital collectible from the {expandedCard.title} collection on the Solana blockchain with instant wallet delivery.
                                                        </p>
                                                    </div>

                                                    {/* Stats Cards */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="bg-muted p-5 rounded-2xl border border-border relative overflow-hidden">
                                                            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-bold mb-1">Mint Progress</p>
                                                            <p className="text-3xl font-mono font-black text-foreground">
                                                                {expandedCard.totalMinted ?? 0} <span className="text-xs font-sans font-normal text-muted-foreground">/ {expandedCard.maxSupply ?? "?"}</span>
                                                            </p>
                                                            {expandedCard.totalMinted !== undefined && expandedCard.maxSupply && (
                                                                <div className="w-full bg-border h-1.5 rounded-full mt-3 overflow-hidden">
                                                                    <div 
                                                                        className="bg-primary h-full rounded-full transition-all duration-500" 
                                                                        style={{ width: `${Math.min(100, (expandedCard.totalMinted / expandedCard.maxSupply) * 100)}%` }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="bg-muted p-5 rounded-2xl border border-border">
                                                            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-bold mb-1">Price Per Mint</p>
                                                            <p className="text-3xl font-mono font-black text-primary">
                                                                {expandedCard.price} <span className="text-xs font-sans font-normal text-muted-foreground">SOL</span>
                                                            </p>
                                                            <p className="text-[10px] font-mono text-primary mt-2 flex items-center gap-1 font-semibold">
                                                                <ShieldCheck size={12} /> Instant Delivery
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Security & Guarantees */}
                                                    <div className="space-y-2.5 text-xs font-mono text-muted-foreground bg-muted p-4 rounded-xl border border-border">
                                                        <div className="flex items-center gap-2">
                                                            <Check size={14} className="text-primary shrink-0" />
                                                            <span className="text-foreground">Provably fair Metaplex Candy Machine v2</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Check size={14} className="text-primary shrink-0" />
                                                            <span className="text-foreground">Direct-to-wallet on-chain minting</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Mint CTA */}
                                                <div className="pt-6 border-t border-border mt-6">
                                                    {expandedCard.totalMinted !== undefined && expandedCard.maxSupply !== undefined && expandedCard.totalMinted >= expandedCard.maxSupply ? (
                                                        <button 
                                                            disabled 
                                                            className="w-full py-4 bg-destructive/10 text-destructive rounded-2xl font-black text-base uppercase tracking-widest cursor-not-allowed border border-destructive/20"
                                                        >
                                                            Sold Out
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base uppercase tracking-wider rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 font-display"
                                                            onClick={() => handleMintCM(expandedCard.candyMachineId!)}
                                                            disabled={isMinting}
                                                        >
                                                            <Zap size={18} className="fill-current" />
                                                            <span>{isMinting ? "Processing Transaction..." : `Mint Random NFT (${expandedCard.price} SOL)`}</span>
                                                        </button>
                                                    )}
                                                    {status && (
                                                        <div className="mt-3 text-center text-xs font-mono font-bold bg-muted p-3 rounded-xl border border-border text-foreground animate-in fade-in">
                                                            {status}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* MOBILE CANDY MACHINE (md:hidden) - Unified with Terminal View */}
                                        <div className="flex md:hidden w-full h-full flex-col justify-between p-3.5 sm:p-5 overflow-y-auto custom-scrollbar bg-card">
                                            <div className="space-y-2.5 sm:space-y-3">
                                                {/* Header / Badge */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-wider flex items-center gap-1">
                                                        <ShieldCheck size={12} /> Provably Fair Drop
                                                    </span>
                                                    <span className="text-[10px] font-mono text-muted-foreground">Metaplex v2</span>
                                                </div>

                                                <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-tight text-foreground leading-tight">
                                                    {expandedCard.title}
                                                </h3>

                                                {/* Centered Square Artwork Frame (No Clipping, No Cutting Bar!) */}
                                                <div className="relative w-full max-w-[150px] sm:max-w-[180px] mx-auto aspect-square rounded-2xl overflow-hidden border border-border bg-muted shadow-md group">
                                                    <img 
                                                        src={resolveNftImageUrl(expandedCard.images[0], expandedCard.title)} 
                                                        alt={expandedCard.title} 
                                                        className="w-full h-full object-cover" 
                                                        onError={(e) => handleImageFallback(e, expandedCard.title)}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />
                                                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-background/90 text-foreground font-mono font-bold text-[9px] sm:text-[10px] backdrop-blur-md border border-border whitespace-nowrap">
                                                        Blind Mint
                                                    </span>
                                                </div>

                                                {/* Stats Cards (2-Columns Compact) */}
                                                <div className="grid grid-cols-2 gap-2 text-center font-mono">
                                                    <div className="p-2 sm:p-2.5 rounded-xl bg-muted border border-border">
                                                        <span className="text-[9px] text-muted-foreground uppercase font-bold block mb-0.5">Mint Progress</span>
                                                        <span className="text-sm sm:text-base font-black text-foreground block">
                                                            {expandedCard.totalMinted ?? 0} <span className="text-[10px] font-normal text-muted-foreground">/ {expandedCard.maxSupply ?? "?"}</span>
                                                        </span>
                                                        {expandedCard.totalMinted !== undefined && expandedCard.maxSupply && (
                                                            <div className="w-full bg-border h-1 rounded-full mt-1.5 overflow-hidden">
                                                                <div 
                                                                    className="bg-primary h-full rounded-full transition-all duration-500" 
                                                                    style={{ width: `${Math.min(100, (expandedCard.totalMinted / expandedCard.maxSupply) * 100)}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="p-2 sm:p-2.5 rounded-xl bg-muted border border-border">
                                                        <span className="text-[9px] text-muted-foreground uppercase font-bold block mb-0.5">Price Per Mint</span>
                                                        <span className="text-sm sm:text-base font-black text-primary block">
                                                            {expandedCard.price} <span className="text-[10px] text-muted-foreground font-normal">SOL</span>
                                                        </span>
                                                        <span className="text-[9px] text-primary mt-0.5 flex items-center justify-center gap-1 font-bold">
                                                            Instant Delivery
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Guarantees Chip */}
                                                <div className="flex items-center justify-between p-2 rounded-xl bg-muted border border-border text-[9px] sm:text-[10px] font-mono text-muted-foreground">
                                                    <span className="flex items-center gap-1 text-foreground font-bold">
                                                        <Check size={12} className="text-primary shrink-0" /> Metaplex CMv2
                                                    </span>
                                                    <span className="flex items-center gap-1 text-foreground font-bold">
                                                        <Check size={12} className="text-primary shrink-0" /> Direct To Wallet
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Mobile Mint CTA */}
                                            <div className="pt-2 sm:pt-3 border-t border-border mt-2">
                                                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                                                    <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-bold">Total</span>
                                                    <span className="text-base sm:text-xl font-mono font-black text-primary">
                                                        {expandedCard.price} SOL
                                                    </span>
                                                </div>

                                                {expandedCard.totalMinted !== undefined && expandedCard.maxSupply !== undefined && expandedCard.totalMinted >= expandedCard.maxSupply ? (
                                                    <button 
                                                        disabled 
                                                        className="w-full py-2.5 sm:py-3.5 bg-destructive/10 text-destructive rounded-xl font-black text-xs sm:text-sm uppercase tracking-widest cursor-not-allowed border border-destructive/20"
                                                    >
                                                        Sold Out
                                                    </button>
                                                ) : (
                                                    <button 
                                                        className="w-full py-2.5 sm:py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 font-display"
                                                        onClick={() => handleMintCM(expandedCard.candyMachineId!)}
                                                        disabled={isMinting}
                                                    >
                                                        <Zap size={16} className="fill-current" />
                                                        <span>{isMinting ? "Processing..." : `Mint Random NFT (${expandedCard.price} SOL)`}</span>
                                                    </button>
                                                )}

                                                {status && (
                                                    <div className="mt-2 text-center text-[10px] font-mono font-bold bg-muted p-2 rounded-lg border border-border text-foreground animate-in fade-in">
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
                                            <div className="w-[56%] h-full flex flex-col border-r border-border bg-muted/20 relative">
                                                <div className="px-6 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between text-xs font-mono text-muted-foreground">
                                                    <span className="flex items-center gap-1.5">
                                                        <Sparkles size={13} className="text-primary" />
                                                        {expandedCard.nfts?.length === 1 
                                                            ? "Active Vault Asset • Loaded in terminal" 
                                                            : "Select an NFT to inspect in terminal"}
                                                    </span>
                                                    <span className="text-muted-foreground/70 font-semibold">{expandedCard.nfts?.length || 0} {expandedCard.nfts?.length === 1 ? 'Item' : 'Items'}</span>
                                                </div>

                                                <div 
                                                    className="p-6 overflow-y-auto custom-scrollbar flex-1 grid gap-4 items-start content-start"
                                                    style={{
                                                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 220px))',
                                                        gridAutoRows: 'max-content',
                                                        alignContent: 'start',
                                                        alignItems: 'start'
                                                    }}
                                                >
                                                    {expandedCard.nfts && expandedCard.nfts.length === 0 ? (
                                                        <div className="col-span-full py-16 text-center text-muted-foreground font-mono text-sm">
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
                                                                    style={{ height: 'fit-content', alignSelf: 'start' }}
                                                                    className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border bg-card shadow-sm h-fit self-start w-full ${
                                                                        isSelected 
                                                                            ? 'border-primary ring-2 ring-primary/40 shadow-md' 
                                                                            : 'border-border hover:border-primary/40'
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
                                                                        className="absolute top-2.5 left-2.5 z-10 px-2 py-1 bg-background/90 hover:bg-primary text-foreground hover:text-primary-foreground rounded-lg backdrop-blur-md border border-border text-[10px] font-mono font-bold flex items-center gap-1 transition-all shadow-sm group-hover:scale-105"
                                                                        title="Inspect in 3D"
                                                                    >
                                                                        <Box size={11} />
                                                                        <span>3D</span>
                                                                    </button>

                                                                    {/* Selected Checkmark */}
                                                                    {isSelected && (
                                                                        <div className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md font-black animate-in zoom-in-50">
                                                                            <Check size={14} strokeWidth={3} />
                                                                        </div>
                                                                    )}

                                                                    {/* NFT Image */}
                                                                    <div className="aspect-square w-full overflow-hidden bg-muted relative">
                                                                        <img
                                                                            src={resolveNftImageUrl(nft.image, displayName)}
                                                                            alt={displayName}
                                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                            onError={(e) => handleImageFallback(e, displayName)}
                                                                        />
                                                                    </div>

                                                                    {/* Card Info */}
                                                                    <div className="p-3 bg-card border-t border-border flex items-center justify-between">
                                                                        <div className="min-w-0 pr-2">
                                                                            <p className="text-[11px] font-mono text-muted-foreground truncate">#{nft.mintAddress.slice(0, 6)}</p>
                                                                            <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
                                                                        </div>
                                                                        <div className="text-right shrink-0">
                                                                            <span className="text-[9px] font-mono text-muted-foreground uppercase block">Price</span>
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
                                            <div className="w-[44%] h-full flex flex-col p-5 lg:p-6 bg-card overflow-y-auto custom-scrollbar relative justify-between">
                                                {selectedNFT ? (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5 text-xs text-primary font-mono font-bold">
                                                                <ShieldCheck size={14} />
                                                                <span>VERIFIED ON-CHAIN ASSET</span>
                                                            </div>
                                                            <span className="text-xs font-mono text-muted-foreground">PDA Escrow</span>
                                                        </div>

                                                        <div>
                                                            <h3 className="text-xl lg:text-2xl font-black font-display uppercase tracking-tight text-foreground truncate">
                                                                {selectedNFT.name || `${expandedCard.collection || expandedCard.title} #${selectedNFT.mintAddress.slice(0, 4)}`}
                                                            </h3>
                                                            {/* Mint Hash with Copy */}
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs font-mono text-foreground bg-muted px-2.5 py-0.5 rounded-lg border border-border">
                                                                    {selectedNFT.mintAddress.slice(0, 10)}...{selectedNFT.mintAddress.slice(-6)}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopyMint(selectedNFT.mintAddress)}
                                                                    className="px-2 py-0.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-all text-xs flex items-center gap-1 font-mono"
                                                                    title="Copy Mint Address"
                                                                >
                                                                    {copiedMint ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                                                                    <span>{copiedMint ? "Copied" : "Copy"}</span>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Hero Artwork Frame */}
                                                        <div className="my-2 relative max-w-[210px] lg:max-w-[230px] mx-auto w-full aspect-square rounded-2xl overflow-hidden border border-border bg-muted shadow-md group">
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
                                                                className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-xl bg-background/90 hover:bg-primary text-foreground hover:text-primary-foreground font-mono font-bold text-xs backdrop-blur-md border border-border hover:border-primary/50 shadow-md flex items-center gap-1.5 transition-all"
                                                            >
                                                                <Box size={13} />
                                                                <span>Inspect in 3D</span>
                                                            </button>
                                                        </div>

                                                        {/* Feature Specs */}
                                                        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono font-semibold my-2">
                                                            <div className="p-1.5 rounded-xl bg-muted border border-border text-muted-foreground">
                                                                <span className="text-primary block font-bold text-[9px]">● Escrow</span>
                                                                <span className="text-foreground font-bold">PDA Locked</span>
                                                            </div>
                                                            <div className="p-1.5 rounded-xl bg-muted border border-border text-muted-foreground">
                                                                <span className="text-primary block font-bold text-[9px]">● Settlement</span>
                                                                <span className="text-foreground font-bold">Instant Claim</span>
                                                            </div>
                                                            <div className="p-1.5 rounded-xl bg-muted border border-border text-muted-foreground">
                                                                <span className="text-primary block font-bold text-[9px]">● Interactive</span>
                                                                <span className="text-foreground font-bold">3D Ready</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="my-auto text-center p-8 border border-dashed border-border rounded-2xl bg-muted/20">
                                                        <p className="text-sm font-mono text-muted-foreground">
                                                            Select an asset from the vault to inspect details.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Bottom Buy CTA */}
                                                <div className="pt-3 border-t border-border mt-auto">
                                                    {selectedNFT && (
                                                        <div className="flex items-center justify-between mb-2.5">
                                                            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">Total Price</span>
                                                            <span className="text-2xl font-mono font-black text-primary flex items-center gap-1">
                                                                {selectedNFT.price} <span className="text-xs font-sans font-normal text-muted-foreground">SOL</span>
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    {expandedCard.nfts && expandedCard.nfts.length === 0 ? (
                                                        <button 
                                                            disabled 
                                                            className="w-full py-3 bg-destructive/10 text-destructive rounded-2xl font-black text-sm uppercase tracking-widest cursor-not-allowed border border-destructive/20"
                                                        >
                                                            Sold Out
                                                        </button>
                                                    ) : !selectedNFT ? (
                                                        <button 
                                                            disabled 
                                                            className="w-full py-3 bg-muted text-muted-foreground rounded-2xl font-black text-sm uppercase tracking-widest cursor-not-allowed border border-border font-mono"
                                                        >
                                                            Select an NFT Above
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            type="button"
                                                            className="w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground font-display hover:shadow-lg hover:shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                                                            onClick={() => handleBuyDirect(selectedNFT.mintAddress)}
                                                            disabled={isMinting}
                                                        >
                                                            <Zap size={18} className="fill-current" />
                                                            <span>{isMinting ? "Processing Transaction..." : `Buy Now (${selectedNFT.price} SOL)`}</span>
                                                        </button>
                                                    )}

                                                    {status && (
                                                        <div className="mt-3 text-center text-xs font-mono font-bold bg-muted p-2.5 rounded-xl border border-border text-foreground animate-in fade-in">
                                                            {status}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* MOBILE VIEW: Full-Height Tabs (md:hidden) */}
                                        <div className="flex md:hidden w-full h-full flex-col relative overflow-hidden bg-card">
                                            {mobileModalTab === 'gallery' ? (
                                                <>
                                                    {/* Mobile Tab 1: Scrollable 2-Column Gallery */}
                                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 pb-28">
                                                        <div className="grid grid-cols-2 gap-2.5 items-start content-start auto-rows-max">
                                                            {expandedCard.nfts && expandedCard.nfts.length === 0 ? (
                                                                <div className="col-span-full py-16 text-center text-muted-foreground font-mono text-xs">
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
                                                                            className={`relative rounded-xl overflow-hidden border bg-card active:scale-95 transition-all shadow-sm h-fit self-start ${
                                                                                isSelected 
                                                                                    ? 'border-primary ring-2 ring-primary/40' 
                                                                                    : 'border-border'
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
                                                                                className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-background/90 text-foreground hover:bg-primary hover:text-primary-foreground rounded-md text-[9px] font-mono font-bold flex items-center gap-1 border border-border"
                                                                            >
                                                                                <Box size={10} />
                                                                                <span>3D</span>
                                                                            </button>

                                                                            {isSelected && (
                                                                                <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black">
                                                                                    <Check size={12} strokeWidth={3} />
                                                                                </div>
                                                                            )}

                                                                            <div className="aspect-square w-full bg-muted relative">
                                                                                <img
                                                                                    src={resolveNftImageUrl(nft.image, displayName)}
                                                                                    alt={displayName}
                                                                                    className="w-full h-full object-cover"
                                                                                    onError={(e) => handleImageFallback(e, displayName)}
                                                                                />
                                                                            </div>

                                                                            <div className="p-2 bg-card border-t border-border flex items-center justify-between">
                                                                                <span className="text-[10px] font-mono text-muted-foreground truncate mr-1">#{nft.mintAddress.slice(0, 4)}</span>
                                                                                <span className="text-xs font-mono font-black text-primary">{nft.price} SOL</span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Floating HUD at Bottom of Mobile Gallery (Contained inside modal card) */}
                                                    {selectedNFT && (
                                                        <motion.div
                                                            initial={{ y: 20, opacity: 0 }}
                                                            animate={{ y: 0, opacity: 1 }}
                                                            className="absolute bottom-4 left-3.5 right-3.5 sm:bottom-5 sm:left-4 sm:right-4 p-2.5 sm:p-3 bg-card/95 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl flex items-center justify-between z-30 gap-2"
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <img
                                                                    src={resolveNftImageUrl(selectedNFT.image, selectedNFT.name || 'NFT')}
                                                                    alt="Thumb"
                                                                    className="w-10 h-10 rounded-xl object-cover border border-border shrink-0 bg-muted"
                                                                    onError={(e) => handleImageFallback(e, selectedNFT.name || 'NFT')}
                                                                />
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-foreground truncate leading-tight">
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
                                                                    className="p-2 rounded-xl bg-muted text-foreground hover:bg-primary hover:text-primary-foreground border border-border text-xs font-mono font-bold flex items-center gap-1 transition-colors"
                                                                    title="Inspect in 3D"
                                                                >
                                                                    <Box size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setMobileModalTab('details')}
                                                                    className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs font-mono flex items-center gap-1 shadow-md active:scale-95"
                                                                >
                                                                    <span>Details & Buy</span>
                                                                    <ArrowRight size={13} />
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </>
                                            ) : (
                                                /* Mobile Tab 2: Full Mobile Terminal */
                                                <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-5 flex flex-col justify-between pb-6 sm:pb-8">
                                                    <div className="space-y-2.5 sm:space-y-4">
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
                                                                    <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-wider flex items-center gap-1">
                                                                        <ShieldCheck size={12} /> Verified On-Chain
                                                                    </span>
                                                                    <span className="text-[10px] font-mono text-muted-foreground">PDA Escrow</span>
                                                                </div>

                                                                <h3 className="text-base sm:text-xl font-black font-display uppercase tracking-tight text-foreground leading-tight">
                                                                    {selectedNFT.name || `${expandedCard.collection || expandedCard.title} #${selectedNFT.mintAddress.slice(0, 4)}`}
                                                                </h3>

                                                                {/* Artwork Frame */}
                                                                <div className="relative w-full max-w-[170px] sm:max-w-[210px] md:max-w-[240px] mx-auto aspect-square rounded-2xl overflow-hidden border border-border bg-muted shadow-md">
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
                                                                        className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 sm:py-1 rounded-xl bg-background/90 text-foreground hover:bg-primary hover:text-primary-foreground font-mono font-bold text-[10px] sm:text-xs backdrop-blur-md border border-border flex items-center gap-1"
                                                                    >
                                                                        <Box size={12} />
                                                                        <span>3D Interactive</span>
                                                                    </button>
                                                                </div>

                                                                {/* Mint Address Chip */}
                                                                <div className="flex items-center justify-between p-2 sm:p-3 rounded-xl bg-muted border border-border">
                                                                    <span className="text-[9px] sm:text-[10px] font-mono text-muted-foreground uppercase font-bold">Mint Hash</span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[11px] sm:text-xs font-mono text-foreground font-bold">
                                                                            {selectedNFT.mintAddress.slice(0, 8)}...{selectedNFT.mintAddress.slice(-4)}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleCopyMint(selectedNFT.mintAddress)}
                                                                            className="p-1 rounded bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground border border-border"
                                                                            title="Copy Mint"
                                                                        >
                                                                            {copiedMint ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Specs */}
                                                                <div className="grid grid-cols-2 gap-2 text-center text-[9px] sm:text-[10px] font-mono">
                                                                    <div className="p-2 sm:p-2.5 rounded-xl bg-muted border border-border">
                                                                        <span className="text-muted-foreground block mb-0.5">Settlement</span>
                                                                        <span className="text-primary font-bold">Instant Transfer</span>
                                                                    </div>
                                                                    <div className="p-2 sm:p-2.5 rounded-xl bg-muted border border-border">
                                                                        <span className="text-muted-foreground block mb-0.5">Storage</span>
                                                                        <span className="text-primary font-bold">Solana PDA</span>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="py-8 text-center text-muted-foreground font-mono text-xs">
                                                                No asset selected. Return to the vault gallery to pick one.
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Mobile Terminal Buy CTA */}
                                                    <div className="pt-2.5 sm:pt-4 border-t border-border mt-3 sm:mt-6">
                                                        {selectedNFT && (
                                                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                                                                <span className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">Total</span>
                                                                <span className="text-lg sm:text-2xl font-mono font-black text-primary">
                                                                    {selectedNFT.price} SOL
                                                                </span>
                                                            </div>
                                                        )}

                                                        {selectedNFT ? (
                                                            <button 
                                                                type="button"
                                                                className="w-full py-2.5 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-base uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground font-display flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-50"
                                                                onClick={() => handleBuyDirect(selectedNFT.mintAddress)}
                                                                disabled={isMinting}
                                                            >
                                                                <Zap size={16} className="fill-current" />
                                                                <span>{isMinting ? "Processing..." : `Buy Now (${selectedNFT.price} SOL)`}</span>
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                type="button"
                                                                onClick={() => setMobileModalTab('gallery')}
                                                                className="w-full py-2.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm bg-muted text-muted-foreground font-mono border border-border"
                                                            >
                                                                Choose an NFT
                                                            </button>
                                                        )}

                                                        {status && (
                                                            <div className="mt-3 text-center text-xs font-mono font-bold bg-muted p-2.5 rounded-xl border border-border text-foreground animate-in fade-in">
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
