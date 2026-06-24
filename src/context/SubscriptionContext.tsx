"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SystemProgram, Transaction, PublicKey } from "@solana/web3.js";
import toast from "react-hot-toast";

const MERCHANT_WALLET = "9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu";

export interface Subscription {
  moduleId: string;
  isSubscribed: boolean;
  expiresAt: number | null;
  isCancelled: boolean;
  txSignature: string | null;
}

export interface SubscriptionContextType {
  subscriptions: Record<string, Subscription>;
  loading: boolean;
  subscribe: (moduleId: string) => Promise<boolean>;
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
    loadSubscriptions();
  }, [loadSubscriptions]);

  // Subscribe function
  const subscribe = async (moduleId: string): Promise<boolean> => {
    if (!publicKey) {
      toast.error("Please connect your wallet first.");
      return false;
    }

    const walletKey = publicKey.toBase58();

    if (isDemo) {
      // Simulate transaction in Sandbox / Demo mode
      return new Promise((resolve) => {
        const toastId = toast.loading("Simulating Solana Sandbox Transaction...");
        setTimeout(() => {
          const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
          const subDetails: Subscription = {
            moduleId,
            isSubscribed: true,
            expiresAt,
            isCancelled: false,
            txSignature: `sim-sub-tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          };

          localStorage.setItem(`street_sync_sub_${walletKey}_${moduleId}`, JSON.stringify(subDetails));
          setSubscriptions((prev) => ({ ...prev, [moduleId]: subDetails }));
          
          toast.dismiss(toastId);
          toast.success(`Successfully Subscribed to ${MODULE_NAMES[moduleId]}! (Sandbox Demo)`);
          resolve(true);
        }, 1500);
      });
    }

    // Real Solana transaction flow
    const toastId = toast.loading(`Preparing subscription transaction for ${MODULE_NAMES[moduleId]}...`);
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(MERCHANT_WALLET),
          lamports: 1_000_000_000, // 1 SOL
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

      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
      const subDetails: Subscription = {
        moduleId,
        isSubscribed: true,
        expiresAt,
        isCancelled: false,
        txSignature: signature,
      };

      localStorage.setItem(`street_sync_sub_${walletKey}_${moduleId}`, JSON.stringify(subDetails));
      setSubscriptions((prev) => ({ ...prev, [moduleId]: subDetails }));

      toast.dismiss(toastId);
      toast.success(`Successfully Subscribed to ${MODULE_NAMES[moduleId]}!`);
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
