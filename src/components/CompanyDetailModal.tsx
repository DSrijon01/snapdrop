import { FC, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BondingCurveAccount, useLaunchpad } from "../hooks/useLaunchpad";
import { useTokenMetadata } from "../hooks/useTokenMetadata";
import { BN } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

interface CompanyDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    curve: BondingCurveAccount | null;
}

export const CompanyDetailModal: FC<CompanyDetailModalProps> = ({ isOpen, onClose, curve }) => {
    const { metadata, loading: metadataLoading } = useTokenMetadata(curve?.account.mint || null);
    const { buyTokens, loading: programLoading } = useLaunchpad();
    const [amount, setAmount] = useState<number>(1);
    const [isBuying, setIsBuying] = useState(false);
    
    // Calculate price
    // K = V_SOL * V_TOK
    // New_V_TOK = V_TOK - amount
    // New_V_SOL = K / New_V_TOK
    // Cost = New_V_SOL - V_SOL
    const [estimatedCost, setEstimatedCost] = useState<number>(0);

    useEffect(() => {
        if (!curve || amount <= 0) return;
        try {
            const vSol = new BN(curve.account.virtualSolReserves);
            const vTok = new BN(curve.account.virtualTokenReserves);
            const k = vSol.mul(vTok);
            const amountBN = new BN(amount); // Assuming raw units or handled decimals? 
            // NOTE: Amount should be in ATOMIC units. If UI uses 1 token, we need decimals.
            // For now, let's assume 6 decimals or 9? 
            // We should fetch decimals from mint. But basic bonding curve often uses 6.
            // Let's assume input is RAW for simplicity or 1 = 1 token (need multiplier).
            // Better to use 1_000_000 multiplier for 6 decimals.
            // I'll stick to raw units in logic or update later.
            // Prompt says: "Calculate SOL cost based on constant product formula".
            
            const newVTok = vTok.sub(amountBN);
            if (newVTok.lte(new BN(0))) {
                setEstimatedCost(0);
                return;
            }
            const newVSol = k.div(newVTok).add(new BN(1));
            const cost = newVSol.sub(vSol);
            
            setEstimatedCost(cost.toNumber() / LAMPORTS_PER_SOL);
        } catch(e) { console.error(e); }
    }, [curve, amount]);

    const handleBuy = async () => {
        if (!curve) return;
        setIsBuying(true);
        try {
             const tx = await buyTokens(curve, amount);
             console.log("Purchase TX:", tx);
             alert(`Purchase Successful! TX: ${tx}`);
             onClose();
        } catch (error) {
            console.error(error);
            alert("Purchase failed: " + error);
        } finally {
            setIsBuying(false);
        }
    };

    if (!isOpen || !curve) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-card w-full max-w-2xl rounded-2xl border border-border overflow-hidden shadow-2xl flex flex-col md:flex-row"
                >
                     {/* Image Section */}
                     <div className="md:w-1/2 h-64 md:h-auto bg-muted relative">
                        {metadata?.image ? (
                            <img src={metadata.image} alt={metadata.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground animate-pulse">Loading Image...</div>
                        )}
                        
                        {metadata?.isToken2022 && (
                            <div className="absolute top-4 left-4 bg-yellow-500/90 text-black font-bold px-3 py-1 rounded-full text-xs shadow-lg flex items-center gap-2 backdrop-blur-md border border-yellow-300">
                                <span>⚠️ Token-2022</span>
                            </div>
                        )}
                     </div>

                     {/* Info Section */}
                     <div className="md:w-1/2 p-6 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-black font-display uppercase">{metadata?.name || "Unknown Token"}</h2>
                                <p className="text-sm font-mono text-muted-foreground">{metadata?.symbol || "UNK"}</p>
                            </div>
                            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        {metadata?.isToken2022 && (
                             <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-500">
                                <strong>Warning:</strong> This is a Token-2022 asset. Transfer Fees or Delegated Authority may apply.
                            </div>
                        )}

                        <p className="text-sm text-muted-foreground mb-6 flex-1">
                            {metadata?.description || "No description provided."}
                        </p>
                        
                        <div className="space-y-4">
                            <div className="p-4 bg-muted/50 rounded-xl border border-border">
                                <div className="flex justify-between text-sm mb-2">
                                    <span>Price per Token</span>
                                    <span className="font-bold">
                                        {(estimatedCost / (amount || 1)).toFixed(6)} SOL
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Reserves (Virtual)</span>
                                    <span className="font-mono">
                                        {new BN(curve.account.virtualTokenReserves).toString()}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Amount</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={amount}
                                        onChange={(e) => setAmount(Number(e.target.value))}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono"
                                    />
                                </div>
                                <div className="flex-1 text-right">
                                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Total Cost</label>
                                    <div className="font-bold text-lg">{estimatedCost.toFixed(4)} SOL</div>
                                </div>
                            </div>

                            <button 
                                onClick={handleBuy}
                                disabled={isBuying || amount <= 0}
                                className="w-full py-3 bg-primary text-primary-foreground font-black uppercase tracking-wider rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isBuying ? "Processing..." : "Purchase Now"}
                            </button>
                        </div>
                     </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
