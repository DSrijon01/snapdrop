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
 * overriding sendAndConfirm with modern blockhash-aware confirmation and maxRetries
 * to permanently eliminate Anchor's 30-second legacy timeout (confirmTransactionUsingLegacyTimeoutStrategy).
 */
export function createConfirmedProvider(connection: Connection, wallet: any): AnchorProvider {
    const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
        preflightCommitment: "confirmed",
        skipPreflight: true,
    });

    if (wallet && typeof wallet.signTransaction === "function") {
        provider.sendAndConfirm = async (tx: any, signers?: any[], opts?: any) => {
            const latestBlockhash = await connection.getLatestBlockhash("confirmed");

            let rawTx: Uint8Array;
            try {
                if (tx.version !== undefined) {
                    // VersionedTransaction
                    if (signers && signers.length > 0) {
                        tx.sign(signers);
                    }
                    const signedTx = await wallet.signTransaction(tx);
                    rawTx = signedTx.serialize();
                } else {
                    // Standard Transaction
                    tx.feePayer = tx.feePayer || wallet.publicKey;
                    tx.recentBlockhash = latestBlockhash.blockhash;
                    if (signers && signers.length > 0) {
                        for (const s of signers) {
                            tx.partialSign(s);
                        }
                    }
                    const signedTx = await wallet.signTransaction(tx);
                    rawTx = signedTx.serialize();
                }
            } catch (signErr: any) {
                const signErrStr = (
                    (signErr?.name || "") + " " +
                    (signErr?.message || "") + " " +
                    (typeof signErr === "string" ? signErr : JSON.stringify(signErr) || "")
                ).toLowerCase();

                if (signErr?.name === "WalletSignTransactionError" || signErrStr.includes("unexpected error")) {
                    throw new Error(
                        "Phantom Wallet Error: Transaction simulation failed in wallet. Your Phantom wallet is currently set to 'Testnet Mode' instead of Solana Devnet! Please switch Phantom to Solana Devnet (Phantom ⚙️ ➔ Developer Settings ➔ Change Network ➔ Solana Devnet)."
                    );
                }
                throw signErr;
            }

            const signature = await connection.sendRawTransaction(rawTx, {
                skipPreflight: true,
                maxRetries: 5,
                preflightCommitment: "confirmed",
                ...opts,
            });

            // Modern block-height-exceedance confirmation strategy instead of 30-second legacy timeout
            const confirmation = await connection.confirmTransaction(
                {
                    signature,
                    blockhash: latestBlockhash.blockhash,
                    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                },
                "confirmed"
            );

            if (confirmation.value.err) {
                throw new Error(`Transaction ${signature} failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
            }

            return signature;
        };
    }

    return provider;
}

/**
 * Parses Solana transaction errors into clear, actionable, user-friendly messages.
 * Specifically detects Phantom network mismatch (Testnet mode vs Devnet).
 */
export function parseSolanaErrorMessage(err: any): string {
    const errorStr = (
        (err?.name || "") + " " +
        (err?.message || "") + " " +
        (typeof err === "string" ? err : JSON.stringify(err) || "")
    ).toLowerCase();

    if (
        errorStr.includes("user rejected") ||
        errorStr.includes("rejected the request") ||
        errorStr.includes("transaction cancelled") ||
        errorStr.includes("user denied")
    ) {
        return "Transaction was cancelled in your wallet.";
    }

    if (
        err?.name === "WalletSignTransactionError" ||
        errorStr.includes("walletsigntransactionerror") ||
        errorStr.includes("unexpected error") ||
        errorStr.includes("testnet mode") ||
        errorStr.includes("phantom wallet error") ||
        errorStr.includes("simulation failed: unexpected error")
    ) {
        return "Phantom Wallet Network Mismatch: Your Phantom wallet is set to 'Testnet Mode' instead of Solana Devnet! Please open Phantom ➔ Settings (⚙️) ➔ Developer Settings ➔ Change Network ➔ Select 'Solana Devnet'.";
    }

    if (errorStr.includes("insufficient lamports") || errorStr.includes("insufficient funds") || errorStr.includes("0x1")) {
        return "Insufficient SOL balance in your wallet to cover the trade amount and gas fees.";
    }

    if (err?.logs && Array.isArray(err.logs) && err.logs.length > 0) {
        return `${err.message || "Transaction failed"}. Logs: ${err.logs[err.logs.length - 1]}`;
    }

    return err?.message || "Transaction failed. Please ensure your wallet is set to Solana Devnet.";
}
