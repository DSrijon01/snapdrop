"use client";

import { FC, Suspense, useRef, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, RoundedBox, Sparkles, Environment } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { X, Box, RotateCw, Play, Pause, ExternalLink, Copy, Check, Eye } from "lucide-react";

export interface NFT3DViewerProps {
    isOpen: boolean;
    onClose: () => void;
    item: {
        name: string;
        image: string;
        rank?: number;
        mint?: string;
        price?: number;
        seller?: string;
        description?: string;
        attributes?: Array<{ trait_type: string; value: string }> | string[];
    } | null;
}

// Procedural Card Back Canvas Generator (Cyberpunk Circuit & Street Sync Branding)
function createCardBackCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1440;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    // Dark cyber gradient background
    const grad = ctx.createLinearGradient(0, 0, 1024, 1440);
    grad.addColorStop(0, "#080a11");
    grad.addColorStop(0.5, "#111625");
    grad.addColorStop(1, "#05060a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1440);

    // Diagonal carbon-fiber weave pattern
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 2;
    for (let i = -1440; i < 2480; i += 24) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 1440, 1440);
        ctx.stroke();
    }

    // Outer neon frame
    ctx.strokeStyle = "rgba(74, 222, 128, 0.45)";
    ctx.lineWidth = 6;
    ctx.strokeRect(36, 36, 952, 1368);

    // Inner subtle border
    ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(54, 54, 916, 1332);

    // Corner tech markers
    const corners = [
        [36, 36], [988, 36], [36, 1404], [988, 1404]
    ];
    ctx.fillStyle = "#4ade80";
    corners.forEach(([x, y]) => {
        ctx.fillRect(x - 8, y - 8, 16, 16);
    });

    // Holographic Center Core
    const cx = 512;
    const cy = 720;
    const rad = 230;

    const radialGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, rad);
    radialGrad.addColorStop(0, "rgba(74, 222, 128, 0.25)");
    radialGrad.addColorStop(0.6, "rgba(56, 189, 248, 0.12)");
    radialGrad.addColorStop(1, "transparent");
    ctx.fillStyle = radialGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();

    // Geometric Circuit Ring
    ctx.strokeStyle = "rgba(74, 222, 128, 0.7)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, rad - 20, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
    ctx.setLineDash([16, 12]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, rad + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Typography
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 68px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("STREET SYNC", cx, cy - 25);

    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 26px monospace";
    ctx.fillText("VERIFIED DIGITAL ASSET", cx, cy + 30);

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "20px monospace";
    ctx.fillText("SOLANA HIGH SPEED PROTOCOL", cx, cy + 85);

    return canvas;
}

// Procedural Card Front Fallback Canvas Generator
function createCyberpunkFallbackCanvas(title: string): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1440;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    const grad = ctx.createLinearGradient(0, 0, 1024, 1440);
    grad.addColorStop(0, "#0b0f19");
    grad.addColorStop(0.5, "#182035");
    grad.addColorStop(1, "#070a12");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1440);

    // Neon Frame
    ctx.strokeStyle = "rgba(74, 222, 128, 0.6)";
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, 944, 1360);

    // Hexagonal / Circular Hologram Crest
    ctx.fillStyle = "rgba(74, 222, 128, 0.12)";
    ctx.beginPath();
    ctx.arc(512, 640, 240, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 58px sans-serif";
    ctx.textAlign = "center";
    const displayTitle = title.length > 20 ? title.slice(0, 18) + "..." : title;
    ctx.fillText(displayTitle, 512, 630);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 28px monospace";
    ctx.fillText("3D HOLOGRAPHIC SLAB", 512, 700);

    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = "22px monospace";
    ctx.fillText("STREET SYNC DECENTRALIZED", 512, 760);

    return canvas;
}

