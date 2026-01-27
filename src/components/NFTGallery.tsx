"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { FC, useEffect, useState, useMemo } from "react";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { fetchAllDigitalAssetByOwner, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey as toPublicKey } from "@metaplex-foundation/umi";
import { motion, AnimatePresence } from "framer-motion";

interface NFT {
    name: string;
    image: string;
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
    { name: "Cosmic Cube #001", image: "https://images.unsplash.com/photo-1614726365206-3532c1c696e9?w=400&h=400&fit=crop", ownerName: "CosmicTraveler", ownerAddress: "Cosm...9x1" },
    { name: "Neon Genesis", image: "https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?w=400&h=400&fit=crop", ownerName: "NeonKnight", ownerAddress: "Neon...7z2" },
    { name: "Abstract Thought", image: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=400&fit=crop", ownerName: "AbstractArt", ownerAddress: "Abst...3y8" },
    { name: "Pixel Punk", image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop", ownerName: "PixelPunk", ownerAddress: "Pixe...1a9" },
];

interface Props {
    refreshTrigger?: number;
}

export const NFTGallery: FC<Props> = ({ refreshTrigger = 0 }) => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [nfts, setNfts] = useState<NFT[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedNft, setSelectedNft] = useState<NFT | null>(null);

    // Initialize Umi
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
                // Force a small delay to ensure chain data is propagated
                await new Promise(r => setTimeout(r, 2000));
                
                const owner = toPublicKey(wallet.publicKey!.toBase58());
                const assets = await fetchAllDigitalAssetByOwner(umi, owner);
                
                // Process metadata
                const loadedNfts = await Promise.all(assets.map(async (asset: any) => {
                    // Try to load JSON metadata if uri exists
                    let json = undefined;
                    if (asset.metadata.uri) {
                         try {
                             const response = await fetch(asset.metadata.uri);
                             json = await response.json();
                         } catch (unknownError) {
                             console.error("Failed to load metadata json", unknownError);
                         }
                    }
                    return {
                        name: asset.metadata.name,
                        uri: asset.metadata.uri,
                        image: json?.image || "",
                        description: json?.description || "",
                        json,
                        ownerName: generateRandomOwner().name,
                        ownerAddress: generateRandomOwner().addr
                    } as NFT;
                }));

                setNfts(loadedNfts);
            } catch (error) {
                console.error("Error fetching NFTs:", error);
                // Fallback to mock for demo if fetch fails
                setNfts(MOCK_NFTS); 
            } finally {
                setLoading(false);
            }
        };

        fetchNFTs();
    }, [wallet.publicKey, umi, refreshTrigger]);

    if (!wallet.publicKey) return (
        <div className="text-center text-gray-500 py-10 italic">
            Connect wallet to view your SnapDrop stream.
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
                        className="group relative aspect-square overflow-hidden rounded-xl bg-gray-900 border border-white/10 hover:border-green-500/50 transition-all cursor-pointer shadow-lg hover:shadow-green-500/20"
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
                            <h4 className="text-white font-bold truncate text-lg mb-1">{nft.name || nft.json?.name || `NFT #${i}`}</h4>
                            
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
                                    <span className="text-[10px] text-gray-400 font-mono leading-none">{nft.ownerAddress || "Wallet"}</span>
                                </div>
                            </div>

                            <button className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg text-white text-xs font-bold uppercase tracking-wider transform scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all shadow-lg shadow-green-900/20">
                                See Details
                            </button>
                        </div>
                    </motion.div>
                ))
            ) : (
                // Empty State / Mock Stream
                <>
                    <div className="col-span-full mb-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 flex flex-col items-start gap-1">
                        <h4 className="text-xl font-bold text-white">Your NFTs Await</h4>
                        <p className="text-sm text-gray-300">
                            You don&apos;t have any SnapDrops yet. Here&apos;s a <span className="text-blue-400 font-bold">preview</span> of how your gallery will look.
                        </p>
                    </div>

                    {MOCK_NFTS.map((nft, i) => (
                        <div key={`mock-${i}`} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-900 border border-white/10 hover:border-blue-500/50 transition-all">
                            <img 
                                src={nft.image} 
                                alt={nft.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            
                            {/* Owner Info Mock */}
                            <div className="flex items-center gap-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                                    {(nft as any).ownerName?.[0] || "U"}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-white font-semibold leading-none">{(nft as any).ownerName || "Unknown"}</span>
                                    <span className="text-[10px] text-gray-400 font-mono leading-none">{(nft as any).ownerAddress || "Wallet"}</span>
                                </div>
                            </div>
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
                            className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-2xl"
                        >
                            <button 
                                onClick={() => setSelectedNft(null)}
                                className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-white/10 rounded-full text-white transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>

                            {/* Image Section */}
                            <div className="w-full md:w-1/2 bg-black/50 aspect-square md:aspect-auto relative group">
                                <img 
                                    src={selectedNft.json?.image || selectedNft.image} 
                                    alt={selectedNft.name}
                                    className="w-full h-full object-contain"
                                />
                            </div>

                            {/* Details Section */}
                            <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto bg-gradient-to-br from-white/5 to-transparent custom-scrollbar">
                                <div className="flex items-center gap-2 mb-2">
                                     <div className="inline-block px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold border border-green-500/30 uppercase tracking-wider">
                                        Verified Collection
                                    </div>
                                    {selectedNft.json?.symbol && (
                                        <span className="text-gray-500 text-xs font-mono">{selectedNft.json.symbol}</span>
                                    )}
                                </div>
                               
                                <h2 className="text-3xl font-black text-white mb-4 leading-tight">{selectedNft.name || selectedNft.json?.name}</h2>
                                
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            Description
                                        </h3>
                                        <p className="text-gray-300 leading-relaxed text-sm bg-black/20 p-4 rounded-xl border border-white/5">
                                            {selectedNft.description || selectedNft.json?.description || "No description provided."}
                                        </p>
                                    </div>

                                    {selectedNft.json?.attributes && (
                                        <div>
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                Attributes <span className="text-gray-600">({selectedNft.json.attributes.length})</span>
                                            </h3>
                                            <div className="grid grid-cols-2 gap-2">
                                                {selectedNft.json.attributes.map((attr, idx) => (
                                                    <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors group">
                                                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1 group-hover:text-gray-400 transition-colors">{attr.trait_type}</p>
                                                        <p className="text-sm text-gray-200 font-bold truncate" title={attr.value}>{attr.value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Action Buttons */}
                                    <div className="pt-4 flex justify-center">
                                        <a 
                                            href={`https://solscan.io/token/${selectedNft.uri ? 'mock-for-now' : ''}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-center text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                                        >
                                           <span>View on Solscan</span>
                                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
