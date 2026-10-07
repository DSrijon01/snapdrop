"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SystemProgram, Transaction, PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import toast from "react-hot-toast";
import bs58 from "bs58";
import { checkSolBalance } from "@/utils/balanceCheck";
import { withSolanaRetry, confirmTransactionRobust } from "@/utils/solanaRetry";

const MERCHANT_WALLET = "9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu";

export type SubscriptionPlanId = "1day" | "7days" | "30days";

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  durationDays: number;
  priceSol: number;
  lamports: number;
  description: string;
  badge?: string;
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlan> = {
  "1day": {
    id: "1day",
    name: "1 Day Pass",
    durationDays: 1,
    priceSol: 0.1,
    lamports: 100_000_000,
    description: "Instant 24h Pro feature access",
    badge: "Quick Access",
  },
  "7days": {
    id: "7days",
    name: "7 Days Pass",
    durationDays: 7,
    priceSol: 0.5,
    lamports: 500_000_000,
    description: "Weekly power-user pass",
    badge: "Most Flexible",
  },
  "30days": {
    id: "30days",
    name: "30 Days Pro",
    durationDays: 30,
    priceSol: 1.0,
    lamports: 1_000_000_000,
    description: "Full monthly unconstrained access",
    badge: "Best Value",
    popular: true,
  },
};

export interface Subscription {
  moduleId: string;
  isSubscribed: boolean;
  expiresAt: number | null;
  isCancelled: boolean;
  txSignature: string | null;
  planId?: SubscriptionPlanId;
}

