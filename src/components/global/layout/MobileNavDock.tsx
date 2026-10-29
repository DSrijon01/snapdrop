"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  ArrowLeftRight,
  Zap,
  PiggyBank,
  Menu,
  X,
  LineChart,
  Newspaper,
  Search,
  Terminal,
  Activity,
  ShieldCheck,
  Copy,
  Check,
  Twitter,
  Send,
  MessageSquare as Discord,
  Droplets,
  ExternalLink,
} from "lucide-react";
import { useSubscription } from "@/context/SubscriptionContext";
import toast from "react-hot-toast";

interface NavTab {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
}

const PRIMARY_TABS: NavTab[] = [
  { label: "Hub", href: "/", icon: LayoutGrid, exact: true },
  { label: "Trade", href: "/trade", icon: ArrowLeftRight },
  { label: "E-Plays", href: "/e-plays", icon: Zap },
  { label: "Staking", href: "/snbl", icon: PiggyBank },
];

const SECONDARY_MODULES = [
  { label: "SS Terminal", href: "/openclaw", moduleId: "openclaw", icon: Terminal, desc: "AI-powered trading terminal" },
  { label: "Market Data", href: "/market-data", moduleId: "market-data", icon: LineChart, desc: "Live charts & volume" },
  { label: "Market News", href: "/market-news", moduleId: "market-news", icon: Newspaper, desc: "Alpha & crypto insights" },
  { label: "SS Scan", href: "/ss-scan", moduleId: "ss-scan", icon: Search, desc: "On-chain token analyzer" },
  { label: "Sessions", href: "/sessions", moduleId: "sessions", icon: Activity, desc: "Active trades & history" },
];

