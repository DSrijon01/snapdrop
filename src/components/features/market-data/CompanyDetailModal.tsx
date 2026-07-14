import { FC, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BondingCurveAccount, useLaunchpad } from "../../../hooks/useLaunchpad";
import { useTokenMetadata } from "../../../hooks/useTokenMetadata";
import { TokenBadge } from "../../global/wallet/TokenBadge";
import { BN } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import toast from "react-hot-toast";

interface CompanyDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    curve: any | null;
}

export const CompanyDetailModal: FC<CompanyDetailModalProps> = ({ isOpen, onClose, curve }) => {
    const { metadata, loading: metadataLoading } = useTokenMetadata(curve?.account.mint || null);
    const { buyTokens, buyTokensFixedPrice, loading: programLoading } = useLaunchpad();
    const [amount, setAmount] = useState<number>(1);
    const [isBuying, setIsBuying] = useState(false);
    
    // Calculate price
    const [estimatedCost, setEstimatedCost] = useState<number>(0);

    const isFixedPrice = !!curve?.account.pricePerToken;
    const decimals = curve?.decimals ?? 9;

    useEffect(() => {
        if (curve) {
            if (isFixedPrice) {
                const rem = Number(curve.account.remainingSupply) / Math.pow(10, decimals);
                setAmount(rem);
            } else {
                setAmount(1);
            }
        }
    }, [curve, isFixedPrice, decimals]);

    useEffect(() => {
        if (!curve || amount <= 0) return;
        try {
            if (isFixedPrice) {
                const pricePerToken = Number(curve.account.pricePerToken) / LAMPORTS_PER_SOL;
                setEstimatedCost(amount * pricePerToken);
            } else {
                const vSol = new BN(curve.account.virtualSolReserves);
                const vTok = new BN(curve.account.virtualTokenReserves);
                const k = vSol.mul(vTok);
                const amountBN = new BN(amount);
                
                const newVTok = vTok.sub(amountBN);
                if (newVTok.lte(new BN(0))) {
                    setEstimatedCost(0);
                    return;
                }
                const newVSol = k.div(newVTok).add(new BN(1));
                const cost = newVSol.sub(vSol);
                
                setEstimatedCost(cost.toNumber() / LAMPORTS_PER_SOL);
            }
        } catch(e) { console.error(e); }
    }, [curve, amount, isFixedPrice]);

    const handleBuy = async () => {
        if (!curve) return;
        setIsBuying(true);
        try {
             let tx = "";
             const purchaseInfo = {
                 mint: curve.account.mint.toBase58(),
                 amount: amount.toLocaleString(),
                 price: estimatedCost.toFixed(4),
                 name: metadata?.name || "Unknown",
                 symbol: metadata?.symbol || "UNK",
                 image: metadata?.image || "",
                 date: Date.now(),
                 signature: "",
                 type: "BUY"
             };

             if (isFixedPrice) {
                 tx = await buyTokensFixedPrice(curve, amount);
                 purchaseInfo.signature = tx;
                 
                 const existing = JSON.parse(localStorage.getItem("street_sync_token_purchases") || "[]");
                 localStorage.setItem("street_sync_token_purchases", JSON.stringify([purchaseInfo, ...existing]));
             } else {
                 tx = await buyTokens(curve, amount);
                 purchaseInfo.signature = tx;

                 const existing = JSON.parse(localStorage.getItem("street_sync_token_purchases") || "[]");
                 localStorage.setItem("street_sync_token_purchases", JSON.stringify([purchaseInfo, ...existing]));
             }
             
             // Dispatch global event for instant UI updates
             window.dispatchEvent(new Event("token_purchases_updated"));

             console.log("Purchase TX:", tx);
             toast.success(`Purchase Successful! TX: ${tx.slice(0, 10)}...${tx.slice(-10)}`);
             onClose();
        } catch (error: any) {
            console.error("Purchase failed", error);
            toast.error(`Purchase failed: ${error.message || error}`);
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
                            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-500 space-y-2">
                                <div>
                                    <strong>Warning:</strong> This is a Token-2022 asset. Active Extensions:
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {metadata.extensions && metadata.extensions.length > 0 ? (
                                        metadata.extensions.map((ext: number) => (
                                            <TokenBadge key={ext} type="EXTENSION" extensionType={ext} />
                                        ))
                                    ) : (
                                        <span className="text-[10px] text-yellow-500/60 italic">Standard behavior (no custom extensions)</span>
                                    )}
                                </div>
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
                                        {isFixedPrice 
                                            ? `${parseFloat((Number(curve.account.pricePerToken) / LAMPORTS_PER_SOL).toFixed(6))} SOL`
                                            : `${(estimatedCost / (amount || 1)).toFixed(6)} SOL`}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>{isFixedPrice ? "Remaining Supply" : "Reserves (Virtual)"}</span>
                                    <span className="font-mono">
                                        {isFixedPrice 
                                            ? (Number(curve.account.remainingSupply) / Math.pow(10, decimals)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
                                            : new BN(curve.account.virtualTokenReserves).toString()}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-bold uppercase text-muted-foreground block">Amount</label>
                                        {isFixedPrice && (
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    const maxVal = Number(curve.account.remainingSupply) / Math.pow(10, decimals);
                                                    setAmount(maxVal);
                                                }}
                                                className="text-[10px] text-primary hover:underline font-bold"
                                            >
                                                Use Max ({(Number(curve.account.remainingSupply) / Math.pow(10, decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })})
                                            </button>
                                        )}
                                    </div>
                                    <input 
                                        type="number" 
                                        step="any"
                                        min="0.0001"
                                        max={isFixedPrice ? (Number(curve.account.remainingSupply) / Math.pow(10, decimals)) : undefined}
                                        value={amount}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            const maxVal = isFixedPrice ? (Number(curve.account.remainingSupply) / Math.pow(10, decimals)) : Infinity;
                                            if (val > maxVal) {
                                                setAmount(maxVal);
                                            } else {
                                                setAmount(val);
                                            }
                                        }}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono"
                                    />
                                </div>
                                <div className="flex-1 text-right">
                                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Total Cost</label>
                                    <div className="font-bold text-lg">
                                        {isFixedPrice ? parseFloat(estimatedCost.toFixed(6)) : estimatedCost.toFixed(4)} SOL
                                    </div>
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
