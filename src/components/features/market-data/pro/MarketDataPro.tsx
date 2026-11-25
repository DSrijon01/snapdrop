"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSubscription } from "@/context/SubscriptionContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShieldAlert,
  Sparkles,
  Zap,
  CheckCircle2,
  Activity,
  MessageSquare,
  Wallet,
  Send,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Trash2,
  RefreshCw,
  BarChart2,
  PieChart,
  Paperclip,
  Wrench,
  Smartphone,
  ExternalLink,
  RotateCcw,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/global/theme-logo/Logo";
import { AssetPill, TokenData } from "./AssetPill";
import { Sparkline } from "./Sparkline";
import { AllocationDoughnut, DoughnutItem } from "./AllocationDoughnut";
import { ActionCard } from "./ActionCard";
import toast from "react-hot-toast";
import { ProStatusBar } from "@/components/global/subscription/SubscriptionCountdown";
import { OpenClawChatResponse, SupportedModelId } from "@/lib/openclaw/types";
import { getOpenClawConfig } from "@/lib/openclaw/skillsStore";
import { executeOpenClawChat, fetchClientMarketPrices } from "@/lib/openclaw/clientChat";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { openInPhantomBrowser } from "@/lib/wallet/phantomDeeplink";

// ==========================================
// TYPES & CONSTANTS
// ==========================================

type AssetTicker = "SOL" | "BTC" | "ETH" | "JUP" | "USDC";
type ManualHoldings = Record<AssetTicker, number>;

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
  assetPills?: TokenData[];
  sparklineData?: {
    prices: number[];
    isBullish: boolean;
    label?: string;
  };
  allocationData?: DoughnutItem[];
  actionCard?: {
    suggestedMove: string;
    primaryText: string;
    secondaryText: string;
    onPrimaryAction: string;
  };
}

const DEFAULT_MANUAL_HOLDINGS: ManualHoldings = {
  SOL: 12.0,
  BTC: 0.3,
  ETH: 0.8,
  JUP: 350.0,
  USDC: 2500.0,
};

const MANUAL_STORAGE_KEY = "streetsync_manual_portfolio_v1";

const TOKEN_META: Record<
  AssetTicker,
  { name: string; defaultPrice: number; defaultChange: number; logoBg: string; description: string; sparkline: number[]; color: string }
> = {
  SOL: {
    name: "Solana",
    defaultPrice: 142.5,
    defaultChange: 4.2,
    logoBg: "bg-gradient-to-tr from-[#9945FF] to-[#14F195]",
    description: "Layer 1 Momentum",
    sparkline: [120, 124, 128, 132, 135, 140, 142.5],
    color: "#9945FF",
  },
  BTC: {
    name: "Bitcoin",
    defaultPrice: 64500.0,
    defaultChange: 1.15,
    logoBg: "bg-[#F7931A]",
    description: "Core Store of Value",
    sparkline: [62100, 63400, 62800, 64200, 63900, 64800, 64500],
    color: "#F7931A",
  },
  ETH: {
    name: "Ethereum",
    defaultPrice: 3200.0,
    defaultChange: -1.48,
    logoBg: "bg-[#627EEA]",
    description: "Smart Contract L1",
    sparkline: [3350, 3290, 3240, 3180, 3250, 3220, 3200],
    color: "#627EEA",
  },
  JUP: {
    name: "Jupiter",
    defaultPrice: 0.95,
    defaultChange: -4.18,
    logoBg: "bg-gradient-to-r from-[#19FB9B] to-[#252830]",
    description: "Solana Liquidity",
    sparkline: [1.05, 1.02, 0.98, 0.99, 1.01, 0.97, 0.95],
    color: "#19FB9B",
  },
  USDC: {
    name: "USD Coin",
    defaultPrice: 1.0,
    defaultChange: 0.0,
    logoBg: "bg-[#2775CA]",
    description: "Stable Dry Powder",
    sparkline: [1, 1, 1, 1, 1, 1, 1],
    color: "#2775CA",
  },
};

const ASSET_TICKERS: AssetTicker[] = ["SOL", "BTC", "ETH", "JUP", "USDC"];

