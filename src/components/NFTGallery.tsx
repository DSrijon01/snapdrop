"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { FC, useEffect, useState } from "react";
import { Metaplex } from "@metaplex-foundation/js";
// import { PublicKey } from "@solana/web3.js"; // Unused

interface NFT {
    name: string;
    image: string;
    uri?: string;
    json?: {
        name?: string;
        image?: string;
    };
}

// Mock data for display when no NFTs found or for preview
const MOCK_NFTS: NFT[] = [
    { name: "Snap #001", image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80" },
    { name: "Snap #002", image: "https://images.unsplash.com/photo-1614812513172-567d2fe96a75?w=400&q=80" }, 
    { name: "Snap #003", image: "https://images.unsplash.com/photo-1637858868799-7f26a0640eb6?w=400&q=80" },
    { name: "Snap #004", image: "https://images.unsplash.com/photo-1642427749670-f20e2e76ed8c?w=400&q=80" },
];

interface Props {
    refreshTrigger?: number;
}

export const NFTGallery: FC<Props> = ({ refreshTrigger = 0 }) => {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [nfts, setNfts] = useState<NFT[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!publicKey) {
            setNfts([]);
            return;
        }

        const fetchNFTs = async () => {
            setLoading(true);
            try {
                const metaplex = Metaplex.make(connection);
                // Force a small delay to ensure chain data is propagated
                await new Promise(r => setTimeout(r, 2000));
                
                const userNfts = await metaplex.nfts().findAllByOwner({ owner: publicKey });
                
                // Process metadata
                const loadedNfts = await Promise.all(userNfts.map(async (nft: any) => {
                    // Try to load JSON metadata if uri exists
                    if (nft.uri) {
                         try {
                             const response = await fetch(nft.uri);
                             const json = await response.json();
                             return { ...nft, json } as NFT;
                         } catch (unknownError) { // Rename e to unknownError
                             return nft as NFT;
                         }
                    }
                    return nft as NFT;
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
    }, [publicKey, connection, refreshTrigger]);

    if (!publicKey) return (
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
                    <div key={i} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-900 border border-white/10 hover:border-green-500/50 transition-all">
                        <img 
                            src={nft.json?.image || nft.image || "https://placehold.co/400x400/121212/pink?text=NFT"} 
                            alt={nft.name || nft.json?.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white text-sm font-bold truncate">{nft.name || nft.json?.name || `NFT #${i}`}</p>
                        </div>
                    </div>
                ))
            ) : (
                // Empty State / Mock Stream
                <>
                    <div className="col-span-full mb-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 flex flex-col items-start gap-1">
                        <h4 className="text-xl font-bold text-white">Your NFTs Await</h4>
                        <p className="text-sm text-gray-300">
                            You don't have any SnapDrops yet. Here's a <span className="text-blue-400 font-bold">preview</span> of how your gallery will look.
                        </p>
                    </div>

                    {MOCK_NFTS.map((nft, i) => (
                        <div key={`mock-${i}`} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-900 border border-white/10 hover:border-blue-500/50 transition-all">
                            <img 
                                src={nft.image} 
                                alt={nft.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            {/* Clean hover effect only, no badges or text */}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
};
