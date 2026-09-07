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
            const errorStr = (
                (err?.name || "") + " " +
                (err?.message || "") + " " +
                (typeof err === "string" ? err : JSON.stringify(err) || "")
            ).toLowerCase();

            const isUserRejection = errorStr.includes("user rejected") ||
                                    errorStr.includes("rejected the request") ||
                                    errorStr.includes("transaction cancelled") ||
                                    errorStr.includes("user denied");
            if (isUserRejection) {
                throw err;
            }

            const isTimeout = errorStr.includes("not confirmed in") || 
                              errorStr.includes("transactionexpiredtimeouterror");

            // Prevent infinite or lengthy timeout loops
            if (isTimeout && attempt > 1) {
                throw err;
            }

            const isRateLimit = errorStr.includes("429") || 
                                errorStr.includes("rate limit") || 
                                errorStr.includes("too many requests");
            const isBlockhashIssue = errorStr.includes("blockhash not found") || 
                                     errorStr.includes("blockhash") ||
                                     errorStr.includes("transaction simulation failed") ||
                                     errorStr.includes("block height exceeded") ||
                                     errorStr.includes("expired") ||
                                     isTimeout;
            const isNetworkIssue = errorStr.includes("failed to fetch") ||
                                   errorStr.includes("err_name_not_resolved") ||
                                   errorStr.includes("network error") ||
                                   errorStr.includes("fetch failed") ||
                                   errorStr.includes("connection refused");

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
