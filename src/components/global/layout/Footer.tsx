"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Twitter, MessageSquare as Discord, Send, Droplets } from 'lucide-react';
import { SolanaLogo } from '@/components/global/theme-logo/SolanaLogo';
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
    <footer className="hidden md:flex w-full min-h-[40px] h-auto py-2 bg-background border-t border-border items-center justify-between gap-y-2 px-3 sm:px-6 text-[10px] sm:text-[11px] font-bold text-muted-foreground mt-auto shrink-0 z-40">
      
      {/* First Section: Links & Socials */}
      <div className="flex items-center space-x-3 sm:space-x-4 flex-wrap gap-y-1">
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
          <a
            href="https://discord.gg/gTz6DDmFq"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
            aria-label="Discord"
            title="Join Street Sync Discord"
          >
            <Discord className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://t.me/streetsync"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
            aria-label="Telegram"
            title="Join Street Sync Telegram"
          >
            <Send className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://x.com/streetsyncss"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
            aria-label="X (Twitter)"
            title="Follow Street Sync on 𝕏"
          >
            <Twitter className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Second Section: Solana Live Pricing & Fee Indicator */}
      <div className="hidden md:flex items-center space-x-6 text-[11px]">
          <div className="flex items-center space-x-1.5 hover:text-foreground transition-colors cursor-pointer" title="Live Solana Price">
              <SolanaLogo className="w-3.5 h-3.5" />
              <span className="text-muted-foreground font-semibold uppercase text-[10px]">SOL Price:</span>
              <span className="font-mono text-foreground font-semibold">${solPrice}</span>
          </div>

          <div className="flex items-center space-x-1.5 hover:text-foreground transition-colors cursor-pointer text-muted-foreground" title="Average Solana Devnet Network Fee">
               <Droplets className="w-3 h-3 text-cyan-400" />
               <span className="text-muted-foreground font-semibold uppercase text-[10px]">Network Fee:</span>
               <span className="font-mono text-foreground">~0.000005 SOL</span>
          </div>
      </div>

      {/* Third Section: Copyright */}
      <div className="whitespace-nowrap flex items-center space-x-4 w-full sm:w-auto justify-center sm:justify-end mt-1 sm:mt-0 text-[9px] sm:text-[11px]">
        <span>© 2026 Street Sync. Built on Solana.</span>
      </div>

    </footer>
  );
}