// Interactive 3D Collectible Slab
const NFTCardSlab: FC<{
    name: string;
    imageUrl: string;
    targetRotationY: number;
}> = ({ name, imageUrl, targetRotationY }) => {
    const groupRef = useRef<THREE.Group>(null);
    const [frontTexture, setFrontTexture] = useState<THREE.Texture | null>(null);
    const [backTexture, setBackTexture] = useState<THREE.Texture | null>(null);

    // Generate/Load Textures safely
    useEffect(() => {
        let isMounted = true;

        // Card Back Texture
        const backCanvas = createCardBackCanvas();
        const bTex = new THREE.CanvasTexture(backCanvas);
        bTex.colorSpace = THREE.SRGBColorSpace;
        if (isMounted) setBackTexture(bTex);

        // Card Front Fallback
        const fallbackCanvas = createCyberpunkFallbackCanvas(name);
        const fallbackTex = new THREE.CanvasTexture(fallbackCanvas);
        fallbackTex.colorSpace = THREE.SRGBColorSpace;
        if (isMounted) setFrontTexture(fallbackTex);

        // Attempt loading real image into Texture
        if (imageUrl) {
            const loader = new THREE.TextureLoader();
            loader.setCrossOrigin("anonymous");
            loader.load(
                imageUrl,
                (loaded) => {
                    if (!isMounted) return;
                    loaded.colorSpace = THREE.SRGBColorSpace;
                    loaded.needsUpdate = true;
                    setFrontTexture(loaded);
                },
                undefined,
                (err) => {
                    console.warn("Using procedural 3D fallback texture for NFT:", err);
                }
            );
        }

        return () => {
            isMounted = false;
        };
    }, [imageUrl, name]);

    // Smooth rotation interpolation when flip is requested
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
        <Float speed={1.5} rotationIntensity={0.25} floatIntensity={0.4}>
            <group ref={groupRef}>
                {/* 1. Core Card Body (Beveled Rim / Titanium frame) */}
                <RoundedBox args={[2.3, 3.2, 0.05]} radius={0.04} smoothness={4}>
                    <meshStandardMaterial
                        color="#12151d"
                        metalness={0.9}
                        roughness={0.15}
                        envMapIntensity={1.2}
                    />
                </RoundedBox>

                {/* 2. Front Artwork Plane */}
                {frontTexture && (
                    <mesh position={[0, 0, 0.027]}>
                        <planeGeometry args={[2.16, 3.06]} />
                        <meshStandardMaterial
                            map={frontTexture}
                            metalness={0.15}
                            roughness={0.3}
                            envMapIntensity={0.9}
                        />
                    </mesh>
                )}

                {/* 3. Back Artwork Plane */}
                {backTexture && (
                    <mesh position={[0, 0, -0.027]} rotation={[0, Math.PI, 0]}>
                        <planeGeometry args={[2.16, 3.06]} />
                        <meshStandardMaterial
                            map={backTexture}
                            metalness={0.65}
                            roughness={0.2}
                            envMapIntensity={1.0}
                        />
                    </mesh>
                )}

                {/* 4. Outer Graded Crystal Slab (Protective Glass Encasement) */}
                <RoundedBox args={[2.42, 3.32, 0.11]} radius={0.06} smoothness={4}>
                    <meshPhysicalMaterial
                        transparent
                        opacity={0.32}
                        roughness={0.05}
                        metalness={0.1}
                        transmission={0.85}
                        ior={1.5}
                        reflectivity={0.9}
                        clearcoat={1.0}
                        clearcoatRoughness={0.1}
                    />
                </RoundedBox>

                {/* Cyberpunk Accent Rim Lights */}
                <pointLight position={[1.5, 2, 0.5]} intensity={2.5} distance={5} color="#4ade80" />
                <pointLight position={[-1.5, -2, -0.5]} intensity={2.0} distance={5} color="#38bdf8" />
            </group>
        </Float>
    );
};

