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
import { resolveNftImageUrl, handleImageFallback } from "@/utils/nftImageResolver";
import { LayoutGrid, List } from "lucide-react";

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
            className="group relative bg-card border border-border rounded-xl sm:rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
            onClick={onClick}
        >
            <div className="aspect-square w-full bg-muted relative overflow-hidden shrink-0">
                {metadata?.image ? (
                    <img 
                        src={resolveNftImageUrl(metadata.image, metadata.name)} 
                        alt={metadata.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        onError={(e) => {
                            handleImageFallback(e, metadata.name);
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-mono">Loading...</div>
                )}
                
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex gap-1.5 sm:gap-2">
                    {isToken2022 ? (
                        <TokenBadge type="TOKEN_2022" className="px-1.5 py-0.5 text-[8px] sm:text-[10px] sm:px-2 sm:py-1" />
                    ) : (
                        <TokenBadge type="SPL" className="px-1.5 py-0.5 text-[8px] sm:text-[10px] sm:px-2 sm:py-1" />
                    )}
                </div>
            </div>

            <div className="p-2.5 sm:p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-0.5 sm:mb-1 gap-1">
                    <h3 className="font-bold text-foreground text-xs sm:text-lg font-display uppercase truncate max-w-[105px] sm:max-w-[150px]" title={metadata?.name}>
                        {metadata?.name || "Unknown"}
                    </h3>
                    {isFixedPrice && (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                            Fixed
                        </span>
                    )}
                </div>
                <p className="text-[10px] sm:text-xs font-mono text-muted-foreground mb-1.5 sm:mb-3 truncate">
                    {metadata?.symbol || "..."}
                </p>
                
                {metadata?.extensions && metadata.extensions.length > 0 && (
                    <div className="hidden sm:flex flex-wrap gap-1.5 mb-4">
                        {metadata.extensions.map((ext: number) => (
                            <TokenBadge key={ext} type="EXTENSION" extensionType={ext} />
                        ))}
                    </div>
                )}
                
                <div className="flex justify-between items-end mt-auto pt-1.5 sm:pt-0 border-t border-border/40 sm:border-0">
                    <div className="min-w-0">
                        <div className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-mono">
                            {isFixedPrice ? "Price" : "Price"}
                        </div>
                        <div className="font-bold text-xs sm:text-lg text-foreground truncate">
                            {isFixedPrice ? parseFloat(price.toFixed(4)) : parseFloat(price.toFixed(5))} <span className="text-[8px] sm:text-xs text-muted-foreground">SOL</span>
                        </div>
                    </div>
                     <div className="text-right shrink-0">
                        <div className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-mono">Supply</div>
                        <div className="font-bold text-xs sm:text-lg text-foreground font-mono">
                            {(Number(supply) / Math.pow(10, decimals)).toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact" })}
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
    const [mobileGrid, setMobileGrid] = useState<'grid' | 'single'>('grid');

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
        <div className="container mx-auto p-2.5 sm:p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <CompanyDetailModal 
                isOpen={!!selectedItem} 
                onClose={() => setSelectedItem(null)} 
                curve={selectedItem} 
            />

            <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-5 sm:mb-8 justify-between items-start md:items-center border-b border-border/40 pb-4 sm:pb-5">
                 <div className="flex items-center justify-between w-full md:w-auto">
                     <div>
                         <h2 className="text-xl sm:text-3xl font-black font-display uppercase tracking-tight">Launchpad Market</h2>
                         <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 font-mono">
                            {filteredItems.length} of {allItems.length} Live Tokens
                         </div>
                     </div>

                     {/* Mobile Layout Switcher: 2-Col Grid vs Single List */}
                     <div className="flex sm:hidden items-center bg-muted/60 border border-border rounded-xl p-0.5 shrink-0">
                         <button
                             type="button"
                             onClick={() => setMobileGrid('grid')}
                             className={`p-1.5 rounded-lg transition-all ${
                                 mobileGrid === 'grid'
                                     ? 'bg-background text-primary shadow-xs'
                                     : 'text-muted-foreground hover:text-foreground'
                             }`}
                             title="2-Column Grid View"
                             aria-label="2-Column Grid View"
                         >
                             <LayoutGrid size={15} />
                         </button>
                         <button
                             type="button"
                             onClick={() => setMobileGrid('single')}
                             className={`p-1.5 rounded-lg transition-all ${
                                 mobileGrid === 'single'
                                     ? 'bg-background text-primary shadow-xs'
                                     : 'text-muted-foreground hover:text-foreground'
                             }`}
                             title="Single Column Detailed View"
                             aria-label="Single Column Detailed View"
                         >
                             <List size={15} />
                         </button>
                     </div>
                 </div>

                 <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
                     {/* Search Input */}
                     <input
                         type="text"
                         placeholder="Search tokens..."
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="bg-card border border-border rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-foreground outline-none focus:border-primary/50 transition-colors flex-1 md:w-64"
                     />
                     {/* Extension Dropdown */}
                     <select
                         value={extensionFilter}
                         onChange={(e) => setExtensionFilter(e.target.value)}
                         className="bg-card border border-border rounded-xl px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-foreground outline-none focus:border-primary/50 transition-colors cursor-pointer shrink-0 max-w-[150px] sm:max-w-none sm:min-w-[180px]"
                     >
                         <option value="all">All Types</option>
                         <option value="spl">Standard SPL</option>
                         <option value="token-2022">Token-2022</option>
                         <option value="1">↳ Transfer Fee</option>
                         <option value="5">↳ Interest Bearing</option>
                         <option value="4">↳ Soulbound</option>
                         <option value="8">↳ Perm Delegate</option>
                         <option value="15">↳ Group Parent</option>
                     </select>
                 </div>
            </div>

            {filteredItems.length === 0 ? (
                <div className="text-center p-20 text-muted-foreground border border-dashed border-border rounded-3xl">
                    No active tokens match your search or filter options.
                </div>
            ) : (
                <div className={`grid ${mobileGrid === 'grid' ? 'grid-cols-2 gap-2.5' : 'grid-cols-1 gap-4'} sm:grid-cols-2 lg:grid-cols-4 sm:gap-6`}>
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

