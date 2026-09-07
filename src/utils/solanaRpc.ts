/**
 * Dedicated high-speed Solana Devnet RPC endpoint.
 * Defaults to the configured Helius RPC to eliminate public RPC 429 rate limits.
 */
export const HELIUS_DEVNET_RPC = "https://devnet.helius-rpc.com/?api-key=7adb5466-7650-4c74-919f-5a6b9b7c01cd";

export const getSolanaRpcEndpoint = (): string => {
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
        return process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    }
    return HELIUS_DEVNET_RPC;
};
