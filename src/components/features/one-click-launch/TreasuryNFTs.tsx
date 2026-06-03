import { FC, useState } from 'react';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useSsNftGallery } from '@/hooks/useSsNftGallery';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { useTokenMetadata, getTokenMetadataWithCache } from '@/hooks/useTokenMetadata';
import { CarouselItem } from '@/app/snbl/_components/StackedNFTGallery';
import { umi } from '@/utils/umi';
import { findMetadataPda, fetchMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { publicKey } from '@metaplex-foundation/umi';

export type TokenAccountInfo = {
    mint: PublicKey;
    amount: bigint;
    decimals: number;
    programId: PublicKey;
};

interface TreasuryNFTsProps {
    nfts: TokenAccountInfo[];
}

const NFTCard: FC<{ nft: TokenAccountInfo; isSelected: boolean; onSelect: () => void }> = ({ nft, isSelected, onSelect }) => {
    const { metadata, loading } = useTokenMetadata(nft.mint);
    
    return (
        <div 
            onClick={onSelect}
            className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col gap-4 shadow-sm transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'}`}
        >
            <div className="flex items-center gap-4">
                 {loading ? (
                    <div className="w-16 h-16 rounded-lg bg-muted animate-pulse" />
                 ) : metadata?.image ? (
                    <img 
                        src={metadata.image} 
                        alt={metadata.name} 
                        className="w-16 h-16 rounded-lg object-cover bg-muted" 
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/400?text=No+Image";
                        }}
                    />
                ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground text-center p-1">
                        No Img
                    </div>
                )}
                <div className="flex-1 overflow-hidden">
                     <h3 className="font-bold text-lg truncate">{metadata?.name || "Unknown NFT"}</h3>
                     <p className="text-sm text-muted-foreground truncate">{metadata?.symbol || "UNK"}</p>
                </div>
                <div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                        {isSelected && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                </div>
            </div>
            <div className="text-xs text-muted-foreground break-all">
                Mint: {nft.mint.toBase58()}
            </div>
        </div>
    );
};

