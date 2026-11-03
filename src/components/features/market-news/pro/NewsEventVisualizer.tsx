"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Network, 
  RotateCcw, 
  Plus, 
  Link2, 
  Unlink, 
  ExternalLink, 
  Sparkles, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  Info, 
  X, 
  Trash2, 
  Search, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Newspaper,
  Layers,
  ChevronDown
} from "lucide-react";
import toast from "react-hot-toast";
import { NewsArticle } from "@/lib/newsApi";

export type NodeStatus = "verified" | "active" | "alert" | "mapped";

export interface VisualizerNode {
  id: string;
  title: string;
  label: string; // Short pill label (e.g. "Stripe Launch", "Merchant Beta")
  category: "Solana" | "Macro" | "Regulation" | "DeFi" | "Tech";
  date: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  sentimentScore: number; // 0 - 100
  impact: "high" | "medium" | "low";
  status: NodeStatus;
  source: string;
  summary: string;
  url?: string;
  x: number; // 2D canvas coordinates
  y: number;
}

export interface VisualizerEdge {
  id: string;
  sourceId: string;
  targetId: string;
  style?: "solid" | "dashed";
  label?: string;
}

export interface StorylinePreset {
  id: string;
  name: string;
  subtitle: string;
  nodes: VisualizerNode[];
  edges: VisualizerEdge[];
}

