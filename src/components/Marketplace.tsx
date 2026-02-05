"use client";

import { FC, useState } from "react";
import { motion } from "framer-motion";

// Mock Data for Marketplace
const MARKET_ITEMS = [
    { id: 1, name: "Yokai #1135", rank: 4398, price: 0.5, image: "https://images.unsplash.com/photo-1614726365723-49cfae9f6966?w=400&fit=crop", lastSale: 0.25 },
    { id: 2, name: "Yokai #1269", rank: 3669, price: 0.8, image: "https://images.unsplash.com/photo-1618193139062-2c5bf4f935b7?w=400&fit=crop", lastSale: 0.25 },
    { id: 3, name: "Yokai #1426", rank: 3938, price: 1.2, image: "https://images.unsplash.com/photo-1614727187346-7988229c9ccf?w=400&fit=crop", lastSale: 0.39 },
    { id: 4, name: "Yokai #0904", rank: 2951, price: 2.5, image: "https://images.unsplash.com/photo-1620336655174-3266ecc69911?w=400&fit=crop", lastSale: 1.5, isHot: true },
    { id: 5, name: "Yokai #3321", rank: 120, price: 5.0, image: "https://images.unsplash.com/photo-1605170439002-90845e8c0137?w=400&fit=crop", lastSale: 4.2 },
    { id: 6, name: "Yokai #0042", rank: 15, price: 12.0, image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&fit=crop", lastSale: null },
    { id: 7, name: "Yokai #5512", rank: 5600, price: 0.35, image: "https://images.unsplash.com/photo-1563089145-599997676d42?w=400&fit=crop", lastSale: 0.3 },
    { id: 8, name: "Yokai #2291", rank: 2100, price: 1.8, image: "https://images.unsplash.com/photo-1642425149856-639f379ad461?w=400&fit=crop", lastSale: 1.2 },
];

export const Marketplace: FC = () => {
    const [searchTerm, setSearchTerm] = useState("");
    
    // Filter items based on search
    const filteredItems = MARKET_ITEMS.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Header / Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between sticky top-24 z-20 bg-black/80 backdrop-blur-xl p-4 rounded-xl border border-red-900/20 shadow-xl">
                {/* Search */}
                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search items..."
                        className="w-full bg-black border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <button className="px-4 py-2.5 bg-black hover:bg-zinc-900 border border-white/20 hover:border-red-500 rounded-lg text-sm font-bold text-white whitespace-nowrap transition-colors flex items-center gap-2 group">
                        Price: Low to High
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    
                     <div className="h-8 w-px bg-white/20 mx-1" />

                     {/* View Toggles (Visual) */}
                     <div className="flex bg-black rounded-lg p-1 border border-white/20">
                        <button className="p-2 bg-red-600 text-white rounded shadow-sm border border-red-500">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        </button>
                        <button className="p-2 text-gray-500 hover:text-white transition-colors">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                     </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group relative bg-[#050505] border border-white/5 rounded-xl overflow-hidden hover:border-red-600/50 hover:shadow-[0_0_30px_rgba(220,38,38,0.2)] transition-all duration-300"
                    >
                        {/* Image */}
                        <div className="aspect-square overflow-hidden relative">
                             {item.isHot && (
                                 <div className="absolute top-3 right-3 z-10 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 transform skew-x-[-10deg] shadow-lg shadow-red-600/40 animate-pulse">
                                     Hot Sale
                                 </div>
                             )}
                            <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 grayscale group-hover:grayscale-0"
                            />
                            {/* Hover Overlay */}
                            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end h-1/2">
                                <button className="w-full py-3 bg-red-600 text-white font-black text-sm uppercase rounded-none transform skew-x-[-5deg] hover:bg-white hover:text-black transition-colors shadow-lg">
                                    Buy for {item.price} SOL
                                </button>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-white text-lg tracking-tight">{item.name}</h3>
                                <span className="text-xs font-mono text-red-500 bg-red-900/10 px-2 py-1 rounded border border-red-900/20">#{item.rank}</span>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-white/5 flex items-end justify-between">
                                <div>
                                    {item.lastSale && (
                                        <div className="text-[10px] text-gray-500 mb-0.5 font-mono">
                                            Last: {item.lastSale} WETH
                                        </div>
                                    )}
                                    <div className="text-white font-bold text-lg flex items-center gap-1">
                                        {item.price} <span className="text-xs text-red-500 font-normal">SOL</span>
                                    </div>
                                </div>
                                <div className="text-xs text-red-500 font-bold uppercase tracking-wider bg-transparent border border-red-500/30 px-3 py-1 hover:bg-red-500 hover:text-white transition-colors cursor-pointer">
                                    Details
                                </div>
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
