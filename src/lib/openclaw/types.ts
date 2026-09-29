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

export type SupportedModelId = 
  | "gpt-oss-120b" 
  | "gpt-oss-20b" 
  | "qwen-27b" 
  | "deepseek" 
  | "kimi" 
  | "openai" 
  | "groq";

export interface AIModelOption {
  id: SupportedModelId;
  name: string;
  tagline: string;
  modelCode: string;
  provider: string;
  badge: string;
  isFree: boolean;
  color: string;
}

export interface OpenClawConfig {
  activeModelId: SupportedModelId;
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
  modelId?: SupportedModelId;
  portfolio?: {
    sol: number;
    btc?: number;
    usdc?: number;
    jup?: number;
    isLiveWallet?: boolean;
    walletAddress?: string;
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
