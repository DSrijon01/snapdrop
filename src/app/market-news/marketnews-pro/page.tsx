"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSubscription } from "@/context/SubscriptionContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  ShieldAlert, 
  Sparkles, 
  TrendingUp, 
  Zap, 
  CheckCircle2, 
  Plus, 
  Eye, 
  Bell, 
  BellOff, 
  Calendar, 
  Info, 
  MessageSquare,
  Network
} from "lucide-react";
import Link from "next/link";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import toast from "react-hot-toast";

// 7-day Sentiment scoring matching Image 2 exactly
const SENTIMENT_CHART_DATA = [
  { day: "Mon", sentiment: 62 },
  { day: "Tue", sentiment: 65 },
  { day: "Wed", sentiment: 58 },
  { day: "Thu", sentiment: 70 },
  { day: "Fri", sentiment: 76 },
  { day: "Sat", sentiment: 82 },
  { day: "Sun", sentiment: 80 },
];

interface NewsNode {
  id: string;
  title: string;
  date: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  sentimentScore: number;
  content: string;
  parentId?: string;
  yOffset?: number; // visually adjust child vertical position
}

interface EventTree {
  id: string;
  title: string;
  subtitle: string;
  isFollowing: boolean;
  nodes: NewsNode[];
}

const INITIAL_TREES: EventTree[] = [
  {
    id: "stripe-solana",
    title: "Stripe & Solana Pay Integration",
    subtitle: "Tracking merchant beta trials, regulatory clearances, and transaction speed milestones.",
    isFollowing: true,
    nodes: [
      {
        id: "stripe-root",
        title: "Stripe Announces Strategic Solana Pay Integration",
        date: "2026-06-15",
        sentiment: "Bullish",
        sentimentScore: 85,
        content: "Stripe re-enters crypto payments with native Solana integration, enabling instant settlement and extremely low transaction fees for millions of global online stores.",
      },
      {
        id: "stripe-sub-1",
        title: "US Merchant Beta Program Officially Commences",
        date: "2026-06-18",
        sentiment: "Bullish",
        sentimentScore: 92,
        content: "A select group of 5,000 Shopify merchants using Stripe payments gain early access to Solana Pay transaction settlements. Integration takes under 5 minutes.",
        parentId: "stripe-root",
        yOffset: -120
      },
      {
        id: "stripe-sub-2",
        title: "Regulatory Compliance Review Initiated by SEC",
        date: "2026-06-21",
        sentiment: "Neutral",
        sentimentScore: 55,
        content: "Regulatory bodies request transaction logs and settlement architecture details. Experts believe standard AML/KYC checkpoints will suffice without halting implementation.",
        parentId: "stripe-root",
        yOffset: 120
      }
    ]
  },
  {
    id: "sec-ripple",
    title: "SEC vs Ripple Settlement Finalization",
    subtitle: "Tracking final trial judgments, fine distributions, and exchange relisting actions.",
    isFollowing: false,
    nodes: [
      {
        id: "ripple-root",
        title: "Court Schedules Final Review Conference",
        date: "2026-05-12",
        sentiment: "Neutral",
        sentimentScore: 50,
        content: "District judge schedules a mandatory final settlement review conference, signalling that a definitive conclusion to the multi-year litigation is imminent.",
      },
      {
        id: "ripple-sub-1",
        title: "SEC Agrees to Reduce Demanded Penalty by 60%",
        date: "2026-05-20",
        sentiment: "Bullish",
        sentimentScore: 88,
        content: "In a surprise concession, SEC lawyers submit a revised settlement proposal, slashing the requested penalty from $2B down to $780M, resolving structural deadlock.",
        parentId: "ripple-root",
        yOffset: -100
      },
      {
        id: "ripple-sub-2",
        title: "Major Exchanges Resume Global XRP Trading",
        date: "2026-06-10",
        sentiment: "Bullish",
        sentimentScore: 95,
        content: "Following legal finalization, major global crypto exchanges completely relist XRP for spot and leverage products, driving trading volume up 340% within 48 hours.",
        parentId: "ripple-root",
        yOffset: 100
      }
    ]
  },
  {
    id: "ftx-liquidation",
    title: "FTX Recovery & Distribution Plan",
    subtitle: "Monitoring auction timelines, creditor payouts, and market liquidation impact.",
    isFollowing: false,
    nodes: [
      {
        id: "ftx-root",
        title: "Court Approves Payout and Liquidation Blueprint",
        date: "2026-04-28",
        sentiment: "Neutral",
        sentimentScore: 52,
        content: "Bankruptcy court approves the final wind-down proposal. Assets will be incrementally sold off to establish a 100% principal recovery fund for qualified creditors.",
      },
      {
        id: "ftx-sub-1",
        title: "Locked SOL Auction Concludes for $1.9B",
        date: "2026-05-14",
        sentiment: "Bullish",
        sentimentScore: 72,
        content: "Liquidators sell off another batch of locked SOL to institutional buyers (Pantera, Galaxy) at a minor discount, removing spot-market dumping overhang.",
        parentId: "ftx-root",
        yOffset: -110
      },
      {
        id: "ftx-sub-2",
        title: "Distribution Portal Suffers Temporary DDOS",
        date: "2026-06-22",
        sentiment: "Bearish",
        sentimentScore: 35,
        content: "Creditors report access timeout issues on the official distributions site. Security teams confirm a brief cyberattack. No private wallet data was compromised.",
        parentId: "ftx-root",
        yOffset: 110
      }
    ]
  }
];

