import { OpenClawConfig, OpenClawSkill, AIModelOption } from "./types";

export const DEFAULT_AI_MODELS: AIModelOption[] = [
  {
    id: "deepseek",
    name: "DeepSeek R1",
    tagline: "High-Precision Quantitative Reasoning & Math",
    modelCode: "deepseek-reasoner",
    provider: "DeepSeek AI",
    badge: "Quant King",
    isFree: true,
    color: "#00E5FF",
  },
  {
    id: "kimi",
    name: "Kimi 3",
    tagline: "Ultra Long-Context & Macro Sentiment Analysis",
    modelCode: "moonshot-v1-128k",
    provider: "Moonshot AI",
    badge: "Macro Context",
    isFree: false,
    color: "#A855F7",
  },
  {
    id: "openai",
    name: "GPT-4o Mini",
    tagline: "Fast Multi-Modal Pattern Recognition & Execution",
    modelCode: "gpt-4o-mini",
    provider: "OpenAI",
    badge: "Standard",
    isFree: false,
    color: "#22C55E",
  },
  {
    id: "groq",
    name: "Llama 3.3 (Groq)",
    tagline: "Sub-Second Ultra-Fast Open Source Inference",
    modelCode: "llama-3.3-70b-versatile",
    provider: "Groq Cloud (Free)",
    badge: "Free & Fast",
    isFree: true,
    color: "#F97316",
  },
];

export const DEFAULT_SKILLS: OpenClawSkill[] = [
  {
    id: "market-data-grounding",
    name: "Live Market Grounding Skill",
    version: "v1.4",
    category: "perception",
    description: "Fetches live price tickers, 24h change %, and volumes from public DEX & CEX APIs to eliminate model hallucinations.",
    enabled: true,
    instructions: "Always inject real-time prices for mentioned tickers (SOL, BTC, ETH, JUP, USDC). Reject historical assumptions if current price disagrees.",
    parameters: {
      refreshIntervalSeconds: 15,
      enable24hDelta: true,
      priceFeedSource: "jupiter_and_binance",
    },
    tools: ["get_token_prices", "get_24h_stats"],
    lastUpdated: "2026-09-28",
  },
  {
    id: "portfolio-rebalance-skill",
    name: "Portfolio Rebalancing & Concentration Guard",
    version: "v2.1",
    category: "risk",
    description: "Evaluates single-asset portfolio weight. Triggers rebalance advisory when an asset breaches the concentration threshold.",
    enabled: true,
    instructions: "Calculate asset concentration percentage. If any non-stablecoin asset exceeds maxConcentrationPct (default 65%), formulate a rebalance action card to trim into USDC.",
    parameters: {
      maxConcentrationPct: 65,
      suggestedTrimPct: 25,
      rebalanceTargetAsset: "USDC",
    },
    tools: ["calculate_allocation", "generate_rebalance_action"],
    lastUpdated: "2026-09-28",
  },
  {
    id: "risk-guard-skill",
    name: "RSI & Volatility Boundary Guard",
    version: "v1.8",
    category: "risk",
    description: "Monitors 14-period RSI and trailing volatility to flag overbought (>70) and oversold (<30) conditions.",
    enabled: true,
    instructions: "Flag overbought risk when RSI exceeds 70 and recommend partial profit taking. Suggest DCA accumulation when RSI drops below 30.",
    parameters: {
      rsiOverboughtThreshold: 70,
      rsiOversoldThreshold: 30,
      maxSlippageBps: 50,
    },
    tools: ["check_rsi_bounds", "enforce_max_slippage"],
    lastUpdated: "2026-09-28",
  },
  {
    id: "solana-dex-execution-skill",
    name: "Solana DEX 1-Click Execution Intent",
    version: "v2.0",
    category: "execution",
    description: "Generates atomic action cards for Jupiter/Raydium token swaps that the user can execute directly with one click.",
    enabled: true,
    instructions: "When the analysis suggests a trade, provide a concrete ActionCard with exact token amounts, target routing, and executable handler.",
    parameters: {
      defaultDex: "Jupiter v6",
      enableSimulationPreview: true,
    },
    tools: ["create_action_card", "simulate_dex_swap"],
    lastUpdated: "2026-09-28",
  },
  {
    id: "macro-sentiment-skill",
    name: "Macro & Crypto Sentiment Synthesis",
    version: "v1.2",
    category: "intelligence",
    description: "Synthesizes market narrative, funding rates, and fear & greed index to colorize tactical suggestions.",
    enabled: true,
    instructions: "Interpret market tone based on broader market dynamics and summarize the macro thesis in 1-2 sharp sentences.",
    parameters: {
      includeFearGreed: true,
      sentimentSource: "crypto_panic_feed",
    },
    tools: ["fetch_market_news", "get_funding_rates"],
    lastUpdated: "2026-09-28",
  },
];

const CONFIG_STORAGE_KEY = "openclaw_agent_config_v1";

export function getOpenClawConfig(): OpenClawConfig {
  if (typeof window === "undefined") {
    return {
      activeModelId: "deepseek",
      skills: DEFAULT_SKILLS,
      apiKeys: {},
      globalRiskLimitUsd: 10000,
    };
  }

  const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (!stored) {
    const initialConfig: OpenClawConfig = {
      activeModelId: "deepseek",
      skills: DEFAULT_SKILLS,
      apiKeys: {},
      globalRiskLimitUsd: 10000,
    };
    saveOpenClawConfig(initialConfig);
    return initialConfig;
  }

  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Error reading OpenClaw config", e);
    return {
      activeModelId: "deepseek",
      skills: DEFAULT_SKILLS,
      apiKeys: {},
      globalRiskLimitUsd: 10000,
    };
  }
}

export function saveOpenClawConfig(config: OpenClawConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function toggleSkill(skillId: string): OpenClawConfig {
  const config = getOpenClawConfig();
  config.skills = config.skills.map((s) =>
    s.id === skillId ? { ...s, enabled: !s.enabled } : s
  );
  saveOpenClawConfig(config);
  return config;
}

export function updateSkillParameter(
  skillId: string,
  paramKey: string,
  paramValue: any
): OpenClawConfig {
  const config = getOpenClawConfig();
  config.skills = config.skills.map((s) => {
    if (s.id === skillId) {
      return {
        ...s,
        parameters: { ...s.parameters, [paramKey]: paramValue },
        lastUpdated: new Date().toISOString().split("T")[0],
      };
    }
    return s;
  });
  saveOpenClawConfig(config);
  return config;
}

export function addCustomSkill(newSkill: OpenClawSkill): OpenClawConfig {
  const config = getOpenClawConfig();
  config.skills.push({
    ...newSkill,
    id: newSkill.id || `custom-skill-${Date.now()}`,
    lastUpdated: new Date().toISOString().split("T")[0],
  });
  saveOpenClawConfig(config);
  return config;
}

export function deleteSkill(skillId: string): OpenClawConfig {
  const config = getOpenClawConfig();
  config.skills = config.skills.filter((s) => s.id !== skillId);
  saveOpenClawConfig(config);
  return config;
}

export function resetSkillsToDefault(): OpenClawConfig {
  const config: OpenClawConfig = {
    activeModelId: "deepseek",
    skills: DEFAULT_SKILLS,
    apiKeys: getOpenClawConfig().apiKeys,
    globalRiskLimitUsd: 10000,
  };
  saveOpenClawConfig(config);
  return config;
}