export function MobileNavDock() {
  const pathname = usePathname();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const { hasAccess } = useSubscription();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [solPrice, setSolPrice] = useState<string>("---");
  const [balance, setBalance] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const isAdmin = publicKey?.toBase58() === "9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu";

  // Auto-close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  // Fetch SOL balance
  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    let isMounted = true;
    connection.getBalance(publicKey).then((lamports) => {
      if (isMounted) setBalance(lamports / LAMPORTS_PER_SOL);
    }).catch(console.error);

    let subId: number | null = null;
    try {
      subId = connection.onAccountChange(publicKey, (acc) => {
        if (isMounted) setBalance(acc.lamports / LAMPORTS_PER_SOL);
      });
    } catch (e) {
      console.debug("Account change subscription failed:", e);
    }

    return () => {
      isMounted = false;
      if (subId !== null) {
        try {
          connection.removeAccountChangeListener(subId);
        } catch (e) {
          // ignore
        }
      }
    };
  }, [publicKey, connection]);

  // Fetch SOL live price
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const response = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT");
        const data = await response.json();
        if (data.price) {
          setSolPrice(parseFloat(data.price).toFixed(2));
        }
      } catch (err) {
        console.debug("SOL price fetch error:", err);
      }
    };

    fetchSolPrice();
    const interval = setInterval(fetchSolPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  const copyAddress = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    toast.success("Wallet address copied!", { icon: "📋" });
    setTimeout(() => setCopied(false), 2000);
  };

  // Only render when connected, matching app gated architecture
  if (!connected) return null;

  return (
    <>
      {/* 1. Persistent Glassmorphic Bottom Dock (Mobile Only) */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border shadow-[0_-8px_30px_rgba(0,0,0,0.35)] safe-bottom"
        aria-label="Mobile Navigation Dock"
      >
        <div className="flex items-center justify-around px-2 py-1.5 max-w-md mx-auto">
          {PRIMARY_TABS.map((tab) => {
            const isActive = tab.exact 
              ? pathname === tab.href 
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch={true}
                className="relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all duration-200 select-none group active:scale-95"
              >
                {/* Active Glow Pill */}
                {isActive && (
                  <motion.div
                    layoutId="activeDockTab"
                    className="absolute inset-0 bg-primary/15 rounded-xl border border-primary/25"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}

                <div className="relative">
                  <Icon
                    size={20}
                    className={`transition-colors duration-200 ${
                      isActive ? "text-primary scale-110 drop-shadow-[0_0_8px_rgba(255,24,1,0.5)]" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                </div>

                <span
                  className={`text-[10px] font-bold tracking-tight uppercase font-display mt-0.5 transition-colors duration-200 ${
                    isActive ? "text-primary font-black" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* More / Menu Drawer Button */}
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Toggle All Modules"
            className="relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all duration-200 select-none group active:scale-95 text-muted-foreground hover:text-foreground"
          >
            {isMenuOpen && (
              <div className="absolute inset-0 bg-primary/15 rounded-xl border border-primary/25" />
            )}
            <div className="relative">
              {isMenuOpen ? (
                <X size={20} className="text-primary transition-transform duration-200" />
              ) : (
                <Menu size={20} className="text-muted-foreground group-hover:text-primary transition-colors duration-200" />
              )}
              {/* Subtle indicator dot */}
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>
            <span
              className={`text-[10px] font-bold tracking-tight uppercase font-display mt-0.5 ${
                isMenuOpen ? "text-primary font-black" : "text-muted-foreground"
              }`}
            >
              Menu
            </span>
          </button>
        </div>
      </nav>

      {/* 2. Mobile Drawer / Sheet for Additional Modules */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-md z-[55]"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-card border-t border-border rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden safe-bottom"
            >
              {/* Drag Handle & Header */}
              <div className="pt-3 pb-2 px-6 flex flex-col items-center border-b border-border/60 shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 mb-3" />
                <div className="w-full flex items-center justify-between">
                  <h3 className="text-base font-black uppercase tracking-wider font-display text-foreground">
                    Street Sync Modules
                  </h3>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1.5 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* User Identity Banner */}
                {publicKey && (
                  <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${publicKey.toBase58()}&backgroundColor=transparent`}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full bg-background border border-border p-1 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-foreground truncate">
                            {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
                          </span>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        </div>
                        <p className="text-[11px] font-mono text-muted-foreground">
                          {balance !== null ? `${balance.toFixed(4)} SOL` : "Loading..."}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={copyAddress}
                      className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="Copy Address"
                    >
                      {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                )}

                {/* Modules Grid */}
                <div>
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2 px-1">
                    Features &amp; Tools
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {SECONDARY_MODULES.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      const Icon = item.icon;
                      const isSubscribed = item.moduleId ? hasAccess(item.moduleId) : false;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={true}
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isActive
                              ? "bg-primary/10 border-primary/40 text-primary font-bold shadow-sm"
                              : "bg-muted/30 hover:bg-muted/70 border-border text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-background border border-border shrink-0">
                              <Icon size={18} className={isActive ? "text-primary" : "text-muted-foreground"} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase tracking-wide font-display truncate">
                                  {item.label}
                                </span>
                                {isSubscribed && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary uppercase font-bold">
                                    PRO
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                            </div>
                          </div>
                          <ExternalLink size={14} className="text-muted-foreground/60 shrink-0 ml-2" />
                        </Link>
                      );
                    })}

                    {/* Admin One-Click Launch */}
                    {isAdmin && (
                      <Link
                        href="/one-click-launch"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-between p-3 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-background border border-destructive/30">
                            <ShieldCheck size={18} />
                          </div>
                          <div>
                            <span className="text-xs font-black uppercase tracking-wide font-display">
                              One Click Launch
                            </span>
                            <p className="text-[10px] text-destructive/80">Admin Token Deployer</p>
                          </div>
                        </div>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Solana Live Status Strip */}
                <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-foreground font-bold">Solana Devnet</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="font-bold text-foreground font-mono">${solPrice}</span>
                    <div className="flex items-center gap-1">
                      <Droplets size={12} />
                      <span>0.000005 SOL</span>
                    </div>
                  </div>
                </div>

                {/* Socials & Legal */}
                <div className="pt-2 flex flex-col gap-3">
                  <div className="flex items-center justify-center gap-6 text-muted-foreground">
                    <a
                      href="https://discord.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:text-foreground transition-colors"
                      aria-label="Discord"
                    >
                      <Discord size={18} />
                    </a>
                    <a
                      href="https://t.me"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:text-foreground transition-colors"
                      aria-label="Telegram"
                    >
                      <Send size={18} />
                    </a>
                    <a
                      href="https://twitter.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:text-foreground transition-colors"
                      aria-label="Twitter"
                    >
                      <Twitter size={18} />
                    </a>
                  </div>

                  <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-muted-foreground/80 pb-2">
                    <Link href="#" className="hover:text-foreground transition-colors">
                      Terms of Service
                    </Link>
                    <span>•</span>
                    <Link href="#" className="hover:text-foreground transition-colors">
                      Privacy Policy
                    </Link>
                    <span>•</span>
                    <span>© 2026 Street Sync</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
