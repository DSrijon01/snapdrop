"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SystemProgram, Transaction, PublicKey } from "@solana/web3.js";
import toast from "react-hot-toast";
import { checkSolBalance } from "@/utils/balanceCheck";

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
  "openclaw": "OpenClaw AI Terminal",
  "snbl": "SNBL Staking",
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
  const { publicKey, sendTransaction, wallet } = useWallet();
  const [subscriptions, setSubscriptions] = useState<Record<string, Subscription>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  const isDemo = wallet?.adapter.name === 'Street Sync Demo';

  // Load subscriptions for the active wallet
  const loadSubscriptions = useCallback(() => {
    if (!publicKey) {
      setSubscriptions({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const walletKey = publicKey.toBase58();
    const loadedSubs: Record<string, Subscription> = {};

    Object.keys(MODULE_NAMES).forEach((moduleId) => {
      try {
        const stored = localStorage.getItem(`street_sync_sub_${walletKey}_${moduleId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Check if expired
          const now = Date.now();
          if (parsed.expiresAt && now > parsed.expiresAt) {
            // Subscription expired
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

    const toastId = toast.loading(`Preparing ${selectedPlan.name} (${selectedPlan.priceSol} SOL) for ${MODULE_NAMES[moduleId]}...`);
    try {
      const transaction = new Transaction().add(
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

      toast.loading("Awaiting wallet approval...", { id: toastId });
      const signature = await sendTransaction(transaction, connection);

      toast.loading("Confirming transaction on Solana Devnet...", { id: toastId });
      await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

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

      toast.dismiss(toastId);
      toast.success(`Successfully Subscribed to ${MODULE_NAMES[moduleId]} (${selectedPlan.name})!`);
      return true;
    } catch (error: any) {
      console.error("Subscription payment failed:", error);
      toast.dismiss(toastId);
      toast.error(error.message || "Transaction failed or rejected by user.");
      return false;
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
