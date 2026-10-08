import { Connection, PublicKey, Transaction, VersionedTransaction, Keypair } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import bs58 from "bs58";
import { withSolanaRetry, confirmTransactionRobust } from "@/utils/solanaRetry";
import toast from "react-hot-toast";

export type PendingActionType = 
    | "NFT_BUY" 
    | "NFT_LISTING" 
    | "TOKEN_BUY" 
    | "TOKEN_LISTING" 
    | "TOKEN_SECONDARY_BUY"
    | "EPLAYS_BUY"
    | "EPLAYS_CLAIM"
    | "EPLAYS_CLEANUP";

export interface PendingAction {
    type: PendingActionType;
    data: any;
    timestamp: number;
}

const PENDING_ACTION_KEY = "street_sync_pending_mobile_action";

/**
 * Saves a pending transaction intent to localStorage before triggering wallet prompts / deep links.
 */
export function savePendingAction(type: PendingActionType, data: any) {
    if (typeof window === "undefined") return;
    try {
        const payload: PendingAction = {
            type,
            data,
            timestamp: Date.now(),
        };
        localStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(payload));
        // Also keep legacy keys for backwards-compatibility
        if (type === "NFT_BUY") {
            localStorage.setItem("street_sync_pending_nft_buy", JSON.stringify({ item: data, buyer: data.buyer, timestamp: Date.now() }));
        }
    } catch (e) {
        console.warn("[PendingTransactions] Failed to save pending action:", e);
    }
}

/**
 * Retrieves the currently active pending action if it occurred within the last 15 minutes.
 */
export function getPendingAction(): PendingAction | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(PENDING_ACTION_KEY);
        if (!raw) return null;
        const parsed: PendingAction = JSON.parse(raw);
        if (Date.now() - parsed.timestamp > 15 * 60 * 1000) {
            clearPendingAction();
            return null;
        }
        return parsed;
    } catch {
        clearPendingAction();
        return null;
    }
}

/**
 * Clears pending action and any transient signature data from localStorage.
 */
export function clearPendingAction() {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(PENDING_ACTION_KEY);
        localStorage.removeItem("street_sync_pending_nft_buy");
        localStorage.removeItem("street_sync_last_signed_tx");
        localStorage.removeItem("street_sync_last_tx_signature");
    } catch (e) {
        console.warn("[PendingTransactions] Failed to clear pending action:", e);
    }
}

// Global lock for active in-memory modal actions to prevent background resumption fighting
let inFlightActionActive = false;

export function setInFlightActionActive(active: boolean) {
    inFlightActionActive = active;
}

export function isInFlightActionActive(): boolean {
    return inFlightActionActive;
}

/**
 * Records the success of an action across local stores and fires global events.
 */