export function MarketDataPro() {
  const { hasAccess, openSubscriptionModal, loading: subLoading } = useSubscription();
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();

  const [isMounted, setIsMounted] = useState(false);
  const [activeView, setActiveView] = useState<"Advisor" | "Portfolio">("Advisor");
  const [previewState, setPreviewState] = useState<"StateA" | "StateB">("StateB");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState<SupportedModelId>("gpt-oss-120b");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Portfolio Mode: Live Wallet vs Manual Input Portfolio
  const [portfolioMode, setPortfolioMode] = useState<"live" | "manual">("manual");
  const [liveSolBalance, setLiveSolBalance] = useState<number | null>(null);
  const [liveUsdcBalance, setLiveUsdcBalance] = useState<number>(0);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);

  // Manual Portfolio Holdings (persisted in localStorage)
  const [manualHoldings, setManualHoldings] = useState<ManualHoldings>(DEFAULT_MANUAL_HOLDINGS);
  const [quickTicker, setQuickTicker] = useState<AssetTicker>("SOL");
  const [quickAmount, setQuickAmount] = useState<string>("");

  // Live Market Prices
  const [marketPrices, setMarketPrices] = useState<Record<AssetTicker, { price: number; change24h: number }>>({
    SOL: { price: TOKEN_META.SOL.defaultPrice, change24h: TOKEN_META.SOL.defaultChange },
    BTC: { price: TOKEN_META.BTC.defaultPrice, change24h: TOKEN_META.BTC.defaultChange },
    ETH: { price: TOKEN_META.ETH.defaultPrice, change24h: TOKEN_META.ETH.defaultChange },
    JUP: { price: TOKEN_META.JUP.defaultPrice, change24h: TOKEN_META.JUP.defaultChange },
    USDC: { price: TOKEN_META.USDC.defaultPrice, change24h: TOKEN_META.USDC.defaultChange },
  });

  // Dev preview unlock
  const [simulatedSubscribe, setSimulatedSubscribe] = useState(false);

  // Chat history list
  const [chats, setChats] = useState([
    { id: "1", title: "SOL concentration risk", active: true },
    { id: "2", title: "Q2 rebalance plan", active: false },
    { id: "3", title: "BTC vs ETH allocation", active: false },
    { id: "4", title: "Is JUP a good entry?", active: false },
    { id: "5", title: "DCA schedule for SOL", active: false },
  ]);

  const [messages, setMessages] = useState<Message[]>([]);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const refreshMarketPrices = async () => {
    try {
      const live = await fetchClientMarketPrices();
      setMarketPrices((prev) => ({
        SOL: live.SOL ? { price: live.SOL.price, change24h: live.SOL.change24h } : prev.SOL,
        BTC: live.BTC ? { price: live.BTC.price, change24h: live.BTC.change24h } : prev.BTC,
        ETH: live.ETH ? { price: live.ETH.price, change24h: live.ETH.change24h } : prev.ETH,
        JUP: live.JUP ? { price: live.JUP.price, change24h: live.JUP.change24h } : prev.JUP,
        USDC: live.USDC ? { price: live.USDC.price, change24h: live.USDC.change24h } : prev.USDC,
      }));
    } catch {
      // Keep current/default prices silently
    }
  };

  const fetchLiveBalances = async () => {
    if (!publicKey || !connection) return;
    try {
      setIsFetchingBalance(true);
      const lamports = await connection.getBalance(publicKey);
      const sol = lamports / LAMPORTS_PER_SOL;
      setLiveSolBalance(sol);

      try {
        const tokenProgram = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: tokenProgram });
        let usdc = 0;
        tokenAccounts.value.forEach(({ account }) => {
          const info = account?.data?.parsed?.info;
          const mint = info?.mint;
          const uiAmount = info?.tokenAmount?.uiAmount || 0;
          if (
            mint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" ||
            mint === "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
          ) {
            usdc += uiAmount;
          }
        });
        setLiveUsdcBalance(usdc);
      } catch {
        // Non-blocking SPL query
      }
    } catch (e) {
      console.warn("Live balance fetch error:", e);
    } finally {
      setIsFetchingBalance(false);
    }
  };

  // Persist manual holdings helper
  const updateManualHoldings = (updater: (prev: ManualHoldings) => ManualHoldings) => {
    setManualHoldings((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(MANUAL_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      setSidebarCollapsed(window.innerWidth < 768);
      try {
        const saved = localStorage.getItem(MANUAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setManualHoldings((prev) => ({ ...prev, ...parsed }));
        }
      } catch {}
    }
    const cfg = getOpenClawConfig();
    if (cfg?.activeModelId) {
      setSelectedModel(cfg.activeModelId);
    }
    refreshMarketPrices();
    handleSwitchState("StateB");
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      fetchLiveBalances();
      setPortfolioMode("live");
    } else {
      setPortfolioMode("manual");
    }
  }, [connected, publicKey]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const isSubscribed = hasAccess("market-data") || simulatedSubscribe;
  const isPaywallLocked = !isSubscribed;

  // Compute active portfolio payload for AI Advisor
  const activeSol = portfolioMode === "live" && liveSolBalance !== null ? liveSolBalance : manualHoldings.SOL;
  const activeBtc = portfolioMode === "live" ? 0 : manualHoldings.BTC;
  const activeEth = portfolioMode === "live" ? 0 : manualHoldings.ETH;
  const activeJup = portfolioMode === "live" ? 0 : manualHoldings.JUP;
  const activeUsdc = portfolioMode === "live" ? liveUsdcBalance : manualHoldings.USDC;

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || chatInput;
    if (!rawText.trim()) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: rawText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsTyping(true);

    const portfolioPayload = {
      sol: activeSol,
      btc: activeBtc,
      usdc: activeUsdc,
      jup: activeJup,
      isLiveWallet: portfolioMode === "live",
      walletAddress: publicKey?.toBase58(),
    };

    try {
      let data: OpenClawChatResponse | null = null;

      try {
        const res = await fetch("/api/openclaw/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: rawText,
            modelId: selectedModel,
            portfolio: portfolioPayload,
          }),
        });

        if (res.ok) {
          data = await res.json();
        }
      } catch {
        // Fall back to client-side engine
      }

      if (!data) {
        data = await executeOpenClawChat({
          message: rawText,
          modelId: selectedModel,
          portfolio: portfolioPayload,
        });
      }

      const aiMsg: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: data.text,
        timestamp: new Date(),
        assetPills: data.assetPills as any,
        sparklineData: data.sparklineData as any,
        allocationData: data.allocationData as any,
        actionCard: data.actionCard as any,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Chat Error:", err);
      try {
        const fallback = await executeOpenClawChat({
          message: rawText,
          modelId: selectedModel,
          portfolio: portfolioPayload,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: "ai",
            text: fallback.text,
            timestamp: new Date(),
            assetPills: fallback.assetPills as any,
            sparklineData: fallback.sparklineData as any,
            allocationData: fallback.allocationData as any,
            actionCard: fallback.actionCard as any,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: "ai",
            text: "Market intelligence is active. Real-time indicators are syncing with on-chain liquidity.",
            timestamp: new Date(),
          },
        ]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleSwitchState = (state: "StateA" | "StateB") => {
    setPreviewState(state);
    if (state === "StateA") {
      setMessages([]);
    } else if (state === "StateB") {
      const solPrice = marketPrices.SOL.price;
      const solChange = marketPrices.SOL.change24h;
      setMessages([
        {
          id: "m1",
          sender: "user",
          text: "Should I take some profit on SOL after this run?",
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          id: "m2",
          sender: "ai",
          text: "SOL momentum is elevated. Trimming a small slice into USDC locks in gains while keeping your core exposure intact.",
          timestamp: new Date(Date.now() - 3550000),
          assetPills: [
            {
              ticker: "SOL",
              name: "Solana",
              price: solPrice,
              change24h: solChange,
              logoBg: TOKEN_META.SOL.logoBg,
              description: "RSI 71 - Overbought",
            },
          ],
          sparklineData: {
            prices: [125, 128, 131, 134, 139, 138, solPrice],
            isBullish: solChange >= 0,
            label: `SOL TREND (${solChange >= 0 ? "+" : ""}${solChange.toFixed(1)}%)`,
          },
          actionCard: {
            suggestedMove:
              "Trim 20–30% of SOL into USDC. Keep a core position — momentum is still up, but you lock in gains and keep dry powder for a pullback.",
            primaryText: "Apply to Manual Portfolio",
            secondaryText: "Set alert at $150",
            onPrimaryAction: "trim-sol",
          },
        },
      ]);
    }
  };

  const handleActionCardClick = (action: string) => {
    if (action === "trim-sol") {
      const solToTrim = +(manualHoldings.SOL * 0.2).toFixed(2);
      if (solToTrim <= 0) {
        toast("Add SOL in your Portfolio tab first to simulate a trim.", { icon: "ℹ️" });
        return;
      }
      updateManualHoldings((prev) => ({
        ...prev,
        SOL: Math.max(0, +(prev.SOL - solToTrim).toFixed(4)),
        USDC: +(prev.USDC + solToTrim * marketPrices.SOL.price).toFixed(2),
      }));
      setPortfolioMode("manual");
      toast.success(`Updated Manual Portfolio: trimmed ${solToTrim} SOL into USDC!`);
    } else if (action === "rebalance") {
      updateManualHoldings((prev) => ({
        ...prev,
        SOL: +(prev.SOL * 0.85).toFixed(4),
        USDC: +(prev.USDC + prev.SOL * 0.15 * marketPrices.SOL.price).toFixed(2),
      }));
      setPortfolioMode("manual");
      toast.success("Manual Portfolio rebalanced!");
    } else {
      toast.success(`Action triggered: ${action}`);
    }
  };

  // Handle Manual Quick Add / Set
  const handleManualAddOrSet = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(quickAmount);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Please enter a valid amount (0 or more).");
      return;
    }
    setPortfolioMode("manual");
    updateManualHoldings((prev) => ({
      ...prev,
      [quickTicker]: parsed,
    }));
    setQuickAmount("");
    toast.success(`Saved ${parsed} ${quickTicker} to your portfolio`);
  };

  // Build Portfolio display list
  const PORTFOLIO_DATA = useMemo(() => {
    const entries: Array<{
      ticker: AssetTicker;
      name: string;
      price: number;
      change24h: number;
      logoBg: string;
      balance: number;
      value: number;
      sparkline: number[];
      isBullish: boolean;
      color: string;
    }> = [];

    const balancesMap: Record<AssetTicker, number> =
      portfolioMode === "live"
        ? { SOL: activeSol, BTC: 0, ETH: 0, JUP: 0, USDC: activeUsdc }
        : manualHoldings;

    ASSET_TICKERS.forEach((ticker) => {
      const bal = balancesMap[ticker] || 0;
      // In live mode, only show tokens with > 0 balance (or SOL so user sees wallet)
      if (portfolioMode === "live" && bal <= 0 && ticker !== "SOL") return;
      // In manual mode, show all non-zero assets (or SOL/USDC if everything is 0)
      if (portfolioMode === "manual" && bal <= 0) return;

      const meta = TOKEN_META[ticker];
      const live = marketPrices[ticker];
      entries.push({
        ticker,
        name: meta.name,
        price: live.price,
        change24h: live.change24h,
        logoBg: meta.logoBg,
        balance: bal,
        value: bal * live.price,
        sparkline: meta.sparkline,
        isBullish: live.change24h >= 0,
        color: meta.color,
      });
    });

    return entries;
  }, [portfolioMode, activeSol, activeUsdc, manualHoldings, marketPrices]);

  const totalPortfolioValue = PORTFOLIO_DATA.reduce((sum, item) => sum + item.value, 0);

  const weighted24hShift = useMemo(() => {
    if (totalPortfolioValue <= 0) return 0;
    return PORTFOLIO_DATA.reduce((acc, item) => acc + (item.value / totalPortfolioValue) * item.change24h, 0);
  }, [PORTFOLIO_DATA, totalPortfolioValue]);

  const doughnutData: DoughnutItem[] = PORTFOLIO_DATA.map((item) => ({
    name: item.ticker,
    value: item.value,
    color: item.color,
  })).filter((item) => item.value > 0);

  if (!isMounted || subLoading) {
    return (
      <div className="flex h-full w-full bg-background items-center justify-center text-muted-foreground animate-pulse font-mono uppercase tracking-widest text-xs">
        Initializing Market Data Pro...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background text-foreground relative">
      {/* -----------------------------------------
          PRO LOCAL NAVBAR
          ----------------------------------------- */}
      <nav className="h-14 border-b border-border bg-card/60 backdrop-blur-md px-2.5 sm:px-4 flex items-center justify-between shrink-0 z-30 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <Link
            href="/market-data"
            className="flex items-center gap-1 text-xs font-mono uppercase text-muted-foreground hover:text-primary transition-colors p-2 sm:py-1.5 sm:px-2 rounded-lg hover:bg-muted shrink-0"
            aria-label="Back to Market Data"
          >
            <ArrowLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="md:hidden flex items-center gap-1.5 p-2 rounded-lg bg-secondary/80 hover:bg-secondary border border-border text-[11px] font-mono text-muted-foreground hover:text-foreground shrink-0 cursor-pointer transition-colors"
            title="Toggle Chat History"
            aria-label="Toggle Chat History"
          >
            <MessageSquare className="w-4 h-4 text-primary" />
          </button>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="hidden sm:inline-block text-xs font-black font-display tracking-widest uppercase italic transform -skew-x-6 text-foreground select-none shrink-0">
              STREET SYNC
            </span>
            <span className="text-[10px] font-mono text-primary font-black uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded truncate">
              MARKET DATA PRO
            </span>
          </div>
        </div>

        {/* Segmented Advisor / Portfolio Switcher */}
        <div className="bg-secondary/80 p-0.5 rounded-xl flex items-center border border-border/80 shrink-0">
          <button
            onClick={() => setActiveView("Advisor")}
            className={`px-2.5 sm:px-4 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeView === "Advisor"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Advisor
          </button>
          <button
            onClick={() => setActiveView("Portfolio")}
            className={`px-2.5 sm:px-4 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeView === "Portfolio"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Portfolio
          </button>
        </div>

        {/* Right Side: Feed indicator (desktop) */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div className="flex gap-3">
            <div className="bg-secondary/45 border border-border px-3 py-1 rounded-lg text-center">
              <span className="text-[8px] font-mono text-muted-foreground uppercase block leading-none">Spreads</span>
              <span className="text-xs font-black text-emerald-500 font-display">0.02%</span>
            </div>
            <div className="bg-secondary/45 border border-border px-3 py-1 rounded-lg text-center">
              <span className="text-[8px] font-mono text-muted-foreground uppercase block leading-none">Feed</span>
              <span className="text-xs font-black text-primary font-display">120 Hz</span>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Feed Connected" />
        </div>
      </nav>

      {/* Subscription Countdown Status Bar */}
      <div className="px-3 sm:px-4 pt-2 sm:pt-3 shrink-0">
        <ProStatusBar moduleId="market-data" className="mb-0" />
      </div>

      {/* -----------------------------------------
          MAIN LAYOUT CONTENT
          ----------------------------------------- */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop for History Drawer (z-[55] clears MobileNavDock z-50) */}
        {!sidebarCollapsed && (
          <div
            onClick={() => setSidebarCollapsed(true)}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-[55] transition-opacity"
          />
        )}

        {/* Collapsible History Sidebar (z-[60] on mobile so it sits cleanly above MobileNavDock) */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-[60] w-72 max-w-[85vw] bg-card/95 backdrop-blur-xl border-r border-border shadow-2xl transition-transform duration-300 flex flex-col overflow-hidden
            md:relative md:inset-auto md:z-20 md:bg-card/15 md:shadow-none md:transition-all
            ${sidebarCollapsed ? "-translate-x-full md:translate-x-0 md:w-0" : "translate-x-0 md:w-60"}
          `}
        >
          <div className="p-3 border-b border-border/60 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-black">
              Chat History
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setMessages([]);
                  handleSwitchState("StateA");
                  if (typeof window !== "undefined" && window.innerWidth < 768) {
                    setSidebarCollapsed(true);
                  }
                }}
                className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors cursor-pointer"
                title="New Chat"
                aria-label="New Chat"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-2 rounded-lg bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Close History"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2.5 px-2 space-y-1.5 scrollbar-hide">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  setChats((prev) => prev.map((c) => ({ ...c, active: c.id === chat.id })));
                  handleSwitchState("StateB");
                  setActiveView("Advisor");
                  if (typeof window !== "undefined" && window.innerWidth < 768) {
                    setSidebarCollapsed(true);
                  }
                }}
                className={`w-full text-left py-2.5 px-3 rounded-lg transition-all flex items-center gap-2 group cursor-pointer ${
                  chat.active && previewState === "StateB"
                    ? "bg-primary/10 text-primary font-bold border border-primary/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span className="text-xs uppercase font-mono tracking-wide truncate flex-1 font-bold">
                  {chat.title}
                </span>
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-border/40 bg-secondary/10 flex items-center justify-center">
            <span className="text-[9px] font-mono text-muted-foreground uppercase font-black">
              STREET SYNC PRIVATE ADVISOR
            </span>
          </div>
        </aside>

        {/* Desktop Collapsed sidebar trigger */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="hidden md:flex absolute left-2 top-2 p-1.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-all shadow-md z-30 cursor-pointer items-center gap-1 text-xs"
            title="Expand History"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* -----------------------------------------
            MAIN CONTENT AREA
            ----------------------------------------- */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeView === "Advisor" ? (
              /* =========================================
                 ADVISOR VIEW (CLEAN LINEAR FLEX STACK)
                 ========================================= */
              <motion.div
                key="advisor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* 1. Scrollable Messages Feed (never overlapped by input bar) */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-5 custom-scrollbar">
                  {messages.length === 0 ? (
                    <div className="max-w-xl mx-auto mt-4 sm:mt-8 space-y-6 flex flex-col items-center text-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#9945FF] to-[#14F195] flex items-center justify-center text-white shadow-lg">
                        <Zap className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>

                      <div className="space-y-2 px-2">
                        <h2 className="text-lg sm:text-2xl font-black font-display uppercase tracking-tight text-foreground">
                          Your AI Portfolio Advisor
                        </h2>
                        <p className="text-muted-foreground text-xs sm:text-sm max-w-sm leading-relaxed font-sans">
                          Ask simple questions about your holdings, risk, or when to take profit. Manage your coins anytime in the{" "}
                          <button
                            type="button"
                            onClick={() => setActiveView("Portfolio")}
                            className="text-primary font-bold underline cursor-pointer"
                          >
                            Portfolio
                          </button>{" "}
                          tab.
                        </p>
                      </div>

                      {/* Responsive Starter Prompt Card */}
                      <div className="w-full bg-card border border-border/80 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-sm text-left">
                        <div className="text-xs text-muted-foreground font-sans font-medium">
                          Try asking: &ldquo;Analyze my current portfolio and suggest improvements&rdquo;
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3 text-xs text-muted-foreground font-mono">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveView("Portfolio")}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground transition-all cursor-pointer text-[11px]"
                            >
                              <Wallet className="w-3.5 h-3.5 text-primary" />
                              <span>Edit Holdings</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2 ml-auto">
                            <select
                              value={selectedModel}
                              onChange={(e) => setSelectedModel(e.target.value as any)}
                              className="bg-secondary/80 border border-border/60 rounded-lg px-2 py-1 text-[10px] text-foreground font-mono font-bold outline-none cursor-pointer max-w-[155px] truncate"
                            >
                              <option value="gpt-oss-120b">GPT-OSS 120B</option>
                              <option value="gpt-oss-20b">GPT-OSS 20B</option>
                              <option value="qwen-27b">Qwen 3.8 27B</option>
                            </select>

                            <button
                              onClick={() => handleSendMessage("Analyze my current portfolio and suggest improvements")}
                              className="p-2 bg-primary text-primary-foreground rounded-lg cursor-pointer flex items-center justify-center hover:opacity-90 active:scale-95 shrink-0"
                              aria-label="Send starter prompt"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Plain-English Quick-Action Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                        {[
                          { text: "Analyze my portfolio", icon: BarChart2 },
                          { text: "Should I take profit on SOL?", icon: PieChart },
                          { text: "How risky is my allocation?", icon: Activity },
                          { text: "Simple DCA plan for me", icon: Wallet },
                        ].map((btn, index) => (
                          <button
                            key={index}
                            onClick={() => handleSendMessage(btn.text)}
                            className="p-3 bg-card hover:bg-secondary border border-border rounded-xl text-left transition-all active:scale-[0.99] flex items-center gap-2.5 shadow-sm group cursor-pointer"
                          >
                            <div className="p-1.5 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                              <btn.icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-sans font-bold text-foreground/90 group-hover:text-foreground">
                              {btn.text}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Active Chat Messages */
                    <div className="max-w-2xl mx-auto space-y-5 pb-2">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-2.5 sm:gap-3.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {msg.sender === "ai" && (
                            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                              <Logo size={16} />
                            </div>
                          )}

                          <div className={`space-y-3 max-w-[88%] sm:max-w-[82%] min-w-0 ${msg.sender === "user" ? "order-1" : "order-2"}`}>
                            <div
                              className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm font-sans ${
                                msg.sender === "user"
                                  ? "bg-primary text-primary-foreground rounded-tr-none font-bold"
                                  : "bg-card border border-border/80 text-foreground rounded-tl-none font-medium"
                              }`}
                            >
                              {msg.text.split("\n\n").map((para, i) => (
                                <p key={i} className={i > 0 ? "mt-2" : ""}>
                                  {para}
                                </p>
                              ))}
                            </div>

                            {msg.sender === "ai" && (
                              <div className="space-y-3 pt-0.5">
                                {msg.assetPills && msg.assetPills.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {msg.assetPills.map((pill, i) => (
                                      <AssetPill key={i} {...pill} showDescription={true} />
                                    ))}
                                  </div>
                                )}

                                {msg.sparklineData && (
                                  <div className="max-w-full overflow-x-auto">
                                    <Sparkline
                                      data={msg.sparklineData.prices}
                                      isBullish={msg.sparklineData.isBullish}
                                      label={msg.sparklineData.label}
                                      width={180}
                                      height={48}
                                    />
                                  </div>
                                )}

                                {msg.allocationData && <AllocationDoughnut data={msg.allocationData} />}

                                {msg.actionCard && (
                                  <ActionCard
                                    suggestedMove={msg.actionCard.suggestedMove}
                                    primaryText={msg.actionCard.primaryText}
                                    secondaryText={msg.actionCard.secondaryText}
                                    onPrimaryClick={() => handleActionCardClick(msg.actionCard!.onPrimaryAction)}
                                    onSecondaryClick={() => toast.success("Auto-alert set successfully.")}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {isTyping && (
                        <div className="flex gap-3 justify-start">
                          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 animate-pulse">
                            <Logo size={16} />
                          </div>
                          <div className="bg-card border border-border/80 px-3.5 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-1 shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      )}

                      <div ref={chatBottomRef} />
                    </div>
                  )}
                </div>

                {/* 2. Docked Non-Overlapping Chat Input Footer */}
                <div className="shrink-0 border-t border-border/70 bg-background/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3">
                  <div className="max-w-2xl mx-auto flex flex-col gap-2">
                    {/* Single clean scrollable row: portfolio source + quick prompts + model */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                      <button
                        onClick={() => {
                          if (!connected && portfolioMode === "manual") {
                            toast("Using your Manual Portfolio. Connect a wallet to sync live.", { icon: "📝" });
                            return;
                          }
                          setPortfolioMode(portfolioMode === "live" ? "manual" : "live");
                        }}
                        className={`px-2.5 py-1 text-[10px] font-mono uppercase rounded-lg border transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                          portfolioMode === "live"
                            ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/40 font-bold"
                            : "bg-primary/10 text-primary border-primary/30 font-bold"
                        }`}
                        title="Switch between Live Wallet and Manual Portfolio"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            portfolioMode === "live" ? "bg-emerald-500 animate-pulse" : "bg-primary"
                          }`}
                        />
                        {portfolioMode === "live"
                          ? `Live (${activeSol.toFixed(2)} SOL)`
                          : `Manual ($${totalPortfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })})`}
                      </button>

                      <button
                        onClick={() => handleSendMessage("show concentration risk")}
                        className="px-2.5 py-1 text-[10px] font-mono uppercase bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg border border-border transition-all shrink-0 cursor-pointer"
                      >
                        Check Risk
                      </button>
                      <button
                        onClick={() => handleSendMessage("trim 20-30% SOL")}
                        className="px-2.5 py-1 text-[10px] font-mono uppercase bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg border border-border transition-all shrink-0 cursor-pointer"
                      >
                        Take Profit
                      </button>
                      <button
                        onClick={() => handleSendMessage("DCA accumulation strategy")}
                        className="px-2.5 py-1 text-[10px] font-mono uppercase bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg border border-border transition-all shrink-0 cursor-pointer"
                      >
                        DCA Plan
                      </button>

                      <div className="flex items-center gap-1 shrink-0 ml-auto pl-2">
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value as any)}
                          className="bg-card border border-border/70 rounded-lg px-2 py-1 text-[10px] text-foreground font-mono font-bold outline-none cursor-pointer"
                          aria-label="Select AI Model"
                        >
                          <option value="gpt-oss-120b">GPT-OSS 120B</option>
                          <option value="gpt-oss-20b">GPT-OSS 20B</option>
                          <option value="qwen-27b">Qwen 27B</option>
                        </select>
                      </div>
                    </div>

                    {/* Input Row */}
                    <div className="bg-card border border-border/80 rounded-xl flex items-center shadow-sm focus-within:border-primary transition-all pr-1.5">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSendMessage();
                        }}
                        placeholder="Ask your AI advisor..."
                        className="w-full bg-transparent border-0 outline-none focus:ring-0 py-2.5 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm placeholder:text-muted-foreground/60 text-foreground"
                      />
                      <button
                        onClick={() => handleSendMessage()}
                        disabled={!chatInput.trim()}
                        className={`p-2 rounded-lg transition-all shrink-0 cursor-pointer ${
                          chatInput.trim()
                            ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
                            : "text-muted-foreground bg-secondary cursor-not-allowed"
                        }`}
                        aria-label="Send message"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* =========================================
                 PORTFOLIO VIEW (CLEAN LINEAR + MANUAL INPUT)
                 ========================================= */
              <motion.div
                key="portfolio"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 custom-scrollbar"
              >
                <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-4">
                  {/* 1. Portfolio Summary Banner */}
                  <div className="bg-gradient-to-r from-primary/5 to-secondary/35 border border-border/80 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden shadow-sm">
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 border border-primary/20">
                        <Wallet size={22} />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-xl font-black font-display uppercase tracking-tight text-foreground">
                          My Portfolio
                        </h2>
                        <p className="text-muted-foreground text-xs mt-0.5 leading-snug font-sans">
                          {portfolioMode === "manual"
                            ? "Enter your coins below. The AI Advisor uses these numbers."
                            : "Synced live with your connected Solana wallet."}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2.5 relative z-10 w-full md:w-auto">
                      <div className="flex-1 md:flex-initial bg-card/90 border border-border/85 px-3.5 py-2 rounded-xl text-center shadow-xs">
                        <span className="text-[9px] font-mono text-muted-foreground uppercase block font-black leading-none mb-1">
                          Total Value
                        </span>
                        <span className="text-sm sm:text-base font-black text-foreground font-display">
                          ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex-1 md:flex-initial bg-card/90 border border-border/85 px-3.5 py-2 rounded-xl text-center shadow-xs">
                        <span className="text-[9px] font-mono text-muted-foreground uppercase block font-black leading-none mb-1">
                          24H Change
                        </span>
                        <span
                          className={`text-sm sm:text-base font-black font-display ${
                            weighted24hShift >= 0 ? "text-emerald-500" : "text-red-500"
                          }`}
                        >
                          {weighted24hShift >= 0 ? "+" : ""}
                          {weighted24hShift.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Simple Source Switcher (Manual Input vs Live Wallet) */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-card border border-border/80 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-2 bg-secondary/70 p-1 rounded-xl border border-border/60">
                      <button
                        type="button"
                        onClick={() => setPortfolioMode("manual")}
                        className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          portfolioMode === "manual"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Manual Portfolio
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!connected) {
                            toast("Connect your Solana wallet in the top right to use Live Wallet.", { icon: "🔌" });
                            return;
                          }
                          setPortfolioMode("live");
                        }}
                        className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          portfolioMode === "live"
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-muted-foreground"}`} />
                        Live Wallet
                      </button>
                    </div>

                    <div className="flex items-center gap-2 justify-between sm:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveView("Advisor");
                          handleSendMessage("Analyze my current portfolio and suggest improvements");
                        }}
                        className="flex-1 sm:flex-initial px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Ask AI About This</span>
                      </button>

                      {portfolioMode === "live" && connected ? (
                        <button
                          type="button"
                          onClick={() => {
                            fetchLiveBalances();
                            refreshMarketPrices();
                            toast.success("Refreshed balances & prices");
                          }}
                          disabled={isFetchingBalance}
                          className="p-2 rounded-xl border border-border bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                          title="Refresh wallet & prices"
                        >
                          <RefreshCw className={`w-4 h-4 ${isFetchingBalance ? "animate-spin" : ""}`} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            updateManualHoldings(() => DEFAULT_MANUAL_HOLDINGS);
                            toast.success("Reset to sample holdings");
                          }}
                          className="p-2 rounded-xl border border-border bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                          title="Reset to sample portfolio"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3. Simple Manual Input Bar (shown in Manual Mode) */}
                  {portfolioMode === "manual" && (
                    <form
                      onSubmit={handleManualAddOrSet}
                      className="bg-card border border-border/80 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider font-mono text-foreground">
                          Add or Update Coin Amount
                        </span>
                        <span className="text-[11px] text-muted-foreground font-sans">
                          Saved automatically
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={quickTicker}
                          onChange={(e) => setQuickTicker(e.target.value as AssetTicker)}
                          className="bg-secondary/70 border border-border rounded-xl px-3 py-2.5 text-xs font-bold font-mono text-foreground outline-none focus:border-primary cursor-pointer sm:w-40"
                        >
                          {ASSET_TICKERS.map((t) => (
                            <option key={t} value={t}>
                              {t} — {TOKEN_META[t].name}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={quickAmount}
                          onChange={(e) => setQuickAmount(e.target.value)}
                          placeholder={`Enter ${quickTicker} amount (e.g. 10)`}
                          className="flex-1 bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-xs sm:text-sm font-mono text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
                        />

                        <button
                          type="submit"
                          className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Save Amount</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* 4. Holdings List (Mobile Linear Cards + Desktop Table) & Allocation */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="lg:col-span-2 bg-card border border-border/85 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-black font-display uppercase tracking-tight text-sm sm:text-base text-foreground">
                            Your Holdings
                          </h3>
                          <p className="text-[11px] text-muted-foreground font-sans">
                            {portfolioMode === "manual"
                              ? "Tap any amount to edit directly"
                              : "Live balances from your wallet"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            refreshMarketPrices();
                            toast.success("Prices updated");
                          }}
                          className="text-[11px] font-mono text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Live Prices</span>
                        </button>
                      </div>

                      {PORTFOLIO_DATA.length === 0 ? (
                        <div className="py-10 text-center space-y-2 border border-dashed border-border rounded-xl">
                          <p className="text-xs font-semibold text-muted-foreground">
                            No holdings yet. Add a coin above to get started!
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* MOBILE LINEAR CARDS (< sm) - zero horizontal scrolling */}
                          <div className="space-y-2.5 sm:hidden">
                            {PORTFOLIO_DATA.map((token) => {
                              const pct = totalPortfolioValue > 0 ? ((token.value / totalPortfolioValue) * 100).toFixed(1) : "0.0";
                              return (
                                <div
                                  key={token.ticker}
                                  className="p-3 rounded-xl bg-secondary/35 border border-border/70 flex flex-col gap-2.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div
                                        className={`w-8 h-8 rounded-full ${token.logoBg} flex items-center justify-center font-bold text-xs text-white shadow-inner font-mono shrink-0`}
                                      >
                                        {token.ticker.slice(0, 3)}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-black text-sm text-foreground">{token.ticker}</span>
                                          <span
                                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                              token.change24h >= 0
                                                ? "text-emerald-500 bg-emerald-500/10"
                                                : "text-red-500 bg-red-500/10"
                                            }`}
                                          >
                                            {token.change24h >= 0 ? "+" : ""}
                                            {token.change24h.toFixed(2)}%
                                          </span>
                                        </div>
                                        <span className="text-[11px] text-muted-foreground font-mono block">
                                          ${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <span className="font-black text-sm text-foreground font-display block">
                                        ${token.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground font-mono">
                                        {pct}% weight
                                      </span>
                                    </div>
                                  </div>

                                  {portfolioMode === "manual" ? (
                                    <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                                      <label className="text-[10px] font-mono uppercase text-muted-foreground shrink-0">
                                        Amount:
                                      </label>
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={token.balance}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          updateManualHoldings((prev) => ({
                                            ...prev,
                                            [token.ticker]: isNaN(val) || val < 0 ? 0 : val,
                                          }));
                                        }}
                                        className="flex-1 min-w-0 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-foreground outline-none focus:border-primary"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          updateManualHoldings((prev) => ({ ...prev, [token.ticker]: 0 }));
                                          toast(`Removed ${token.ticker}`);
                                        }}
                                        className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                                        aria-label={`Remove ${token.ticker}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-xs font-mono text-muted-foreground">
                                      <span>Balance</span>
                                      <span className="font-bold text-foreground">
                                        {token.balance.toLocaleString()} {token.ticker}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* DESKTOP TABLE (>= sm) */}
                          <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[480px]">
                              <thead>
                                <tr className="border-b border-border/60 text-[10px] font-mono uppercase text-muted-foreground font-black">
                                  <th className="pb-2">Asset</th>
                                  <th className="pb-2 text-right">Price</th>
                                  <th className="pb-2 text-right">24H</th>
                                  <th className="pb-2 text-right">Amount</th>
                                  <th className="pb-2 text-right">Value</th>
                                  {portfolioMode === "manual" && <th className="pb-2 text-right w-10"></th>}
                                </tr>
                              </thead>
                              <tbody>
                                {PORTFOLIO_DATA.map((token) => {
                                  const pct =
                                    totalPortfolioValue > 0 ? ((token.value / totalPortfolioValue) * 100).toFixed(1) : "0.0";
                                  return (
                                    <tr
                                      key={token.ticker}
                                      className="border-b border-border/30 last:border-0 hover:bg-secondary/40 transition-colors"
                                    >
                                      <td className="py-3">
                                        <div className="flex items-center gap-2.5">
                                          <div
                                            className={`w-7 h-7 rounded-full ${token.logoBg} flex items-center justify-center font-bold text-xs text-white shadow-inner font-mono shrink-0`}
                                          >
                                            {token.ticker.slice(0, 3)}
                                          </div>
                                          <div>
                                            <span className="font-black text-xs text-foreground block tracking-tight">
                                              {token.ticker}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-mono">{token.name}</span>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-3 text-right font-mono font-bold text-xs text-foreground/90">
                                        ${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td
                                        className={`py-3 text-right font-mono font-black text-xs ${
                                          token.change24h >= 0 ? "text-emerald-500" : "text-red-500"
                                        }`}
                                      >
                                        {token.change24h >= 0 ? "+" : ""}
                                        {token.change24h.toFixed(2)}%
                                      </td>
                                      <td className="py-3 text-right">
                                        {portfolioMode === "manual" ? (
                                          <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            value={token.balance}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value);
                                              updateManualHoldings((prev) => ({
                                                ...prev,
                                                [token.ticker]: isNaN(val) || val < 0 ? 0 : val,
                                              }));
                                            }}
                                            className="w-24 text-right bg-secondary/60 border border-border rounded-lg px-2 py-1 text-xs font-mono font-bold text-foreground outline-none focus:border-primary"
                                          />
                                        ) : (
                                          <span className="font-mono font-bold text-xs text-foreground">
                                            {token.balance.toLocaleString()} {token.ticker}
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-3 text-right">
                                        <span className="font-mono font-bold text-xs block text-foreground">
                                          ${token.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-mono block">{pct}%</span>
                                      </td>
                                      {portfolioMode === "manual" && (
                                        <td className="py-3 text-right">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              updateManualHoldings((prev) => ({ ...prev, [token.ticker]: 0 }));
                                              toast(`Removed ${token.ticker}`);
                                            }}
                                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                            aria-label={`Remove ${token.ticker}`}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Allocation Doughnut + Action Card */}
                    <div className="space-y-4 lg:col-span-1">
                      {doughnutData.length > 0 && (
                        <div className="flex justify-center w-full">
                          <AllocationDoughnut data={doughnutData} />
                        </div>
                      )}

                      <ActionCard
                        suggestedMove="Want a clear checkup on your current holdings? Let the AI Advisor review your weights and suggest simple next steps."
                        primaryText="Get AI Review"
                        secondaryText="Configure Alerts"
                        onPrimaryClick={() => {
                          setActiveView("Advisor");
                          handleSendMessage("Analyze my current portfolio and suggest improvements");
                        }}
                        onSecondaryClick={() => toast.success("Subscription Auto-alerts activated.")}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* -----------------------------------------
              STATE C: PAYWALL OVERLAY MODAL
              ----------------------------------------- */}
          <AnimatePresence>
            {isPaywallLocked && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/60 backdrop-blur-md z-40 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
              >
                <motion.div
                  initial={{ scale: 0.95, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 15 }}
                  className="max-w-md w-full bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center shadow-2xl relative overflow-hidden my-auto max-h-[88dvh] overflow-y-auto scrollbar-hide"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-4 sm:mb-6">
                    <ShieldAlert size={28} className="sm:w-8 sm:h-8" />
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black font-display uppercase tracking-tight text-foreground mb-1.5 sm:mb-2">
                    PRO ACCESS LOCKED
                  </h2>
                  <p className="text-muted-foreground text-[10px] sm:text-xs font-mono uppercase tracking-widest font-black mb-4 sm:mb-6">
                    Street Sync Subscription Required
                  </p>

                  <div className="bg-secondary/40 border border-border/60 rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 text-left space-y-2.5 sm:space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Upgrade to the <strong>Market Data Pro</strong> tier starting from <strong>0.1 SOL</strong> to unlock:
                    </p>
                    <ul className="space-y-2.5 sm:space-y-3.5 text-xs font-mono uppercase text-foreground/80 font-black">
                      <li className="flex items-center gap-2.5 sm:gap-3">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span>Market Data Pro Dashboards</span>
                      </li>
                      <li className="flex items-center gap-2.5 sm:gap-3">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span>AI portfolio analysis &amp; rebalancing</span>
                      </li>
                      <li className="flex items-center gap-2.5 sm:gap-3">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span>Unlimited private advisor chats</span>
                      </li>
                      <li className="flex items-center gap-2.5 sm:gap-3">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span>Manual &amp; live wallet tracking</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2.5 sm:space-y-3">
                    <button
                      onClick={() => {
                        openSubscriptionModal("market-data");
                      }}
                      className="w-full py-3.5 sm:py-4 bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.99] transition-all rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary/20 cursor-pointer font-display"
                    >
                      Choose Plan &amp; Unlock Pro
                    </button>

                    {typeof window !== "undefined" &&
                      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
                      !Boolean((window as any).phantom?.solana) && (
                        <button
                          type="button"
                          onClick={() => {
                            openInPhantomBrowser(window.location.href);
                          }}
                          className="w-full py-3 bg-[#AB9FF2]/15 hover:bg-[#AB9FF2]/25 active:scale-[0.99] text-[#AB9FF2] border border-[#AB9FF2]/30 rounded-xl flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs transition-all font-display cursor-pointer"
                        >
                          <Smartphone className="w-4 h-4" />
                          <span>Open in Phantom Wallet App</span>
                          <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
                        </button>
                      )}

                    <button
                      onClick={() => {
                        setSimulatedSubscribe(true);
                        setPreviewState("StateB");
                        toast.success("Developer Simulation: Pro unlocked");
                      }}
                      className="w-full py-2 bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-xl font-bold uppercase tracking-wider text-[10px] cursor-pointer"
                    >
                      Simulate Unlock (Dev Preview)
                    </button>

                    <Link
                      href="/market-data"
                      className="w-full py-3 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border transition-all rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer font-sans"
                    >
                      Back to Market Data
                    </Link>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
