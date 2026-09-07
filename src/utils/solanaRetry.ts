import { Connection } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";

/**
 * Executes an async Solana RPC or transaction operation with automatic retry
 * on rate limits (HTTP 429) or transient blockhash synchronization issues.
 */
export async function withSolanaRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1500
): Promise<T> {
    let attempt = 0;
    while (true) {
        try {
            return await operation();
        } catch (err: any) {
            attempt++;
            const errorMessage = (err?.message || JSON.stringify(err) || "").toLowerCase();
            const isRateLimit = errorMessage.includes("429") || 
                                errorMessage.includes("rate limit") || 
                                errorMessage.includes("too many requests");
            const isBlockhashIssue = errorMessage.includes("blockhash not found") || 
                                     errorMessage.includes("blockhash") ||
                                     errorMessage.includes("transaction simulation failed");

            if ((isRateLimit || isBlockhashIssue) && attempt <= maxRetries) {
                const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 400);
                console.warn(
                    `[Solana RPC] ${isRateLimit ? "Rate limit (429)" : "Blockhash sync"} detected. Retrying attempt ${attempt}/${maxRetries} in ${delay}ms...`,
                    err
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
            }
            throw err;
        }
    }
}

/**
 * Creates an AnchorProvider with cluster-wide 'confirmed' commitment and skipPreflight,
 * eliminating "Blockhash not found" simulation mismatches across devnet nodes.
 */
export function createConfirmedProvider(connection: Connection, wallet: any): AnchorProvider {
    return new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
        skipPreflight: true,
    });
}
