/**
 * L2 Database Architecture for Street Sync
 * Modular connection layer supporting:
 * - Firebase Web Client App & RTDB (Realtime Live Chat)
 * - Cloud Firestore (Social Posting Board)
 * - Solana Ed25519 Cryptographic Wallet Verification & Custom Tokens
 */

export * from "./config";
export * from "./auth";
export * from "./chat";
export * from "./posts";
