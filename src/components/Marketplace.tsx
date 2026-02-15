"use client";

import { FC, useState } from "react";
import { motion } from "framer-motion";
import { useLaunchpad, BondingCurveAccount } from "../hooks/useLaunchpad";
import { useTokenMetadata } from "../hooks/useTokenMetadata";
import { CompanyDetailModal } from "./CompanyDetailModal";
import { BN } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const MarketplaceItem = ({ curve, onClick }: { curve: BondingCurveAccount, onClick: () => void }) => {
    const { metadata } = useTokenMetadata(curve.account.mint);
    
    // Calculate display price (Virtual Sol / Virtual Token) or just reserves ratio
    // Price = VirtualSol / VirtualToken
    const vSol = new BN(curve.account.virtualSolReserves);
    const vTok = new BN(curve.account.virtualTokenReserves);
    // Avoid division by zero, though virtual reserves ensure > 0
    const priceLamports = vTok.gt(new BN(0)) ? vSol.div(vTok).toNumber() : 0; // Very rough approximation
    // Better: Buy 1 token price
    // But for grid display, ratio is fine.
    // Wait, vSol is large, vTok is large. vSol/vTok might be < 1 if lots of tokens.
    // Let's just show Price per Token in SOL.
    // If vSol/vTok ~ 0 (e.g. 30 SOL / 1000000 Tokens), checks precision.
    // BN div is integer division. We need float.
    const price = Number(curve.account.virtualSolReserves) / Number(curve.account.virtualTokenReserves);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={onClick}
        >
            <div className="aspect-square w-full bg-muted relative overflow-hidden">
                {metadata?.image ? (
                    <img src={metadata.image} alt={metadata.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">Loading...</div>
                )}
                
                {metadata?.isToken2022 && (
                     <div className="absolute top-3 left-3 z-10 bg-yellow-500/90 text-black font-bold px-2 py-1 rounded-md text-[10px] shadow-lg">
                         TOKEN-2022
                     </div>
                )}
            </div>

            <div className="p-4">
                <h3 className="font-bold text-foreground text-lg font-display uppercase truncate">{metadata?.name || "Unknown"}</h3>
                <p className="text-xs font-mono text-muted-foreground mb-4">{metadata?.symbol || "..."}</p>
                
                <div className="flex justify-between items-end">
                    <div>
                        <div className="text-[10px] text-muted-foreground uppercase">Price</div>
                        <div className="font-bold text-lg">{price.toFixed(6)} SOL</div>
                    </div>
                     <div className="text-right">
                        <div className="text-[10px] text-muted-foreground uppercase">Supply</div>
                        <div className="font-mono text-xs">{new BN(curve.account.realTokenReserves).toString()}</div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

interface MarketplaceProps {
    displayMode?: 'all' | 'user-listings' | 'mock-only' | 'real'; // Kept for compat
}

export const Marketplace: FC<MarketplaceProps> = () => {
    const { curves, loading } = useLaunchpad();
    const [selectedCurve, setSelectedCurve] = useState<BondingCurveAccount | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Identify filtered curves
    // Since metadata filtering requires metadata which is async, 
    // we can filter by mint address or just fetch all logic? 
    // For now, simpler: just map all curves. Search might be tricky without metadata loaded parent-side.
    // I'll skip search for now or implement CLIENT SIDE search inside Item? No.
    // Let's just render all.

    if (loading) {
        return <div className="text-center p-10">Loading Launchpad...</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <CompanyDetailModal 
                isOpen={!!selectedCurve} 
                onClose={() => setSelectedCurve(null)} 
                curve={selectedCurve} 
            />

            <div className="flex justify-between items-center mb-8">
                 <h2 className="text-3xl font-black font-display uppercase">Launchpad Market</h2>
                 <div className="text-sm text-muted-foreground">
                    {curves.length} Live Tokens
                 </div>
            </div>

            {curves.length === 0 ? (
                <div className="text-center p-20 text-muted-foreground border border-dashed border-border rounded-3xl">
                    No active tokens enabled for the Launchpad yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {curves.map((curve) => (
                        <MarketplaceItem 
                            key={curve.publicKey.toString()} 
                            curve={curve} 
                            onClick={() => setSelectedCurve(curve)} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

