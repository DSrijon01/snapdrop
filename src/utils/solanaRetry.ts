import { Connection } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";

/**
 * Executes an async Solana RPC or transaction operation with automatic retry
 * on rate limits (HTTP 429) or transient blockhash synchronization issues.
 */
export async function withSolanaRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 4,
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
                                     errorMessage.includes("transaction simulation failed") ||
                                     errorMessage.includes("block height exceeded") ||
                                     errorMessage.includes("expired");
            const isNetworkIssue = errorMessage.includes("failed to fetch") ||
                                   errorMessage.includes("err_name_not_resolved") ||
                                   errorMessage.includes("network error") ||
                                   errorMessage.includes("fetch failed") ||
                                   errorMessage.includes("connection refused");

            if ((isRateLimit || isBlockhashIssue || isNetworkIssue) && attempt <= maxRetries) {
                const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 400);
                const reason = isRateLimit ? "Rate limit (429)" : isNetworkIssue ? "Transient network/DNS drop" : "Blockhash/slot sync";
                console.warn(
                    `[Solana RPC] ${reason} detected. Retrying attempt ${attempt}/${maxRetries} in ${delay}ms...`,
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
