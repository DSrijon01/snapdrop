"use client";

import { FC, useState, Suspense, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, RoundedBox, Sparkles, Environment } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { Box, RotateCw, Play, Pause, Maximize2, ExternalLink, Sparkles as SparklesIcon, Layers } from "lucide-react";
import { NFT3DViewer } from "./NFT3DViewer";
import { useWallet } from "@solana/wallet-adapter-react";

export interface Gallery3DItem {
    id: string;
    name: string;
    image: string;
    mint?: string;
    rank?: number;
    price?: number;
    collection?: string;
    description?: string;
}

const FEATURED_3D_ITEMS: Gallery3DItem[] = [
    {
        id: "feat-1",
        name: "Cosmic Cube #001",
        image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&h=800&fit=crop",
        mint: "CosmicMint7X9v8Y1L2m4KpQ",
        rank: 1,
        price: 3.5,
        collection: "Street Sync Genesis",
        description: "An authentic cosmic anomaly forged on Solana. Features dimensional refraction and reactive metallic shielding.",
    },
    {
        id: "feat-2",
        name: "Neon Genesis Samurai",
        image: "https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?w=800&h=800&fit=crop",
        mint: "NeonSamurai3B8n9K0J1L2m",
        rank: 42,
        price: 5.2,
        collection: "Cyber Ronin",
        description: "High-voltage cyberpunk warrior engineered for the decentralized streets.",
    },
    {
        id: "feat-3",
        name: "Abstract Thought",
        image: "https://images.unsplash.com/photo-1549490349-8643362247b5?w=800&h=800&fit=crop",
        mint: "AbstractMind9P2x4Z7K1W8",
        rank: 108,
        price: 2.1,
        collection: "Neo Neural",
        description: "A generative neural visualization of cross-chain liquidity and on-chain intelligence.",
    },
    {
        id: "feat-4",
        name: "Pixel Punk #77",
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=800&fit=crop",
        mint: "PixelPunk777A3b8C9d1E",
        rank: 77,
        price: 4.0,
        collection: "Retro Syndicate",
        description: "Classic 8-bit heritage meets modern holographic slab preservation.",
    },
];

// Inner 3D Slab for the Embedded Stage
const EmbeddedCardMesh: FC<{
    item: Gallery3DItem;
    targetRotationY: number;
}> = ({ item, targetRotationY }) => {
    const groupRef = useRef<THREE.Group>(null);
    const [texture, setTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        let active = true;
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin("anonymous");
        loader.load(
            item.image,
            (loaded) => {
                if (!active) return;
                loaded.colorSpace = THREE.SRGBColorSpace;
                setTexture(loaded);
            },
            undefined,
            () => {
                // Procedural canvas fallback if image fails
                const canvas = document.createElement("canvas");
                canvas.width = 512;
                canvas.height = 720;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.fillStyle = "#111422";
                    ctx.fillRect(0, 0, 512, 720);
                    ctx.strokeStyle = "#4ade80";
                    ctx.lineWidth = 8;
                    ctx.strokeRect(20, 20, 472, 680);
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "bold 36px monospace";
                    ctx.textAlign = "center";
                    ctx.fillText(item.name, 256, 360);
                }
                const fallbackTex = new THREE.CanvasTexture(canvas);
                fallbackTex.colorSpace = THREE.SRGBColorSpace;
                if (active) setTexture(fallbackTex);
            }
        );

        return () => {
            active = false;
        };
    }, [item.image, item.name]);

    useFrame(() => {
        if (groupRef.current) {
            groupRef.current.rotation.y = THREE.MathUtils.lerp(
                groupRef.current.rotation.y,
                targetRotationY,
                0.08
            );
        }
    });

    return (
        <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.3}>
            <group ref={groupRef}>
                {/* Metallic Frame */}
                <RoundedBox args={[2.3, 3.2, 0.05]} radius={0.04} smoothness={4}>
                    <meshStandardMaterial color="#0e111a" metalness={0.9} roughness={0.15} />
                </RoundedBox>

                {/* Front Artwork */}
                {texture && (
                    <mesh position={[0, 0, 0.027]}>
                        <planeGeometry args={[2.16, 3.06]} />
                        <meshStandardMaterial map={texture} roughness={0.3} metalness={0.1} />
                    </mesh>
                )}

                {/* Back Artwork */}
                <mesh position={[0, 0, -0.027]} rotation={[0, Math.PI, 0]}>
                    <planeGeometry args={[2.16, 3.06]} />
                    <meshStandardMaterial color="#1a2030" roughness={0.3} metalness={0.8} />
                </mesh>

                {/* Protective Glass Slab */}
                <RoundedBox args={[2.42, 3.32, 0.11]} radius={0.06} smoothness={4}>
                    <meshPhysicalMaterial
                        transparent
                        opacity={0.35}
                        roughness={0.05}
                        metalness={0.1}
                        transmission={0.85}
                        ior={1.5}
                        clearcoat={1.0}
                    />
                </RoundedBox>

                <pointLight position={[1.5, 2, 0.8]} intensity={2.5} distance={5} color="#4ade80" />
                <pointLight position={[-1.5, -2, -0.8]} intensity={2.0} distance={5} color="#38bdf8" />
            </group>
        </Float>
    );
};