export const NFT3DViewer: FC<NFT3DViewerProps> = ({ isOpen, onClose, item }) => {
    const [mounted, setMounted] = useState(false);
    const [autoRotate, setAutoRotate] = useState(true);
    const [targetRotationY, setTargetRotationY] = useState(0);
    const [copied, setCopied] = useState(false);
    const controlsRef = useRef<any>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = "";
            };
        }
    }, [isOpen]);

    // Keyboard shortcuts (Escape closes viewer)
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === " ") {
                e.preventDefault();
                setAutoRotate((prev) => !prev);
            }
            if (e.key === "f" || e.key === "F") {
                setTargetRotationY((prev) => prev + Math.PI);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    const handleFlip = () => {
        setAutoRotate(false);
        setTargetRotationY((prev) => prev + Math.PI);
    };

    const handleResetView = () => {
        if (controlsRef.current) {
            controlsRef.current.reset();
        }
        setTargetRotationY(0);
        setAutoRotate(true);
    };

    const handleCopyMint = () => {
        if (!item?.mint) return;
        navigator.clipboard.writeText(item.mint);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!mounted || !item) return null;

    // Normalize attributes array
    const attributesList: Array<{ trait_type: string; value: string }> = Array.isArray(item.attributes)
        ? item.attributes.map((attr: any) => {
              if (typeof attr === "string") {
                  return { trait_type: "Property", value: attr };
              }
              return { trait_type: attr.trait_type || "Trait", value: String(attr.value || "") };
          })
        : [];

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-2xl select-none"
                >
                    {/* Top Right Controls & Close */}
                    <div className="absolute top-6 right-6 z-[100000] flex items-center gap-3">
                        <button
                            onClick={handleResetView}
                            className="p-2.5 bg-card/60 hover:bg-card border border-border/60 hover:border-primary/50 rounded-xl text-muted-foreground hover:text-foreground transition-all shadow-lg backdrop-blur-md"
                            title="Reset Perspective"
                            aria-label="Reset Camera"
                        >
                            <RotateCw size={18} />
                        </button>

                        <button
                            onClick={() => setAutoRotate((prev) => !prev)}
                            className={`p-2.5 border rounded-xl transition-all shadow-lg backdrop-blur-md ${
                                autoRotate
                                    ? "bg-primary/20 border-primary/50 text-primary"
                                    : "bg-card/60 border-border/60 text-muted-foreground hover:text-foreground"
                            }`}
                            title={autoRotate ? "Pause Auto-Rotate" : "Start Auto-Rotate"}
                            aria-label="Toggle Auto-Rotate"
                        >
                            {autoRotate ? <Pause size={18} /> : <Play size={18} />}
                        </button>

                        <button
                            onClick={handleFlip}
                            className="px-3 py-2 bg-card/60 hover:bg-card border border-border/60 hover:border-primary/50 rounded-xl text-xs font-mono font-bold text-foreground transition-all shadow-lg backdrop-blur-md flex items-center gap-1.5"
                            title="Flip Card (Press F)"
                        >
                            <Box size={14} className="text-primary" />
                            <span>Flip 180°</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2.5 bg-card/80 hover:bg-destructive/20 border border-border/60 hover:border-destructive/50 rounded-xl text-muted-foreground hover:text-destructive transition-all shadow-lg backdrop-blur-md"
                            title="Close (ESC)"
                            aria-label="Close 3D Viewer"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Left HUD Panel: NFT Metadata */}
                    <div className="absolute top-6 left-6 z-[100000] max-w-sm w-full pointer-events-none">
                        <motion.div
                            initial={{ x: -40, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.15 }}
                            className="bg-card/75 backdrop-blur-xl border border-border/60 p-6 rounded-2xl shadow-2xl space-y-4 pointer-events-auto"
                        >
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    3D Holographic Inspection
                                </div>
                                {item.rank !== undefined && (
                                    <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                                        Rank #{item.rank}
                                    </span>
                                )}
                            </div>

                            <div>
                                <h2 className="text-2xl font-black text-foreground font-display uppercase tracking-tight line-clamp-2">
                                    {item.name}
                                </h2>
                                {item.price !== undefined && (
                                    <div className="mt-1 text-lg font-black text-primary font-mono flex items-center gap-1">
                                        {item.price} <span className="text-xs text-muted-foreground font-sans">SOL</span>
                                    </div>
                                )}
                            </div>

                            {item.description && (
                                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                                    {item.description}
                                </p>
                            )}

                            {/* Mint Address with Copy */}
                            {item.mint && (
                                <div className="pt-2 border-t border-border/40 space-y-1">
                                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                                        Mint Address
                                    </span>
                                    <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg border border-border/50">
                                        <span className="text-[10px] font-mono text-foreground font-semibold truncate max-w-[200px]">
                                            {item.mint}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={handleCopyMint}
                                                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                                                title="Copy Mint Address"
                                            >
                                                {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                                            </button>
                                            <a
                                                href={`https://solscan.io/token/${item.mint}?cluster=devnet`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                                                title="Inspect on Solscan"
                                            >
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Attributes List */}
                            {attributesList.length > 0 && (
                                <div className="pt-2 border-t border-border/40 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                                        Attributes ({attributesList.length})
                                    </span>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {attributesList.slice(0, 6).map((attr, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-muted/30 border border-border/40 p-1.5 rounded-lg text-left"
                                            >
                                                <div className="text-[8px] font-mono uppercase text-muted-foreground truncate">
                                                    {attr.trait_type}
                                                </div>
                                                <div className="text-[10px] font-bold text-foreground truncate">
                                                    {attr.value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* 3D Canvas Viewport */}
                    <div className="w-full h-full cursor-grab active:cursor-grabbing">
                        <Canvas
                            shadows
                            dpr={[1, 2]}
                            camera={{ position: [0, 0, 4.5], fov: 45 }}
                            gl={{ antialias: true, alpha: true }}
                        >
                            <Suspense fallback={null}>
                                <ambientLight intensity={0.7} />
                                <directionalLight position={[4, 5, 4]} intensity={1.4} castShadow />
                                <directionalLight position={[-4, -5, -4]} intensity={0.5} />

                                <NFTCardSlab
                                    name={item.name}
                                    imageUrl={item.image}
                                    targetRotationY={targetRotationY}
                                />

                                <Sparkles count={40} scale={5} size={2.5} speed={0.4} opacity={0.5} color="#4ade80" />

                                <OrbitControls
                                    ref={controlsRef}
                                    autoRotate={autoRotate}
                                    autoRotateSpeed={0.9}
                                    enablePan={false}
                                    minDistance={2.4}
                                    maxDistance={6.5}
                                    dampingFactor={0.06}
                                    enableDamping
                                />
                                <Environment preset="city" />
                            </Suspense>
                        </Canvas>

                        {/* Bottom Interaction Guide */}
                        <div className="absolute bottom-8 inset-x-0 text-center pointer-events-none z-[100000]">
                            <div className="inline-flex items-center gap-2 bg-card/70 backdrop-blur-md px-4 py-1.5 rounded-full text-[11px] font-mono font-medium text-muted-foreground border border-border/50 shadow-lg">
                                <Eye size={13} className="text-primary" />
                                <span>Left-click + Drag to Rotate • Scroll to Zoom • Press [Space] to Pause</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
