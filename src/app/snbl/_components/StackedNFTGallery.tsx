"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { fetchCandyMachine, mintV2, mplCandyMachine, fetchCandyGuard } from "@metaplex-foundation/mpl-candy-machine";
import { publicKey as umiPublicKey, transactionBuilder, generateSigner } from "@metaplex-foundation/umi";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useSsNftGallery } from '@/hooks/useSsNftGallery';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { fetchDigitalAsset, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";

export interface NFTDetail {
    image: string;
    price: number;
    mintAddress: string;
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

export const StackedNFTGallery = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const { program } = useSsNftGallery();
    const [cards, setCards] = useState<CarouselItem[]>(initialCards);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [expandedCard, setExpandedCard] = useState<CarouselItem | null>(null);
    const [selectedNFT, setSelectedNFT] = useState<NFTDetail | null>(null);
    const [isMinting, setIsMinting] = useState(false);
    const [status, setStatus] = useState("");

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
                
                for (const listing of listings) {
                    try {
                        const mintPubkey = listing.account.mint;
                        // Fetch Metadata via Umi
                        const asset = await fetchDigitalAsset(umi, umiPublicKey(mintPubkey.toBase58()));
                        let imageUrl = "";
                        let title = "Treasury NFT";
                        
                        if (asset.metadata.uri) {
                            try {
                                const res = await fetch(asset.metadata.uri);
                                const json = await res.json();
                                imageUrl = json.image || "";
                                title = json.name || title;
                            } catch (e) {
                                console.error("Failed to fetch JSON for URI", asset.metadata.uri);
                            }
                        }
                        
                        const adminStr = listing.account.admin.toBase58();
                        const baseName = title.split('#')[0].trim() || "Treasury";
                        const groupId = `${adminStr}-${baseName}`;
                        
                        const nftDetail = {
                            image: imageUrl,
                            price: listing.account.price.toNumber() / 1e9,
                            mintAddress: mintPubkey.toBase58(),
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
                }
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

                    // Fetch real-time candy machine stats
                    for (const card of localCards) {
                        if (card.type === 'candymachine' && card.candyMachineId) {
                            try {
                                const cm = await fetchCandyMachine(umi, umiPublicKey(card.candyMachineId));
                                card.totalMinted = Number(cm.itemsMinted);
                                card.maxSupply = Number(cm.itemsLoaded);
                            } catch (e) {
                                console.error("Failed to fetch CM details", e);
                            }
                        }
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

    // Slideshow Effect
    useEffect(() => {
        if (expandedCard) return; // Pause slideshow when modal is open
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % cards.length);
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
            
            let paymentDestination = umiPublicKey("9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu");
            if (candyGuard.guards.solPayment.__option === 'Some') {
                paymentDestination = candyGuard.guards.solPayment.value.destination;
            }
            
            setStatus("Confirm Transaction...");
            const nftMint = generateSigner(umi);

            await transactionBuilder()
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
                    confirm: { commitment: "finalized" }
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

            setStatus("Confirm Transaction...");
            
            await program.methods.buyNft()
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
                .rpc();

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
            setStatus(`Purchase failed: ${error.message || "Unknown error"}`);
        } finally {
            setIsMinting(false);
        }
    };

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

            <div className="relative w-full h-[200px] md:h-[260px] flex items-center justify-center perspective-1000 mt-2">
                {/* Navigation Arrows */}
                <button 
                    onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length); }}
                    className="absolute left-2 sm:left-6 z-50 p-2 md:p-3 rounded-full bg-black/40 hover:bg-primary text-white backdrop-blur-md transition-all border border-white/10 hover:scale-110"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % cards.length); }}
                    className="absolute right-2 sm:right-6 z-50 p-2 md:p-3 rounded-full bg-black/40 hover:bg-primary text-white backdrop-blur-md transition-all border border-white/10 hover:scale-110"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>

                <AnimatePresence>
                    {cards.map((card, index) => {
                        const offset = index - currentIndex;
                        // Wrap around logic for infinite feel
                        let displayOffset = offset;
                        if (offset > cards.length / 2) displayOffset -= cards.length;
                        if (offset < -cards.length / 2) displayOffset += cards.length;

                        const isCenter = displayOffset === 0;
                        const absOffset = Math.abs(displayOffset);
                        
                        const isSoldOut = card.type === 'candymachine' 
                            ? (card.totalMinted !== undefined && card.maxSupply !== undefined && card.totalMinted >= card.maxSupply)
                            : (card.nfts && card.nfts.length === 0);

                        return (
                            <motion.div
                                key={card.id}
                                className={`absolute w-[140px] h-[190px] md:w-[170px] md:h-[230px] ${isCenter ? 'cursor-pointer' : 'cursor-pointer'}`}
                                initial={false}
                                animate={{
                                    x: `${displayOffset * 85}%`,
                                    scale: 1 - absOffset * 0.15,
                                    zIndex: 50 - absOffset,
                                    opacity: 1 - absOffset * 0.4,
                                    filter: `blur(${absOffset * 2}px)`,
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                onClick={() => {
                                    if (isCenter) setExpandedCard(card);
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
                                            <img src={img} alt={`${card.title} - Layer ${i}`} className="w-full h-full object-cover" />
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
            <div className="flex items-center gap-1.5 mt-4 z-10">
                {cards.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
                    />
                ))}
            </div>

            {/* Expanded Modal */}
            <AnimatePresence>
                {expandedCard && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-2xl"
                        onClick={() => setExpandedCard(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 30 }}
                            className="bg-card w-full max-w-6xl h-[85vh] md:h-[75vh] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col md:flex-row relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button 
                                className="absolute top-6 right-6 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full z-20 transition-colors border border-white/10"
                                onClick={() => setExpandedCard(null)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>

                            {/* Left Side: Images */}
                            <div className="md:w-1/2 h-[40%] md:h-full relative bg-black/50">
                                {expandedCard.type === 'candymachine' ? (
                                    <>
                                        <img src={expandedCard.images[0]} alt={expandedCard.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-transparent to-transparent" />
                                        <div className="absolute bottom-8 left-8 text-white">
                                            <h2 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight leading-none mb-2">
                                                {expandedCard.title}
                                            </h2>
                                            <p className="text-primary font-bold tracking-widest uppercase text-sm">
                                                {expandedCard.subtitle}
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col">
                                        <div className="p-6 bg-black/40 backdrop-blur-md border-b border-white/10 z-10 absolute top-0 left-0 right-0">
                                            <h2 className="text-2xl font-black font-display uppercase tracking-tight text-white mb-1">
                                                {expandedCard.collection}
                                            </h2>
                                            <p className="text-xs text-primary font-bold tracking-widest uppercase">
                                                Select an NFT to Purchase
                                            </p>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-6 pt-28 custom-scrollbar">
                                            <div className="grid grid-cols-2 gap-4">
                                                {expandedCard.nfts?.map((nft) => (
                                                    <motion.div 
                                                        key={nft.mintAddress}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all shadow-lg ${selectedNFT?.mintAddress === nft.mintAddress ? 'border-primary shadow-primary/20' : 'border-transparent hover:border-white/20'}`}
                                                        onClick={() => setSelectedNFT(nft)}
                                                    >
                                                        <img src={nft.image} className="w-full aspect-square object-cover" />
                                                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-3 backdrop-blur-md border-t border-white/10">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] text-white/70 uppercase font-bold">Price</span>
                                                                <span className="text-sm font-mono text-primary font-black">{nft.price} SOL</span>
                                                            </div>
                                                        </div>
                                                        {selectedNFT?.mintAddress === nft.mintAddress && (
                                                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-1 rounded-full">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Details & Actions */}
                            <div className="md:w-1/2 p-8 md:p-12 flex flex-col bg-card/50 h-[60%] md:h-full overflow-y-auto">
                                
                                {expandedCard.type === 'candymachine' ? (
                                    <div className="flex flex-col h-full justify-center">
                                        <div className="space-y-8 mb-8">
                                            <p className="text-muted-foreground text-lg leading-relaxed">
                                                Blind mint a random NFT from the {expandedCard.title} collection. Try your luck and secure a potentially rare digital asset on the Solana blockchain.
                                            </p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-background/50 p-6 rounded-2xl border border-border">
                                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">Minted</p>
                                                    <p className="text-3xl font-mono font-black text-foreground">{expandedCard.totalMinted} <span className="text-sm text-muted-foreground font-sans font-normal">/ {expandedCard.maxSupply}</span></p>
                                                </div>
                                                <div className="bg-background/50 p-6 rounded-2xl border border-border">
                                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">Price</p>
                                                    <p className="text-3xl font-mono font-black text-primary">{expandedCard.price} <span className="text-sm text-muted-foreground font-sans font-normal">SOL</span></p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto">
                                            {expandedCard.totalMinted !== undefined && expandedCard.maxSupply !== undefined && expandedCard.totalMinted >= expandedCard.maxSupply ? (
                                                <button 
                                                    disabled 
                                                    className="w-full py-5 bg-red-500/20 text-red-500 rounded-2xl font-black text-lg uppercase tracking-widest cursor-not-allowed border border-red-500/50 transition-all shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                                                >
                                                    Sold Out
                                                </button>
                                            ) : (
                                                <button 
                                                    className="w-full py-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(var(--primary),0.2)] hover:shadow-[0_0_40px_rgba(var(--primary),0.4)] hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
                                                    onClick={() => handleMintCM(expandedCard.candyMachineId!)}
                                                    disabled={isMinting}
                                                >
                                                    {isMinting ? "Processing..." : "Mint Random NFT"}
                                                </button>
                                            )}
                                            {status && (
                                                <div className="mt-6 text-center text-sm font-mono font-bold bg-background/50 p-4 rounded-xl border border-border text-foreground animate-in fade-in slide-in-from-bottom-2">
                                                    {status}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full justify-center">
                                        <div className="space-y-6 mb-8">
                                            <h3 className="text-3xl font-black font-display uppercase tracking-tight text-foreground">Collection Details</h3>
                                            <p className="text-muted-foreground text-lg leading-relaxed">
                                                {selectedNFT 
                                                    ? "You have selected a specific asset from the collection. You can purchase it instantly to add it directly to your wallet."
                                                    : expandedCard.nfts && expandedCard.nfts.length === 0
                                                        ? `The ${expandedCard.collection} collection is completely sold out.`
                                                        : `Explore the entire ${expandedCard.collection} collection. Click on any NFT from the gallery on the left to view its specific price and purchase.`
                                                }
                                            </p>

                                            {selectedNFT ? (
                                                <motion.div 
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="bg-background/80 p-6 rounded-2xl border border-primary/30 space-y-4 shadow-[0_0_30px_rgba(var(--primary),0.1)]"
                                                >
                                                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                                        <span className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Asset Hash</span>
                                                        <span className="text-sm font-mono font-bold text-foreground bg-white/5 px-3 py-1 rounded-full">{selectedNFT.mintAddress.slice(0, 10)}...</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Price</span>
                                                        <span className="text-3xl font-mono font-black text-primary">{selectedNFT.price} SOL</span>
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                 <div className="bg-background/30 p-8 rounded-2xl border border-dashed border-white/10 text-center flex flex-col items-center justify-center space-y-3">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                                    <span className="text-sm text-muted-foreground font-bold uppercase tracking-widest">{expandedCard.nfts && expandedCard.nfts.length === 0 ? "Sold Out" : "Waiting for selection"}</span>
                                                 </div>
                                            )}
                                        </div>

                                        <div className="mt-auto">
                                            {expandedCard.nfts && expandedCard.nfts.length === 0 ? (
                                                <button 
                                                    disabled 
                                                    className="w-full py-5 bg-red-500/20 text-red-500 rounded-2xl font-black text-lg uppercase tracking-widest cursor-not-allowed border border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                                                >
                                                    Sold Out
                                                </button>
                                            ) : !selectedNFT ? (
                                                <button 
                                                    disabled 
                                                    className="w-full py-5 bg-foreground/10 text-foreground/40 rounded-2xl font-black text-lg uppercase tracking-widest cursor-not-allowed border border-white/5"
                                                >
                                                    Select an NFT to Buy
                                                </button>
                                            ) : (
                                                <button 
                                                    className="w-full py-5 bg-foreground hover:bg-foreground/90 text-background rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
                                                    onClick={() => handleBuyDirect(selectedNFT.mintAddress)}
                                                    disabled={isMinting}
                                                >
                                                    {isMinting ? "Processing..." : "Buy Now"}
                                                </button>
                                            )}
                                            {status && (
                                                <div className="mt-6 text-center text-sm font-mono font-bold bg-background/50 p-4 rounded-xl border border-border text-foreground animate-in fade-in slide-in-from-bottom-2">
                                                    {status}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