export interface NFT3DGalleryProps {
    items?: any[];
    onBuy?: (item: any) => void;
    currentWallet?: string;
    isBuying?: string | null;
}

export const NFT3DGallery: FC<NFT3DGalleryProps> = ({ items, onBuy, currentWallet, isBuying }) => {
    const { connected } = useWallet();

    const galleryItems: Gallery3DItem[] = useMemo(() => {
        if (items && items.length > 0) {
            return items.map((item, idx) => ({
                id: item.id || item.mint || `item-${idx}`,
                name: item.name || "NFT Listing",
                image: item.image,
                mint: item.mint,
                rank: item.rank || (idx + 1),
                price: item.price,
                collection: "Street Sync Marketplace",
                description: item.description || `Verified P2P listing available for ${item.price ?? 0} SOL on Solana Devnet.`,
                raw: item,
            } as Gallery3DItem & { raw: any }));
        }
        return FEATURED_3D_ITEMS;
    }, [items]);

    const [selectedItem, setSelectedItem] = useState<Gallery3DItem>(galleryItems[0]);

    useEffect(() => {
        if (galleryItems.length > 0) {
            setSelectedItem(galleryItems[0]);
        }
    }, [galleryItems]);

    const [autoRotate, setAutoRotate] = useState(true);
    const [targetRotationY, setTargetRotationY] = useState(0);
    const [isFullscreenViewerOpen, setIsFullscreenViewerOpen] = useState(false);
    const controlsRef = useRef<any>(null);

    const handleFlip = () => {
        setAutoRotate(false);
        setTargetRotationY((prev) => prev + Math.PI);
    };

    const handleReset = () => {
        if (controlsRef.current) {
            controlsRef.current.reset();
        }
        setTargetRotationY(0);
        setAutoRotate(true);
    };

    return (
        <div className="container mx-auto px-4 py-6 space-y-8 animate-in fade-in duration-500">
            {/* Header Banner */}
            <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-card via-card/90 to-primary/10 border border-primary/30 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-mono font-bold uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            Feature • Street Sync 3D Collectible Hub
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-foreground font-display uppercase italic tracking-tight">
                            Interactive 3D NFT Gallery
                        </h2>
                        <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
                            Examine digital collectibles in authentic three-dimensional museum-grade slabs. Drag to rotate, zoom, and inspect on-chain verifiable artwork with real-time Three.js lighting and reflections.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsFullscreenViewerOpen(true)}
                        className="px-6 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-display uppercase tracking-wider font-bold rounded-2xl flex items-center gap-2.5 shadow-xl shadow-primary/25 transition-all hover:scale-105 shrink-0"
                    >
                        <Maximize2 size={16} />
                        <span>Launch Fullscreen 3D</span>
                    </button>
                </div>
            </div>

            {/* Main Stage Grid: Interactive 3D Turntable on Left, Info & Gallery on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* 3D Turntable Viewport (7 Cols) */}
                <div className="lg:col-span-7 bg-card/95 border border-border/80 rounded-3xl overflow-hidden shadow-2xl relative h-[520px] flex flex-col">
                    {/* Viewport Header Controls */}
                    <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono font-bold text-white flex items-center gap-2 pointer-events-auto">
                            <Box size={14} className="text-primary" />
                            <span>{selectedItem.name}</span>
                        </div>

                        <div className="flex items-center gap-2 pointer-events-auto">
                            <button
                                onClick={handleReset}
                                className="p-2 bg-black/60 hover:bg-black/90 border border-white/10 hover:border-primary/40 text-muted-foreground hover:text-white rounded-xl backdrop-blur-md transition-colors shadow-md"
                                title="Reset View"
                            >
                                <RotateCw size={14} />
                            </button>
                            <button
                                onClick={() => setAutoRotate((prev) => !prev)}
                                className={`p-2 border rounded-xl backdrop-blur-md transition-colors shadow-md ${
                                    autoRotate
                                        ? "bg-primary/20 border-primary/50 text-primary"
                                        : "bg-black/60 border-white/10 text-muted-foreground hover:text-white"
                                }`}
                                title={autoRotate ? "Pause Auto-Rotate" : "Start Auto-Rotate"}
                            >
                                {autoRotate ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                            <button
                                onClick={handleFlip}
                                className="px-2.5 py-1.5 bg-black/60 hover:bg-black/90 border border-white/10 hover:border-primary/40 text-xs font-mono font-bold text-white rounded-xl backdrop-blur-md transition-colors shadow-md"
                                title="Flip Card"
                            >
                                Flip 180°
                            </button>
                        </div>
                    </div>

                    {/* Three.js Canvas */}
                    <div className="w-full flex-1 cursor-grab active:cursor-grabbing">
                        <Canvas
                            shadows
                            dpr={[1, 2]}
                            camera={{ position: [0, 0, 4.4], fov: 45 }}
                            gl={{ antialias: true, alpha: true }}
                        >
                            <Suspense fallback={null}>
                                <ambientLight intensity={0.7} />
                                <directionalLight position={[4, 5, 4]} intensity={1.4} />
                                <directionalLight position={[-4, -5, -4]} intensity={0.5} />

                                <EmbeddedCardMesh
                                    item={selectedItem}
                                    targetRotationY={targetRotationY}
                                />

                                <Sparkles count={35} scale={5} size={2.5} speed={0.4} opacity={0.5} color="#4ade80" />

                                <OrbitControls
                                    ref={controlsRef}
                                    autoRotate={autoRotate}
                                    autoRotateSpeed={1.0}
                                    enablePan={false}
                                    minDistance={2.4}
                                    maxDistance={6.0}
                                    dampingFactor={0.06}
                                    enableDamping
                                />
                                <Environment preset="city" />
                            </Suspense>
                        </Canvas>
                    </div>

                    {/* Viewport Footer Hint */}
                    <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
                        <div className="inline-block bg-black/60 backdrop-blur-md px-4 py-1 rounded-full text-[11px] font-mono font-medium text-gray-300 border border-white/5">
                            Drag to rotate in 3D • Scroll to zoom • Click Fullscreen for details
                        </div>
                    </div>
                </div>

                {/* Right Panel: Selected Item Details & Quick Selector (5 Cols) */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Item Card */}
                    <div className="p-6 rounded-3xl bg-card border border-border shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                                Rank #{selectedItem.rank}
                            </span>
                            {selectedItem.price && (
                                <span className="text-2xl font-black font-mono text-foreground">
                                    {selectedItem.price} <span className="text-xs text-muted-foreground font-sans">SOL</span>
                                </span>
                            )}
                        </div>

                        <div>
                            <h3 className="text-2xl font-black text-foreground font-display uppercase tracking-tight">
                                {selectedItem.name}
                            </h3>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                {selectedItem.collection}
                            </p>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {selectedItem.description}
                        </p>

                        <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                                <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                                    Solana Mint
                                </span>
                                <span className="text-xs font-mono font-bold text-foreground truncate block max-w-[160px]">
                                    {selectedItem.mint || "Verified Asset"}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {onBuy && selectedItem.price !== undefined && (
                                    currentWallet && (selectedItem as any).raw?.seller === currentWallet ? (
                                        <button
                                            disabled
                                            className="px-3.5 py-2 bg-muted text-muted-foreground border border-border rounded-xl text-xs font-mono font-bold cursor-not-allowed"
                                        >
                                            You Listed This
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onBuy((selectedItem as any).raw || selectedItem)}
                                            disabled={isBuying === selectedItem.id}
                                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-mono font-bold rounded-xl text-xs shadow-md shadow-primary/20 transition-all hover:scale-[1.02] disabled:opacity-50"
                                        >
                                            {isBuying === selectedItem.id ? "Buying..." : `Buy Now (${selectedItem.price} SOL)`}
                                        </button>
                                    )
                                )}

                                <button
                                    onClick={() => setIsFullscreenViewerOpen(true)}
                                    className="px-3.5 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/25 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                                >
                                    <Box size={14} />
                                    <span>Fullscreen 3D</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Selector Carousel / Thumbnails */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                            <Layers size={14} className="text-primary" />
                            Select Asset to Load into 3D Stage
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto custom-scrollbar p-1">
                            {galleryItems.map((item) => {
                                const isSelected = selectedItem.id === item.id;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedItem(item)}
                                        className={`group relative p-2.5 rounded-2xl border cursor-pointer transition-all duration-300 flex items-center gap-3 ${
                                            isSelected
                                                ? "bg-primary/10 border-primary shadow-lg shadow-primary/15"
                                                : "bg-card hover:bg-muted/50 border-border"
                                        }`}
                                    >
                                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10 relative">
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                            {/* 3D Badge on thumbnail */}
                                            <div className="absolute top-1 right-1 bg-black/70 backdrop-blur-sm px-1 py-0.5 rounded text-[8px] font-mono font-bold text-primary">
                                                3D
                                            </div>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <h5 className="font-bold text-foreground text-sm truncate font-display uppercase">
                                                {item.name}
                                            </h5>
                                            <p className="text-[11px] text-muted-foreground font-mono truncate">
                                                #{item.rank} • {item.price ? `${item.price} SOL` : "Asset"}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Fullscreen 3D Modal */}
            <NFT3DViewer
                isOpen={isFullscreenViewerOpen}
                onClose={() => setIsFullscreenViewerOpen(false)}
                item={selectedItem}
            />
        </div>
    );
};
