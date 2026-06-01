"use client";

import { FC, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { useLaunchpad } from "@/hooks/useLaunchpad";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { ExtensionType } from "@solana/spl-token";
import { X } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    token: any; // TokenAccountInfo
    onListComplete: () => void;
}

export const TokenListingModal: FC<Props> = ({ isOpen, onClose, token, onListComplete }) => {
    const { listTokenSecondary } = useLaunchpad();
    const { publicKey } = useWallet();
    const { metadata, loading: metadataLoading } = useTokenMetadata(token.mint);
    
    const [amount, setAmount] = useState("");
    const [price, setPrice] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const maxBalance = Number(token.amount) / Math.pow(10, token.decimals);

    // Assess blocking extensions
    const activeExtensions = metadata?.extensions || [];
    const hasTransferFee = activeExtensions.includes(ExtensionType.TransferFeeConfig);
    const hasNonTransferable = activeExtensions.includes(ExtensionType.NonTransferable);
    const hasDefaultFrozen = activeExtensions.includes(ExtensionType.DefaultAccountState);
    const hasTransferHook = activeExtensions.includes(ExtensionType.TransferHook);
    const hasMemoTransfer = activeExtensions.includes(ExtensionType.MemoTransfer);

    const getBlockingWarning = () => {
        if (metadataLoading) return null;
        if (!metadata) return null;

        if (hasNonTransferable) {
            return {
                title: "Soulbound Token Locked",
                msg: "This token has the Non-Transferable (Soulbound) extension active. It is bound to your wallet and cannot be transferred or listed for sale.",
                icon: "🔒"
            };
        }
        if (hasTransferFee) {
            return {
                title: "Transfer Fee Token Disabled",
                msg: "This token has a Transfer Fee enabled. Listing is disabled to prevent buyer purchase failure due to on-chain fee deductions in the escrow account.",
                icon: "💸"
            };
        }
        if (hasDefaultFrozen) {
            return {
                title: "Frozen Default Account State",
                msg: "This token freezes new accounts by default. It cannot be safely deposited into the secondary marketplace escrow account.",
                icon: "❄️"
            };
        }
        if (hasTransferHook) {
            return {
                title: "Transfer Hook Active",
                msg: "This token requires custom transfer validation instructions not supported by the secondary market escrow contract.",
                icon: "⚓"
            };
        }
        if (hasMemoTransfer) {
            return {
                title: "Memo Transfer Required",
                msg: "This token requires transaction memo text for all incoming transfers, which is not supported by standard escrow contracts.",
                icon: "📝"
            };
        }
        return null;
    };

    const blockingWarning = getBlockingWarning();

    const handleList = async () => {
        if (blockingWarning) return;
        if (!publicKey || !amount || !price || isNaN(Number(amount)) || isNaN(Number(price))) return;
        
        const amountNum = parseFloat(amount);
        const priceNum = parseFloat(price);

        if (amountNum <= 0) {
            setError("Amount must be greater than zero.");
            return;
        }

        if (amountNum > maxBalance) {
            setError(`Insufficient balance. Maximum is ${maxBalance}`);
            return;
        }

        if (priceNum <= 0) {
            setError("Price must be greater than zero.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            console.log(`Listing ${amountNum} of mint ${token.mint.toBase58()} for ${priceNum} SOL`);
            const tx = await listTokenSecondary(token.mint, amountNum, priceNum);
            console.log("Token Listed Successfully. Signature:", tx);
            toast.success(`Token listed successfully! TX: ${tx.slice(0, 8)}...${tx.slice(-8)}`);
            onListComplete();
            onClose();
        } catch (err: any) {
            console.error("Listing failed:", err);
            setError(err.message || "Failed to list token. Please check console.");
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
                            <div className="p-6 relative">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-2xl font-black text-foreground uppercase italic font-display">
                                        List Token for Sale
                                    </h3>
                                    <button
                                        onClick={onClose}
                                        className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors border border-border"
                                        aria-label="Close modal"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 bg-muted p-3 rounded-xl border border-border">
                                        {metadataLoading ? (
                                            <div className="w-12 h-12 rounded-full bg-muted-foreground/20 animate-pulse" />
                                        ) : metadata?.image ? (
                                            <img 
                                                src={metadata.image} 
                                                alt={metadata.name} 
                                                className="w-12 h-12 rounded-full object-cover bg-muted"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-mono">
                                                No Img
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold text-foreground">
                                                {metadataLoading ? "Loading..." : metadata?.name || "Unknown Token"}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                Mint: {token.mint.toBase58().slice(0, 4)}...{token.mint.toBase58().slice(-4)}
                                            </p>
                                        </div>
                                    </div>

                                    {blockingWarning ? (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 space-y-2">
                                            <div className="font-bold flex items-center gap-1.5 text-red-400">
                                                <span>{blockingWarning.icon}</span>
                                                <span>{blockingWarning.title}</span>
                                            </div>
                                            <p className="text-muted-foreground/90 font-medium leading-relaxed">
                                                {blockingWarning.msg}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                                                        Amount
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={amount}
                                                        onChange={(e) => setAmount(e.target.value)}
                                                        placeholder={`Max ${maxBalance.toFixed(2)}`}
                                                        className="w-full bg-background border border-border rounded-xl p-3 text-base font-bold focus:ring-2 focus:ring-primary/50 outline-none font-mono"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                                                        Total Price (SOL)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={price}
                                                        onChange={(e) => setPrice(e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full bg-background border border-border rounded-xl p-3 text-base font-bold focus:ring-2 focus:ring-primary/50 outline-none font-mono"
                                                    />
                                                </div>
                                            </div>

                                            <div className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl flex flex-col gap-1.5">
                                                <div className="flex justify-between items-center font-bold text-amber-600">
                                                    <span>Listing Details</span>
                                                    <span className="text-[10px] uppercase font-mono bg-amber-500/20 px-1.5 py-0.5 rounded">Security Fee</span>
                                                </div>
                                                <div className="flex justify-between mt-1 text-foreground font-semibold">
                                                    <span className="font-medium text-muted-foreground">Platform Listing Fee</span>
                                                    <span>2% on Sale</span>
                                                </div>
                                                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                                    <span>*Tokens will be securely held in Escrow</span>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {error && (
                                        <p className="text-destructive text-sm font-bold">{error}</p>
                                    )}

                                    <button
                                        onClick={handleList}
                                        disabled={isLoading || (!blockingWarning && (!amount || !price)) || !publicKey || !!blockingWarning}
                                        className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? "Listing..." : blockingWarning ? "Listing Blocked" : "Confirm Listing"}
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
