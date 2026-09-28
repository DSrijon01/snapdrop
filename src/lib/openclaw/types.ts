export interface OpenClawSkill {
  id: string;
  name: string;
  version: string;
  category: "perception" | "execution" | "risk" | "intelligence";
  description: string;
  enabled: boolean;
  instructions: string;
  parameters: Record<string, number | string | boolean>;
  tools: string[];
  lastUpdated?: string;
}

export interface AIModelOption {
  id: "deepseek" | "kimi" | "openai" | "groq";
  name: string;
  tagline: string;
  modelCode: string;
  provider: string;
  badge: string;
  isFree: boolean;
  color: string;
}

export interface OpenClawConfig {
  activeModelId: "deepseek" | "kimi" | "openai" | "groq";
  skills: OpenClawSkill[];
  apiKeys: {
    openai?: string;
    deepseek?: string;
    kimi?: string;
    groq?: string;
    openrouter?: string;
  };
  globalRiskLimitUsd: number;
}

export interface OpenClawChatRequest {
  message: string;
  modelId?: "deepseek" | "kimi" | "openai" | "groq";
  portfolio?: {
    sol: number;
    btc: number;
    usdc: number;
  };
  activeSkillIds?: string[];
}

export interface OpenClawChatResponse {
  text: string;
  modelUsed: string;
  skillsTriggered: string[];
  assetPills?: Array<{
    ticker: string;
    name: string;
    price: number;
    change24h: number;
    description?: string;
    logoBg?: string;
  }>;
  sparklineData?: {
    prices: number[];
    isBullish: boolean;
    label?: string;
  };
  allocationData?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  actionCard?: {
    suggestedMove: string;
    primaryText: string;
    secondaryText: string;
    onPrimaryAction: string;
  };
}