export default function MarketNewsProPage() {
  const { hasAccess, openSubscriptionModal, loading } = useSubscription();
  const [isMounted, setIsMounted] = useState(false);
  const [eventTrees, setEventTrees] = useState<EventTree[]>(INITIAL_TREES);
  const [selectedTreeId, setSelectedTreeId] = useState<string>("stripe-solana");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Interactive Node Addition form state
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [newNodeContent, setNewNodeContent] = useState("");
  const [newNodeSentiment, setNewNodeSentiment] = useState<"Bullish" | "Bearish" | "Neutral">("Bullish");
  const [newNodeScore, setNewNodeScore] = useState(75);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Set default node selection when tree changes
  useEffect(() => {
    const activeTree = eventTrees.find(t => t.id === selectedTreeId);
    if (activeTree && activeTree.nodes.length > 0) {
      // Find root node by default
      const rootNode = activeTree.nodes.find(n => !n.parentId);
      setSelectedNodeId(rootNode ? rootNode.id : activeTree.nodes[0].id);
    }
  }, [selectedTreeId, eventTrees]);

  if (!isMounted || loading) {
    return (
      <div className="flex h-screen w-full bg-background items-center justify-center text-muted-foreground animate-pulse font-mono uppercase tracking-widest text-xs">
        Loading Pro Environment...
      </div>
    );
  }

  const access = hasAccess("market-news");
  const activeTree = eventTrees.find(t => t.id === selectedTreeId);
  const rootNode = activeTree?.nodes.find(n => !n.parentId);
  const childNodes = activeTree?.nodes.filter(n => n.parentId === rootNode?.id) || [];
  const selectedNode = activeTree?.nodes.find(n => n.id === selectedNodeId);

  // Toggle tree following subscription state
  const toggleFollow = (treeId: string) => {
    setEventTrees(prev => prev.map(tree => {
      if (tree.id === treeId) {
        const nextState = !tree.isFollowing;
        if (nextState) {
          toast.success(`Subscribed to real-time updates for "${tree.title}"`);
        } else {
          toast.error(`Unfollowed "${tree.title}" updates`);
        }
        return { ...tree, isFollowing: nextState };
      }
      return tree;
    }));
  };

  // Add custom node dynamically to story tree
  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeTitle || !newNodeContent || !rootNode || !activeTree) {
      toast.error("Please fill in all node details.");
      return;
    }

    // Determine target coordinate offsets
    const existingChildrenCount = childNodes.length;
    const customOffset = (existingChildrenCount * 120) - 100;

    const newNode: NewsNode = {
      id: `custom-node-${Date.now()}`,
      title: newNodeTitle,
      date: new Date().toISOString().split("T")[0],
      sentiment: newNodeSentiment,
      sentimentScore: Number(newNodeScore),
      content: newNodeContent,
      parentId: rootNode.id,
      yOffset: customOffset
    };

    setEventTrees(prev => prev.map(t => {
      if (t.id === activeTree.id) {
        return {
          ...t,
          nodes: [...t.nodes, newNode]
        };
      }
      return t;
    }));

    setNewNodeTitle("");
    setNewNodeContent("");
    setNewNodeSentiment("Bullish");
    setNewNodeScore(75);
    setIsAddingNode(false);
    setSelectedNodeId(newNode.id);
    toast.success("Successfully appended news node to storyline!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative overflow-hidden flex flex-col items-center">
      {/* Background Neon glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[30rem] h-[30rem] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl px-6 pt-12 pb-8 flex items-center justify-between border-b border-border/40 relative z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/market-news"
            className="flex items-center gap-2 text-sm font-mono tracking-widest font-bold uppercase text-muted-foreground hover:text-primary transition-colors group px-3 py-2 -ml-3 rounded-lg hover:bg-muted/50"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Go Back</span>
          </Link>
          <div>
            <h1 className="text-3xl font-black font-display uppercase tracking-tight flex items-center gap-2">
              <Zap className="w-7 h-7 text-primary animate-pulse" />
              Market News Pro
            </h1>
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-mono mt-0.5">
              Premium Multi-Branch Event Tracker & AI Sentiment Trees
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-7xl px-6 py-8 flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {!access ? (
            /* LOCKED SCREEN (Unauthorized) */
            <motion.div
              key="locked"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto mt-12 bg-card/45 backdrop-blur-md border border-border/80 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />
              
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
                <ShieldAlert size={32} />
              </div>

              <h2 className="text-2xl font-black font-display uppercase tracking-tight text-foreground mb-2">
                Pro Access Locked
              </h2>
              <p className="text-muted-foreground text-sm font-mono uppercase tracking-wide mb-6">
                Subscription Required
              </p>

              <div className="bg-muted/40 border border-border/60 rounded-2xl p-4 mb-6 text-left space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Subscribe to the Market News Pro tier for <strong>1 SOL per 30 days</strong> to unlock:
                </p>
                <ul className="space-y-2 text-xs font-mono uppercase text-foreground/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Interactive news connection trees</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>7-Day weighted NLP sentiment scoring</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Live macro event storyline timelines</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => openSubscriptionModal("market-news")}
                  className="w-full py-4 bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg shadow-primary/20"
                >
                  Subscribe for 1 SOL / 30 Days
                </button>
                <Link
                  href="/market-news"
                  className="w-full py-4 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border transition-all rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                >
                  Back to Market News Home
                </Link>
              </div>
            </motion.div>
          ) : (
            /* PRO CONTENT (Authorized) */
            <motion.div
              key="authorized"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Top Summary Banner */}
              <div className="bg-card/45 backdrop-blur-md border border-border rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/15 rounded-2xl flex items-center justify-center text-primary shrink-0">
                    <Network size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black font-display uppercase tracking-tight">
                      Macro Storyline Tracker
                    </h2>
                    <p className="text-muted-foreground text-xs font-mono max-w-xl uppercase mt-0.5">
                      Trace connections between key market reports and map how individual articles steer macro expectations.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {eventTrees.map(tree => (
                    <button
                      key={tree.id}
                      onClick={() => setSelectedTreeId(tree.id)}
                      className={`px-4 py-2.5 rounded-xl font-mono text-xs uppercase font-bold tracking-wide transition-all border ${
                        selectedTreeId === tree.id 
                          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/15 scale-[1.03]" 
                          : "bg-muted/30 hover:bg-muted/65 text-muted-foreground border-border/80"
                      }`}
                    >
                      {tree.title.split(" & ")[0].split(" vs ")[0]} Pro
                    </button>
                  ))}
                </div>
              </div>

              {/* Two Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* LEFT COLUMN: Sentiment Scoring + Active Event Selector (4/12 width) */}
                <div className="lg:col-span-4 space-y-8">
                  
                  {/* Image 2 Matching: 7-Day Sentiment Scoring Card */}
                  <div className="bg-card/35 backdrop-blur-md border border-border rounded-3xl p-6 space-y-6">
                    <div>
                      <h3 className="font-black font-display uppercase tracking-tight text-md">
                        7-Day Sentiment Scoring
                      </h3>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Weighted NLP Bullishness Scale</p>
                    </div>

                    <div className="h-48 w-full font-mono text-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={SENTIMENT_CHART_DATA} 
                          margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis 
                            dataKey="day" 
                            stroke="#6b7280" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={{ stroke: '#374151' }}
                          />
                          <YAxis 
                            domain={[0, 100]} 
                            ticks={[0, 25, 50, 75, 100]} 
                            stroke="#6b7280" 
                            fontSize={10} 
                            tickLine={false}
                            axisLine={{ stroke: '#374151' }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(12, 12, 14, 0.95)",
                              borderColor: "rgba(255,255,255,0.1)",
                              borderRadius: "12px",
                              fontFamily: "monospace",
                              fontSize: "10px",
                              color: "#fff"
                            }}
                          />
                          {/* Rich orange-red bars matching Image 2 */}
                          <Bar dataKey="sentiment" fill="#dc2626" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Active Selector List */}
                  <div className="bg-card/35 backdrop-blur-md border border-border rounded-3xl p-6 space-y-4">
                    <h3 className="font-black font-display uppercase tracking-tight text-sm">
                      Followed Storylines
                    </h3>
                    <div className="space-y-3">
                      {eventTrees.map(tree => (
                        <div 
                          key={tree.id}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            selectedTreeId === tree.id 
                              ? "bg-muted/40 border-primary/40 shadow-sm"
                              : "bg-muted/10 hover:bg-muted/20 border-border/80"
                          }`}
                          onClick={() => setSelectedTreeId(tree.id)}
                        >
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                              {tree.title}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFollow(tree.id);
                              }}
                              className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                              title={tree.isFollowing ? "Unfollow Storyline" : "Follow Storyline"}
                            >
                              {tree.isFollowing ? (
                                <Bell className="w-3.5 h-3.5 text-primary fill-primary/10" />
                              ) : (
                                <BellOff className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {tree.subtitle}
                          </p>
                          <div className="mt-2.5 flex items-center justify-between text-[9px] font-mono uppercase">
                            <span className="text-muted-foreground">{tree.nodes.length} news milestones</span>
                            <span className={`font-bold px-1.5 py-0.5 rounded ${
                              tree.isFollowing ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                            }`}>
                              {tree.isFollowing ? "Active Alerts" : "Muted"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* RIGHT COLUMN: Interactive Tree Canvas + Details (8/12 width) */}
                <div className="lg:col-span-8 space-y-8">
                  
                  {/* Connection Node Map Canvas */}
                  <div className="bg-card/35 backdrop-blur-md border border-border rounded-3xl p-6 space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
                          Interactive Live Map
                        </span>
                        <h3 className="font-black font-display uppercase tracking-tight text-lg mt-1">
                          {activeTree?.title} Timeline Tree
                        </h3>
                      </div>
                      
                      <button
                        onClick={() => setIsAddingNode(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-sans font-bold text-xs uppercase tracking-wide transition-all shadow-md shadow-primary/15"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Update</span>
                      </button>
                    </div>

                    {/* Canvas Area: Absolute positioning with Grid background matching Image 1 */}
                    <div className="relative w-full h-[380px] bg-[#09090b] border border-border/60 rounded-2xl overflow-hidden bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:16px_16px]">
                      
                      {/* SVG Connection Lines overlay */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <defs>
                          <marker
                            id="arrowhead"
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                          >
                            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="rgba(255,255,255,0.18)" />
                          </marker>
                          <marker
                            id="arrowhead-selected"
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                          >
                            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--primary)" />
                          </marker>
                        </defs>

                        {/* Drawing paths between root node and its child nodes */}
                        {rootNode && childNodes.map((child, index) => {
                          const rootX = 230; // right boundary of root node
                          const rootY = 190; // center vertical point of root node
                          const childX = 420; // left boundary of child node
                          
                          // Estimate vertical position of child based on its index & offsets
                          // The layout centers children node around the 190 middle point
                          let childY = 190;
                          if (childNodes.length > 1) {
                            const totalHeight = 280;
                            const step = totalHeight / (childNodes.length - 1);
                            childY = 50 + (index * step);
                          }

                          const isSelectedConnection = selectedNodeId === child.id || selectedNodeId === rootNode.id;

                          return (
                            <g key={child.id}>
                              <path
                                d={`M ${rootX} ${rootY} C ${(rootX + childX)/2} ${rootY}, ${(rootX + childX)/2} ${childY}, ${childX} ${childY}`}
                                fill="none"
                                stroke={isSelectedConnection ? "var(--primary)" : "rgba(255, 255, 255, 0.12)"}
                                strokeWidth={isSelectedConnection ? 2 : 1.5}
                                strokeDasharray={isSelectedConnection ? "5 3" : undefined}
                                markerEnd={isSelectedConnection ? "url(#arrowhead-selected)" : "url(#arrowhead)"}
                                className="transition-all duration-300"
                              />
                            </g>
                          );
                        })}
                      </svg>

                      {/* Root Node Card (Left) */}
                      {rootNode && (
                        <div 
                          className={`absolute w-[200px] h-[130px] rounded-xl p-3 border transition-all cursor-pointer select-none flex flex-col justify-between ${
                            selectedNodeId === rootNode.id
                              ? "bg-primary/10 border-primary shadow-lg shadow-primary/15 scale-[1.03] z-20"
                              : "bg-card/90 border-border/80 hover:border-muted-foreground/60 z-10"
                          }`}
                          style={{
                            left: "30px",
                            top: "125px"
                          }}
                          onClick={() => setSelectedNodeId(rootNode.id)}
                        >
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] font-mono uppercase text-muted-foreground tracking-wider">{rootNode.date}</span>
                              <span className={`text-[8px] font-mono px-1 py-0.5 rounded font-bold uppercase ${
                                rootNode.sentiment === "Bullish" ? "bg-emerald-500/10 text-emerald-500" :
                                rootNode.sentiment === "Bearish" ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                              }`}>
                                {rootNode.sentiment}
                              </span>
                            </div>
                            <h4 className="text-xs font-black uppercase text-foreground line-clamp-3 leading-snug">
                              {rootNode.title}
                            </h4>
                          </div>
                          
                          <div className="flex items-center justify-between text-[8px] font-mono text-muted-foreground border-t border-border/20 pt-1">
                            <span>Root Headline</span>
                            <span className="font-bold text-primary">{rootNode.sentimentScore}% AI Score</span>
                          </div>
                        </div>
                      )}

                      {/* Child Nodes (Right Stacked Panel) */}
                      <div className="absolute top-0 right-4 bottom-0 w-[240px] overflow-y-auto py-4 space-y-4 scrollbar-none pr-1 flex flex-col justify-center">
                        {childNodes.map((child, index) => (
                          <div 
                            key={child.id}
                            className={`w-[220px] min-h-[90px] rounded-xl p-3 border transition-all cursor-pointer select-none flex flex-col justify-between ${
                              selectedNodeId === child.id
                                ? "bg-primary/10 border-primary shadow-lg shadow-primary/15 scale-[1.03] z-20"
                                : "bg-card/90 border-border/80 hover:border-muted-foreground/60 z-10"
                            }`}
                            onClick={() => setSelectedNodeId(child.id)}
                          >
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] font-mono uppercase text-muted-foreground tracking-wider">{child.date}</span>
                                <span className={`text-[8px] font-mono px-1 py-0.5 rounded font-bold uppercase ${
                                  child.sentiment === "Bullish" ? "bg-emerald-500/10 text-emerald-500" :
                                  child.sentiment === "Bearish" ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                                }`}>
                                  {child.sentiment}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-foreground line-clamp-3 leading-snug">
                                {child.title}
                              </h4>
                            </div>

                            <div className="flex items-center justify-between text-[8px] font-mono text-muted-foreground border-t border-border/20 pt-1 mt-2">
                              <span>Sub-Update</span>
                              <span className="font-bold text-primary">{child.sentimentScore}% Score</span>
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  </div>

                  {/* Selected Node Details Display Panel */}
                  <AnimatePresence mode="wait">
                    {selectedNode && (
                      <motion.div 
                        key={selectedNode.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="bg-card/45 backdrop-blur-md border border-border rounded-3xl p-6 space-y-4"
                      >
                        <div className="flex justify-between items-start border-b border-border/30 pb-3 flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Published: {selectedNode.date}</span>
                            </div>
                            <h3 className="text-lg font-black uppercase text-foreground mt-1">
                              {selectedNode.title}
                            </h3>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider ${
                              selectedNode.sentiment === "Bullish" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                              selectedNode.sentiment === "Bearish" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : 
                              "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            }`}>
                              AI Sentiment: {selectedNode.sentiment}
                            </span>
                            
                            <div className="text-right">
                              <span className="text-[10px] text-muted-foreground block font-mono">NLP CONFIDENCE</span>
                              <span className="text-sm font-black font-display text-primary">{selectedNode.sentimentScore}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 leading-relaxed text-sm text-muted-foreground">
                          <p className="bg-muted/20 border border-border/40 rounded-2xl p-4 text-foreground/90 font-sans">
                            {selectedNode.content}
                          </p>

                          <div className="flex items-center gap-4 text-xs font-mono uppercase text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Info className="w-3.5 h-3.5" />
                              <span>Model: NLP Llama-Finance v3</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Impact Assessment: High</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Add Node Interactive Modal Dialog */}
                  <AnimatePresence>
                    {isAddingNode && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                      >
                        <motion.div 
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.95, opacity: 0 }}
                          className="bg-card/95 border border-border max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-6"
                        >
                          <div>
                            <h3 className="text-xl font-black font-display uppercase tracking-tight text-foreground">
                              Add Sub-News to Storyline
                            </h3>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              Attach a new development milestone under this macro event path.
                            </p>
                          </div>

                          <form onSubmit={handleAddNode} className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                                Headline Title
                              </label>
                              <input 
                                type="text"
                                value={newNodeTitle}
                                onChange={(e) => setNewNodeTitle(e.target.value)}
                                placeholder="e.g. Developer docs update hints at Shopify checkout API release"
                                required
                                className="w-full bg-[#121214] border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/60 transition-colors"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                                Details & Summary
                              </label>
                              <textarea
                                value={newNodeContent}
                                onChange={(e) => setNewNodeContent(e.target.value)}
                                placeholder="Details about this news update. Trace how this impacts transaction volumes or regulatory status."
                                required
                                rows={3}
                                className="w-full bg-[#121214] border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/60 transition-colors resize-none"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                                  Sentiment Bias
                                </label>
                                <select 
                                  value={newNodeSentiment}
                                  onChange={(e) => setNewNodeSentiment(e.target.value as any)}
                                  className="w-full bg-[#121214] border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/60 transition-colors"
                                >
                                  <option value="Bullish">Bullish</option>
                                  <option value="Neutral">Neutral</option>
                                  <option value="Bearish">Bearish</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex justify-between">
                                  <span>AI Confidence</span>
                                  <span className="text-primary font-bold">{newNodeScore}%</span>
                                </label>
                                <input 
                                  type="range"
                                  min={10}
                                  max={100}
                                  value={newNodeScore}
                                  onChange={(e) => setNewNodeScore(Number(e.target.value))}
                                  className="w-full accent-primary h-8"
                                />
                              </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setIsAddingNode(false)}
                                className="flex-1 py-3 bg-muted hover:bg-muted/80 border border-border text-muted-foreground rounded-xl font-bold uppercase tracking-wider text-xs transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="flex-1 py-3 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-md shadow-primary/15"
                              >
                                Publish Node
                              </button>
                            </div>
                          </form>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
