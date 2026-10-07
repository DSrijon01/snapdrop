"use client";

import { motion } from "framer-motion";

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo = ({ className = "", size = 40 }: LogoProps) => {
  return (
    <motion.div 
      className={`relative flex items-center justify-center shrink-0 overflow-hidden rounded-xl shadow-md border border-red-500/20 group-hover:border-red-500/50 transition-all ${className}`} 
      style={{ width: size, height: size }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <img
        src="/logo.png"
        alt="Street Sync"
        className="w-full h-full object-cover select-none"
        width={size}
        height={size}
      />
    </motion.div>
  );
};