export const TreasuryNFTs: FC<TreasuryNFTsProps> = ({ nfts }) => {
    const [selectedMints, setSelectedMints] = useState<string[]>([]);
    const [stackTitle, setStackTitle] = useState("");
    const [stackPrice, setStackPrice] = useState("1.0");
    const [status, setStatus] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const wallet = useWallet();
    const { connection } = useConnection();
    const { program } = useSsNftGallery();

    const toggleSelection = (mintStr: string) => {
        setSelectedMints(prev => 
            prev.includes(mintStr) ? prev.filter(m => m !== mintStr) : [...prev, mintStr]
        );
    };

    const handleListStack = () => {
        if (selectedMints.length === 0) return setStatus("Select at least one NFT.");
        if (!stackTitle) return setStatus("Provide a Stack Title.");
        
        setStatus("Preparing stack... Please wait.");
        setIsLoading(true);
        buildAndListStack();
    };

    const buildAndListStack = async () => {
        try {
            const selectedNfts = nfts.filter(n => selectedMints.includes(n.mint.toBase58()));
            const price = parseFloat(stackPrice || "0");
            
            if (!wallet.publicKey || !program) {
                setStatus("Wallet not connected.");
                return;
            }

            const priceLamports = new BN(price * 1e9);

            // 1. On-Chain Listing
            for (const nft of selectedNfts) {
                const mintPubkey = nft.mint;
                
                const [listingPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("gallery_listing"), mintPubkey.toBuffer(), wallet.publicKey.toBuffer()],
                    program.programId
                );

                const [escrowPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("gallery_vault"), mintPubkey.toBuffer(), wallet.publicKey.toBuffer()],
                    program.programId
                );

                const adminTokenAccount = await getAssociatedTokenAddress(mintPubkey, wallet.publicKey);

                await program.methods.listNft(priceLamports)
                    .accounts({
                        admin: wallet.publicKey,
                        mint: mintPubkey,
                        adminTokenAccount: adminTokenAccount,
                        listingAccount: listingPda,
                        escrowTokenAccount: escrowPda,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        rent: SYSVAR_RENT_PUBKEY,
                    } as any)
                    .rpc();
            }

            const nftsData = await Promise.all(selectedNfts.map(async (nft) => {
                let imageUrl = "";
                try {
                    const meta = await getTokenMetadataWithCache(nft.mint, connection, umi);
                    imageUrl = meta?.image || "";
                } catch (err) {
                    console.error("Failed to fetch metadata for", nft.mint.toBase58(), err);
                }
                
                return { mintAddress: nft.mint.toBase58(), image: imageUrl, price };
            }));

            const images = nftsData.map(n => n.image).filter(i => i !== "");

            const newGalleryCard: CarouselItem = {
                id: `treasury-stack-${Date.now()}`,
                type: "direct",
                title: stackTitle,
                subtitle: "Treasury Stack",
                collection: "Treasury Vault",
                images: images.length > 0 ? images : ["https://via.placeholder.com/150"],
                nfts: nftsData,
                adminWallet: wallet.publicKey.toBase58() // Save admin wallet to know who to pay
            };

            const existing = JSON.parse(localStorage.getItem("street_sync_nft_gallery") || "[]");
            localStorage.setItem("street_sync_nft_gallery", JSON.stringify([newGalleryCard, ...existing]));
            window.dispatchEvent(new Event("gallery_updated"));

            setStatus(`✅ Success! Stack "${stackTitle}" Listed to Gallery.`);
            setSelectedMints([]);
            setStackTitle("");
        } catch(e: any) {
             setStatus(`Error: ${e.message}`);
        } finally {
             setIsLoading(false);
        }
    };

    return (
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xl">
            <h2 className="text-2xl font-black font-display uppercase tracking-tight text-foreground mb-6">
                Treasury NFTs
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold uppercase tracking-wider">Your NFTs</h3>
                        <span className="text-xs font-bold bg-white/5 px-2 py-1 rounded-full">{nfts.length} Total</span>
                    </div>
                    {nfts.length === 0 ? (
                        <p className="text-muted-foreground">No NFTs found in Treasury.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {nfts.map(nft => {
                                const mintStr = nft.mint.toBase58();
                                return (
                                    <NFTCard 
                                        key={mintStr} 
                                        nft={nft} 
                                        isSelected={selectedMints.includes(mintStr)}
                                        onSelect={() => toggleSelection(mintStr)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="bg-background border border-border rounded-2xl p-6 h-fit sticky top-6">
                    <h3 className="text-lg font-bold uppercase tracking-wider mb-6 pb-4 border-b border-white/5">
                        Stack Configuration
                    </h3>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">Stack Title</label>
                            <input value={stackTitle} onChange={e => setStackTitle(e.target.value)} type="text" placeholder="e.g. Rare Collectibles" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground focus:border-primary outline-none transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2 tracking-wider">Price per NFT (SOL)</label>
                            <input value={stackPrice} onChange={e => setStackPrice(e.target.value)} type="number" step="0.01" className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground focus:border-primary outline-none transition-colors" />
                        </div>
                        
                        <div className="bg-card/50 p-4 rounded-xl border border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-muted-foreground">Selected NFTs</span>
                                <span className="font-bold">{selectedMints.length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Total Value</span>
                                <span className="font-bold text-primary">{(selectedMints.length * parseFloat(stackPrice || "0")).toFixed(2)} SOL</span>
                            </div>
                        </div>

                        {status && (
                            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm font-mono font-bold text-primary break-all">
                                {status}
                            </div>
                        )}

                        <button 
                            onClick={handleListStack}
                            disabled={selectedMints.length === 0 || isLoading} 
                            className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-black text-lg uppercase tracking-widest transition-all shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Listing..." : "List Stack to Gallery"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
