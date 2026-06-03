"use client";

import { FC, useState } from "react";
import { motion } from "framer-motion";
import { useLaunchpad, BondingCurveAccount } from "../../../hooks/useLaunchpad";
import { useTokenMetadata, metadataCache } from "../../../hooks/useTokenMetadata";
import { CompanyDetailModal } from "../market-data/CompanyDetailModal";
import { BN } from "@coral-xyz/anchor";
import { TokenBadge } from "../../global/wallet/TokenBadge";
import { ExtensionType } from "@solana/spl-token";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const MarketplaceItem = ({ item, onClick }: { item: any, onClick: () => void }) => {
    const isFixedPrice = !!item.account.pricePerToken;
    const mint = item.account.mint;
    const { metadata } = useTokenMetadata(mint);
    const decimals = item.decimals ?? 9;
    
    let price = 0;
    let supply = "0";
    if (isFixedPrice) {
        price = Number(item.account.pricePerToken) / 1_000_000_000;
        supply = new BN(item.account.remainingSupply).toString();
    } else {
        price = Number(item.account.virtualSolReserves) / Number(item.account.virtualTokenReserves);
        supply = new BN(item.account.realTokenReserves).toString();
    }

    // Prefer curve properties since they are fetched directly from mint account in Launchpad
    const isToken2022 = item.isToken2022 || metadata?.isToken2022;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
            onClick={onClick}
        >
            <div className="aspect-square w-full bg-muted relative overflow-hidden shrink-0">
                {metadata?.image ? (
                    <img 
                        src={metadata.image} 
                        alt={metadata.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/400?text=No+Image";
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">Loading...</div>
                )}
                
                <div className="absolute top-3 right-3 z-10 flex gap-2">
                    {isToken2022 ? (
                        <TokenBadge type="TOKEN_2022" />
                    ) : (
                        <TokenBadge type="SPL" />
                    )}
                </div>
            </div>

            <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-foreground text-lg font-display uppercase truncate max-w-[150px]" title={metadata?.name}>{metadata?.name || "Unknown"}</h3>
                    {isFixedPrice && (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Fixed Price
                        </span>
                    )}
                </div>
                <p className="text-xs font-mono text-muted-foreground mb-3">{metadata?.symbol || "..."}</p>
                
                {metadata?.extensions && metadata.extensions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {metadata.extensions.map((ext: number) => (
                            <TokenBadge key={ext} type="EXTENSION" extensionType={ext} />
                        ))}
                    </div>
                )}
                
                <div className="flex justify-between items-end mt-auto">
                    <div>
                        <div className="text-[10px] text-muted-foreground uppercase">
                            {isFixedPrice ? "Price Per Token" : "Price"}
                        </div>
                        <div className="font-bold text-lg">
                            {isFixedPrice ? parseFloat(price.toFixed(6)) : price.toFixed(6)} SOL
                        </div>
                    </div>
                     <div className="text-right">
                        <div className="text-[10px] text-muted-foreground uppercase">Supply</div>
                        <div className="font-bold text-lg">
                            {(Number(supply) / Math.pow(10, decimals)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
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
    const { curves, fixedPriceVaults, loading } = useLaunchpad();
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [extensionFilter, setExtensionFilter] = useState<string>("all");

    const allItems = [...curves, ...fixedPriceVaults];

    // Filter items based on search term and extension type selection
    const filteredItems = allItems.filter((item: any) => {
        const mintStr = item.account.mint.toBase58().toLowerCase();
        
        // Match search term against mint address, name, or symbol
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const meta = metadataCache[item.account.mint.toBase58()];
            const nameMatch = meta?.name?.toLowerCase().includes(term);
            const symbolMatch = meta?.symbol?.toLowerCase().includes(term);
            const mintMatch = mintStr.includes(term);
            if (!nameMatch && !symbolMatch && !mintMatch) {
                return false;
            }
        }

        // Match extension selection
        if (extensionFilter !== "all") {
            if (extensionFilter === "token-2022") {
                if (!item.isToken2022) return false;
            } else if (extensionFilter === "spl") {
                if (item.isToken2022) return false;
            } else {
                const extType = Number(extensionFilter);
                if (!item.activeExtensions?.includes(extType)) return false;
            }
        }

        return true;
    });

    if (loading && allItems.length === 0) {
        return <div className="text-center p-10">Loading Launchpad...</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <CompanyDetailModal 
                isOpen={!!selectedItem} 
                onClose={() => setSelectedItem(null)} 
                curve={selectedItem} 
            />

            <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-start md:items-center border-b border-border/40 pb-5">
                 <div>
                     <h2 className="text-3xl font-black font-display uppercase">Launchpad Market</h2>
                     <div className="text-sm text-muted-foreground mt-1">
                        {filteredItems.length} of {allItems.length} Live Tokens
                     </div>
                 </div>

                 <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                     {/* Search Input */}
                     <input
                         type="text"
                         placeholder="Search name, symbol, mint..."
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 transition-colors w-full sm:w-64"
                     />
                     {/* Extension Dropdown */}
                     <select
                         value={extensionFilter}
                         onChange={(e) => setExtensionFilter(e.target.value)}
                         className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 transition-colors cursor-pointer w-full sm:w-auto min-w-[200px]"
                     >
                         <option value="all">All Token Types</option>
                         <option value="spl">Standard SPL</option>
                         <option value="token-2022">Token-2022 (All)</option>
                         <option value="1">↳ Transfer Fee Config</option>
                         <option value="5">↳ Interest Bearing Config</option>
                         <option value="4">↳ Non-Transferable (Soulbound)</option>
                         <option value="8">↳ Permanent Delegate</option>
                         <option value="15">↳ Token Group Parent</option>
                     </select>
                 </div>
            </div>

            {filteredItems.length === 0 ? (
                <div className="text-center p-20 text-muted-foreground border border-dashed border-border rounded-3xl">
                    No active tokens match your search or filter options.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredItems.map((item: any) => (
                        <MarketplaceItem 
                            key={item.publicKey.toString()} 
                            item={item} 
                            onClick={() => setSelectedItem(item)} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

