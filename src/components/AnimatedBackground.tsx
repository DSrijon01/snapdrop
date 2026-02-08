"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const images = [
  "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=500&auto=format&fit=crop&q=60", // Dark Abstract
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&auto=format&fit=crop&q=60", // Cyberpunk City
  "https://images.unsplash.com/photo-1620336655174-3266ecc69911?w=500&auto=format&fit=crop&q=60", // Glitch Red
  "https://images.unsplash.com/photo-1535868463750-c78d9543614f?w=500&auto=format&fit=crop&q=60", // Neon Red Signs
  "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=500&auto=format&fit=crop&q=60", // Future Technology
];

interface Particle {
  id: number;
  width: number;
  height: number;
  initialX: number;
  initialY: number;
  moveX: number;
  moveY: number;
  duration: number;
}

interface Props {
  refreshTrigger?: number;
}

export const AnimatedBackground: React.FC<Props> = ({ refreshTrigger = 0 }) => {
  const [mounted, setMounted] = useState(false);
  const [shuffledImages, setShuffledImages] = useState<string[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Shuffle images and generate particles on refresh
  useEffect(() => {
    // Shuffle images
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShuffledImages([...images].sort(() => Math.random() - 0.5));

    // Generate random particles
    const newParticles = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      width: Math.random() * 200 + 100,
      height: Math.random() * 200 + 100,
      initialX: Math.random() * 100 - 50,
      initialY: Math.random() * 100 - 50,
      moveX: Math.random() * 50 - 25,
      moveY: Math.random() * 50 - 25,
      duration: Math.random() * 10 + 10,
    }));
    setParticles(newParticles);
  }, [refreshTrigger]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-background transition-colors duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-background to-red-50/80 dark:from-blue-900/20 dark:via-background dark:to-blue-900/20 mix-blend-multiply dark:mix-blend-normal" />
      
      <div className="flex flex-wrap opacity-30">
        {particles.map((p, i) => (
          <motion.div
            key={`${p.id}-${refreshTrigger}`}
            className="m-2 rounded-lg overflow-hidden relative shadow-lg"
            style={{
                width: p.width,
                height: p.height,
            }}
            initial={{ opacity: 0, scale: 0.8, x: p.initialX, y: p.initialY }}
            animate={{
              opacity: [0.2, 0.5, 0.2],
              scale: [0.9, 1.1, 0.9],
              x: [0, p.moveX, 0],
              y: [0, p.moveY, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <img
              src={shuffledImages[i % shuffledImages.length] || images[0]}
              alt="bg"
              className="w-full h-full object-cover"
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

