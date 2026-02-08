"use client";

import { motion } from "framer-motion";
import { useTheme } from "./ThemeProvider";
import { useEffect, useState } from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo = ({ className = "", size = 40 }: LogoProps) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Adaptive color: F1 Red in Light (#FF1801), OpenSea Blue in Dark (#2081e2)
  const adaptiveColor = mounted && theme === "light" ? "#FF1801" : "#2081e2";

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        {/* Animated Inner Icon - Mechanical Gear/Sync */}
        <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke={adaptiveColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="relative z-10 w-full h-full"
            animate={{ rotate: 360 }}
            transition={{ 
                duration: 8, 
                repeat: Infinity, 
                ease: "linear" 
            }}
        >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
        </motion.svg>
    </div>
  );
};
