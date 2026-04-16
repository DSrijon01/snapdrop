"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { ClientWalletMultiButton as WalletMultiButton } from "@/components/ClientWalletMultiButton";
import { ThemeToggle } from "@/components/ThemeToggle"; 
import { Logo } from "@/components/Logo";
import { MobileSyncModal } from "@/components/MobileSyncModal";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function GlobalHeader() {
  const [showMobileSync, setShowMobileSync] = useState(false);
  const pathname = usePathname();
  const { connected } = useWallet();
  
  // Conditionally render the "Back/Home" button if not currently on the root.
  const isHome = pathname === '/';

  return (
    <>
      <MobileSyncModal isOpen={showMobileSync} onClose={() => setShowMobileSync(false)} />
      <header className="px-4 py-3 md:px-6 md:py-4 flex justify-between items-center z-50 sticky top-0 bg-background/80 backdrop-blur-md border-b border-border transition-colors duration-300">
        
        {/* Left Section Navigation & Branding */}
        <div className="flex items-center gap-4 md:gap-6">
            {!isHome && connected && (
              <Link 
                href="/" 
                className="flex items-center gap-2 text-sm font-mono tracking-widest font-bold uppercase text-muted-foreground hover:text-brand-primary transition-colors group px-3 py-2 -ml-3 rounded-lg hover:bg-muted/50"
              >
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  <span className="hidden sm:inline">Back to Hub</span>
              </Link>
            )}

            <Link href="/" className="flex items-center gap-2 group">
                <Logo size={32} className="rounded-sm md:w-10 md:h-10 group-hover:scale-105 transition-transform" /> 
                <h1 className="hidden md:block text-2xl md:text-3xl font-black text-[var(--brand-text-color)] tracking-tighter cursor-pointer select-none uppercase italic transform -skew-x-6 font-display group-hover:opacity-90 transition-opacity">
                Street Sync
                </h1>
            </Link>
        </div>

        {/* Right Section Actions & Wallet Connect */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 shrink-0">
            <button 
              onClick={() => setShowMobileSync(true)}
              className="p-1.5 md:p-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-foreground border border-border shrink-0"
              aria-label="Mobile Sync"
              title="Sync to Mobile"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <path d="M12 18h.01"></path>
              </svg>
            </button>
            <div className="scale-75 sm:scale-90 md:scale-100 origin-right transition-transform">
               <ThemeToggle />
            </div>
            <WalletMultiButton className="!bg-primary hover:!bg-primary/90 transition-all !rounded-xl !font-bold !text-primary-foreground !px-2.5 sm:!px-3 md:!px-6 !text-[10px] sm:!text-sm md:!text-base !h-8 sm:!h-10 md:!h-12 whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] sm:max-w-none" />
        </div>
      </header>
    </>
  );
}
