"use client";

import { FC, Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stage, MeshDistortMaterial, Float, Environment } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";

interface NFT3DViewerProps {
    isOpen: boolean;
    onClose: () => void;
    item: {
        name: string;
        rank: number;
        image: string;
        attributes?: string[];
    } | null;
}

const ProceduralGem: FC<{ color?: string }> = ({ color = "#4ade80" }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            // Adds a slow idle rotation
            meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.2;
        }
    });

    return (
        <Float speed={2} rotationIntensity={1} floatIntensity={1}>
            <mesh ref={meshRef} scale={1.5}>
                <icosahedronGeometry args={[1, 2]} />
                <MeshDistortMaterial
                    color={color}
                    envMapIntensity={0.8}
                    clearcoat={0.9}
                    clearcoatRoughness={0.1}
                    metalness={0.5}
                    distort={0.4}
                    speed={2}
                />
            </mesh>
             {/* Inner core glow */}
             <pointLight distance={3} intensity={4} color={color} />
        </Float>
    );
};

export const NFT3DViewer: FC<NFT3DViewerProps> = ({ isOpen, onClose, item }) => {
    if (!item) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors border border-white/10"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* 3D Canvas Container */}
                    <div className="w-full h-full relative cursor-move">
                        <div className="absolute top-8 left-8 z-10 pointer-events-none">
                            <motion.div 
                                initial={{ x: -50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="bg-black/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl max-w-sm"
                            >
                                <div className="text-xs font-bold text-green-400 mb-2 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
                                    Live Inspection
                                </div>
                                <h2 className="text-4xl font-black text-white mb-2">{item.name}</h2>
                                <div className="flex items-center gap-3 text-sm text-gray-400 mb-4">
                                    <span className="bg-white/10 px-2 py-1 rounded">Rank #{item.rank}</span>
                                    <span>Procedural 3D Asset</span>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    Interact with the object to inspect details. Drag to rotate, scroll to zoom.
                                    This unique asset features dynamic material distortion and reactive lighting.
                                </p>
                            </motion.div>
                        </div>

                        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 50 }}>
                            <Suspense fallback={null}>
                                <Stage environment="city" intensity={0.5} preset="rembrandt" adjustCamera={false}>
                                    <ProceduralGem />
                                </Stage>
                                <OrbitControls 
                                    autoRotate 
                                    autoRotateSpeed={0.5}
                                    enablePan={false} 
                                    minPolarAngle={Math.PI / 4} 
                                    maxPolarAngle={Math.PI / 1.5}
                                    minDistance={3}
                                    maxDistance={8}
                                />
                                <Environment preset="studio" />
                            </Suspense>
                        </Canvas>

                        {/* Bottom Overlay */}
                        <div className="absolute bottom-12 inset-x-0 text-center pointer-events-none">
                             <div className="inline-block bg-black/50 backdrop-blur-md rounded-full px-6 py-2 text-xs text-gray-400 border border-white/5 uppercase tracking-widest">
                                Left Click to Rotate • Scroll to Zoom
                             </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