export const STORYLINE_PRESETS: StorylinePreset[] = [
  {
    id: "stripe-solana",
    name: "Stripe & Solana Pay Expansion",
    subtitle: "Tracking merchant trials, low-latency finality, regulatory checks, and global settlement.",
    nodes: [
      {
        id: "node-launch",
        title: "Stripe Announces Strategic Solana Pay Integration",
        label: "Launch",
        category: "Solana",
        date: "2026-06-15",
        sentiment: "Bullish",
        sentimentScore: 88,
        impact: "high",
        status: "verified",
        source: "Stripe Press",
        summary: "Stripe re-enters crypto payments with native Solana integration, enabling sub-second settlement and fractions of a cent in fees.",
        url: "https://stripe.com",
        x: 40,
        y: 240,
      },
      {
        id: "node-onboarding",
        title: "5,000 Shopify US Merchants Enter Beta",
        label: "Onboarding",
        category: "Solana",
        date: "2026-06-18",
        sentiment: "Bullish",
        sentimentScore: 92,
        impact: "high",
        status: "verified",
        source: "Shopify News",
        summary: "Early merchant trials allow instant checkout in USDC and SOL, reducing payment processing fees by up to 80%.",
        url: "https://shopify.com",
        x: 210,
        y: 130,
      },
      {
        id: "node-signin",
        title: "SEC Initiates Compliance Verification on Settlement Logs",
        label: "Compliance Check",
        category: "Regulation",
        date: "2026-06-21",
        sentiment: "Neutral",
        sentimentScore: 55,
        impact: "high",
        status: "alert",
        source: "Bloomberg",
        summary: "Regulators request transaction proof-of-settlement logs. Legal consensus expects standard compliance checks without disruptions.",
        url: "https://bloomberg.com",
        x: 220,
        y: 330,
      },
      {
        id: "node-home",
        title: "USDC & SOL Settlement Engine Deployed to Production",
        label: "Core Settlement",
        category: "Solana",
        date: "2026-06-25",
        sentiment: "Bullish",
        sentimentScore: 89,
        impact: "medium",
        status: "verified",
        source: "Solana Foundation",
        summary: "High-throughput settlement pipeline achieves sustained 3,200 TPS with 0% downtime across commercial storefronts.",
        url: "https://solana.com",
        x: 390,
        y: 210,
      },
      {
        id: "node-search",
        title: "Solana DEX Weekly Volume Flips Layer 1 Rivals",
        label: "DEX Vol ATH",
        category: "DeFi",
        date: "2026-06-28",
        sentiment: "Bullish",
        sentimentScore: 94,
        impact: "high",
        status: "active",
        source: "DeFiLlama",
        summary: "Spurred by merchant conversions and liquidity pairs, Solana weekly decentralized volume surpasses all competing blockchains.",
        url: "https://defillama.com",
        x: 550,
        y: 110,
      },
      {
        id: "node-product",
        title: "Circle Expands Native Euro & Yen Stablecoins on Solana",
        label: "FX Liquidity",
        category: "DeFi",
        date: "2026-07-02",
        sentiment: "Bullish",
        sentimentScore: 86,
        impact: "medium",
        status: "verified",
        source: "Circle Insights",
        summary: "Multi-currency stablecoin issuance powers seamless cross-border foreign exchange on-chain without traditional banking spreads.",
        url: "https://circle.com",
        x: 710,
        y: 130,
      },
      {
        id: "node-cart",
        title: "Sub-400ms Finality Milestone Achieved with Firedancer",
        label: "Speed Finality",
        category: "Tech",
        date: "2026-07-05",
        sentiment: "Bullish",
        sentimentScore: 91,
        impact: "medium",
        status: "active",
        source: "Jump Crypto",
        summary: "Firedancer validator software updates decrease confirmation jitter, enabling instant point-of-sale tap transactions.",
        url: "https://jumpcrypto.com",
        x: 560,
        y: 280,
      },
      {
        id: "node-checkout",
        title: "Hardware POS Terminals Pilot in NYC & Tokyo Stores",
        label: "POS Terminals",
        category: "Solana",
        date: "2026-07-10",
        sentiment: "Bullish",
        sentimentScore: 84,
        impact: "high",
        status: "alert",
        source: "CoinDesk",
        summary: "Physical merchant terminals supporting contactless Solana Pay roll out in retail pilot locations with instant receipts.",
        url: "https://coindesk.com",
        x: 720,
        y: 290,
      },
      {
        id: "node-confirm",
        title: "Global Unrestricted Commercial Rollout",
        label: "Global Rollout",
        category: "Solana",
        date: "2026-07-20",
        sentiment: "Bullish",
        sentimentScore: 80,
        impact: "medium",
        status: "mapped",
        source: "Press Release",
        summary: "Full worldwide rollout scheduled across all 46 Stripe operating jurisdictions, targeting over $10B annual payment volume.",
        url: "https://stripe.com",
        x: 430,
        y: 400,
      },
    ],
    edges: [
      { id: "e1", sourceId: "node-launch", targetId: "node-onboarding", style: "solid" },
      { id: "e2", sourceId: "node-launch", targetId: "node-signin", style: "dashed" },
      { id: "e3", sourceId: "node-onboarding", targetId: "node-home", style: "solid" },
      { id: "e4", sourceId: "node-signin", targetId: "node-home", style: "solid" },
      { id: "e5", sourceId: "node-home", targetId: "node-search", style: "solid" },
      { id: "e6", sourceId: "node-search", targetId: "node-product", style: "solid" },
      { id: "e7", sourceId: "node-home", targetId: "node-cart", style: "solid" },
      { id: "e8", sourceId: "node-cart", targetId: "node-checkout", style: "solid" },
      { id: "e9", sourceId: "node-product", targetId: "node-checkout", style: "dashed" },
      { id: "e10", sourceId: "node-home", targetId: "node-confirm", style: "solid" },
      { id: "e11", sourceId: "node-cart", targetId: "node-confirm", style: "dashed" },
    ],
  },
  {
    id: "macro-fed",
    name: "Macro Fed Pivot & Global Liquidity",
    subtitle: "Tracing interest rate cuts, bond yields, institutional asset allocation, and liquidity inflows.",
    nodes: [
      {
        id: "fed-pause",
        title: "Federal Reserve Signals Rate Cuts Later This Year",
        label: "Fed Pause",
        category: "Macro",
        date: "2026-05-15",
        sentiment: "Bullish",
        sentimentScore: 78,
        impact: "high",
        status: "verified",
        source: "WSJ",
        summary: "Central bank highlights cooling inflation prints, laying ground for potential monetary easing in upcoming quarters.",
        x: 40,
        y: 220,
      },
      {
        id: "cpi-cooling",
        title: "Core CPI Inflation Prints Lower at 2.6%",
        label: "CPI Print",
        category: "Macro",
        date: "2026-05-22",
        sentiment: "Bullish",
        sentimentScore: 82,
        impact: "medium",
        status: "verified",
        source: "Bureau of Labor",
        summary: "Consumer price index drops below expectations for the third straight month, strengthening rate cut forecasts.",
        x: 230,
        y: 120,
      },
      {
        id: "yield-drop",
        title: "US 10-Year Treasury Yield Drops Below 3.8%",
        label: "Yield Contraction",
        category: "Macro",
        date: "2026-05-28",
        sentiment: "Bullish",
        sentimentScore: 75,
        impact: "medium",
        status: "active",
        source: "CNBC",
        summary: "Bond market rallies as yields decline sharply, driving risk capital from money market accounts into high-beta tech and digital assets.",
        x: 230,
        y: 320,
      },
      {
        id: "dxy-weak",
        title: "US Dollar Index (DXY) Weakens to 10-Month Low",
        label: "DXY Softening",
        category: "Macro",
        date: "2026-06-05",
        sentiment: "Bullish",
        sentimentScore: 84,
        impact: "high",
        status: "verified",
        source: "Financial Times",
        summary: "Dollar softening prompts foreign exchange rotation into decentralized stores of value and digital assets.",
        x: 430,
        y: 220,
      },
      {
        id: "etf-inflows",
        title: "Spot Digital Asset ETFs Record $1.2B Single-Day Net Inflows",
        label: "ETF Surge",
        category: "DeFi",
        date: "2026-06-12",
        sentiment: "Bullish",
        sentimentScore: 95,
        impact: "high",
        status: "alert",
        source: "Bloomberg",
        summary: "Wall Street institutional funds aggressively increase balance sheet allocations as macroeconomic headwinds subside.",
        x: 640,
        y: 130,
      },
      {
        id: "m2-liquidity",
        title: "Global Central Bank M2 Money Supply Enters Expansion Phase",
        label: "Global M2 Expansion",
        category: "Macro",
        date: "2026-06-18",
        sentiment: "Bullish",
        sentimentScore: 88,
        impact: "medium",
        status: "mapped",
        source: "MacroMinds",
        summary: "Synchronized monetary easing across major global central banks triggers a massive liquidity wave across global markets.",
        x: 640,
        y: 310,
      },
    ],
    edges: [
      { id: "mf1", sourceId: "fed-pause", targetId: "cpi-cooling", style: "solid" },
      { id: "mf2", sourceId: "fed-pause", targetId: "yield-drop", style: "solid" },
      { id: "mf3", sourceId: "cpi-cooling", targetId: "dxy-weak", style: "solid" },
      { id: "mf4", sourceId: "yield-drop", targetId: "dxy-weak", style: "solid" },
      { id: "mf5", sourceId: "dxy-weak", targetId: "etf-inflows", style: "solid" },
      { id: "mf6", sourceId: "dxy-weak", targetId: "m2-liquidity", style: "dashed" },
    ],
  },
  {
    id: "sec-clarity",
    name: "Regulatory Clarity & Institutional Accord",
    subtitle: "Tracking legal settlement concessions, staking classifications, and compliant market structures.",
    nodes: [
      {
        id: "reg-suit",
        title: "Judicial Review Mandates Settlement Conference",
        label: "Court Conference",
        category: "Regulation",
        date: "2026-05-12",
        sentiment: "Neutral",
        sentimentScore: 50,
        impact: "high",
        status: "verified",
        source: "Reuters",
        summary: "District judge instructs regulatory agency and industry leaders to finalize fair settlement terms within 30 days.",
        x: 40,
        y: 220,
      },
      {
        id: "reg-staking",
        title: "SEC Clarifies Non-Custodial Proof-of-Stake Guidelines",
        label: "Staking Guidelines",
        category: "Regulation",
        date: "2026-05-24",
        sentiment: "Bullish",
        sentimentScore: 91,
        impact: "high",
        status: "verified",
        source: "CoinDesk",
        summary: "Formal safe-harbor rule affirms that native on-chain proof-of-stake validation does not constitute a security transaction.",
        x: 240,
        y: 120,
      },
      {
        id: "reg-penalty",
        title: "Regulatory Demands Slashed by 60% in Landmark Deal",
        label: "Penalty Slashed",
        category: "Regulation",
        date: "2026-06-02",
        sentiment: "Bullish",
        sentimentScore: 88,
        impact: "medium",
        status: "active",
        source: "Wall Street Journal",
        summary: "Proposed penalties drastically reduced, ending years of overhang and paving the way for corporate treasury participation.",
        x: 240,
        y: 320,
      },
      {
        id: "reg-custody",
        title: "SAB 121 Banking Custody Rule Formally Overturned",
        label: "SAB 121 Repealed",
        category: "Regulation",
        date: "2026-06-15",
        sentiment: "Bullish",
        sentimentScore: 96,
        impact: "high",
        status: "alert",
        source: "Bloomberg",
        summary: "Tier-1 global custodian banks receive green light to custody digital assets directly for hedge funds and sovereign reserves.",
        x: 460,
        y: 220,
      },
      {
        id: "reg-relist",
        title: "Major US Exchanges Relist Full Spot Asset Spectrum",
        label: "Exchanges Relist",
        category: "DeFi",
        date: "2026-06-25",
        sentiment: "Bullish",
        sentimentScore: 92,
        impact: "medium",
        status: "mapped",
        source: "CryptoSlate",
        summary: "Domestic platforms re-enable spot and derivative trading pairs, sparking massive order book depth and narrowing spreads.",
        x: 680,
        y: 220,
      },
    ],
    edges: [
      { id: "rc1", sourceId: "reg-suit", targetId: "reg-staking", style: "solid" },
      { id: "rc2", sourceId: "reg-suit", targetId: "reg-penalty", style: "solid" },
      { id: "rc3", sourceId: "reg-staking", targetId: "reg-custody", style: "solid" },
      { id: "rc4", sourceId: "reg-penalty", targetId: "reg-custody", style: "solid" },
      { id: "rc5", sourceId: "reg-custody", targetId: "reg-relist", style: "solid" },
    ],
  },
];