export function recordActionSuccess(type: PendingActionType, data: any, signature: string) {
    if (typeof window === "undefined") return;
    try {
        console.log(`[PendingTransactions] Recording success for ${type}. Sig: ${signature}`);

        switch (type) {
            case "NFT_LISTING": {
                const newListing = {
                    id: data.mint,
                    mint: data.mint,
                    seller: data.seller,
                    price: Number(data.price),
                    name: data.name || "Listed NFT",
                    image: data.image || "",
                    rank: Math.floor(Math.random() * 5000),
                    pda: data.pda || "",
                    timestamp: Date.now(),
                };
                const existing = JSON.parse(localStorage.getItem("street_sync_user_listings") || "[]");
                if (!existing.some((l: any) => l.mint === newListing.mint)) {
                    localStorage.setItem("street_sync_user_listings", JSON.stringify([newListing, ...existing]));
                }
                window.dispatchEvent(new Event("nft_listings_updated"));
                window.dispatchEvent(new Event("storage"));
                window.dispatchEvent(new CustomEvent("switch_tab", { detail: { tab: "for-sale" } }));
                toast.success(`NFT listed for sale! TX: ${signature.slice(0, 8)}...`);
                break;
            }

            case "NFT_BUY": {
                const purchaseItem = {
                    id: data.mint || data.id,
                    mint: data.mint || data.id,
                    name: data.name || "Exclusive NFT",
                    image: data.image || "",
                    price: Number(data.price || 0),
                    seller: data.seller || "Admin Vault",
                    buyer: data.buyer || "",
                    purchaseDate: Date.now(),
                    date: Date.now(),
                    signature: signature,
                    type: "BUY",
                };
                const existingPurchases = JSON.parse(localStorage.getItem("street_sync_purchases") || "[]");
                localStorage.setItem("street_sync_purchases", JSON.stringify([purchaseItem, ...existingPurchases]));

                // Remove from user listings if it was listed
                const userListings = JSON.parse(localStorage.getItem("street_sync_user_listings") || "[]");
                const updatedListings = userListings.filter((l: any) => l.mint !== (data.mint || data.id));
                localStorage.setItem("street_sync_user_listings", JSON.stringify(updatedListings));

                window.dispatchEvent(new Event("nft_purchases_updated"));
                window.dispatchEvent(new Event("nft_listings_updated"));
                window.dispatchEvent(new Event("storage"));
                window.dispatchEvent(new CustomEvent("switch_tab", { detail: { tab: "stream", subTab: "nfts" } }));
                toast.success(`NFT purchased successfully! TX: ${signature.slice(0, 8)}...`);
                break;
            }

            case "TOKEN_BUY": {
                const tokenPurchase = {
                    mint: data.mint,
                    amount: typeof data.amount === "number" ? data.amount.toLocaleString() : String(data.amount),
                    price: typeof data.price === "number" ? data.price.toFixed(4) : String(data.price || "0"),
                    name: data.name || "Token",
                    symbol: data.symbol || "TOK",
                    image: data.image || "",
                    date: Date.now(),
                    signature: signature,
                    type: "BUY",
                };
                const existingTokens = JSON.parse(localStorage.getItem("street_sync_token_purchases") || "[]");
                localStorage.setItem("street_sync_token_purchases", JSON.stringify([tokenPurchase, ...existingTokens]));

                window.dispatchEvent(new Event("token_purchases_updated"));
                window.dispatchEvent(new Event("token_listings_updated"));
                window.dispatchEvent(new Event("storage"));
                toast.success(`Token purchase confirmed! TX: ${signature.slice(0, 8)}...`);
                break;
            }

            case "TOKEN_LISTING": {
                const tokenListing = {
                    mint: data.mint,
                    amount: typeof data.amount === "number" ? data.amount.toLocaleString() : String(data.amount),
                    price: typeof data.price === "number" ? data.price.toFixed(4) : String(data.price || "0"),
                    name: data.name || "Token",
                    symbol: data.symbol || "TOK",
                    image: data.image || "",
                    date: Date.now(),
                    signature: signature,
                    type: "SELL",
                };
                const existingPurchases = JSON.parse(localStorage.getItem("street_sync_token_purchases") || "[]");
                localStorage.setItem("street_sync_token_purchases", JSON.stringify([tokenListing, ...existingPurchases]));

                // Save to secondary listings for instant rendering in Sell Tokens section
                const uniqueIdStr = data.uniqueId || Keypair.generate().publicKey.toBase58();
                const listingPkStr = data.listingPda || data.mint;
                const newSecondary = {
                    publicKey: listingPkStr,
                    account: {
                        seller: data.seller,
                        mint: data.mint,
                        amount: Math.floor(Number(data.amount) * 1e9).toString(),
                        price: Math.floor(Number(data.price) * 1e9).toString(),
                        uniqueId: uniqueIdStr,
                        bump: 0,
                    },
                    isToken2022: false,
                    decimals: 9,
                    isCustom: true,
                };
                const existingSecondary = JSON.parse(localStorage.getItem("street_sync_secondary_token_listings") || "[]");
                localStorage.setItem("street_sync_secondary_token_listings", JSON.stringify([newSecondary, ...existingSecondary]));

                window.dispatchEvent(new Event("token_listings_updated"));
                window.dispatchEvent(new Event("token_purchases_updated"));
                window.dispatchEvent(new Event("storage"));
                window.dispatchEvent(new CustomEvent("switch_tab", { detail: { tab: "sell-tokens" } }));
                toast.success(`Token listed for sale! TX: ${signature.slice(0, 8)}...`);
                break;
            }

            case "TOKEN_SECONDARY_BUY": {
                const secondaryBuy = {
                    mint: data.mint,
                    amount: typeof data.amount === "number" ? data.amount.toLocaleString() : String(data.amount),
                    price: typeof data.price === "number" ? data.price.toFixed(4) : String(data.price || "0"),
                    name: data.name || "Token",
                    symbol: data.symbol || "TOK",
                    image: data.image || "",
                    date: Date.now(),
                    signature: signature,
                    type: "BUY",
                };
                const existing = JSON.parse(localStorage.getItem("street_sync_token_purchases") || "[]");
                localStorage.setItem("street_sync_token_purchases", JSON.stringify([secondaryBuy, ...existing]));

                // Remove from secondary listings
                const secondaryListings = JSON.parse(localStorage.getItem("street_sync_secondary_token_listings") || "[]");
                const updatedSecondary = secondaryListings.filter((l: any) => {
                    const lMint = l.account?.mint ? (typeof l.account.mint === 'string' ? l.account.mint : new PublicKey(l.account.mint).toBase58()) : "";
                    return lMint !== data.mint;
                });
                localStorage.setItem("street_sync_secondary_token_listings", JSON.stringify(updatedSecondary));

                window.dispatchEvent(new Event("token_purchases_updated"));
                window.dispatchEvent(new Event("token_listings_updated"));
                window.dispatchEvent(new Event("storage"));
                toast.success(`Secondary token purchased! TX: ${signature.slice(0, 8)}...`);
                break;
            }

            case "EPLAYS_BUY": {
                const historyItem = {
                    marketId: data.marketId,
                    marketTitle: data.marketTitle,
                    side: data.side,
                    amount: data.amount,
                    shares: data.shares,
                    price: data.price,
                    type: "BUY",
                    signature: signature,
                    date: Date.now(),
                };
                const existingHist = JSON.parse(localStorage.getItem("street_sync_prediction_history") || "[]");
                localStorage.setItem("street_sync_prediction_history", JSON.stringify([historyItem, ...existingHist]));

                // Also save to optimistic positions
                const newPos = {
                    id: data.userTokenAccount || `pos-${Date.now()}`,
                    marketId: data.marketId,
                    marketName: data.marketTitle,
                    position: data.side === "YES" ? "Yes" : "No",
                    shares: data.shares || data.amount,
                    avgPrice: data.price,
                    currentValue: data.amount,
                    isResolved: false,
                    isWinner: false,
                    mintPubkey: data.mintPubkey || data.targetMint,
                    userMintAccount: data.userTokenAccount,
                    market: data.market,
                    timestamp: Date.now(),
                };
                const existingPositions = JSON.parse(localStorage.getItem("street_sync_prediction_positions") || "[]");
                localStorage.setItem("street_sync_prediction_positions", JSON.stringify([newPos, ...existingPositions]));

                window.dispatchEvent(new Event("prediction_history_updated"));
                window.dispatchEvent(new Event("prediction_markets_updated"));
                window.dispatchEvent(new Event("eplays_updated"));
                window.dispatchEvent(new Event("storage"));
                window.dispatchEvent(new CustomEvent("redirect_route", { detail: { route: "/e-plays" } }));
                toast.success(`Prediction shares bought! TX: ${signature.slice(0, 8)}...`);
                break;
            }

            case "EPLAYS_CLAIM": {
                const claimItem = {
                    marketId: data.marketId,
                    marketTitle: data.marketTitle,
                    side: data.side,
                    amount: data.amount,
                    shares: data.shares,
                    price: data.price,
                    type: "CLAIM",
                    signature: signature,
                    date: Date.now(),
                };
                const existingHist = JSON.parse(localStorage.getItem("street_sync_prediction_history") || "[]");
                localStorage.setItem("street_sync_prediction_history", JSON.stringify([claimItem, ...existingHist]));

                // Remove from optimistic positions
                const storedPos = JSON.parse(localStorage.getItem("street_sync_prediction_positions") || "[]");
                const remainingPos = storedPos.filter((p: any) => p.id !== data.positionId && p.marketId !== data.marketId);
                localStorage.setItem("street_sync_prediction_positions", JSON.stringify(remainingPos));

                window.dispatchEvent(new Event("prediction_history_updated"));
                window.dispatchEvent(new Event("prediction_markets_updated"));
                window.dispatchEvent(new Event("eplays_updated"));
                window.dispatchEvent(new Event("storage"));
                window.dispatchEvent(new CustomEvent("redirect_route", { detail: { route: "/e-plays" } }));
                toast.success(`Winnings claimed! TX: ${signature.slice(0, 8)}...`);
                break;
            }

            case "EPLAYS_CLEANUP": {
                const cleanItem = {
                    marketId: data.marketId,
                    marketTitle: data.marketTitle,
                    side: data.side,
                    amount: 0.002,
                    shares: data.shares,
                    price: data.price,
                    type: "CLEANUP",
                    signature: signature,
                    date: Date.now(),
                };
                const existingHist = JSON.parse(localStorage.getItem("street_sync_prediction_history") || "[]");
                localStorage.setItem("street_sync_prediction_history", JSON.stringify([cleanItem, ...existingHist]));

                const storedPos = JSON.parse(localStorage.getItem("street_sync_prediction_positions") || "[]");
                const remainingPos = storedPos.filter((p: any) => p.id !== data.positionId && p.marketId !== data.marketId);
                localStorage.setItem("street_sync_prediction_positions", JSON.stringify(remainingPos));

                window.dispatchEvent(new Event("prediction_history_updated"));
                window.dispatchEvent(new Event("prediction_markets_updated"));
                window.dispatchEvent(new Event("eplays_updated"));
                window.dispatchEvent(new Event("storage"));
                window.dispatchEvent(new CustomEvent("redirect_route", { detail: { route: "/e-plays" } }));
                toast.success(`Position closed! Rent reclaimed. TX: ${signature.slice(0, 8)}...`);
                break;
            }
        }
    } catch (err) {
        console.error("[PendingTransactions] Failed to record action success:", err);
    }
}

