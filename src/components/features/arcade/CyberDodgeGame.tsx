"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { Trophy, RefreshCw, X, Play, Volume2, VolumeX, ArrowLeft, ArrowRight } from "lucide-react";
import { ClientWalletMultiButton as WalletMultiButton } from "@/components/global/wallet/ClientWalletMultiButton";

// Web Audio API Sound Synthesizer (Zero external dependencies)
function playRetroSound(type: "coin" | "crash" | "start") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "coin") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === "crash") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === "start") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // AudioContext blocked or not allowed prior to interaction
  }
}

// Lane coordinates: Left (-1.5), Center (0), Right (1.5)
const LANES = [-1.5, 0, 1.5];

interface ItemObject {
  id: number;
  lane: number;
  z: number;
  type: "coin" | "obstacle";
  collected?: boolean;
}

// 3D Player Ship Component
function PlayerShip({ targetLane, isInvulnerable }: { targetLane: number; isInvulnerable: boolean }) {
  const meshRef = useRef<THREE.Group>(null);
  const currentX = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const targetX = LANES[targetLane];
    currentX.current = THREE.MathUtils.lerp(currentX.current, targetX, delta * 14);
    meshRef.current.position.x = currentX.current;

    // Banking tilt when turning
    const diff = targetX - currentX.current;
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, -diff * 0.8, delta * 12);
    // Slight idle hover bounce
    meshRef.current.position.y = 0.35 + Math.sin(Date.now() * 0.005) * 0.05;
  });

  return (
    <group ref={meshRef} position={[0, 0.35, 1.5]}>
      {/* Ship Hull */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.35, 0.9, 4]} />
        <meshStandardMaterial
          color={isInvulnerable ? "#38bdf8" : "#22c55e"}
          emissive={isInvulnerable ? "#0284c7" : "#15803d"}
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Cockpit / Eye */}
      <mesh position={[0, 0.1, -0.05]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Wings */}
      <mesh position={[-0.35, -0.05, 0.2]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.35, 0.04, 0.4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.9} />
      </mesh>
      <mesh position={[0.35, -0.05, 0.2]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.35, 0.04, 0.4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.9} />
      </mesh>

      {/* Thruster Glow Light */}
      <pointLight color="#38bdf8" distance={2} intensity={4} position={[0, 0, 0.6]} />
    </group>
  );
}

// 3D Neon Track Highway
function NeonHighway() {
  const gridRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (gridRef.current) {
      gridRef.current.position.z = (gridRef.current.position.z + delta * 12) % 4;
    }
  });

  return (
    <group>
      {/* Dark Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -15]}>
        <planeGeometry args={[7, 60]} />
        <meshStandardMaterial color="#030712" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Lane Separator Guides */}
      {[-0.75, 0.75].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, -15]}>
          <planeGeometry args={[0.04, 60]} />
          <meshBasicMaterial color="#38bdf8" opacity={0.3} transparent />
        </mesh>
      ))}

      {/* Track Outer Neon Borders */}
      {[-2.5, 2.5].map((x, i) => (
        <mesh key={i} position={[x, 0.1, -15]}>
          <boxGeometry args={[0.08, 0.2, 60]} />
          <meshStandardMaterial color="#ff1801" emissive="#ff1801" emissiveIntensity={1} />
        </mesh>
      ))}

      {/* Moving Track Stripes */}
      <group ref={gridRef} position={[0, 0.02, 0]}>
        {Array.from({ length: 15 }).map((_, i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -i * 4]}>
            <planeGeometry args={[4.8, 0.08]} />
            <meshBasicMaterial color="#1e293b" opacity={0.6} transparent />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// Collectible Solana Crystals and Obstacles
function WorldItems({ items }: { items: ItemObject[] }) {
  return (
    <group>
      {items.map((item) => {
        if (item.collected) return null;
        const x = LANES[item.lane];
        const z = item.z;

        if (item.type === "coin") {
          return (
            <Float key={item.id} speed={4} rotationIntensity={2} floatIntensity={0.5} position={[x, 0.45, z]}>
              <mesh rotation={[0.4, 0.4, 0]}>
                <octahedronGeometry args={[0.22, 0]} />
                <meshStandardMaterial
                  color="#22c55e"
                  emissive="#16a34a"
                  emissiveIntensity={1.2}
                  roughness={0.1}
                  metalness={0.9}
                />
              </mesh>
              <pointLight color="#22c55e" distance={1.5} intensity={2} />
            </Float>
          );
        } else {
          return (
            <group key={item.id} position={[x, 0.35, z]}>
              <mesh>
                <boxGeometry args={[0.7, 0.7, 0.7]} />
                <meshStandardMaterial
                  color="#ff1801"
                  emissive="#ef4444"
                  emissiveIntensity={1}
                  roughness={0.3}
                  wireframe={false}
                />
              </mesh>
              <pointLight color="#ff1801" distance={2} intensity={2.5} />
            </group>
          );
        }
      })}
    </group>
  );
}

// 3D Scene Core
function GameScene({
  targetLane,
  items,
  isInvulnerable,
}: {
  targetLane: number;
  items: ItemObject[];
  isInvulnerable: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[0, 10, 5]} intensity={1.2} color="#ffffff" />
      <fog attach="fog" args={["#030712", 10, 35]} />

      <NeonHighway />
      <PlayerShip targetLane={targetLane} isInvulnerable={isInvulnerable} />
      <WorldItems items={items} />
    </>
  );
}

