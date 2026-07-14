"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSubscription } from "@/context/SubscriptionContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, ShieldAlert, Sparkles, Zap, CheckCircle2, DollarSign, Activity, Percent,
  MessageSquare, Bell, Wallet, Send, ChevronLeft, ChevronRight, PlusCircle, Trash2, 
  Settings, RefreshCw, BarChart2, PieChart, Info, HelpCircle, Link as LinkIcon, Paperclip, Wrench
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/global/theme-logo/Logo";
import { AssetPill, TokenData } from "./AssetPill";
import { Sparkline } from "./Sparkline";
import { AllocationDoughnut, DoughnutItem } from "./AllocationDoughnut";
import { ActionCard } from "./ActionCard";
import toast from "react-hot-toast";

// ==========================================
// CUSTOM CHAT MESSAGE TYPE
// ==========================================

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

export function MarketDataPro() {
  const { hasAccess, openSubscriptionModal, loading: subLoading } = useSubscription();
  const [isMounted, setIsMounted] = useState(false);
  const [activeView, setActiveView] = useState<"Advisor" | "Portfolio">("Advisor");
  const [previewState, setPreviewState] = useState<"StateA" | "StateB">("StateB");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("sol-advisor");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Custom subscription status overwrite for simulated demo purposes
  const [simulatedSubscribe, setSimulatedSubscribe] = useState(false);

  // User balance details
  const [solBalance, setSolBalance] = useState(12.0);
  const [btcBalance, setBtcBalance] = useState(0.3);
  const [usdcBalance, setUsdcBalance] = useState(0);

  // Standard Mock Tokens
  const TOKENS: Record<string, TokenData> = {
    SOL: { ticker: "SOL", name: "Solana", price: 142.50, change24h: 4.20, logoBg: "bg-gradient-to-tr from-[#9945FF] to-[#14F195]", description: "RSI 71 - overbought" },
    BTC: { ticker: "BTC", name: "Bitcoin", price: 64500.00, change24h: 1.15, logoBg: "bg-[#F7931A]", description: "Steady - Accumulating" },
    ETH: { ticker: "ETH", name: "Ethereum", price: 3200.00, change24h: -1.48, logoBg: "bg-[#627EEA]", description: "Weak Momentum" },
    JUP: { ticker: "JUP", name: "Jupiter", price: 0.95, change24h: -4.18, logoBg: "bg-gradient-to-r from-[#19FB9B] to-[#252830]", description: "Support Test" },
    USDC: { ticker: "USDC", name: "USD Coin", price: 1.00, change24h: 0.00, logoBg: "bg-[#2775CA]", description: "Stable" }
  };

  // Chats list mock
  const [chats, setChats] = useState([
    { id: "1", title: "SOL concentration risk", active: true },
    { id: "2", title: "Q2 rebalance plan", active: false },
    { id: "3", title: "BTC vs ETH allocation", active: false },
    { id: "4", title: "Is JUP a good entry?", active: false },
    { id: "5", title: "DCA schedule for SOL", active: false }
  ]);

  // Messages list state
  const [messages, setMessages] = useState<Message[]>([]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setIsMounted(true);
    handleSwitchState("StateB");
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);



  // Determine actual access (checks Context OR simulated unlock)
  const isSubscribed = hasAccess("market-data") || simulatedSubscribe;
  
  // Apply paywall overlay if the user doesn't have subscription access
  const isPaywallLocked = !isSubscribed;

  // Handle Send message
  const handleSendMessage = (textToSend?: string) => {
    const rawText = textToSend || chatInput;
    if (!rawText.trim()) return;

    // 1. Add User message
    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: rawText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsTyping(true);

    // 2. Simulate AI response
    setTimeout(() => {
      let aiText = "I have analyzed your holdings and the active market conditions.";
      let assetPills: TokenData[] | undefined = undefined;
      let sparklineData: any = undefined;
      let allocationData: any = undefined;
      let actionCard: any = undefined;

      const lower = rawText.toLowerCase();

      if (lower.includes("profit") || lower.includes("take profit")) {
        aiText = "SOL is up +11.8% on the week and RSI is pushing into overbought territory. Taking partial profit here is reasonable — here's the read.";
        assetPills = [TOKENS.SOL];
        sparklineData = {
          prices: [125, 128, 131, 134, 139, 138, 142.5],
          isBullish: true,
          label: "SOL PRICE & RSI +11.8%"
        };
        actionCard = {
          suggestedMove: "trim 20–30% of SOL into USDC. Keep a core position — momentum is still up, but you lock in gains and have dry powder for a pullback.",
          primaryText: "Add to portfolio",
          secondaryText: "Set alert at $150",
          onPrimaryAction: "trim-sol"
        };
      } else if (lower.includes("concentration") || lower.includes("12 sol") || lower.includes("risk") || lower.includes("rebalance")) {
        aiText = "Short answer: yes — about 78% of your portfolio is in SOL. This is a very high concentration. Let's look at your whole book. Here's the live pricing:";
        assetPills = [TOKENS.SOL, TOKENS.BTC];
        sparklineData = {
          prices: [120, 124, 128, 132, 135, 140, 142.5],
          isBullish: true,
          label: "SOL 7-DAY +11.8%"
        };
        allocationData = [
          { name: "SOL", value: 12 * TOKENS.SOL.price, color: "#9945FF" },
          { name: "BTC", value: 0.3 * TOKENS.BTC.price, color: "#F7931A" }
        ];
        actionCard = {
          suggestedMove: "Reduce SOL holdings weight from 78% to 50% by transferring assets to BTC and USDC to build lower concentration risk.",
          primaryText: "Execute Rebalance",
          secondaryText: "Set alert at $150",
          onPrimaryAction: "rebalance"
        };
      } else if (lower.includes("import") || lower.includes("wallet")) {
        aiText = "Active Solana wallet scanned! Loaded 12.0 SOL and 0.3 BTC into your advisor dashboard. Let's check allocations and market exposure details:";
        setSolBalance(12.0);
        setBtcBalance(0.3);
        setUsdcBalance(2500);
        allocationData = [
          { name: "SOL", value: 12 * TOKENS.SOL.price, color: "#9945FF" },
          { name: "BTC", value: 0.3 * TOKENS.BTC.price, color: "#F7931A" },
          { name: "USDC", value: 2500, color: "#2775CA" }
        ];
        actionCard = {
          suggestedMove: "Your wallet balances have synchronized. Consider DCA tools for Solana buys under $130.",
          primaryText: "Configure DCA",
          secondaryText: "Review wallet list",
          onPrimaryAction: "dca"
        };
      } else if (lower.includes("overbought") || lower.includes("market")) {
        aiText = "High beta assets like Solana are testing overbought bounds (RSI 71), whereas BTC remains relatively stable at $64.5k. Caution is advised.";
        assetPills = [TOKENS.SOL, TOKENS.BTC];
        actionCard = {
          suggestedMove: "Set trailing alerts for high-volatility tokens to react instantly to pullback events.",
          primaryText: "Configure Auto-alerts",
          secondaryText: "Review watchlist",
          onPrimaryAction: "alerts"
        };
      }

      const aiMsg: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: aiText,
        timestamp: new Date(),
        assetPills,
        sparklineData,
        allocationData,
        actionCard
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200);
  };

  // Switch to specific states (A, B)
  const handleSwitchState = (state: "StateA" | "StateB") => {
    setPreviewState(state);
    if (state === "StateA") {
      setMessages([]);
    } else if (state === "StateB") {
      setMessages([
        {
          id: "m1",
          sender: "user",
          text: "Should I take some profit on SOL after this run?",
          timestamp: new Date(Date.now() - 3600000)
        },
        {
          id: "m2",
          sender: "ai",
          text: "SOL is up +11.8% on the week and RSI is pushing into overbought territory. Taking partial profit here is reasonable — here's the read.",
          timestamp: new Date(Date.now() - 3550000),
          assetPills: [TOKENS.SOL],
          sparklineData: {
            prices: [125, 128, 131, 134, 139, 138, 142.5],
            isBullish: true,
            label: "SOL PRICE & RSI +11.8%"
          },
          actionCard: {
            suggestedMove: "trim 20–30% of SOL into USDC. Keep a core position — momentum is still up, but you lock in gains and have dry powder for a pullback.",
            primaryText: "Add to portfolio",
            secondaryText: "Set alert at $150",
            onPrimaryAction: "trim-sol"
          }
        }
      ]);
    }
  };

  // Handle mock actions within action cards
  const handleActionCardClick = (action: string) => {
    if (action === "trim-sol") {
      setSolBalance(9.6);
      setUsdcBalance(usdcBalance + (2.4 * TOKENS.SOL.price));
      toast.success("Simulation: Successfully trimmed 20% SOL into USDC!");
    } else if (action === "rebalance") {
      setSolBalance(7.5);
      setBtcBalance(0.35);
      toast.success("Simulation: Rebalance executed successfully!");
    } else {
      toast.success(`Action triggered: ${action}`);
    }
  };

  // Mock portfolio assets details
  const PORTFOLIO_DATA = [
    { ...TOKENS.SOL, balance: solBalance, value: solBalance * TOKENS.SOL.price, sparkline: [120, 124, 128, 132, 135, 140, 142.5], isBullish: true },
    { ...TOKENS.BTC, balance: btcBalance, value: btcBalance * TOKENS.BTC.price, sparkline: [62100, 63400, 62800, 64200, 63900, 64800, 64500], isBullish: true },
    { ...TOKENS.ETH, balance: 0.8, value: 0.8 * TOKENS.ETH.price, sparkline: [3350, 3290, 3240, 3180, 3250, 3220, 3200], isBullish: false },
    { ...TOKENS.JUP, balance: 350.0, value: 350.0 * TOKENS.JUP.price, sparkline: [1.05, 1.02, 0.98, 0.99, 1.01, 0.97, 0.95], isBullish: false },
    { ...TOKENS.USDC, balance: usdcBalance || 2500, value: (usdcBalance || 2500) * TOKENS.USDC.price, sparkline: [1, 1, 1, 1, 1, 1, 1], isBullish: true }
  ];

  const totalPortfolioValue = PORTFOLIO_DATA.reduce((sum, item) => sum + item.value, 0);

  const doughnutData: DoughnutItem[] = PORTFOLIO_DATA.map(item => ({
    name: item.ticker,
    value: item.value,
    color: item.ticker === "SOL" ? "#9945FF" :
           item.ticker === "BTC" ? "#F7931A" :
           item.ticker === "ETH" ? "#627EEA" :
           item.ticker === "JUP" ? "#19FB9B" : "#2775CA"
  })).filter(item => item.value > 0);

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
          PRO LOCAL NAVBAR (renders inside main container)
          ----------------------------------------- */}
      <nav className="h-14 border-b border-border bg-card/60 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30">
        
        {/* Left Side: Brand Logo and Title */}
        <div className="flex items-center gap-3">
          <Link 
            href="/market-data" 
            className="flex items-center gap-1.5 text-xs font-mono uppercase text-muted-foreground hover:text-primary transition-colors py-1.5 px-2.5 rounded-lg hover:bg-muted"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black font-display tracking-widest uppercase italic transform -skew-x-6 text-foreground select-none">
              STREET SYNC
            </span>
            <span className="text-[10px] font-mono text-primary font-black uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded">
              MARKET DATA PRO
            </span>
          </div>
        </div>

        {/* Center: Segmented Advisor / Portfolio controls */}
        <div className="bg-secondary/80 p-0.5 rounded-xl flex items-center border border-border/80 scale-95 md:scale-100">
          <button
            onClick={() => setActiveView("Advisor")}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${activeView === "Advisor" ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Advisor
          </button>
          <button
            onClick={() => setActiveView("Portfolio")}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${activeView === "Portfolio" ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Portfolio
          </button>
        </div>

        {/* Right Side: Pro Feed indicators */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex gap-3">
            <div className="bg-secondary/45 border border-border px-3 py-1 rounded-lg text-center">
              <span className="text-[8px] font-mono text-muted-foreground uppercase block leading-none">Spreads</span>
              <span className="text-xs font-black text-emerald-500 font-display">0.02%</span>
            </div>
            <div className="bg-secondary/45 border border-border px-3 py-1 rounded-lg text-center">
              <span className="text-[8px] font-mono text-muted-foreground uppercase block leading-none">Indicator Feed</span>
              <span className="text-xs font-black text-primary font-display">120 Hz</span>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Feed Connected" />
        </div>
      </nav>

      {/* -----------------------------------------
          MAIN LAYOUT CONTENT
          ----------------------------------------- */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* -----------------------------------------
            COLLAPSIBLE LEFT SIDEBAR (Chats History)
            ----------------------------------------- */}
        <aside 
          className={`border-r border-border bg-card/15 transition-all duration-300 flex flex-col shrink-0 overflow-hidden z-20 ${sidebarCollapsed ? 'w-0' : 'w-60'}`}
        >
          {/* Sidebar Toggle & New Chat Button */}
          <div className="p-3 border-b border-border/60 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-black">History</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setMessages([]);
                  handleSwitchState("StateA");
                }}
                className="p-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                title="New Chat"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 rounded bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Chats list */}
          <div className="flex-1 overflow-y-auto py-2.5 px-2 space-y-1.5 scrollbar-hide">
            {chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => {
                  setChats(prev => prev.map(c => ({ ...c, active: c.id === chat.id })));
                  handleSwitchState("StateB");
                }}
                className={`w-full text-left py-2 px-3 rounded-lg transition-all flex items-center gap-2 group cursor-pointer ${chat.active && previewState === "StateB" ? 'bg-primary/10 text-primary font-bold border border-primary/15' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span className="text-xs uppercase font-mono tracking-wide truncate flex-1 font-bold">
                  {chat.title}
                </span>
              </button>
            ))}
          </div>

          {/* Sidebar bottom indicator */}
          <div className="p-3 border-t border-border/40 bg-secondary/10 flex items-center justify-center">
            <span className="text-[8px] font-mono text-muted-foreground uppercase font-black">
              STREET SYNC SECURE ENVELOPE
            </span>
          </div>
        </aside>

        {/* Collapsed sidebar trigger indicator */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute left-2 top-2 p-1.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-all shadow-md z-30 cursor-pointer"
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
                 ADVISOR VIEW (CHAT CO-PILOT)
                 ========================================= */
              <motion.div
                key="advisor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden relative"
              >
                {/* Scrollable chat messages feed */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-6 custom-scrollbar pb-32">
                  
                  {messages.length === 0 ? (
                    /* State A: Empty State layout */
                    <div className="max-w-xl mx-auto mt-10 space-y-8 flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#9945FF] to-[#14F195] flex items-center justify-center text-white shadow-lg animate-bounce">
                        <Zap className="w-7 h-7" />
                      </div>
                      
                      <div className="space-y-2">
                        <h2 className="text-xl md:text-2xl font-black font-display uppercase tracking-tight text-foreground">
                          YOUR PRIVATE MARKET CO-PILOT
                        </h2>
                        <p className="text-muted-foreground text-xs font-semibold max-w-sm leading-relaxed font-sans">
                          Ask anything about crypto, your holdings, and the market. Every chat is private and stays on-device.
                        </p>
                      </div>

                      {/* Main landing input card block (Supreme aesthetic prompt card) */}
                      <div className="w-full bg-card border border-border/80 rounded-2xl p-4 space-y-4 shadow-sm text-left">
                        <div className="text-xs text-muted-foreground font-sans font-medium flex items-center gap-1.5">
                          <span>Ask anything — e.g. "Should I rebalance my SOL position?"</span>
                        </div>
                        <div className="flex items-center gap-2 border-t border-border/40 pt-3 text-xs text-muted-foreground font-mono">
                          <button className="flex items-center gap-1.5 p-1 rounded hover:bg-secondary transition-all cursor-pointer">
                            <Paperclip className="w-3.5 h-3.5" />
                          </button>
                          <button className="flex items-center gap-1.5 p-1 rounded hover:bg-secondary transition-all cursor-pointer">
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Tools</span>
                          </button>
                          
                          <div className="ml-auto flex items-center gap-2">
                            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5" /> Fast
                            </span>
                            <select 
                              value={selectedAgent}
                              onChange={(e) => setSelectedAgent(e.target.value)}
                              className="bg-secondary/80 border border-border/60 rounded px-2 py-1 text-[10px] text-foreground font-bold outline-none cursor-pointer"
                            >
                              <option value="sol-advisor">sol-advisor</option>
                              <option value="market-copilot">market-copilot</option>
                            </select>
                            
                            <button
                              onClick={() => handleSendMessage("Should I take some profit on SOL after this run?")}
                              className="p-2 bg-primary text-primary-foreground rounded-lg cursor-pointer flex items-center justify-center hover:opacity-90 active:scale-95"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Quick-action prompts grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                        {[
                          { text: "Analyze my SOL position", icon: BarChart2 },
                          { text: "Rebalance for lower risk", icon: PieChart },
                          { text: "Is the market overbought?", icon: Activity },
                          { text: "Import my wallet", icon: Wallet }
                        ].map((btn, index) => (
                          <button
                            key={index}
                            onClick={() => handleSendMessage(btn.text)}
                            className="p-3 bg-card hover:bg-secondary border border-border rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-2.5 shadow-sm group cursor-pointer"
                          >
                            <div className="p-1.5 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                              <btn.icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10px] uppercase font-mono tracking-wide font-black text-foreground/80 group-hover:text-foreground">
                              {btn.text}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Active chat messages render */
                    <div className="max-w-2xl mx-auto space-y-5">
                      {messages.map((msg) => (
                        <div 
                          key={msg.id}
                          className={`flex gap-3.5 ${msg.sender === "user" ? 'justify-end' : 'justify-start'}`}
                        >
                          {/* Avatar logo for AI */}
                          {msg.sender === "ai" && (
                            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                              <Logo size={16} />
                            </div>
                          )}

                          <div className={`space-y-3.5 max-w-[85%] ${msg.sender === "user" ? 'order-1' : 'order-2'}`}>
                            {/* Text Message Bubble */}
                            <div className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm font-sans font-medium ${
                              msg.sender === "user" 
                                ? 'bg-primary text-primary-foreground rounded-tr-none font-bold' 
                                : 'bg-card border border-border/80 text-foreground rounded-tl-none'
                            }`}>
                              {msg.text.split("\n\n").map((para, i) => (
                                <p key={i} className={i > 0 ? "mt-2" : ""}>{para}</p>
                              ))}
                            </div>

                            {/* Custom Rich UI Components embedded inline inside AI reply */}
                            {msg.sender === "ai" && (
                              <div className="space-y-4 pt-1 animate-fadeIn">
                                {/* 1. Asset Pills List */}
                                {msg.assetPills && msg.assetPills.length > 0 && (
                                  <div className="flex flex-wrap gap-2.5">
                                    {msg.assetPills.map((pill, i) => (
                                      <AssetPill key={i} {...pill} showDescription={true} />
                                    ))}
                                  </div>
                                )}

                                {/* 2. Inline Sparkline Chart */}
                                {msg.sparklineData && (
                                  <Sparkline 
                                    data={msg.sparklineData.prices} 
                                    isBullish={msg.sparklineData.isBullish} 
                                    label={msg.sparklineData.label}
                                    width={180}
                                    height={48}
                                  />
                                )}

                                {/* 3. Allocation Doughnut Chart */}
                                {msg.allocationData && (
                                  <AllocationDoughnut data={msg.allocationData} />
                                )}

                                {/* 4. Action Card */}
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

                      {/* Typing indicator bubble */}
                      {isTyping && (
                        <div className="flex gap-4 justify-start">
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

                {/* Fixed Glassmorphic Chat Input Area */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-8 pb-5 px-4 md:px-6 shrink-0 z-10 pointer-events-none">
                  <div className="max-w-2xl mx-auto flex flex-col gap-2 pointer-events-auto">
                    {/* Suggested mini pills */}
                    {messages.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                        <button 
                          onClick={() => handleSendMessage("trim 20-30% SOL")}
                          className="px-2.5 py-1 text-[9px] font-mono uppercase bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg border border-border transition-all shrink-0 cursor-pointer"
                        >
                          Trim SOL
                        </button>
                        <button 
                          onClick={() => handleSendMessage("show current risk")}
                          className="px-2.5 py-1 text-[9px] font-mono uppercase bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg border border-border transition-all shrink-0 cursor-pointer"
                        >
                          Check Risk
                        </button>
                        <button 
                          onClick={() => handleSendMessage("import wallet")}
                          className="px-2.5 py-1 text-[9px] font-mono uppercase bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg border border-border transition-all shrink-0 cursor-pointer"
                        >
                          Sync Wallet
                        </button>
                      </div>
                    )}

                    {/* Main input container */}
                    <div className="relative bg-card/85 backdrop-blur-lg border border-border/80 rounded-xl flex items-center shadow-lg hover:border-primary/30 focus-within:border-primary transition-all pr-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendMessage();
                        }}
                        placeholder="Reply to the advisor..."
                        className="w-full bg-transparent border-0 outline-none focus:ring-0 py-3.5 px-4 text-xs placeholder:text-muted-foreground/60 text-foreground"
                      />
                      <button
                        onClick={() => handleSendMessage()}
                        disabled={!chatInput.trim()}
                        className={`p-2 rounded-lg transition-all shrink-0 cursor-pointer ${chatInput.trim() ? 'bg-primary text-primary-foreground hover:scale-105 active:scale-95' : 'text-muted-foreground bg-secondary cursor-not-allowed'}`}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

              </motion.div>
            ) : (
              
              /* =========================================
                 PORTFOLIO VIEW (COINGECKO PORTFOLIO CHECKER)
                 ========================================= */
              <motion.div
                key="portfolio"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-y-auto px-4 md:px-6 py-6 custom-scrollbar"
              >
                <div className="max-w-4xl mx-auto space-y-6">
                  
                  {/* Portfolio Dashboard Header */}
                  <div className="bg-gradient-to-r from-primary/5 to-secondary/35 border border-border/80 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center gap-3.5 relative z-10">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 border border-primary/20">
                        <Wallet size={24} />
                      </div>
                      <div>
                        <h2 className="text-lg md:text-xl font-black font-display uppercase tracking-tight text-foreground">
                          PRO PORTFOLIO SCANNER
                        </h2>
                        <p className="text-muted-foreground text-[11px] font-semibold mt-0.5 max-w-sm leading-relaxed font-sans">
                          Track weights, review indicators, and optimize balances.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 relative z-10 w-full md:w-auto">
                      <div className="flex-1 md:flex-initial bg-card/85 border border-border/85 px-4 py-2.5 rounded-xl text-center shadow-xs">
                        <span className="text-[9px] font-mono text-muted-foreground uppercase block font-black leading-none mb-1">Net Valuation</span>
                        <span className="text-base font-black text-foreground font-display">
                          ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex-1 md:flex-initial bg-card/85 border border-border/85 px-4 py-2.5 rounded-xl text-center shadow-xs">
                        <span className="text-[9px] font-mono text-muted-foreground uppercase block font-black leading-none mb-1">24H Value Shift</span>
                        <span className="text-base font-black text-emerald-500 font-display">+5.85%</span>
                      </div>
                    </div>
                  </div>

                  {/* Allocation & Visual Metrics */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* CoinGecko Holdings Table */}
                    <div className="lg:col-span-2 bg-card border border-border/85 rounded-2xl p-5 space-y-4 shadow-sm overflow-x-auto">
                      <div>
                        <h3 className="font-black font-display uppercase tracking-tight text-base text-foreground">
                          Asset Balance Details
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Real-time indicators & holdings value</p>
                      </div>

                      <table className="w-full text-left border-collapse min-w-[450px]">
                        <thead>
                          <tr className="border-b border-border/60 text-[9px] font-mono uppercase text-muted-foreground font-black pb-2">
                            <th className="pb-2">Asset</th>
                            <th className="pb-2 text-right">Price</th>
                            <th className="pb-2 text-right">24H Shift</th>
                            <th className="pb-2 text-center">7D Sparkline</th>
                            <th className="pb-2 text-right">Holdings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {PORTFOLIO_DATA.map((token, idx) => {
                            const pct = ((token.value / totalPortfolioValue) * 100).toFixed(1);
                            return (
                              <tr key={idx} className="border-b border-border/30 last:border-0 hover:bg-secondary/40 transition-colors">
                                <td className="py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-7 h-7 rounded-full ${token.logoBg} flex items-center justify-center font-bold text-xs text-white shadow-inner font-mono`}>
                                      {token.ticker.slice(0, 3)}
                                    </div>
                                    <div>
                                      <span className="font-black text-xs text-foreground block tracking-tight">{token.ticker}</span>
                                      <span className="text-[9px] text-muted-foreground uppercase font-mono">{token.name}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 text-right font-mono font-bold text-xs text-foreground/90">
                                  ${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className={`py-3 text-right font-mono font-black text-xs ${token.change24h >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {token.change24h >= 0 ? "+" : ""}{token.change24h.toFixed(2)}%
                                </td>
                                <td className="py-3 text-center">
                                  <div className="inline-block scale-90">
                                    <Sparkline data={token.sparkline} isBullish={token.isBullish} width={80} height={28} />
                                  </div>
                                </td>
                                <td className="py-3 text-right">
                                  <span className="font-mono font-bold text-xs block text-foreground">
                                    {token.balance.toLocaleString()} {token.ticker}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground font-mono block">
                                    ${token.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ({pct}%)
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Weightings Doughnut Card */}
                    <div className="space-y-5 lg:col-span-1">
                      <div className="flex justify-center w-full">
                        <AllocationDoughnut data={doughnutData} />
                      </div>

                      {/* Suggested move action card inside portfolio view */}
                      <ActionCard 
                        suggestedMove="You have high SOL concentration (68.0%). Execute a 1-click optimization to trim 15% SOL into USDC to lower structural market risks."
                        primaryText="Reallocate Portfolio"
                        secondaryText="Configure Automatic Alerts"
                        onPrimaryClick={() => {
                          setSolBalance(9.6);
                          setUsdcBalance(2500 + (2.4 * TOKENS.SOL.price));
                          toast.success("Simulation: Portfolio successfully reallocated!");
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
                className="absolute inset-0 bg-background/50 backdrop-blur-md z-45 flex items-center justify-center p-4"
              >
                <motion.div 
                  initial={{ scale: 0.95, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 15 }}
                  className="max-w-md w-full bg-card/85 backdrop-blur-lg border border-border/80 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden"
                >
                  {/* Glowing background indicator */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                  
                  {/* Lock badge icon */}
                  <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
                    <ShieldAlert size={32} />
                  </div>

                  <h2 className="text-2xl font-black font-display uppercase tracking-tight text-foreground mb-2">
                    PRO ACCESS LOCKED
                  </h2>
                  <p className="text-muted-foreground text-xs font-mono uppercase tracking-widest font-black mb-6">
                    Street Sync Subscription Required
                  </p>

                  <div className="bg-secondary/40 border border-border/60 rounded-2xl p-5 mb-6 text-left space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Upgrade to the <strong>Market Data Pro</strong> tier for <strong>1 SOL per 30 days</strong> to unlock these features:
                    </p>
                    <ul className="space-y-3.5 text-xs font-mono uppercase text-foreground/80 font-black">
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span>Market Data Pro Dashboards</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span>AI portfolio analysis & rebalancing</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span>Unlimited private advisor chats</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <span>Wallet auto-import & price alerts</span>
                      </li>
                    </ul>
                  </div>

                  {/* Sub actions */}
                  <div className="space-y-3">
                    <button
                      onClick={async () => {
                        try {
                          await openSubscriptionModal("market-data");
                          setSimulatedSubscribe(true);
                          setPreviewState("StateB");
                        } catch (err) {
                          setSimulatedSubscribe(true);
                          setPreviewState("StateB");
                          toast.success("Demo Mode: Pro unlocked!");
                        }
                      }}
                      className="w-full py-4 bg-primary text-primary-foreground hover:scale-[1.01] active:scale-[0.99] transition-all rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary/20 cursor-pointer"
                    >
                      Subscribe for 1 SOL / 30 Days
                    </button>
                    
                    <button
                      onClick={() => {
                        setSimulatedSubscribe(true);
                        setPreviewState("StateB");
                        toast.success("Developer Simulation: Pro unlocked");
                      }}
                      className="w-full py-2.5 bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-xl font-bold uppercase tracking-wider text-[10px] cursor-pointer animate-pulse"
                    >
                      Simulate Unlock (Dev Preview)
                    </button>

                    <Link
                      href="/market-data"
                      className="w-full py-3.5 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border transition-all rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer font-sans"
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

// ==========================================
// DECORATIVE HELPERS & ICONS
// ==========================================

function ShieldCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.746 3.746 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
      />
    </svg>
  );
}
