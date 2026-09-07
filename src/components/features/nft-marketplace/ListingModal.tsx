"use client";

import { FC, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { SystemProgram, PublicKey, LAMPORTS_PER_SOL, SYSVAR_RENT_PUBKEY, ComputeBudgetProgram } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { findListingAddress, findEscrowAddress, PROGRAM_ID, IDL } from "@/utils/program";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { withSolanaRetry, createConfirmedProvider } from "@/utils/solanaRetry";
import { X, Loader2 } from "lucide-react";

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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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

                const provider = createConfirmedProvider(connection, wallet);
                
                // DEBUG: Log values to identify undefined
                console.log("IDL:", IDL);
                console.log("Imported PROGRAM_ID:", PROGRAM_ID.toBase58());
                
                // Use imported constants
                const program = new Program(IDL as any, provider as any);

                console.log("Listing PDA:", listingPDA.toBase58());
                console.log("Escrow PDA:", escrowPDA.toBase58());

                const TREASURY_WALLET = new PublicKey("9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu");
                const LISTING_FEE = new BN(0.01 * LAMPORTS_PER_SOL);

                const signature = await withSolanaRetry(async () => {
                    return await program.methods
                        .listNft(listingPrice)
                        .accounts({
                            seller: wallet.publicKey,
                            mint: mintPubkey,
                            sellerTokenAccount: sellerTokenAccount,
                            listingAccount: listingPDA,
                            escrowTokenAccount: escrowPDA,
                            systemProgram: SystemProgram.programId,
                            tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // Standard Token Program
                            rent: SYSVAR_RENT_PUBKEY,
                        })
                        .preInstructions([
                            ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
                            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
                            SystemProgram.transfer({
                                fromPubkey: wallet.publicKey,
                                toPubkey: TREASURY_WALLET,
                                lamports: LISTING_FEE.toNumber(),
                            })
                        ])
                        .rpc({ skipPreflight: true });
                });

                // Dispatch global update event
                window.dispatchEvent(new Event('nft_listings_updated'));

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

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] overflow-y-auto overflow-x-hidden flex items-center justify-center p-3 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        className="relative w-full max-w-md my-auto bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] z-10"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0 bg-card">
                            <h3 className="text-xl sm:text-2xl font-black text-foreground uppercase italic font-display tracking-wide">
                                List for Sale
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors border border-border cursor-pointer"
                                aria-label="Close modal"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        
                        {/* Scrollable Body */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <div className="flex items-center gap-4 bg-muted p-3 rounded-xl border border-border">
                                <img 
                                    src={nft.image} 
                                    alt={nft.name} 
                                    className="w-16 h-16 rounded-lg object-cover bg-muted"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-foreground truncate">{nft.name}</p>
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
                                    className="w-full bg-background border border-border rounded-xl p-3 text-lg font-bold focus:ring-2 focus:ring-primary/50 outline-none font-mono"
                                />
                            </div>

                            <div className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl flex flex-col gap-1.5">
                                <div className="flex justify-between items-center font-bold text-amber-600">
                                    <span>Listing Details</span>
                                    <span className="text-[10px] uppercase font-mono bg-amber-500/20 px-1.5 py-0.5 rounded">Security Fee</span>
                                </div>
                                <div className="flex justify-between mt-1 text-foreground font-semibold">
                                    <span className="font-medium text-muted-foreground">Platform Fee</span>
                                    <span>0.01 SOL</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                    <span>*NFT will be securely held in Escrow</span>
                                </div>
                            </div>

                            {error && (
                                <p className="text-destructive text-sm font-bold">{error}</p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-border/50 bg-card shrink-0">
                            <button
                                onClick={handleList}
                                disabled={isLoading || !price || !wallet}
                                className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Listing on Solana...</span>
                                    </>
                                ) : (
                                    "Confirm Listing"
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};
