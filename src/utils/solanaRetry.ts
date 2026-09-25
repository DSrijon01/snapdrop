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
            const errorStr = (
                (err?.name || "") + " " +
                (err?.message || "") + " " +
                (typeof err === "string" ? err : JSON.stringify(err) || "")
            ).toLowerCase();

            // 1. User rejection / cancellation MUST NEVER RETRY
            const isUserRejection = 
                err?.code === 4001 ||
                err?.name === "UserRejectedRequestError" ||
                err?.name === "WalletWindowClosedError" ||
                errorStr.includes("user rejected") ||
                errorStr.includes("rejected the request") ||
                errorStr.includes("transaction cancelled") ||
                errorStr.includes("transaction canceled") ||
                errorStr.includes("user cancelled") ||
                errorStr.includes("user canceled") ||
                errorStr.includes("user denied") ||
                errorStr.includes("cancelled by user") ||
                errorStr.includes("canceled by user") ||
                errorStr.includes("cancel") ||
                errorStr.includes("reject") ||
                errorStr.includes("denied") ||
                errorStr.includes("declined") ||
                errorStr.includes("window closed");

            if (isUserRejection) {
                throw err;
            }

            // 2. Insufficient balance MUST NEVER RETRY
            const isInsufficientFunds = 
                errorStr.includes("insufficient lamports") ||
                errorStr.includes("insufficient funds") ||
                errorStr.includes("0x1");

            if (isInsufficientFunds) {
                throw err;
            }

            // 3. Network mismatch or wrong mode MUST NEVER RETRY
            if (errorStr.includes("testnet mode") || errorStr.includes("network mismatch")) {
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
                                     errorStr.includes("block height exceeded") ||
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

                // 1. MUST check for user cancellation / rejection FIRST before any simulation check
                const isUserRejection = 
                    signErr?.code === 4001 ||
                    signErr?.name === "WalletWindowClosedError" ||
                    signErr?.name === "UserRejectedRequestError" ||
                    signErrStr.includes("user rejected") ||
                    signErrStr.includes("rejected the request") ||
                    signErrStr.includes("user cancelled") ||
                    signErrStr.includes("user canceled") ||
                    signErrStr.includes("transaction cancelled") ||
                    signErrStr.includes("transaction canceled") ||
                    signErrStr.includes("user denied") ||
                    signErrStr.includes("declined") ||
                    signErrStr.includes("window closed") ||
                    signErrStr.includes("cancel") ||
                    signErrStr.includes("reject");

                if (isUserRejection) {
                    const cancelErr = new Error("Transaction cancelled in your wallet.");
                    (cancelErr as any).name = "UserRejectedRequestError";
                    (cancelErr as any).code = 4001;
                    throw cancelErr;
                }

                // 2. Only if explicitly not user cancellation, check for phantom testnet mode issue
                if (signErrStr.includes("simulation failed: unexpected error") || (signErrStr.includes("unexpected error") && signErrStr.includes("simulation"))) {
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
 * Specifically detects user cancellations and Phantom network mismatch.
 */
export function parseSolanaErrorMessage(err: any): string {
    const errorStr = (
        (err?.name || "") + " " +
        (err?.message || "") + " " +
        (typeof err === "string" ? err : JSON.stringify(err) || "")
    ).toLowerCase();

    if (
        err?.code === 4001 ||
        err?.name === "UserRejectedRequestError" ||
        err?.name === "WalletWindowClosedError" ||
        errorStr.includes("user rejected") ||
        errorStr.includes("rejected the request") ||
        errorStr.includes("transaction cancelled") ||
        errorStr.includes("transaction canceled") ||
        errorStr.includes("user cancelled") ||
        errorStr.includes("user canceled") ||
        errorStr.includes("user denied") ||
        errorStr.includes("cancelled in your wallet") ||
        errorStr.includes("canceled in your wallet") ||
        errorStr.includes("cancelled by user") ||
        errorStr.includes("canceled by user") ||
        errorStr.includes("cancel") ||
        errorStr.includes("reject") ||
        errorStr.includes("denied") ||
        errorStr.includes("declined") ||
        errorStr.includes("window closed")
    ) {
        return "Transaction was cancelled in your wallet.";
    }

    if (
        errorStr.includes("testnet mode") ||
        errorStr.includes("phantom wallet network mismatch") ||
        (errorStr.includes("simulation failed") && errorStr.includes("unexpected error"))
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
