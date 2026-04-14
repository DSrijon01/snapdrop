"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Twitter, MessageSquare as Discord, Send, Droplets } from 'lucide-react';
import { motion } from 'framer-motion';

export function Footer() {
  const [solPrice, setSolPrice] = useState<string>("---");

  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
        const data = await response.json();
        if (data.price) {
          setSolPrice(parseFloat(data.price).toFixed(2));
        }
      } catch (error) {
        console.error("Failed to fetch SOL price", error);
      }
    };

    fetchSolPrice();
    const interval = setInterval(fetchSolPrice, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="w-full h-10 bg-background border-t border-border flex items-center justify-between px-4 sm:px-6 text-[11px] font-bold text-muted-foreground mt-auto shrink-0 z-50">
      
      {/* First Section: Links & Socials */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1 text-green-500 mr-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="uppercase tracking-widest text-[9px]">Live</span>
        </div>
        <Link href="#" className="hover:text-foreground transition-colors">
          Terms of Service
        </Link>
        <Link href="#" className="hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
        
        <div className="flex items-center space-x-3 pl-4 border-l border-border m-0">
          <Link href="#" className="hover:text-foreground transition-colors" aria-label="Discord">
            <Discord className="w-3.5 h-3.5" />
          </Link>
          <Link href="#" className="hover:text-foreground transition-colors" aria-label="Telegram">
            <Send className="w-3.5 h-3.5" />
          </Link>
          <Link href="#" className="hover:text-foreground transition-colors" aria-label="Twitter">
            <Twitter className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Second Section: Solana Live Pricing & Animated Chart */}
      <div className="hidden md:flex items-center space-x-8">
          <div className="flex items-center space-x-1.5 hover:text-foreground transition-colors cursor-pointer">
              <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M125.751 38.3845L127.871 36.2655H112.98L92.0519 15.3374H24.3217L3.39355 36.2655L1.27464 38.3845H16.1664L37.0945 17.4564H104.824L125.751 38.3845ZM125.751 68.3245L127.871 66.2055H112.98L92.0519 45.2774H24.3217L3.39355 66.2055L1.27464 68.3245H16.1664L37.0945 47.3964H104.824L125.751 68.3245ZM1.27464 96.1455L3.39355 94.0264H18.2853L39.2133 114.955H106.944L127.871 94.0264L125.751 96.1455H110.86L89.932 117.074H22.2018L1.27464 96.1455Z" fill="currentColor"/>
              </svg>
              <span className="font-mono">${solPrice}</span>
          </div>

          {/* Polymarket Style Mini-Chart */}
          <div className="w-28 h-6 overflow-hidden relative opacity-100 mx-4">
              <svg 
                 width="100%" 
                 height="100%" 
                 viewBox="0 0 100 12" 
                 preserveAspectRatio="none"
                 className="absolute top-0 left-0 text-red-500"
              >
                 {/* Background Grid Lines */}
                 <line x1="0" y1="2" x2="100" y2="2" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="2,2" />
                 <line x1="0" y1="6" x2="100" y2="6" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="2,2" />
                 <line x1="0" y1="10" x2="100" y2="10" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="2,2" />
                 
                 {/* Animated Live Main Line */}
                 <motion.path 
                       animate={{
                           d: [
                               "M 0 6 C 15 6, 30 3, 45 5 L 65 3",
                               "M 0 6 C 15 6, 30 8, 45 4 L 65 9",
                               "M 0 6 C 15 6, 30 4, 45 7 L 65 5",
                               "M 0 6 C 15 6, 30 3, 45 5 L 65 3"
                           ]
                       }}
                       transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                       fill="none" 
                       stroke="currentColor" 
                       strokeWidth="1.5" 
                       strokeLinejoin="round"
                       strokeLinecap="round" />
                 
                 {/* Trailing Dashed Goal Line (Polymarket Prediction Trace) */}
                 <motion.line
                       x1="65"
                       x2="100"
                       y2="6"
                       animate={{ y1: [3, 9, 5, 3] }}
                       transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                       stroke="currentColor"
                       strokeWidth="1"
                       strokeOpacity="0.4"
                       strokeDasharray="2,2"
                 />

                 {/* Pulsing Halo (Outer Aura) */}
                 <motion.circle
                       cx="65"
                       animate={{
                           cy: [3, 9, 5, 3],
                           r: [1.5, 4.5],
                           opacity: [0.7, 0]
                       }}
                       transition={{ 
                           cy: { repeat: Infinity, duration: 6, ease: "easeInOut" },
                           r: { repeat: Infinity, duration: 1.5, ease: "easeOut" },
                           opacity: { repeat: Infinity, duration: 1.5, ease: "easeOut" }
                       }}
                       fill="currentColor"
                 />

                 {/* Bouncing Head (Target Price Node) */}
                 <motion.circle
                       cx="65"
                       animate={{
                           cy: [3, 9, 5, 3]
                       }}
                       transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                       r="1.5"
                       fill="currentColor"
                       className="drop-shadow-[0_0_3px_rgba(239,68,68,1)]"
                 />
              </svg>
          </div>

          <div className="flex items-center space-x-1.5 hover:text-foreground transition-colors cursor-pointer text-muted-foreground/80">
               <Droplets className="w-3 h-3" />
               <span className="font-mono">0.000005 SOL</span>
          </div>
      </div>

      {/* Third Section: Copyright */}
      <div className="whitespace-nowrap flex items-center space-x-4">
        <span>© 2026 Street Sync. Built on Solana.</span>
      </div>

    </footer>
  );
}
