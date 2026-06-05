"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { LineChart, Newspaper, Zap, Bot, PiggyBank, Activity, Menu, X, Rocket, Search } from "lucide-react";
import { UserAvatar } from "@/components/global/layout/UserAvatar";

const NAV_ITEMS = [
  { label: "Market Data", href: "/market-data", icon: LineChart },
  { label: "Market News", href: "/market-news", icon: Newspaper },
  { label: "SS Scan", href: "/ss-scan", icon: Search },
  { label: "E-plays", href: "/e-plays", icon: Zap },
  { label: "Openclaw T cal", href: "/openclaw", icon: Bot },
  { label: "SNBL", href: "/snbl", icon: PiggyBank },
  { label: "Sessions", href: "/sessions", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { connected } = useWallet();

  // Auto-close sidebar on mobile when navigating to a new route
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const toggleSidebar = () => setIsOpen(!isOpen);

  if (!connected) return null;

  return (
    <>
      {/* Mobile Hamburger Button (Floating Action Button) */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed bottom-16 right-4 z-[60] p-3 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-105 transition-all focus:outline-none"
        aria-label="Toggle Navigation"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity" 
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`group fixed md:sticky top-0 z-50 h-[100dvh] md:h-full w-64 md:w-20 md:hover:w-64 bg-background border-r border-border transition-all duration-300 ease-in-out flex flex-col overflow-hidden ${
          isOpen ? "left-0" : "-left-64 md:left-0"
        }`}
      >
        {/* User Avatar Area (Highest Element) */}
        <div className="px-5 border-b border-border shrink-0 bg-secondary/20 flex items-center md:h-[96px] h-[88px]">
          <UserAvatar />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group/item ${
                  isActive
                    ? "bg-primary/10 text-primary font-bold shadow-[inset_4px_0_0_0_var(--brand-color)] md:shadow-[inset_4px_0_0_0_oklch(var(--primary))]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon size={20} className={`shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover/item:text-foreground transition-colors"}`} />
                <span className="md:opacity-0 md:w-0 md:group-hover:opacity-100 md:group-hover:w-auto overflow-hidden text-sm uppercase tracking-wide font-display whitespace-nowrap transition-all duration-300">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Trade Button */}
        <div className="p-3 mt-auto border-t border-border shrink-0 bg-background/50 backdrop-blur-md">
          <Link
            href="/trade"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 justify-center md:justify-start px-4 py-3 bg-primary/10 hover:bg-primary border border-primary/20 hover:border-primary text-primary hover:text-primary-foreground rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(var(--primary),0.1)] hover:shadow-[0_0_20px_rgba(var(--primary),0.4)] group/btn"
          >
            <Rocket size={20} className="shrink-0 transition-transform group-hover/btn:-translate-y-1 group-hover/btn:scale-110" />
            <span className="md:opacity-0 md:w-0 md:group-hover:opacity-100 md:group-hover:w-auto overflow-hidden font-display font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300">
              Trade!
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}
