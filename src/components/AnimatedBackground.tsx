"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const images = [
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=500&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1595078475328-1ab05d0a6a0e?w=500&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=500&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=500&auto=format&fit=crop&q=60", // Solana-ish
    "https://images.unsplash.com/photo-1622630994162-4b25455c320b?w=500&auto=format&fit=crop&q=60", // Abstract Green
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&auto=format&fit=crop&q=60", // Pinkish
];

interface Props {
  refreshTrigger?: number;
}

export const AnimatedBackground: React.FC<Props> = ({ refreshTrigger = 0 }) => {
  const [mounted, setMounted] = useState(false);
  const [shuffledImages, setShuffledImages] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Shuffle images whenever refreshTrigger changes
  useEffect(() => {
    const shuffled = [...images].sort(() => Math.random() - 0.5);
    setShuffledImages(shuffled);
  }, [refreshTrigger]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-black/90">
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 to-pink-900/20 mix-blend-overlay" />
      
      <div className="flex flex-wrap opacity-30">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={`${i}-${refreshTrigger}`} // Force re-render on refresh
            className="m-2 rounded-lg overflow-hidden relative shadow-lg"
            style={{
                width: Math.random() * 200 + 100,
                height: Math.random() * 200 + 100,
            }}
            initial={{ opacity: 0, scale: 0.8, x: Math.random() * 100 - 50, y: Math.random() * 100 - 50 }}
            animate={{
              opacity: [0.2, 0.5, 0.2],
              scale: [0.9, 1.1, 0.9],
              x: [0, Math.random() * 50 - 25, 0],
              y: [0, Math.random() * 50 - 25, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
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
