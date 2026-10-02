"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { LineChart, Newspaper, Zap, Terminal, PiggyBank, Activity, Menu, X, Rocket, Search, ShieldCheck, Sparkles } from "lucide-react";
import { UserAvatar } from "@/components/global/layout/UserAvatar";
import { useSubscription } from "@/context/SubscriptionContext";

const NAV_ITEMS = [
  { label: "Market Data", href: "/market-data", moduleId: "market-data", icon: LineChart },
  { label: "Market News", href: "/market-news", moduleId: "market-news", icon: Newspaper },
  { label: "SS Scan", href: "/ss-scan", moduleId: "ss-scan", icon: Search },
  { label: "E-plays", href: "/e-plays", moduleId: "e-plays", icon: Zap },
  { label: "SS Terminal", href: "/openclaw", moduleId: "openclaw", icon: Terminal },
  { label: "SS Staking", href: "/snbl", moduleId: "snbl", icon: PiggyBank },
  { label: "Sessions", href: "/sessions", moduleId: "sessions", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { connected, publicKey } = useWallet();
  const { hasAccess } = useSubscription();

  const isAdmin = publicKey?.toBase58() === "9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu";

  const navItems = [
    ...NAV_ITEMS,
    ...(isAdmin ? [{ label: "One Click Launch", href: "/one-click-launch", moduleId: "launch", icon: ShieldCheck }] : []),
  ];

  // Auto-close sidebar on mobile when navigating to a new route
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const toggleSidebar = () => setIsOpen(!isOpen);

  if (!connected) return null;

  return (
    <aside
      className="hidden md:flex group sticky top-0 z-40 h-full w-20 hover:w-64 bg-background border-r border-border transition-all duration-300 ease-in-out flex-col overflow-hidden shrink-0"
    >
        {/* User Avatar Area (Highest Element) */}
        <div className="px-5 border-b border-border shrink-0 bg-secondary/20 flex items-center md:h-[96px] h-[88px]">
          <UserAvatar />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            const isSubscribed = item.moduleId ? hasAccess(item.moduleId) : false;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 group/item relative ${
                  isActive
                    ? "bg-primary/10 text-primary font-bold shadow-[inset_4px_0_0_0_var(--brand-color)] md:shadow-[inset_4px_0_0_0_oklch(var(--primary))]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <Icon size={20} className={`${isActive ? "text-primary" : "text-muted-foreground group-hover/item:text-foreground transition-colors"}`} />
                    {isSubscribed && (
                      <span className="md:group-hover:hidden absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
                    )}
                  </div>
                  <span className="md:opacity-0 md:w-0 md:group-hover:opacity-100 md:group-hover:w-auto overflow-hidden text-sm uppercase tracking-wide font-display whitespace-nowrap transition-all duration-300">
                    {item.label}
                  </span>
                </div>

                {isSubscribed && (
                  <span className="md:opacity-0 md:w-0 md:group-hover:opacity-100 md:group-hover:w-auto overflow-hidden transition-all duration-300 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-mono font-bold tracking-wider uppercase border border-primary/30 flex items-center gap-0.5 shrink-0 ml-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>PRO</span>
                  </span>
                )}
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
  );
}

