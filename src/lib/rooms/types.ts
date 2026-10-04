import { ChatMessage } from "@/components/features/sessions/mockData";

export interface ChatRoom {
  id: string;
  name: string;
  topic?: string;
  creator: string; // Wallet public key or username
  creatorShort: string;
  createdAt: number; // Timestamp in ms
  durationMinutes: number; // Initial duration (default 10)
  expiresAt: number; // Expiry timestamp in ms (Infinity for global wall)
  isGlobal?: boolean;
  totalExtensions: number; // Count of 1-hour extensions applied
  extensionCostSol: number; // 0.0001 SOL
  messages: ChatMessage[];
  participantsCount: number;
  scope?: "sessions" | "prediction-market";
  contextId?: string; // Optional market ID or ticker for prediction markets
}

export interface RoomTimeRemaining {
  totalSeconds: number;
  minutes: number;
  seconds: number;
  formatted: string;
  isExpired: boolean;
  isExpiringSoon: boolean; // < 2 minutes
  percentRemaining: number; // 0 to 100
}