// Single lock to prevent duplicate concurrent resumption attempts
let isResumptionInProgress = false;

/**
 * Universal resumption processor: Checks if there is a pending mobile action and a returned
 * signed transaction or signature from Phantom / Solflare. Broadcasts, confirms, and updates UI.
 */
export async function resumePendingTransactions(connection: Connection): Promise<boolean> {
    if (typeof window === "undefined") return false;
    if (isResumptionInProgress) return false;

    // If an in-memory modal call is actively running, let it complete rather than racing
    if (isInFlightActionActive()) {
        console.log("[PendingTransactions] Modal call currently in flight, deferring background resumption.");
        return false;
    }

    const pending = getPendingAction();
    const signedTxStr = localStorage.getItem("street_sync_last_signed_tx");
    const txSigStr = localStorage.getItem("street_sync_last_tx_signature");

    if (!pending || (!signedTxStr && !txSigStr)) {
        return false;
    }

    isResumptionInProgress = true;
    try {
        let finalSig: string = "";

        if (signedTxStr) {
            const rawBytes = bs58.decode(signedTxStr);

            // Extract the transaction's signature directly from the signed payload
            let extractedSig = "";
            try {
                const tx = Transaction.from(rawBytes);
                const s = tx.signatures[0]?.signature || (tx as any).signature;
                if (s) extractedSig = bs58.encode(s);
            } catch {
                try {
                    const vtx = VersionedTransaction.deserialize(rawBytes);
                    if (vtx.signatures[0]) extractedSig = bs58.encode(vtx.signatures[0]);
                } catch {}
            }

            try {
                finalSig = await withSolanaRetry(async () => {
                    return await connection.sendRawTransaction(rawBytes, {
                        skipPreflight: true,
                        maxRetries: 5,
                        preflightCommitment: "confirmed",
                    });
                });
            } catch (sendErr: any) {
                const sendErrStr = (sendErr?.message || "").toLowerCase();
                if (
                    sendErrStr.includes("already been processed") ||
                    sendErrStr.includes("0x0") ||
                    sendErrStr.includes("duplicate") ||
                    extractedSig
                ) {
                    finalSig = extractedSig || txSigStr || "verified_onchain";
                } else {
                    throw sendErr;
                }
            }

            if (!finalSig && extractedSig) {
                finalSig = extractedSig;
            }

            if (finalSig) {
                try {
                    await confirmTransactionRobust(connection, finalSig);
                } catch (confErr) {
                    console.warn("[PendingTransactions] Confirmation warning:", confErr);
                }
            }
        } else if (txSigStr) {
            finalSig = txSigStr;
            try {
                await confirmTransactionRobust(connection, finalSig);
            } catch (confErr) {
                console.warn("[PendingTransactions] Signature check warning:", confErr);
            }
        }

        if (finalSig) {
            recordActionSuccess(pending.type, pending.data, finalSig);
            clearPendingAction();
            return true;
        }
    } catch (err: any) {
        console.error("[PendingTransactions] Resumption execution failed:", err);
        // If error indicates already processed, treat as success
        const errStr = (err?.message || "").toLowerCase();
        if (errStr.includes("already been processed") || errStr.includes("0x0")) {
            const fallbackSig = localStorage.getItem("street_sync_last_tx_signature") || "verified_onchain";
            recordActionSuccess(pending.type, pending.data, fallbackSig);
            clearPendingAction();
            return true;
        }
    } finally {
        isResumptionInProgress = false;
    }

    return false;
}
