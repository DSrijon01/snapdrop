"use client";

import { FC, useState } from "react";
import { motion } from "framer-motion";
import { NFT3DViewer } from "./NFT3DViewer";

// Mock Data for Marketplace
const MARKET_ITEMS = [
    { id: 1, name: "Yokai #1135", rank: 4398, price: 0.5, image: "https://images.unsplash.com/photo-1614726365723-49cfae9f6966?w=400&fit=crop", lastSale: 0.25, is3D: true },
    { id: 2, name: "Yokai #1269", rank: 3669, price: 0.8, image: "https://images.unsplash.com/photo-1618193139062-2c5bf4f935b7?w=400&fit=crop", lastSale: 0.25 },
    { id: 3, name: "Yokai #1426", rank: 3938, price: 1.2, image: "https://images.unsplash.com/photo-1614727187346-7988229c9ccf?w=400&fit=crop", lastSale: 0.39, is3D: true },
    { id: 4, name: "Yokai #0904", rank: 2951, price: 2.5, image: "https://images.unsplash.com/photo-1620336655174-3266ecc69911?w=400&fit=crop", lastSale: 1.5, isHot: true },
    { id: 5, name: "Yokai #3321", rank: 120, price: 5.0, image: "https://images.unsplash.com/photo-1605170439002-90845e8c0137?w=400&fit=crop", lastSale: 4.2, is3D: true },
    { id: 6, name: "Yokai #0042", rank: 15, price: 12.0, image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&fit=crop", lastSale: null },
    { id: 7, name: "Yokai #5512", rank: 5600, price: 0.35, image: "https://images.unsplash.com/photo-1563089145-599997676d42?w=400&fit=crop", lastSale: 0.3 },
    { id: 8, name: "Yokai #2291", rank: 2100, price: 1.8, image: "https://images.unsplash.com/photo-1642425149856-639f379ad461?w=400&fit=crop", lastSale: 1.2 },
];

export const Marketplace: FC = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selected3DItem, setSelected3DItem] = useState<(typeof MARKET_ITEMS)[0] | null>(null);
    
    // Filter and Sort items
    const filteredItems = MARKET_ITEMS.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        if (sortOrder === 'asc') {
            return a.price - b.price;
        } else {
            return b.price - a.price;
        }
    });

    const toggleSort = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    return (
        <div className="container mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 3D Viewer Modal */}
            <NFT3DViewer 
                isOpen={!!selected3DItem} 
                onClose={() => setSelected3DItem(null)} 
                item={selected3DItem}
            />
            
            {/* Header / Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between sticky top-[146px] z-30 bg-background/80 backdrop-blur-xl p-4 rounded-2xl border border-border shadow-xl">
                {/* Search */}
                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name or trait..."
                        className="w-full bg-muted border border-border rounded-xl py-3 pl-10 pr-4 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all font-display"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <button 
                        onClick={toggleSort}
                        className="px-4 py-2.5 bg-muted hover:bg-muted/80 border border-border rounded-xl text-sm font-bold text-foreground whitespace-nowrap transition-colors flex items-center gap-2 font-display uppercase tracking-wide"
                    >
                        Price: {sortOrder === 'asc' ? 'Low to High' : 'High to Low'}
                        <svg className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    
                     <div className="h-8 w-px bg-border mx-1" />

                     {/* View Toggles (Visual) */}
                     <div className="flex bg-muted rounded-xl p-1 border border-border">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                     </div>
                </div>
            </div>

            {/* Grid */}
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'flex flex-col'} gap-6`}>
                {filteredItems.map((item) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-xl transition-all duration-300 ${viewMode === 'list' ? 'flex flex-row items-center h-48' : ''}`}
                    >
                        {/* Image */}
                        <div className={`overflow-hidden relative ${viewMode === 'list' ? 'w-48 h-full aspect-square' : 'aspect-square w-full'}`}>
                             {item.isHot && (
                                 <div className="absolute top-3 right-3 z-10 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-1 rounded-md shadow-lg shadow-destructive/20 animate-pulse font-display tracking-widest uppercase">
                                     HOT SALE
                                 </div>
                             )}
                             
                             {/* 3D Indicator / Action */}
                             {item.is3D && (
                                 <div className="absolute top-3 left-3 z-10">
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); setSelected3DItem(item); }}
                                          className="bg-purple-600/90 hover:bg-purple-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg backdrop-blur-md transition-all flex items-center gap-1.5 border border-purple-400/30 font-display uppercase tracking-wide"
                                      >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                                          View 3D
                                      </button>
                                 </div>
                             )}

                            <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            {/* Hover Overlay - Only in Grid View for now or modified for list */}
                            {viewMode === 'grid' && (
                                <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end h-1/2">
                                    <button className="w-full py-3 bg-white text-black font-black text-sm uppercase rounded-xl hover:bg-gray-200 transition-colors shadow-lg font-display tracking-wide">
                                        Buy Now for {item.price} SOL
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className={`p-4 ${viewMode === 'list' ? 'flex-1 flex flex-row items-center justify-between' : ''}`}>
                            <div className={viewMode === 'list' ? 'flex flex-col gap-2' : ''}>
                                <div className={`flex justify-between items-start mb-2 ${viewMode === 'list' ? 'flex-col gap-1 items-start' : ''}`}>
                                    <h3 className="font-bold text-foreground text-lg font-display uppercase">{item.name}</h3>
                                    <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-1 rounded border border-border">#{item.rank}</span>
                                </div>
                                {viewMode === 'list' && item.lastSale && (
                                    <div className="text-[10px] text-muted-foreground">
                                        Last sale: {item.lastSale} SOL
                                    </div>
                                )}
                            </div>
                            
                            <div className={`${viewMode === 'list' ? 'flex flex-col items-end gap-2' : 'mt-4 pt-4 border-t border-border flex items-end justify-between'}`}>
                                <div>
                                    {/* Hide last sale in grid view here as it's cleaner, keeping original layout */}
                                    {viewMode !== 'list' && item.lastSale && (
                                        <div className="text-[10px] text-muted-foreground mb-0.5">
                                            Last sale: {item.lastSale} SOL
                                        </div>
                                    )}
                                    <div className="text-foreground font-bold text-lg flex items-center gap-1">
                                        {item.price} <span className="text-xs text-muted-foreground font-normal">SOL</span>
                                    </div>
                                </div>
                                {viewMode === 'list' ? (
                                    <button className="px-6 py-2 bg-foreground text-background font-bold text-sm rounded-lg hover:bg-foreground/90 transition-colors">
                                        Buy Now
                                    </button>
                                ) : (
                                    <div className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded border border-primary/20">
                                        Buy Now
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
            
            <div className="mt-12 text-center text-gray-500 text-sm">
                Showing {filteredItems.length} items
            </div>
        </div>
    );
};