interface CyberDodgeGameProps {
  onExit: () => void;
}

export default function CyberDodgeGame({ onExit }: CyberDodgeGameProps) {
  const [gameState, setGameState] = useState<"ready" | "playing" | "gameover">("ready");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [targetLane, setTargetLane] = useState(1); // 0=Left, 1=Center, 2=Right
  const [items, setItems] = useState<ItemObject[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [isInvulnerable, setIsInvulnerable] = useState(false);

  const nextItemId = useRef(1);
  const currentLaneRef = useRef(1);
  currentLaneRef.current = targetLane;

  // Load High Score
  useEffect(() => {
    const saved = localStorage.getItem("street_sync_arcade_highscore");
    if (saved) setHighScore(parseInt(saved, 10) || 0);
  }, []);

  // Controls: Keyboard Arrows / A & D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        setTargetLane((l) => Math.max(0, l - 1));
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        setTargetLane((l) => Math.min(2, l + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  // Main Game Loop: Moves items toward player, spawns, and checks collisions
  useEffect(() => {
    if (gameState !== "playing") return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const currentSpeed = 16 * speedMultiplier;

      setItems((prevItems) => {
        const updated: ItemObject[] = [];
        const playerZ = 1.5;
        const playerLane = currentLaneRef.current;

        for (const item of prevItems) {
          const newZ = item.z + currentSpeed * delta;

          // Check Collision with player
          if (!item.collected && Math.abs(newZ - playerZ) < 0.6 && item.lane === playerLane) {
            if (item.type === "coin") {
              item.collected = true;
              setScore((s) => s + 10);
              if (!isMuted) playRetroSound("coin");
            } else if (item.type === "obstacle") {
              if (!isInvulnerable) {
                // Game Over!
                if (!isMuted) playRetroSound("crash");
                setGameState("gameover");
                setScore((finalScore) => {
                  setHighScore((prevHigh) => {
                    const newHigh = Math.max(prevHigh, finalScore);
                    localStorage.setItem("street_sync_arcade_highscore", newHigh.toString());
                    return newHigh;
                  });
                  return finalScore;
                });
                return prevItems;
              }
            }
          }

          // Keep item if it hasn't passed behind camera
          if (newZ < 5) {
            updated.push({ ...item, z: newZ });
          }
        }

        // Spawn new items ahead
        const farthestZ = updated.reduce((min, it) => Math.min(min, it.z), 0);
        if (farthestZ > -35) {
          const spawnLane = Math.floor(Math.random() * 3);
          const isObstacle = Math.random() > 0.45;
          updated.push({
            id: nextItemId.current++,
            lane: spawnLane,
            z: Math.min(-30, farthestZ - 7),
            type: isObstacle ? "obstacle" : "coin",
          });

          // Occasionally spawn a coin in an alternate lane
          if (isObstacle && Math.random() > 0.5) {
            const alternateLane = (spawnLane + 1) % 3;
            updated.push({
              id: nextItemId.current++,
              lane: alternateLane,
              z: Math.min(-30, farthestZ - 7),
              type: "coin",
            });
          }
        }

        return updated;
      });

      // Gradually increase speed
      setSpeedMultiplier((sm) => Math.min(2.5, sm + delta * 0.02));

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, speedMultiplier, isMuted, isInvulnerable]);

  const startGame = () => {
    setScore(0);
    setTargetLane(1);
    setSpeedMultiplier(1);
    setIsInvulnerable(true);

    // Initial batch of items
    const initialItems: ItemObject[] = [
      { id: 1, lane: 1, z: -10, type: "coin" },
      { id: 2, lane: 0, z: -17, type: "coin" },
      { id: 3, lane: 2, z: -24, type: "obstacle" },
      { id: 4, lane: 1, z: -24, type: "coin" },
      { id: 5, lane: 0, z: -32, type: "obstacle" },
    ];
    setItems(initialItems);
    setGameState("playing");

    if (!isMuted) playRetroSound("start");

    // Brief 1.5s invulnerability upon start
    setTimeout(() => {
      setIsInvulnerable(false);
    }, 1500);
  };

  return (
    <div className="relative w-full max-w-sm sm:max-w-md aspect-square bg-card/90 backdrop-blur-xl border-2 border-primary/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center justify-center font-display select-none">
      {/* 3D WebGL Canvas */}
      <div className="absolute inset-0">
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 2.8, 4.5], fov: 60 }}
          gl={{ antialias: true, alpha: false }}
        >
          <Suspense fallback={null}>
            <GameScene
              targetLane={targetLane}
              items={items}
              isInvulnerable={isInvulnerable}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-xl bg-background/80 backdrop-blur-md border border-border/80 shadow-md font-mono text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-foreground">SCORE:</span>
            <span className="text-emerald-400 font-black text-sm">{score}</span>
          </div>

          <div className="px-3 py-1 rounded-xl bg-background/80 backdrop-blur-md border border-border/80 shadow-md font-mono text-xs flex items-center gap-1 text-muted-foreground">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>HI: {highScore}</span>
          </div>
        </div>

        {/* Audio & Close Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-8 h-8 rounded-xl bg-background/80 backdrop-blur-md border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onExit}
            className="w-8 h-8 rounded-xl bg-background/80 backdrop-blur-md border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Exit Mini-Game"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Touch Controls for Mobile */}
      {gameState === "playing" && (
        <div className="absolute bottom-4 inset-x-6 flex items-center justify-between z-10 pointer-events-auto sm:hidden">
          <button
            onClick={() => setTargetLane((l) => Math.max(0, l - 1))}
            className="w-14 h-14 rounded-2xl bg-card/80 backdrop-blur-md border border-border/80 flex items-center justify-center text-primary active:scale-95 shadow-lg active:bg-primary/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest bg-background/60 px-3 py-1 rounded-full">
            Tap to Steer
          </div>

          <button
            onClick={() => setTargetLane((l) => Math.min(2, l + 1))}
            className="w-14 h-14 rounded-2xl bg-card/80 backdrop-blur-md border border-border/80 flex items-center justify-center text-primary active:scale-95 shadow-lg active:bg-primary/20"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Ready / Start Overlay */}
      {gameState === "ready" && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center text-primary mb-3 shadow-lg shadow-primary/20 animate-bounce">
            <Play className="w-7 h-7 ml-1" />
          </div>

          <h3 className="text-2xl font-black uppercase tracking-tight text-foreground mb-1">
            Street Sync <span className="text-primary">3D Arcade</span>
          </h3>
          <p className="text-xs text-muted-foreground font-mono max-w-xs mb-5">
            Dodge red glitches · Collect green Solana tokens.
            <br />
            <span className="text-[11px] text-primary font-bold">Use [A / D] or [← / →] to steer.</span>
          </p>

          <div className="flex gap-3">
            <button
              onClick={startGame}
              className="px-6 py-3 bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/30 cursor-pointer"
            >
              Start Mission
            </button>
            <button
              onClick={onExit}
              className="px-4 py-3 bg-muted text-muted-foreground font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-muted/80 transition-all cursor-pointer"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === "gameover" && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="text-xs font-mono font-bold uppercase tracking-widest text-destructive mb-1 animate-pulse">
            System Overload
          </div>

          <h3 className="text-2xl font-black uppercase tracking-tight text-foreground mb-2">
            Mission Failed
          </h3>

          <div className="my-3 p-4 rounded-2xl bg-card border border-border/80 w-full max-w-xs space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-muted-foreground">SCORE:</span>
              <span className="font-black text-emerald-400 text-lg">{score}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-mono border-t border-border/40 pt-2">
              <span className="text-muted-foreground">HIGH SCORE:</span>
              <span className="font-bold text-foreground text-sm">{highScore}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full max-w-xs">
            <button
              onClick={startGame}
              className="w-full py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl hover:scale-102 active:scale-95 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Play Again
            </button>

            <button
              onClick={onExit}
              className="w-full py-2 bg-muted/60 text-muted-foreground font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-muted transition-all cursor-pointer"
            >
              Back to Avatar
            </button>
          </div>

          {/* Web3 Hook: Connect Wallet prompt */}
          <div className="mt-3 pt-3 border-t border-border/40 w-full max-w-xs">
            <p className="text-[10px] text-muted-foreground mb-2 font-mono">
              Connect wallet to save high score on-chain
            </p>
            <div className="flex justify-center scale-90">
              <WalletMultiButton className="!py-2 !px-6 !h-auto !text-xs !bg-primary !text-primary-foreground !rounded-xl !font-bold !uppercase" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
