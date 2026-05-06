"use client";

import { FC, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { findListingAddress, findEscrowAddress, PROGRAM_ID, IDL } from "@/utils/program";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";

// NOTE: Since we don't have the Anchor Provider fully wired up with IDL in this snippet,
// we will simulate the Instruction construction or use a simulated "Safe Mode" if Program ID is mock.

interface Props {
    isOpen: boolean;
    onClose: () => void;
    nft: any; 
    onListComplete: (price: number, signature: string) => void;
}

// Global Treasury Wallet from Requirements


export const ListingModal: FC<Props> = ({ isOpen, onClose, nft, onListComplete }) => {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const [price, setPrice] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleList = async () => {
        if (!wallet || !price || isNaN(Number(price))) return;
        
        setIsLoading(true);
        setError("");

        try {
            const priceNum = parseFloat(price);
            const listingPrice = new BN(priceNum * LAMPORTS_PER_SOL);
            
            // --- NEW PDA LOGIC ---
            if (nft.mint) {
                const mintPubkey = new PublicKey(nft.mint);
                const [listingPDA] = findListingAddress(mintPubkey, wallet.publicKey);
                const [escrowPDA] = findEscrowAddress(mintPubkey, wallet.publicKey);
                const sellerTokenAccount = await getAssociatedTokenAddress(mintPubkey, wallet.publicKey);

                const provider = new AnchorProvider(connection, wallet, {});
                
                // DEBUG: Log values to identify undefined
                console.log("IDL:", IDL);
                console.log("Imported PROGRAM_ID:", PROGRAM_ID.toBase58());
                
                // Use imported constants
                const program = new Program(IDL as any, provider as any);

                console.log("Listing PDA:", listingPDA.toBase58());
                console.log("Escrow PDA:", escrowPDA.toBase58());

                const TREASURY_WALLET = new PublicKey("9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu");
                const LISTING_FEE = new BN(0.01 * LAMPORTS_PER_SOL);

                const signature = await program.methods
                    .listNft(listingPrice)
                    .accounts({
                        seller: wallet.publicKey,
                        mint: mintPubkey,
                        sellerTokenAccount: sellerTokenAccount,
                        listingAccount: listingPDA,
                        escrowTokenAccount: escrowPDA,
                        systemProgram: SystemProgram.programId,
                        tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // Standard Token Program
                    })
                    .preInstructions([
                        SystemProgram.transfer({
                            fromPubkey: wallet.publicKey,
                            toPubkey: TREASURY_WALLET,
                            lamports: LISTING_FEE.toNumber(),
                        })
                    ])
                    .rpc();
                
                await connection.confirmTransaction(signature, "confirmed");

                // Pass the signature so UI can update
                onListComplete(priceNum, signature);
                onClose();
                return;
            }

        } catch (err: any) {
            console.error("Listing failed full error:", err);
            // Try to extract logs if available
            if (err.logs) {
                console.error("Transaction Logs:", err.logs);
            }
            setError("Failed to list item. Check console for details.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md p-6"
                    >
                        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                            <div className="p-6">
                                <h3 className="text-2xl font-black text-foreground uppercase italic font-display mb-4">
                                    List for Sale
                                </h3>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 bg-muted p-3 rounded-xl border border-border">
                                        <img 
                                            src={nft.image} 
                                            alt={nft.name} 
                                            className="w-16 h-16 rounded-lg object-cover"
                                        />
                                        <div>
                                            <p className="font-bold text-foreground">{nft.name}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{nft.mint?.slice(0, 4)}...{nft.mint?.slice(-4)}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                                            Price (SOL)
                                        </label>
                                        <input
                                            type="number"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-background border border-border rounded-xl p-3 text-lg font-bold focus:ring-2 focus:ring-primary/50 outline-none"
                                        />
                                    </div>

                                    <div className="text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                                        <p className="font-bold text-yellow-600 mb-1">Listing Info</p>
                                        <div className="flex justify-between">
                                            <span>Platform Fee</span>
                                            <span>0.01 SOL</span>
                                        </div>
                                        <div className="flex justify-between mt-1 text-[10px] opacity-80">
                                            <span>*NFT will be moved to Escrow</span>
                                        </div>
                                    </div>

                                    {error && (
                                        <p className="text-destructive text-sm font-bold">{error}</p>
                                    )}

                                    <button
                                        onClick={handleList}
                                        disabled={isLoading || !price || !wallet}
                                        className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? "Listing..." : "Confirm Listing"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