export interface SubscriptionContextType {
  subscriptions: Record<string, Subscription>;
  loading: boolean;
  subscribe: (moduleId: string, planId?: SubscriptionPlanId) => Promise<boolean>;
  cancelSubscription: (moduleId: string) => Promise<boolean>;
  hasAccess: (moduleId: string) => boolean;
  showModal: boolean;
  activeModuleId: string | null;
  openSubscriptionModal: (moduleId: string) => void;
  closeSubscriptionModal: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const MODULE_NAMES: Record<string, string> = {
  "e-plays": "E-Plays",
  "market-data": "Market Data",
  "market-news": "Market News",
  "ss-scan": "SS Scan",
  "openclaw": "SS Terminal",
  "snbl": "SS Staking",
  "sessions": "Sessions Board",
};

// Helper to safely write to localStorage, clearing oversized simulated feed logs if quota is full
const safeLocalStorageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (error: any) {
    if (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22
    ) {
      console.warn("Storage quota exceeded! Clearing non-essential sessions feed cache to free space...");
      try {
        localStorage.removeItem("sessions_posts");
        localStorage.removeItem("sessions_chat");
        localStorage.setItem(key, value);
        console.log("Successfully wrote subscription after clearing cache.");
      } catch (retryError) {
        console.error("Critical storage write failure even after pruning sessions feed cache:", retryError);
        // Absolute fallback: Clear all items except other subscriptions
        try {
          const keys = Object.keys(localStorage);
          keys.forEach((k) => {
            if (!k.startsWith("street_sync_sub_")) {
              localStorage.removeItem(k);
            }
          });
          localStorage.setItem(key, value);
        } catch (e) {
          throw retryError;
        }
      }
    } else {
      throw error;
    }
  }
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction, wallet } = useWallet();
  const [subscriptions, setSubscriptions] = useState<Record<string, Subscription>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  const isDemo = wallet?.adapter.name === 'Street Sync Demo';

  // In-memory cache to eliminate loading flash on route changes
  const walletSubCache = React.useRef<Record<string, Record<string, Subscription>>>({});

  // Load subscriptions for the active wallet
  const loadSubscriptions = useCallback(() => {
    if (!publicKey) {
      setSubscriptions({});
      setLoading(false);
      return;
    }

    const walletKey = publicKey.toBase58();
    const cached = walletSubCache.current[walletKey];
    if (cached) {
      setSubscriptions(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const loadedSubs: Record<string, Subscription> = {};

    Object.keys(MODULE_NAMES).forEach((moduleId) => {
      try {
        const stored = localStorage.getItem(`street_sync_sub_${walletKey}_${moduleId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          const now = Date.now();
          if (parsed.expiresAt && now > parsed.expiresAt) {
            loadedSubs[moduleId] = {
              moduleId,
              isSubscribed: false,
              expiresAt: null,
              isCancelled: false,
              txSignature: null,
              planId: parsed.planId,
            };
            localStorage.removeItem(`street_sync_sub_${walletKey}_${moduleId}`);
          } else {
            loadedSubs[moduleId] = parsed;
          }
        } else {
          loadedSubs[moduleId] = {
            moduleId,
            isSubscribed: false,
            expiresAt: null,
            isCancelled: false,
            txSignature: null,
          };
        }
      } catch (e) {
        console.error(`Failed to load subscription for ${moduleId}:`, e);
      }
    });

    walletSubCache.current[walletKey] = loadedSubs;
    setSubscriptions(loadedSubs);
    setLoading(false);
  }, [publicKey]);

  // Sync state on mount or wallet connect
  useEffect(() => {
    // Proactively clear oversized session log items if they are bloated
    try {
      const postsStr = localStorage.getItem("sessions_posts");
      if (postsStr && postsStr.length > 30000) {
        console.log("Proactively clearing oversized sessions_posts on mount");
        localStorage.removeItem("sessions_posts");
      }
      const chatStr = localStorage.getItem("sessions_chat");
      if (chatStr && chatStr.length > 10000) {
        localStorage.removeItem("sessions_chat");
      }
    } catch (e) {
      console.warn("Storage check skipped:", e);
    }
    loadSubscriptions();
  }, [loadSubscriptions]);

  // Lock to prevent concurrent execution between active subscribe() call and phantom_mobile_tx_signed listener
  const isSubscribingRef = React.useRef(false);

  // Resumption handler: Detects return from mobile wallet redirect when page reloaded or resumed
  useEffect(() => {
    const handlePendingMobileSubscription = async () => {
      if (typeof window === "undefined") return;
      // If user is currently running the in-memory subscribe() call, let that call handle it
      if (isSubscribingRef.current) return;

      const rawPending = localStorage.getItem("street_sync_pending_subscription");
      const signedTxStr = localStorage.getItem("street_sync_last_signed_tx");
      const txSigStr = localStorage.getItem("street_sync_last_tx_signature");

      if (!rawPending || (!signedTxStr && !txSigStr)) return;

      let pendingAction: any;
      try {
        pendingAction = JSON.parse(rawPending);
      } catch {
        localStorage.removeItem("street_sync_pending_subscription");
        return;
      }

      // Check freshness (within 10 minutes)
      if (Date.now() - pendingAction.timestamp > 10 * 60 * 1000) {
        localStorage.removeItem("street_sync_pending_subscription");
        localStorage.removeItem("street_sync_last_signed_tx");
        localStorage.removeItem("street_sync_last_tx_signature");
        return;
      }

      const toastId = toast.loading(`Confirming ${pendingAction.planName || "Pro"} subscription on Solana...`);
      try {
        let signature = txSigStr;
        if (!signature && signedTxStr) {
          const rawBytes = bs58.decode(signedTxStr);
          try {
            signature = await withSolanaRetry(async () => {
              return await connection.sendRawTransaction(rawBytes, {
                skipPreflight: true,
                maxRetries: 5,
                preflightCommitment: "confirmed",
              });
            });
          } catch (sendErr: any) {
            const sendErrStr = (sendErr?.message || "").toLowerCase();
            if (sendErrStr.includes("already been processed") || sendErrStr.includes("0x0")) {
              const tx = Transaction.from(rawBytes);
              signature = bs58.encode(tx.signatures[0]?.signature || (tx as any).signature);
            } else {
              throw sendErr;
            }
          }
        }

        if (signature) {
          await confirmTransactionRobust(connection, signature);

          const subDetails: Subscription = {
            moduleId: pendingAction.moduleId,
            isSubscribed: true,
            expiresAt: pendingAction.expiresAt,
            isCancelled: false,
            txSignature: signature,
            planId: pendingAction.planId,
          };

          safeLocalStorageSet(
            `street_sync_sub_${pendingAction.walletKey}_${pendingAction.moduleId}`,
            JSON.stringify(subDetails)
          );
          setSubscriptions((prev) => ({ ...prev, [pendingAction.moduleId]: subDetails }));

          toast.dismiss(toastId);
          toast.success(
            `Successfully Subscribed to ${MODULE_NAMES[pendingAction.moduleId] || "Pro"} (${pendingAction.planName || "Plan"})!`
          );
        }
      } catch (err: any) {
        console.error("Failed to broadcast returned mobile subscription tx:", err);
        toast.dismiss(toastId);
        toast.error("Subscription transaction failed: " + (err?.message || "RPC error"));
      } finally {
        localStorage.removeItem("street_sync_pending_subscription");
        localStorage.removeItem("street_sync_last_signed_tx");
        localStorage.removeItem("street_sync_last_tx_signature");
      }
    };

    handlePendingMobileSubscription();
    window.addEventListener("phantom_mobile_tx_signed", handlePendingMobileSubscription);
    window.addEventListener("phantom_mobile_tx_sent", handlePendingMobileSubscription);
    return () => {
      window.removeEventListener("phantom_mobile_tx_signed", handlePendingMobileSubscription);
      window.removeEventListener("phantom_mobile_tx_sent", handlePendingMobileSubscription);
    };
  }, [connection]);

  // Subscribe function with selected plan
  const subscribe = async (moduleId: string, planId: SubscriptionPlanId = "30days"): Promise<boolean> => {
    if (!publicKey) {
      toast.error("Please connect your wallet first.");
      return false;
    }

    const selectedPlan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS["30days"];
    const durationMs = selectedPlan.durationDays * 24 * 60 * 60 * 1000;
    const walletKey = publicKey.toBase58();
    const currentSub = subscriptions[moduleId];

    // If already active and extending, add on top of remaining time
    const baseTime = (currentSub?.isSubscribed && currentSub.expiresAt && currentSub.expiresAt > Date.now())
      ? currentSub.expiresAt
      : Date.now();
    const expiresAt = baseTime + durationMs;

    if (isDemo) {
      // Simulate transaction in Sandbox / Demo mode
      return new Promise((resolve) => {
        const toastId = toast.loading(`Simulating ${selectedPlan.name} (${selectedPlan.priceSol} SOL) on Sandbox...`);
        setTimeout(() => {
          const subDetails: Subscription = {
            moduleId,
            isSubscribed: true,
            expiresAt,
            isCancelled: false,
            txSignature: `sim-sub-tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            planId,
          };

          try {
            safeLocalStorageSet(`street_sync_sub_${walletKey}_${moduleId}`, JSON.stringify(subDetails));
            setSubscriptions((prev) => ({ ...prev, [moduleId]: subDetails }));
            toast.dismiss(toastId);
            toast.success(`Successfully Subscribed to ${MODULE_NAMES[moduleId]} (${selectedPlan.name})! (Sandbox Demo)`);
            resolve(true);
          } catch (err) {
            toast.dismiss(toastId);
            toast.error("Failed to save subscription status. Browser storage full.");
            resolve(false);
          }
        }, 1200);
      });
    }

    // Real Solana transaction flow
    const isBalanceOk = await checkSolBalance(publicKey, selectedPlan.priceSol, connection, () => {
      // Re-trigger load to sync local state balances
      loadSubscriptions();
    });
    if (!isBalanceOk) return false;

    isSubscribingRef.current = true;
    const toastId = toast.loading(`Preparing ${selectedPlan.name} (${selectedPlan.priceSol} SOL) for ${MODULE_NAMES[moduleId]}...`);
    try {
      const transaction = new Transaction()
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }))
        .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }))
        .add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(MERCHANT_WALLET),
            lamports: selectedPlan.lamports,
          })
        );

      // Fetch fresh blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Persist pending subscription state for mobile deeplink return resilience
      const pendingSub = {
        walletKey,
        moduleId,
        planId,
        expiresAt,
        planName: selectedPlan.name,
        timestamp: Date.now(),
      };
      safeLocalStorageSet("street_sync_pending_subscription", JSON.stringify(pendingSub));

      toast.loading("Awaiting wallet approval in Phantom...", { id: toastId });

      let signature: string;
      if (signTransaction) {
        // Preferred path: Request wallet signature only, then broadcast via dedicated Helius Devnet RPC.
        const signedTx = await signTransaction(transaction);
        try {
          signature = await withSolanaRetry(async () => {
            return await connection.sendRawTransaction(signedTx.serialize(), {
              skipPreflight: true,
              maxRetries: 5,
              preflightCommitment: "confirmed",
            });
          });
        } catch (sendErr: any) {
          const sendErrStr = (sendErr?.message || "").toLowerCase();
          if (sendErrStr.includes("already been processed") || sendErrStr.includes("0x0")) {
            signature = bs58.encode(signedTx.signatures[0]?.signature || (signedTx as any).signature);
          } else {
            throw sendErr;
          }
        }
      } else {
        // Fallback for wallets without signTransaction
        signature = await withSolanaRetry(async () => {
          return await sendTransaction(transaction, connection, {
            skipPreflight: true,
            preflightCommitment: "confirmed",
          });
        });
      }

      toast.loading("Confirming transaction on Solana Devnet...", { id: toastId });
      await confirmTransactionRobust(connection, signature, blockhash, lastValidBlockHeight);

      const subDetails: Subscription = {
        moduleId,
        isSubscribed: true,
        expiresAt,
        isCancelled: false,
        txSignature: signature,
        planId,
      };

      safeLocalStorageSet(`street_sync_sub_${walletKey}_${moduleId}`, JSON.stringify(subDetails));
      setSubscriptions((prev) => ({ ...prev, [moduleId]: subDetails }));
      localStorage.removeItem("street_sync_pending_subscription");
      localStorage.removeItem("street_sync_last_signed_tx");
      localStorage.removeItem("street_sync_last_tx_signature");

      toast.dismiss(toastId);
      toast.success(`Successfully Subscribed to ${MODULE_NAMES[moduleId]} (${selectedPlan.name})!`);
      return true;
    } catch (error: any) {
      console.error("Subscription payment failed:", error);
      localStorage.removeItem("street_sync_pending_subscription");
      localStorage.removeItem("street_sync_last_signed_tx");
      localStorage.removeItem("street_sync_last_tx_signature");
      toast.dismiss(toastId);
      toast.error(error.message || "Transaction failed or rejected by user.");
      return false;
    } finally {
      isSubscribingRef.current = false;
    }
  };

  // Cancel/Unsubscribe subscription immediately
  const cancelSubscription = async (moduleId: string): Promise<boolean> => {
    if (!publicKey) return false;
    
    const walletKey = publicKey.toBase58();
    const currentSub = subscriptions[moduleId];
    if (!currentSub || !currentSub.isSubscribed) {
      toast.error("No active subscription found.");
      return false;
    }

    try {
      const updatedDetails: Subscription = {
        moduleId,
        isSubscribed: false,
        expiresAt: null,
        isCancelled: false,
        txSignature: null,
      };

      localStorage.removeItem(`street_sync_sub_${walletKey}_${moduleId}`);
      setSubscriptions((prev) => ({ ...prev, [moduleId]: updatedDetails }));
      toast.success(`Unsubscribed from ${MODULE_NAMES[moduleId]} successfully. Access has been terminated.`);
      return true;
    } catch (e) {
      console.error("Failed to unsubscribe:", e);
      toast.error("Failed to unsubscribe.");
      return false;
    }
  };

  // Check access
  const hasAccess = useCallback((moduleId: string): boolean => {
    const sub = subscriptions[moduleId];
    if (!sub) return false;
    if (!sub.isSubscribed) return false;
    if (sub.expiresAt && Date.now() > sub.expiresAt) return false;
    return true;
  }, [subscriptions]);

  const openSubscriptionModal = (moduleId: string) => {
    setActiveModuleId(moduleId);
    setShowModal(true);
  };

  const closeSubscriptionModal = () => {
    setShowModal(false);
    setActiveModuleId(null);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptions,
        loading,
        subscribe,
        cancelSubscription,
        hasAccess,
        showModal,
        activeModuleId,
        openSubscriptionModal,
        closeSubscriptionModal,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};