interface NewsEventVisualizerProps {
  liveArticles?: NewsArticle[];
  onOpenFeed?: () => void;
  onOpenSentimentModal?: () => void;
}

export function NewsEventVisualizer({
  liveArticles = [],
  onOpenFeed,
  onOpenSentimentModal,
}: NewsEventVisualizerProps) {
  // Active Preset
  const [selectedPresetId, setSelectedPresetId] = useState<string>("stripe-solana");
  
  // Working state for Nodes and Edges
  const [nodes, setNodes] = useState<VisualizerNode[]>(() => {
    return STORYLINE_PRESETS[0].nodes;
  });
  const [edges, setEdges] = useState<VisualizerEdge[]>(() => {
    return STORYLINE_PRESETS[0].edges;
  });

  // Selected Node for details inspector
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("node-signin");
  
  // Interactive Connecting Mode state
  const [isConnectMode, setIsConnectMode] = useState(false);
  const [connectSourceNodeId, setConnectSourceNodeId] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<"All" | "Bullish" | "Bearish" | "Neutral">("All");

  // Zoom & Pan Scale
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Add Custom Node Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState<VisualizerNode["category"]>("Solana");
  const [newSentiment, setNewSentiment] = useState<"Bullish" | "Bearish" | "Neutral">("Bullish");
  const [newScore, setNewScore] = useState(85);
  const [newImpact, setNewImpact] = useState<"high" | "medium" | "low">("high");
  const [newSummary, setNewSummary] = useState("");

  // Live feed drawer inside visualizer
  const [isFeedDrawerOpen, setIsFeedDrawerOpen] = useState(false);

  // Dragging mechanics
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragNodeIdRef = useRef<string | null>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const nodeStartPosRef = useRef({ x: 0, y: 0 });

  // Elapsed Session Time Tracker (e.g. 12:52 from reference image)
  const [elapsedSeconds, setElapsedSeconds] = useState(772); // Starts ~12:52

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Switch Storyline Preset
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = STORYLINE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setNodes([...preset.nodes]);
      setEdges([...preset.edges]);
      setSelectedNodeId(preset.nodes[0]?.id || null);
      setIsConnectMode(false);
      setConnectSourceNodeId(null);
      setPanOffset({ x: 0, y: 0 });
      setZoomLevel(1);
      toast.success(`Loaded "${preset.name}" storyline.`);
    }
  };

  // Reset to original preset layout (Auto-Organize)
  const handleResetLayout = () => {
    const preset = STORYLINE_PRESETS.find((p) => p.id === selectedPresetId);
    if (preset) {
      setNodes([...preset.nodes]);
      setEdges([...preset.edges]);
      setPanOffset({ x: 0, y: 0 });
      setZoomLevel(1);
      toast.success("Visualizer reset to optimal narrative flow.");
    }
  };

  // Node Drag Handlers (Pointer Event API with full mobile touch support)
  const handleNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    
    // If in connect mode, handle connection
    if (isConnectMode) {
      handleNodeConnectClick(nodeId);
      return;
    }

    setSelectedNodeId(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    isDraggingRef.current = true;
    dragNodeIdRef.current = nodeId;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    nodeStartPosRef.current = { x: node.x, y: node.y };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !dragNodeIdRef.current) return;

    const dx = (e.clientX - dragStartPosRef.current.x) / zoomLevel;
    const dy = (e.clientY - dragStartPosRef.current.y) / zoomLevel;

    const targetId = dragNodeIdRef.current;
    const newX = Math.max(10, Math.min(840, nodeStartPosRef.current.x + dx));
    const newY = Math.max(10, Math.min(500, nodeStartPosRef.current.y + dy));

    setNodes((prev) =>
      prev.map((n) => (n.id === targetId ? { ...n, x: newX, y: newY } : n))
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      dragNodeIdRef.current = null;
    }
  };

  // Connection Engine
  const handleNodeConnectClick = (nodeId: string) => {
    if (!connectSourceNodeId) {
      setConnectSourceNodeId(nodeId);
      toast("Select another node to create or toggle connection", {
        icon: "⚡",
      });
    } else {
      if (connectSourceNodeId === nodeId) {
        setConnectSourceNodeId(null);
        return;
      }
      // Check if edge already exists
      const existingIndex = edges.findIndex(
        (e) =>
          (e.sourceId === connectSourceNodeId && e.targetId === nodeId) ||
          (e.sourceId === nodeId && e.targetId === connectSourceNodeId)
      );

      if (existingIndex >= 0) {
        // Toggle/Remove edge
        setEdges((prev) => prev.filter((_, i) => i !== existingIndex));
        toast.success("Disconnected link between nodes.");
      } else {
        // Add new edge
        const newEdge: VisualizerEdge = {
          id: `edge-${Date.now()}`,
          sourceId: connectSourceNodeId,
          targetId: nodeId,
          style: "solid",
        };
        setEdges((prev) => [...prev, newEdge]);
        toast.success("Linked events into narrative flow!");
      }
      setConnectSourceNodeId(null);
    }
  };

  const handleStartConnectFromInspector = (nodeId: string) => {
    setIsConnectMode(true);
    setConnectSourceNodeId(nodeId);
    toast("Click any target node to create a correlation link", { icon: "⚡" });
  };

  const handleDisconnectNode = (nodeId: string) => {
    setEdges((prev) => prev.filter((e) => e.sourceId !== nodeId && e.targetId !== nodeId));
    toast.success("All connections for this node removed.");
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.sourceId !== nodeId && e.targetId !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
    toast.success("Node removed from visualizer.");
  };

  // Add Article from Live Feed into Visualizer
  const handleAddArticleToMap = (article: NewsArticle) => {
    // Generate distinct location
    const existingCount = nodes.length;
    const col = existingCount % 4;
    const row = Math.floor(existingCount / 4);
    const x = 80 + col * 190;
    const y = 80 + row * 130;

    const label = article.title.length > 18 
      ? article.title.substring(0, 18).trim() + "..." 
      : article.title;

    const newNode: VisualizerNode = {
      id: `live-${article.article_id || Date.now()}`,
      title: article.title,
      label: label,
      category: article.tags?.[0]?.includes("Solana") ? "Solana" : "DeFi",
      date: new Date(article.pubDate || Date.now()).toISOString().split("T")[0],
      sentiment: article.sentiment === "Positive" ? "Bullish" : article.sentiment === "Negative" ? "Bearish" : "Neutral",
      sentimentScore: Math.round(Math.abs(article.sentiment_score || 0.8) * 100),
      impact: Math.abs(article.sentiment_score || 0) > 0.6 ? "high" : "medium",
      status: "active",
      source: article.source_name || "Live Wire",
      summary: article.description || article.content || "Real-time market catalyst feed.",
      url: article.link,
      x: Math.min(x, 700),
      y: Math.min(y, 420),
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setIsFeedDrawerOpen(false);
    toast.success(`Pinned "${label}" to interactive visualizer!`);
  };

  // Add Custom Node
  const handleCreateCustomNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }

    const short = newLabel.trim() || newTitle.slice(0, 16);
    const newNode: VisualizerNode = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      label: short,
      category: newCategory,
      date: new Date().toISOString().split("T")[0],
      sentiment: newSentiment,
      sentimentScore: Number(newScore),
      impact: newImpact,
      status: "active",
      source: "User Research",
      summary: newSummary.trim() || "User tracked catalyst event.",
      x: 350 + (Math.random() * 80 - 40),
      y: 220 + (Math.random() * 80 - 40),
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setIsAddModalOpen(false);
    setNewTitle("");
    setNewLabel("");
    setNewSummary("");
    toast.success("Event milestone added to visualizer.");
  };

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchesSearch =
        searchQuery === "" ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.source.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSentiment =
        sentimentFilter === "All" || n.sentiment === sentimentFilter;

      return matchesSearch && matchesSentiment;
    });
  }, [nodes, searchQuery, sentimentFilter]);

  // Active selected node object
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  // Active preset object
  const activePreset = useMemo(() => {
    return STORYLINE_PRESETS.find((p) => p.id === selectedPresetId) || STORYLINE_PRESETS[0];
  }, [selectedPresetId]);

  // High Impact Count for top metrics
  const highImpactCount = useMemo(() => {
    return nodes.filter((n) => n.impact === "high" || n.status === "alert").length;
  }, [nodes]);

  // Overall Bullish Bias %
  const averageSentiment = useMemo(() => {
    if (nodes.length === 0) return 75;
    const sum = nodes.reduce((acc, curr) => acc + curr.sentimentScore, 0);
    return Math.round(sum / nodes.length);
  }, [nodes]);

  return (
    <div className="w-full flex flex-col bg-[#08080a] border border-border/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden font-sans select-none">
      
      {/* ----------------------------------------------------
          TOP HEADER BAR (Replicating Reference Image Metrics)
          "Sign in • Apple ID • iPhone 15 Pro | SCREENS 8 FLOWS 36 BUGS 1 ELAPSED 12:52"
          ---------------------------------------------------- */}
      <div className="bg-[#0e0e11] border-b border-border/70 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        
        {/* Left: Breadcrumbs / Topic context */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground truncate">
            <span className="text-primary font-bold">{activePreset.name}</span>
            <span>•</span>
            <span className="text-foreground/90 hidden xs:inline">Solana L1 Core</span>
            <span>•</span>
            <span className="text-muted-foreground/80 hidden sm:inline">Event Nexus</span>
          </div>

          {/* Preset Selector Dropdown */}
          <div className="relative inline-block ml-1">
            <select
              value={selectedPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="bg-card hover:bg-muted/60 border border-border/80 text-[10px] font-mono uppercase font-bold text-foreground py-1 px-2.5 rounded-lg focus:outline-none focus:border-primary cursor-pointer transition-colors"
            >
              {STORYLINE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Metrics line matching reference image stats exactly */}
        <div className="flex items-center gap-3 sm:gap-4 font-mono text-[11px] uppercase tracking-wider shrink-0 overflow-x-auto scrollbar-none py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">EVENTS</span>
            <span className="font-bold text-foreground bg-muted/60 px-1.5 py-0.5 rounded text-[10px]">
              {nodes.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">FLOWS</span>
            <span className="font-bold text-foreground bg-muted/60 px-1.5 py-0.5 rounded text-[10px]">
              {edges.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-rose-400 font-bold">HIGH IMPACT</span>
            <span className="font-black text-rose-500 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded text-[10px]">
              {highImpactCount}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-muted-foreground">ELAPSED</span>
            <span className="font-bold text-primary font-mono">
              {formatElapsed(elapsedSeconds)}
            </span>
          </div>
        </div>

      </div>

      {/* ----------------------------------------------------
          INTERACTION TOOLBAR
          (Connect mode, Auto-Align, +Add Node, Live Feed, Zoom)
          ---------------------------------------------------- */}
      <div className="bg-[#0b0b0e] border-b border-border/60 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
        
        {/* Left Toolbar Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Reset / Auto-Align Layout Button */}
          <button
            onClick={handleResetLayout}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-[11px] font-mono uppercase font-bold tracking-wider cursor-pointer transition-colors active:scale-95"
            title="Auto-organize and center all event milestones"
          >
            <RotateCcw className="w-3 h-3 text-primary" />
            <span>Reset Flow</span>
          </button>

          {/* Connect Mode Toggle */}
          <button
            onClick={() => {
              setIsConnectMode(!isConnectMode);
              setConnectSourceNodeId(null);
            }}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-[11px] font-mono uppercase font-bold tracking-wider cursor-pointer transition-all active:scale-95 ${
              isConnectMode
                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 ring-1 ring-primary"
                : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border"
            }`}
            title="Click two nodes to create or remove an edge"
          >
            <Link2 className="w-3 h-3" />
            <span>{isConnectMode ? "Link Mode: Active" : "Link Nodes"}</span>
          </button>

          {/* Add Custom Catalyst Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-[11px] font-mono uppercase font-bold tracking-wider cursor-pointer transition-colors active:scale-95"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            <span>Add Event</span>
          </button>

          {/* Live News Drawer Toggle */}
          <button
            onClick={() => setIsFeedDrawerOpen(true)}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-[11px] font-mono uppercase font-bold tracking-wider cursor-pointer transition-colors active:scale-95"
          >
            <Newspaper className="w-3 h-3 text-cyan-400" />
            <span className="hidden xs:inline">Live Wire</span> ({liveArticles.length || 6})
          </button>

          {/* 7-Day Sentiment Trigger */}
          {onOpenSentimentModal && (
            <button
              onClick={onOpenSentimentModal}
              className="hidden md:flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-[11px] font-mono uppercase font-bold tracking-wider cursor-pointer transition-colors active:scale-95"
            >
              <TrendingUp className="w-3 h-3 text-amber-400" />
              <span>7D Score</span>
            </button>
          )}
        </div>

        {/* Right Toolbar: Quick Search & Zoom Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Quick Search */}
          <div className="relative hidden sm:block">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter nodes..."
              className="bg-card border border-border rounded-lg pl-7 pr-2.5 py-1 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary w-28 md:w-36 transition-all"
            />
          </div>

          {/* Zoom In/Out Buttons */}
          <div className="flex items-center bg-card border border-border rounded-xl p-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.65, z - 0.1))}
              className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1.5 text-muted-foreground font-bold">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* ----------------------------------------------------
          CANVAS AREA
          (Dot Grid, SVG Bezier Connections, Interactive Draggable Pills)
          ---------------------------------------------------- */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full h-[460px] sm:h-[520px] md:h-[580px] bg-[#070709] overflow-hidden touch-none select-none cursor-crosshair"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        {/* Subtle Top-Left Ambient Glow */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Link Mode Guidance Bar */}
        <AnimatePresence>
          {isConnectMode && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-primary text-primary-foreground font-mono text-[11px] font-bold uppercase tracking-wider py-1.5 px-4 rounded-full shadow-lg flex items-center gap-2 pointer-events-none"
            >
              <Link2 className="w-3.5 h-3.5 animate-spin" />
              <span>
                {connectSourceNodeId
                  ? "Now click target node to create correlation link"
                  : "Click any starting node"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scaled/Panned Graph Inner View */}
        <div
          className="absolute inset-0 origin-top-left transition-transform duration-75 ease-out"
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            width: "100%",
            height: "100%",
          }}
        >
          {/* SVG LAYER: Curved Bezier Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
              {/* Normal Arrowhead */}
              <marker
                id="arrowhead-normal"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="rgba(255, 255, 255, 0.25)" />
              </marker>

              {/* Selected / Active Arrowhead */}
              <marker
                id="arrowhead-active"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#dc2626" />
              </marker>

              {/* Gradient for highlighted edges */}
              <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#dc2626" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Render all edges */}
            {edges.map((edge) => {
              const source = nodes.find((n) => n.id === edge.sourceId);
              const target = nodes.find((n) => n.id === edge.targetId);
              if (!source || !target) return null;

              // Node dimensions for center anchor
              const nodeWidth = 148;
              const nodeHeight = 44;

              const x1 = source.x + nodeWidth;
              const y1 = source.y + nodeHeight / 2;
              const x2 = target.x;
              const y2 = target.y + nodeHeight / 2;

              // Compute organic horizontal Bezier path
              const dx = x2 - x1;
              const cx1 = x1 + Math.max(40, dx * 0.5);
              const cy1 = y1;
              const cx2 = x2 - Math.max(40, dx * 0.5);
              const cy2 = y2;

              const isEdgeActive =
                selectedNodeId === edge.sourceId || selectedNodeId === edge.targetId;

              const strokeColor = isEdgeActive
                ? "url(#edge-gradient)"
                : edge.style === "dashed"
                ? "rgba(255, 255, 255, 0.18)"
                : "rgba(255, 255, 255, 0.28)";

              const strokeWidth = isEdgeActive ? 2.5 : 1.5;

              return (
                <g key={edge.id} className="transition-all duration-200">
                  <path
                    d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={edge.style === "dashed" ? "5 4" : undefined}
                    markerEnd={isEdgeActive ? "url(#arrowhead-active)" : "url(#arrowhead-normal)"}
                    className={isEdgeActive ? "drop-shadow-[0_0_8px_rgba(220,38,38,0.4)]" : ""}
                  />
                  {/* Subtle directional pulse dot if selected */}
                  {isEdgeActive && (
                    <circle r="3" fill="#ffffff">
                      <animateMotion
                        path={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                        dur="2.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>

          {/* INTERACTIVE DRAGGABLE NODE PILLS */}
          {filteredNodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isConnectSource = connectSourceNodeId === node.id;

            // Status dot color mapping
            const dotColor =
              node.status === "verified"
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                : node.status === "alert"
                ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"
                : node.status === "active"
                ? "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                : "bg-slate-400";

            return (
              <div
                key={node.id}
                onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                onClick={() => setSelectedNodeId(node.id)}
                style={{
                  transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
                  width: "148px",
                  height: "44px",
                }}
                className={`absolute rounded-full border px-3 py-1.5 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing transition-shadow duration-150 select-none ${
                  isSelected
                    ? "bg-[#18181b] border-primary shadow-[0_0_20px_rgba(220,38,38,0.35)] ring-2 ring-primary/80 z-20"
                    : isConnectSource
                    ? "bg-primary/20 border-primary ring-2 ring-primary z-20 animate-pulse"
                    : "bg-[#101013]/90 hover:bg-[#16161a] border-border/70 hover:border-border text-foreground z-10"
                }`}
              >
                {/* Status Dot */}
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />

                {/* Short Node Label */}
                <span className="font-mono text-xs font-bold uppercase tracking-tight text-foreground truncate flex-1 text-left">
                  {node.label}
                </span>

                {/* Sentiment Badge / Mini Icon */}
                <div className="shrink-0 flex items-center">
                  {node.sentiment === "Bullish" ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  ) : node.sentiment === "Bearish" ? (
                    <TrendingDown className="w-3 h-3 text-rose-400" />
                  ) : (
                    <Minus className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </div>
            );
          })}

          {/* FLOATING INSPECTOR CARD (Replicating BUG FOUND Inspector from Screenshot)
              Renders directly on canvas on desktop (md:) */}
          {selectedNode && (
            <div
              className="hidden md:block absolute z-30 w-80 bg-[#121216]/95 backdrop-blur-xl border border-border/90 rounded-2xl p-4 shadow-2xl transition-all duration-200"
              style={{
                // Position intelligently: right side if node is on left half, else left side
                left: selectedNode.x > 480 ? `${Math.max(20, selectedNode.x - 330)}px` : `${Math.min(540, selectedNode.x + 160)}px`,
                top: `${Math.min(320, Math.max(30, selectedNode.y - 40))}px`,
              }}
            >
              {/* Header Status Tag */}
              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-border/40">
                <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase font-black tracking-wider">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedNode.status === "alert"
                        ? "bg-rose-500 animate-pulse"
                        : selectedNode.status === "verified"
                        ? "bg-emerald-500"
                        : "bg-cyan-400"
                    }`}
                  />
                  <span
                    className={
                      selectedNode.status === "alert"
                        ? "text-rose-400"
                        : selectedNode.status === "verified"
                        ? "text-emerald-400"
                        : "text-cyan-400"
                    }
                  >
                    {selectedNode.status === "alert"
                      ? "CRITICAL CATALYST"
                      : selectedNode.status === "verified"
                      ? "VERIFIED NARRATIVE"
                      : "ACTIVE EVENT"}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Title & Headline */}
              <h4 className="font-display font-black text-xs uppercase tracking-tight text-foreground leading-snug line-clamp-2 mb-1.5">
                {selectedNode.title}
              </h4>

              {/* Meta: Source, Date, Impact */}
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-muted-foreground mb-2 flex-wrap">
                <span className="text-foreground/90 font-bold">{selectedNode.source}</span>
                <span>•</span>
                <span>{selectedNode.date}</span>
                <span>•</span>
                <span className="text-primary font-bold">
                  {selectedNode.sentimentScore}% {selectedNode.sentiment}
                </span>
              </div>

              {/* Summary text */}
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3 mb-3 bg-muted/20 p-2 rounded-xl border border-border/40 font-sans">
                {selectedNode.summary}
              </p>

              {/* Action Buttons matching reference image */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-border/40 flex-wrap">
                {selectedNode.url && (
                  <a
                    href={selectedNode.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-2 bg-muted/60 hover:bg-muted text-foreground border border-border/80 rounded-lg text-[10px] font-mono uppercase font-bold text-center flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Source</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}

                <button
                  onClick={() => handleStartConnectFromInspector(selectedNode.id)}
                  className="py-1.5 px-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-[10px] font-mono uppercase font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Link this event to another node"
                >
                  <Link2 className="w-3 h-3" />
                  <span>Connect</span>
                </button>

                <button
                  onClick={() => handleDisconnectNode(selectedNode.id)}
                  className="p-1.5 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 rounded-lg transition-colors cursor-pointer"
                  title="Disconnect all edges for this node"
                >
                  <Unlink className="w-3 h-3" />
                </button>

                <button
                  onClick={() => handleDeleteNode(selectedNode.id)}
                  className="p-1.5 bg-muted/40 hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 border border-border/60 rounded-lg transition-colors cursor-pointer ml-auto"
                  title="Remove from visualizer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ----------------------------------------------------
          MOBILE BOTTOM SHEET INSPECTOR (md:hidden)
          Smoothly slides up from bottom when a node is selected on mobile
          ---------------------------------------------------- */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-[#101014]/98 backdrop-blur-2xl border-t border-border/90 rounded-t-3xl p-4 pb-24 shadow-2xl space-y-3 font-sans"
          >
            {/* Drag Handle Bar */}
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold">
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedNode.status === "alert"
                      ? "bg-rose-500 animate-pulse"
                      : selectedNode.status === "verified"
                      ? "bg-emerald-500"
                      : "bg-cyan-400"
                  }`}
                />
                <span
                  className={
                    selectedNode.status === "alert"
                      ? "text-rose-400"
                      : selectedNode.status === "verified"
                      ? "text-emerald-400"
                      : "text-cyan-400"
                  }
                >
                  {selectedNode.status === "alert"
                    ? "CRITICAL CATALYST"
                    : selectedNode.status === "verified"
                    ? "VERIFIED NARRATIVE"
                    : "ACTIVE EVENT"}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-primary font-bold">
                  {selectedNode.sentimentScore}% {selectedNode.sentiment}
                </span>
              </div>

              <button
                onClick={() => setSelectedNodeId(null)}
                className="p-1 rounded-lg bg-muted/60 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h4 className="font-display font-black text-sm uppercase tracking-tight text-foreground leading-snug">
              {selectedNode.title}
            </h4>

            <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-3 rounded-2xl border border-border/40 font-sans max-h-24 overflow-y-auto">
              {selectedNode.summary}
            </p>

            <div className="flex items-center gap-2 pt-1">
              {selectedNode.url && (
                <a
                  href={selectedNode.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-3 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-mono uppercase font-bold text-center flex items-center justify-center gap-1.5"
                >
                  <span>Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              <button
                onClick={() => handleStartConnectFromInspector(selectedNode.id)}
                className="flex-1 py-2.5 px-3 bg-primary text-primary-foreground rounded-xl text-xs font-mono uppercase font-bold flex items-center justify-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Connect</span>
              </button>

              <button
                onClick={() => handleDeleteNode(selectedNode.id)}
                className="p-2.5 bg-muted text-muted-foreground hover:text-rose-400 border border-border rounded-xl"
                title="Remove node"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------
          BOTTOM LEGEND BAR (Directly matching Reference Image)
          "• VERIFIED • RUNNING • FAILED • MAPPED, NOT WALKED"
          ---------------------------------------------------- */}
      <div className="bg-[#0b0b0e] border-t border-border/70 px-4 py-2.5 flex items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground overflow-x-auto scrollbar-none flex-wrap">
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
            <span className="text-foreground/90 font-bold">VERIFIED / BULLISH</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.5)]" />
            <span className="text-foreground/90 font-bold">ACTIVE FLOW</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-rose-400 font-bold">CRITICAL CATALYST</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-muted-foreground" />
            <span>MAPPED NARRATIVE</span>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-muted-foreground/70">
          <span>Tip: Drag nodes to rearrange • Click 'Link Nodes' to connect</span>
        </div>
      </div>

      {/* ----------------------------------------------------
          LIVE NEWS WIRE DRAWER / POPUP
          (Allows user to pin real headlines to the visualizer map)
          ---------------------------------------------------- */}
      <AnimatePresence>
        {isFeedDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#101014] border border-border w-full max-w-xl max-h-[85vh] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Newspaper size={18} />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-sm uppercase tracking-tight text-foreground">
                      Live Market News Wire
                    </h3>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      Select any headline to inject as an interactive node on the map
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsFeedDrawerOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Articles Scroll Area */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                {liveArticles.slice(0, 12).map((art) => (
                  <div
                    key={art.article_id}
                    className="p-3 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-border/60 transition-all flex items-start justify-between gap-3 group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[9px] font-mono uppercase text-muted-foreground">
                        <span className="font-bold text-foreground/90">{art.source_name}</span>
                        <span>•</span>
                        <span className={art.sentiment === "Positive" ? "text-emerald-400" : art.sentiment === "Negative" ? "text-rose-400" : "text-slate-400"}>
                          {art.sentiment} ({Math.round(Math.abs(art.sentiment_score || 0.8) * 100)}%)
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-xs uppercase tracking-tight text-foreground leading-snug line-clamp-2">
                        {art.title}
                      </h4>
                    </div>

                    <button
                      onClick={() => handleAddArticleToMap(art)}
                      className="shrink-0 py-1.5 px-3 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Pin</span>
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------
          ADD CUSTOM NODE MODAL
          ---------------------------------------------------- */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121216] border border-border max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-black font-display uppercase tracking-tight text-foreground">
                    Add Custom Event Milestone
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    Plot a new market development on the visual correlation graph
                  </p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomNode} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground block mb-1">
                    Event Headline Title
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Visa integrates Solana settling $500M in test trials"
                    required
                    className="w-full bg-[#18181c] border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground block mb-1">
                      Short Node Pill Label
                    </label>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="e.g. Visa Trial"
                      className="w-full bg-[#18181c] border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground block mb-1">
                      Sector / Category
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full bg-[#18181c] border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs cursor-pointer"
                    >
                      <option value="Solana">Solana</option>
                      <option value="Macro">Macro</option>
                      <option value="DeFi">DeFi</option>
                      <option value="Regulation">Regulation</option>
                      <option value="Tech">Tech</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground block mb-1">
                      Sentiment
                    </label>
                    <select
                      value={newSentiment}
                      onChange={(e) => setNewSentiment(e.target.value as any)}
                      className="w-full bg-[#18181c] border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs cursor-pointer"
                    >
                      <option value="Bullish">Bullish</option>
                      <option value="Neutral">Neutral</option>
                      <option value="Bearish">Bearish</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground flex justify-between mb-1">
                      <span>NLP Score</span>
                      <span className="text-primary font-bold">{newScore}%</span>
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={newScore}
                      onChange={(e) => setNewScore(Number(e.target.value))}
                      className="w-full accent-primary h-6"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-muted-foreground block mb-1">
                    Analysis & Narrative Impact
                  </label>
                  <textarea
                    value={newSummary}
                    onChange={(e) => setNewSummary(e.target.value)}
                    placeholder="Describe how this event affects liquidity, network TPS, or institutional capital flows..."
                    rows={2}
                    className="w-full bg-[#18181c] border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl font-bold uppercase transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-bold uppercase transition-all shadow-md shadow-primary/20"
                  >
                    Plot Event
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
