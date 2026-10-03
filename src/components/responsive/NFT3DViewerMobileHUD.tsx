"use client";

import { FC, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Box,
    RotateCw,
    Play,
    Pause,
    X,
    ShoppingCart,
    Copy,
    Check,
    ExternalLink,
    ChevronUp,
    ChevronDown,
    Info,
    Sparkles,
    Eye,
} from "lucide-react";

export interface NFT3DViewerMobileHUDProps {
    item: {
        name: string;
        image: string;
        mint?: string;
        rank?: number;
        price?: number;
        description?: string;
        attributes?: any[];
        seller?: string;
        raw?: any;
    };
    autoRotate: boolean;
    onToggleAutoRotate: () => void;
    onFlip: () => void;
    onResetView: () => void;
    onClose: () => void;
    onBuy?: (item: any) => void;
    isBuying?: boolean;
    currentWallet?: string | null;
}

export const NFT3DViewerMobileHUD: FC<NFT3DViewerMobileHUDProps> = ({
    item,
    autoRotate,
    onToggleAutoRotate,
    onFlip,
    onResetView,
    onClose,
    onBuy,
    isBuying,
    currentWallet,
}) => {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyMint = () => {
        if (!item?.mint) return;
        navigator.clipboard.writeText(item.mint);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Normalize attributes array
    const attributesList: Array<{ trait_type: string; value: string }> = Array.isArray(item.attributes)
        ? item.attributes.map((attr: any) => {
              if (typeof attr === "string") {
                  return { trait_type: "Property", value: attr };
              }
              return { trait_type: attr.trait_type || "Trait", value: String(attr.value || "") };
          })
        : [];

    return (
        <div className="md:hidden">
            {/* Top Navigation & Controls Bar */}
            <div 
                className="absolute top-0 inset-x-0 z-[100000] p-3 pt-safe flex items-center justify-between pointer-events-none"
                style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))" }}
            >
                {/* Left: Minimal Inspection Title Pill */}
                <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/85 backdrop-blur-xl border border-border/70 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0 drop-shadow-[0_0_6px_rgba(255,24,1,0.8)]" />
                    <span className="text-[11px] font-mono font-bold text-foreground uppercase tracking-wider truncate max-w-[120px]">
                        {item.name}
                    </span>
                    {item.rank !== undefined && (
                        <span className="text-[9px] font-mono font-bold bg-primary/10 text-primary border border-primary/25 px-1.5 py-0.2 rounded-full">
                            #{item.rank}
                        </span>
                    )}
                </div>

                {/* Right: Quick Action Controls */}
                <div className="pointer-events-auto flex items-center gap-1.5">
                    <button
                        onClick={onFlip}
                        className="p-2 rounded-xl bg-card/85 backdrop-blur-xl border border-border/70 text-foreground active:scale-90 transition-transform shadow-md flex items-center justify-center"
                        title="Flip 180°"
                        aria-label="Flip Card"
                    >
                        <Box size={16} className="text-primary" />
                    </button>

                    <button
                        onClick={onToggleAutoRotate}
                        className={`p-2 rounded-xl backdrop-blur-xl border shadow-md active:scale-90 transition-all ${
                            autoRotate
                                ? "bg-primary/20 border-primary/50 text-primary"
                                : "bg-card/85 border-border/70 text-muted-foreground"
                        }`}
                        title={autoRotate ? "Pause Auto-Rotate" : "Start Auto-Rotate"}
                        aria-label="Toggle Auto-Rotate"
                    >
                        {autoRotate ? <Pause size={16} /> : <Play size={16} />}
                    </button>

                    <button
                        onClick={onResetView}
                        className="p-2 rounded-xl bg-card/85 backdrop-blur-xl border border-border/70 text-muted-foreground active:scale-90 transition-transform shadow-md"
                        title="Reset Camera"
                        aria-label="Reset Camera"
                    >
                        <RotateCw size={16} />
                    </button>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-destructive/15 text-destructive border border-destructive/30 backdrop-blur-xl active:scale-90 transition-transform shadow-md"
                        title="Close 3D Viewer"
                        aria-label="Close 3D Viewer"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Floating Interaction Guide (Above Bottom Bar) */}
            {!isSheetOpen && (
                <div className="absolute bottom-24 inset-x-0 text-center pointer-events-none z-[100000]">
                    <div className="inline-flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-3.5 py-1 rounded-full text-[10px] font-mono text-muted-foreground/90 border border-white/10 shadow-lg">
                        <Eye size={12} className="text-primary" />
                        <span>Drag to rotate • Pinch to zoom</span>
                    </div>
                </div>
            )}

            {/* Bottom Bar (Compact HUD) - Only shown when sheet is closed */}
            {!isSheetOpen && (
                <div 
                    className="absolute bottom-0 inset-x-0 z-[100000] p-3 pb-safe pointer-events-none"
                    style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
                >
                    <div className="pointer-events-auto bg-card/95 backdrop-blur-xl border border-border/70 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3">
                        <button
                            onClick={() => setIsSheetOpen(true)}
                            className="flex items-center gap-2.5 text-left min-w-0 flex-1 hover:opacity-80 transition-opacity"
                        >
                            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0 text-primary">
                                <Info size={18} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-black text-foreground font-display uppercase tracking-tight truncate">
                                    {item.name}
                                </div>
                                <div className="text-[11px] font-mono font-bold text-primary flex items-center gap-1">
                                    {item.price !== undefined ? `${item.price} SOL` : "Asset"}
                                    <span className="text-[9px] text-muted-foreground font-sans font-normal">
                                        • Tap for info
                                    </span>
                                </div>
                            </div>
                            <ChevronUp size={16} className="text-muted-foreground" />
                        </button>

                        {/* Quick Buy or Details Button */}
                        {onBuy && item.price !== undefined ? (
                            currentWallet && item.seller === currentWallet ? (
                                <span className="px-3 py-2 bg-muted text-muted-foreground rounded-xl text-[10px] font-mono font-bold shrink-0">
                                    Yours
                                </span>
                            ) : (
                                <button
                                    onClick={() => onBuy((item as any).raw || item)}
                                    disabled={isBuying}
                                    className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-display uppercase tracking-wider font-bold rounded-xl text-xs shadow-lg shadow-primary/25 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                                >
                                    <ShoppingCart size={13} />
                                    <span>{isBuying ? "Buying..." : `Buy`}</span>
                                </button>
                            )
                        ) : (
                            <button
                                onClick={() => setIsSheetOpen(true)}
                                className="px-3 py-2 bg-secondary text-secondary-foreground rounded-xl text-xs font-mono font-semibold shrink-0"
                            >
                                Details
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Slide-Up Metadata Sheet */}
            <AnimatePresence>
                {isSheetOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100001] bg-black/60 backdrop-blur-sm flex flex-col justify-end"
                        onClick={() => setIsSheetOpen(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card border-t border-border/80 rounded-t-3xl p-5 pb-safe max-h-[75vh] flex flex-col shadow-2xl space-y-4 overflow-hidden"
                            style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))" }}
                        >
                            {/* Drag handle / Close */}
                            <div className="flex items-center justify-between border-b border-border/40 pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest">
                                        3D Holographic Inspection
                                    </span>
                                </div>
                                <button
                                    onClick={() => setIsSheetOpen(false)}
                                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ChevronDown size={20} />
                                </button>
                            </div>

                            {/* Scrollable Sheet Content */}
                            <div className="overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                                {/* Title & Price */}
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-xl font-black text-foreground font-display uppercase tracking-tight">
                                            {item.name}
                                        </h3>
                                        {item.price !== undefined && (
                                            <div className="mt-1 text-base font-black text-primary font-mono flex items-center gap-1">
                                                {item.price} <span className="text-xs text-muted-foreground font-sans">SOL</span>
                                            </div>
                                        )}
                                    </div>
                                    {item.rank !== undefined && (
                                        <span className="text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full">
                                            Rank #{item.rank}
                                        </span>
                                    )}
                                </div>

                                {/* Description */}
                                {item.description && (
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {item.description}
                                    </p>
                                )}

                                {/* Buy Button inside sheet */}
                                {onBuy && item.price !== undefined && (
                                    <div>
                                        {currentWallet && item.seller === currentWallet ? (
                                            <button
                                                disabled
                                                className="w-full py-3 bg-muted text-muted-foreground border border-border rounded-xl text-xs font-mono font-bold cursor-not-allowed text-center"
                                            >
                                                You Listed This Item
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    onBuy((item as any).raw || item);
                                                    setIsSheetOpen(false);
                                                }}
                                                disabled={isBuying}
                                                className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-display uppercase tracking-wider font-bold rounded-xl text-xs shadow-lg shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                            >
                                                <ShoppingCart size={16} />
                                                <span>{isBuying ? "Processing..." : `Buy Now for ${item.price} SOL`}</span>
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Mint Address */}
                                {item.mint && (
                                    <div className="pt-2 border-t border-border/40 space-y-1.5">
                                        <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                                            Mint Address
                                        </span>
                                        <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-xl border border-border/50">
                                            <span className="text-[10px] font-mono text-foreground font-semibold truncate max-w-[200px]">
                                                {item.mint}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={handleCopyMint}
                                                    className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                                                    title="Copy Mint Address"
                                                >
                                                    {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                                                </button>
                                                <a
                                                    href={`https://solscan.io/token/${item.mint}?cluster=devnet`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                                                    title="Inspect on Solscan"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Attributes */}
                                {attributesList.length > 0 && (
                                    <div className="pt-2 border-t border-border/40 space-y-2">
                                        <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                                            Attributes ({attributesList.length})
                                        </span>
                                        <div className="grid grid-cols-2 gap-2">
                                            {attributesList.map((attr, idx) => (
                                                <div
                                                    key={idx}
                                                    className="bg-muted/30 border border-border/40 p-2 rounded-xl text-left"
                                                >
                                                    <div className="text-[9px] font-mono uppercase text-muted-foreground truncate">
                                                        {attr.trait_type}
                                                    </div>
                                                    <div className="text-[11px] font-bold text-foreground truncate mt-0.5">
                                                        {attr.value}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
