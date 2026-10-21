import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { db } from "@/lib/l2database/config";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Subscription, SubscriptionPlanId, SUBSCRIPTION_PLANS, MODULE_NAMES } from "@/context/SubscriptionContext";

export const MERCHANT_WALLET = "9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu";
export const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/**
 * Creates an on-chain Solana Memo instruction that permanently records the subscription details
 * in the transaction history so it can be recovered across any browser or device.
 */
export function createSubscriptionMemoInstruction(
  payer: PublicKey,
  moduleId: string,
  planId: SubscriptionPlanId,
  expiresAt: number
): TransactionInstruction {
  const memoText = `SS_SUB:${moduleId}:${planId}:${expiresAt}`;
  return new TransactionInstruction({
    keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memoText, "utf-8"),
  });
}

/**
 * Asynchronously synchronizes and verifies subscription records for a connected wallet
 * across on-chain Solana transactions, Firebase Firestore, and local storage.
 */
export async function syncWalletSubscriptions(
  connection: Connection,
  walletPublicKey: PublicKey
): Promise<Record<string, Subscription>> {
  const walletKey = walletPublicKey.toBase58();
  const now = Date.now();
  const resolvedSubs: Record<string, Subscription> = {};

  // 1. If connected wallet is the platform merchant / admin, grant full Pro access
  if (walletKey === MERCHANT_WALLET) {
    const oneYearFromNow = now + 365 * 24 * 60 * 60 * 1000;
    Object.keys(MODULE_NAMES).forEach((moduleId) => {
      resolvedSubs[moduleId] = {
        moduleId,
        isSubscribed: true,
        expiresAt: oneYearFromNow,
        isCancelled: false,
        txSignature: "admin_platform_wallet",
        planId: "30days",
      };
      try {
        localStorage.setItem(
          `street_sync_sub_${walletKey}_${moduleId}`,
          JSON.stringify(resolvedSubs[moduleId])
        );
      } catch (e) {
        console.warn("Storage write note:", e);
      }
    });
    return resolvedSubs;
  }

  // 2. Check Firestore for cross-browser shared subscription state
  try {
    const subsRef = collection(db, "subscriptions");
    const q = query(subsRef, where("walletAddress", "==", walletKey));
    const snapshot = await getDocs(q);

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.moduleId && data.expiresAt && data.expiresAt > now) {
        resolvedSubs[data.moduleId] = {
          moduleId: data.moduleId,
          isSubscribed: true,
          expiresAt: data.expiresAt,
          isCancelled: Boolean(data.isCancelled),
          txSignature: data.txSignature || null,
          planId: data.planId || "30days",
        };
        try {
          localStorage.setItem(
            `street_sync_sub_${walletKey}_${data.moduleId}`,
            JSON.stringify(resolvedSubs[data.moduleId])
          );
        } catch (e) {
          // ignore storage error
        }
      }
    });
  } catch (firestoreErr) {
    console.warn("[syncWalletSubscriptions] Firestore query note:", firestoreErr);
  }

  // 3. Verify on-chain transactions directly from Solana RPC via Memo & signatures
  try {
    const signatures = await connection.getSignaturesForAddress(walletPublicKey, { limit: 25 });

    for (const sigInfo of signatures) {
      if (sigInfo.err) continue;

      // Check if signature contains an on-chain Memo
      if (sigInfo.memo && typeof sigInfo.memo === "string") {
        // Solana RPC returns memo prefixed with length, e.g., "[42] SS_SUB:snbl:30days:1795180000000"
        const cleanMemo = sigInfo.memo.replace(/^\[\d+\]\s*/, "").trim();

        if (cleanMemo.startsWith("SS_SUB:") || cleanMemo.startsWith("STREETSYNC_SUB:")) {
          const parts = cleanMemo.split(":");
          if (parts.length >= 4) {
            const modId = parts[1];
            const planId = parts[2] as SubscriptionPlanId;
            const expiresAt = Number(parts[3]);

            if (expiresAt && expiresAt > now && (!resolvedSubs[modId] || (resolvedSubs[modId].expiresAt || 0) < expiresAt)) {
              const subObj: Subscription = {
                moduleId: modId,
                isSubscribed: true,
                expiresAt,
                isCancelled: false,
                txSignature: sigInfo.signature,
                planId,
              };

              resolvedSubs[modId] = subObj;

              try {
                localStorage.setItem(`street_sync_sub_${walletKey}_${modId}`, JSON.stringify(subObj));
              } catch (e) {
                // ignore
              }

              // Also persist to Firestore to speed up other browsers
              try {
                await setDoc(doc(db, "subscriptions", `${walletKey}_${modId}`), {
                  walletAddress: walletKey,
                  moduleId: modId,
                  planId,
                  expiresAt,
                  txSignature: sigInfo.signature,
                  updatedAt: now,
                });
              } catch (fsSyncErr) {
                console.warn("[syncWalletSubscriptions] Background Firestore persist note:", fsSyncErr);
              }
            }
          }
        }
      }
    }
  } catch (onChainErr) {
    console.warn("[syncWalletSubscriptions] On-chain signature inspection note:", onChainErr);
  }

  return resolvedSubs;
}
