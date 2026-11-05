"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SystemProgram, Transaction, PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import toast from "react-hot-toast";
import bs58 from "bs58";
import { checkSolBalance } from "@/utils/balanceCheck";
import { withSolanaRetry, confirmTransactionRobust } from "@/utils/solanaRetry";
import { savePendingAction, resumePendingTransactions } from "@/utils/pendingTransactions";
import { PhantomMobileWalletName } from "@/lib/wallet/PhantomMobileWalletAdapter";
import { isStandaloneApp } from "@/utils/isStandaloneApp";
import { getStoredPhantomSession } from "@/lib/wallet/phantomDeeplink";
import { db } from "@/lib/l2database/config";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import {
  MERCHANT_WALLET,
  createSubscriptionMemoInstruction,
  syncWalletSubscriptions,
} from "@/lib/subscriptions/onChainSubscriptions";

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

// Helper to resolve active wallet key across desktop wallet adapter, Phantom mobile session, and SIWS auth
export const getEffectiveWalletAddress = (adapterPublicKey?: PublicKey | null): string | null => {
  if (adapterPublicKey) return adapterPublicKey.toBase58();
  if (typeof window !== "undefined") {
    try {
      const session = getStoredPhantomSession();
      if (session?.publicKey) return session.publicKey;
    } catch {}
    try {
      const authUserStr = localStorage.getItem("streetsync_solana_auth_user");
      if (authUserStr) {
        const authUser = JSON.parse(authUserStr);
        if (authUser?.walletAddress) return authUser.walletAddress;
      }
    } catch {}
  }
  return null;
};

// Helper to safely write to localStorage, clearing oversized simulated feed logs if quota is full without throwing
const safeLocalStorageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (error: any) {
    if (
      error?.name === "QuotaExceededError" ||
      error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error?.code === 22
    ) {
      console.warn("Storage quota exceeded! Clearing non-essential sessions feed cache to free space...");
      try {
        localStorage.removeItem("sessions_posts");
        localStorage.removeItem("sessions_chat");
        localStorage.removeItem("sync_feed_pro_posts");
        localStorage.setItem(key, value);
        console.log("Successfully wrote subscription after clearing cache.");
      } catch (retryError) {
        console.error("Critical storage write failure even after pruning sessions feed cache:", retryError);
        // Absolute fallback: Clear all items except other subscriptions and pending actions
        try {
          const keys = Object.keys(localStorage);
          keys.forEach((k) => {
            if (!k.startsWith("street_sync_sub_") && !k.startsWith("street_sync_pending_")) {
              localStorage.removeItem(k);
            }
          });
          localStorage.setItem(key, value);
        } catch (e) {
          console.warn("localStorage write failed even after pruning, keeping in-memory state:", e);
        }
      }
    } else {
      console.warn("localStorage write error (silenced):", error);
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
    const effectiveWallet = getEffectiveWalletAddress(publicKey);
    if (!effectiveWallet) {
      setSubscriptions({});
      setLoading(false);
      return;
    }

    const walletKey = effectiveWallet;
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
        const cancelledAtStr = localStorage.getItem(`street_sync_cancelled_${walletKey}_${moduleId}`);
        if (cancelledAtStr) {
          loadedSubs[moduleId] = {
            moduleId,
            isSubscribed: false,
            expiresAt: null,
            isCancelled: true,
            txSignature: null,
          };
          return;
        }

        const stored = localStorage.getItem(`street_sync_sub_${walletKey}_${moduleId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          const now = Date.now();
          if (parsed.isCancelled || (parsed.expiresAt && now > parsed.expiresAt)) {
            loadedSubs[moduleId] = {
              moduleId,
              isSubscribed: false,
              expiresAt: null,
              isCancelled: Boolean(parsed.isCancelled),
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

    // In background, verify and sync on-chain & cloud subscriptions across any browser/device
    let effectivePubkey: PublicKey | null = publicKey;
    if (!effectivePubkey && effectiveWallet) {
      try {
        effectivePubkey = new PublicKey(effectiveWallet);
      } catch {}
    }

    if (!isDemo && effectivePubkey) {
      syncWalletSubscriptions(connection, effectivePubkey)
        .then((onChainSubs) => {
          if (Object.keys(onChainSubs).length > 0) {
            setSubscriptions((prev) => {
              const filteredOnChain: Record<string, Subscription> = {};
              Object.entries(onChainSubs).forEach(([mod, sub]) => {
                const isCancelledLocally = Boolean(
                  localStorage.getItem(`street_sync_cancelled_${walletKey}_${mod}`)
                );
                if (!isCancelledLocally) {
                  filteredOnChain[mod] = sub;
                }
              });
              const merged = { ...prev, ...filteredOnChain };
              walletSubCache.current[walletKey] = merged;
              return merged;
            });
          }
        })
        .catch((e) => {
          console.warn("[SubscriptionContext] On-chain subscription sync note:", e);
        });
    }
  }, [publicKey, connection, isDemo]);

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

  // Global event listener for redirect_route across all pages
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleRedirectRoute = (e: any) => {
      const targetRoute = e?.detail?.route;
      if (targetRoute && window.location.pathname !== targetRoute) {
        window.location.href = targetRoute;
      }
    };
    window.addEventListener("redirect_route", handleRedirectRoute);
    return () => window.removeEventListener("redirect_route", handleRedirectRoute);
  }, []);

  // Proactive auto-redirect: if user returns from mobile wallet and module is already active
  useEffect(() => {
    if (typeof window === "undefined") return;
    const rawPending = localStorage.getItem("street_sync_pending_subscription");
    if (!rawPending) return;

    try {
      const parsed = JSON.parse(rawPending);
      const modId = parsed.moduleId;
      const walletKey = parsed.walletKey;
      const targetRoute = parsed.targetProRoute || (modId ? `/${modId}/${modId.replace(/-/g, "")}-pro` : null);

      const localSubStr = walletKey && modId ? localStorage.getItem(`street_sync_sub_${walletKey}_${modId}`) : null;
      let localActive = false;
      if (localSubStr) {
        try {
          const lData = JSON.parse(localSubStr);
          localActive = Boolean(lData?.isSubscribed && lData.expiresAt && lData.expiresAt > Date.now());
        } catch {}
      }

      const isSubscribedNow = (modId && subscriptions[modId]?.isSubscribed) || localActive;
      if (isSubscribedNow && targetRoute) {
        localStorage.removeItem("street_sync_pending_subscription");
        localStorage.removeItem("street_sync_last_signed_tx");
        localStorage.removeItem("street_sync_last_tx_signature");
        localStorage.removeItem("phantom_mobile_return_url");

        setShowModal(false);
        toast.dismiss();
        if (window.location.pathname !== targetRoute) {
          window.location.href = targetRoute;
        }
      }
    } catch {}
  }, [subscriptions]);

  // Resumption handler: Detects return from mobile wallet redirect when page reloaded or resumed
  useEffect(() => {
    const handlePendingMobileSubscription = async () => {
      if (typeof window === "undefined") return;

      const rawPending = localStorage.getItem("street_sync_pending_subscription");
      if (!rawPending) return;

      let pendingAction: any;
      try {
        pendingAction = JSON.parse(rawPending);
      } catch {
        localStorage.removeItem("street_sync_pending_subscription");
        return;
      }

      // Check freshness (within 15 minutes)
      if (Date.now() - pendingAction.timestamp > 15 * 60 * 1000) {
        localStorage.removeItem("street_sync_pending_subscription");
        localStorage.removeItem("street_sync_last_signed_tx");
        localStorage.removeItem("street_sync_last_tx_signature");
        return;
      }

      const targetProRoute = pendingAction.targetProRoute || `/${pendingAction.moduleId}/${pendingAction.moduleId.replace(/-/g, "")}-pro`;

      // 1. Check if user is ALREADY subscribed (e.g. on-chain or through concurrent resumePendingTransactions)
      const existingStored = localStorage.getItem(`street_sync_sub_${pendingAction.walletKey}_${pendingAction.moduleId}`);
      let isAlreadyActive = subscriptions[pendingAction.moduleId]?.isSubscribed;
      if (!isAlreadyActive && existingStored) {
        try {
          const parsedStored = JSON.parse(existingStored);
          isAlreadyActive = Boolean(parsedStored?.isSubscribed && parsedStored.expiresAt && parsedStored.expiresAt > Date.now());
        } catch {}
      }

      if (isAlreadyActive) {
        if (!subscriptions[pendingAction.moduleId]?.isSubscribed && existingStored) {
          try {
            const parsedStored = JSON.parse(existingStored);
            setSubscriptions((prev) => ({ ...prev, [pendingAction.moduleId]: parsedStored }));
          } catch {}
        }
        localStorage.removeItem("street_sync_pending_subscription");
        localStorage.removeItem("street_sync_last_signed_tx");
        localStorage.removeItem("street_sync_last_tx_signature");
        localStorage.removeItem("phantom_mobile_return_url");

        setShowModal(false);
        toast.dismiss();
        if (window.location.pathname !== targetProRoute) {
          window.location.href = targetProRoute;
        }
        return;
      }

      const signedTxStr = localStorage.getItem("street_sync_last_signed_tx");
      const txSigStr = localStorage.getItem("street_sync_last_tx_signature");
      if (!signedTxStr && !txSigStr) return;

      // Delegate unified broadcast and confirmation to resumePendingTransactions to prevent duplicate broadcasting race conditions
      try {
        await resumePendingTransactions(connection);
      } catch (err: any) {
        console.warn("[SubscriptionContext] Mobile subscription resumption note:", err);
      }
    };

    const handleMobileWalletError = (e: any) => {
      const err = e?.detail?.error || "Transaction was cancelled in wallet.";
      setShowModal(false);
      toast.dismiss();
      localStorage.removeItem("street_sync_pending_subscription");
      localStorage.removeItem("street_sync_last_signed_tx");
      localStorage.removeItem("street_sync_last_tx_signature");
      localStorage.removeItem("phantom_mobile_return_url");
      toast.error(typeof err === "string" ? err : "Transaction was cancelled in wallet.");
    };

    handlePendingMobileSubscription();
    window.addEventListener("phantom_mobile_tx_signed", handlePendingMobileSubscription);
    window.addEventListener("phantom_mobile_tx_sent", handlePendingMobileSubscription);
    window.addEventListener("solflare_mobile_tx_signed", handlePendingMobileSubscription);
    window.addEventListener("solflare_mobile_tx_sent", handlePendingMobileSubscription);
    window.addEventListener("phantom_mobile_error", handleMobileWalletError);
    window.addEventListener("solflare_mobile_error", handleMobileWalletError);

    const handleSubUpdated = (e: any) => {
      const detail = e?.detail;
      if (detail && detail.moduleId) {
        setSubscriptions((prev) => ({ ...prev, [detail.moduleId]: detail }));
      }
      loadSubscriptions();
    };
    const handleCloseAll = () => {
      setShowModal(false);
    };
    window.addEventListener("subscription_updated", handleSubUpdated);
    window.addEventListener("street_sync_close_all_modals", handleCloseAll);

    return () => {
      window.removeEventListener("phantom_mobile_tx_signed", handlePendingMobileSubscription);
      window.removeEventListener("phantom_mobile_tx_sent", handlePendingMobileSubscription);
      window.removeEventListener("solflare_mobile_tx_signed", handlePendingMobileSubscription);
      window.removeEventListener("solflare_mobile_tx_sent", handlePendingMobileSubscription);
      window.removeEventListener("phantom_mobile_error", handleMobileWalletError);
      window.removeEventListener("solflare_mobile_error", handleMobileWalletError);
      window.removeEventListener("subscription_updated", handleSubUpdated);
      window.removeEventListener("street_sync_close_all_modals", handleCloseAll);
    };
  }, [connection, loadSubscriptions, subscriptions]);

  // Subscribe function with selected plan
  const subscribe = async (moduleId: string, planId: SubscriptionPlanId = "30days"): Promise<boolean> => {
    const effectiveWallet = getEffectiveWalletAddress(publicKey);
    if (!effectiveWallet) {
      toast.error("Please connect your wallet first.");
      return false;
    }

    const userPubkey = publicKey || new PublicKey(effectiveWallet);
    const selectedPlan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS["30days"];
    const durationMs = selectedPlan.durationDays * 24 * 60 * 60 * 1000;
    const walletKey = effectiveWallet;
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
            localStorage.removeItem(`street_sync_cancelled_${walletKey}_${moduleId}`);
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
    const isBalanceOk = await checkSolBalance(userPubkey, selectedPlan.priceSol, connection, () => {
      // Re-trigger load to sync local state balances
      loadSubscriptions();
    });
    if (!isBalanceOk) return false;

    isSubscribingRef.current = true;
    const toastId = toast.loading(`Preparing ${selectedPlan.name} (${selectedPlan.priceSol} SOL) for ${MODULE_NAMES[moduleId]}...`);
    try {
      const transaction = new Transaction()
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 150_000 }))
        .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }))
        .add(
          SystemProgram.transfer({
            fromPubkey: userPubkey,
            toPubkey: new PublicKey(MERCHANT_WALLET),
            lamports: selectedPlan.lamports,
          })
        )
        .add(
          createSubscriptionMemoInstruction(userPubkey, moduleId, planId, expiresAt)
        );

      // Fetch fresh blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPubkey;

      // Persist pending subscription state for mobile deeplink return resilience
      const targetProRoute = `/${moduleId}/${moduleId.replace(/-/g, "")}-pro`;
      const pendingSub = {
        walletKey,
        moduleId,
        planId,
        expiresAt,
        planName: selectedPlan.name,
        targetProRoute,
        timestamp: Date.now(),
      };
      safeLocalStorageSet("street_sync_pending_subscription", JSON.stringify(pendingSub));
      if (typeof window !== "undefined") {
        safeLocalStorageSet("phantom_mobile_return_url", window.location.href);
      }
      savePendingAction("SUBSCRIPTION_BUY", pendingSub);

      const walletDisplayName = wallet?.adapter?.name || "wallet";
      toast.loading(`Awaiting wallet approval in ${walletDisplayName}...`, { id: toastId });

      let signature: string;
      const isMobile = typeof window !== "undefined" && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || isStandaloneApp());
      const isMobileWallet = Boolean((wallet?.adapter as any)?.isPhantomMobileAdapter) ||
        Boolean((wallet?.adapter as any)?.isSolflareMobileAdapter) ||
        (isMobile && !Boolean((window as any).phantom?.solana) && !Boolean((window as any).solflare?.isSolflare));

      if (isMobileWallet) {
        // Mobile path: execute sendTransaction which prompts Phantom/Solflare mobile deep link
        signature = await sendTransaction(transaction, connection, {
          skipPreflight: true,
          preflightCommitment: "confirmed",
        });
      } else if (signTransaction) {
        // Desktop browser extension path: sign and broadcast via dedicated Helius Devnet RPC
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

      localStorage.removeItem(`street_sync_cancelled_${walletKey}_${moduleId}`);
      safeLocalStorageSet(`street_sync_sub_${walletKey}_${moduleId}`, JSON.stringify(subDetails));
      setSubscriptions((prev) => ({ ...prev, [moduleId]: subDetails }));
      localStorage.removeItem("street_sync_pending_subscription");
      localStorage.removeItem("street_sync_last_signed_tx");
      localStorage.removeItem("street_sync_last_tx_signature");
      localStorage.removeItem("phantom_mobile_return_url");

      // Persist to Firestore asynchronously (non-blocking) so Firestore never delays UX
      setDoc(doc(db, "subscriptions", `${walletKey}_${moduleId}`), {
        walletAddress: walletKey,
        moduleId,
        planId,
        expiresAt,
        txSignature: signature,
        isCancelled: false,
        updatedAt: Date.now(),
      }).catch((fsErr) => {
        console.warn("Firestore subscription save note:", fsErr);
      });

      // Immediately dismiss modal and notify all listeners
      setShowModal(false);
      window.dispatchEvent(new CustomEvent("street_sync_close_all_modals"));
      window.dispatchEvent(new CustomEvent("subscription_updated", { detail: subDetails }));
      window.dispatchEvent(new Event("storage"));

      toast.dismiss(toastId);
      toast.dismiss();
      toast.success(`Successfully Subscribed to ${MODULE_NAMES[moduleId]} (${selectedPlan.name})!`);
      return true;
    } catch (error: any) {
      console.error("Subscription payment failed:", error);
      toast.dismiss(toastId);
      toast.dismiss();

      // On mobile deep link navigation, the promise might reject/abort because window.location.href launched the external wallet app.
      // If a pending subscription was saved, DO NOT wipe it or show false-positive failure toasts!
      const hasPendingSub = typeof window !== "undefined" && Boolean(localStorage.getItem("street_sync_pending_subscription"));
      const isMobileCheck = typeof window !== "undefined" && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || isStandaloneApp());
      if (hasPendingSub && isMobileCheck) {
        // User was navigated to mobile wallet app, let resumption handle return
        return false;
      }

      localStorage.removeItem("street_sync_pending_subscription");
      localStorage.removeItem("street_sync_last_signed_tx");
      localStorage.removeItem("street_sync_last_tx_signature");

      // Check if user is actually subscribed despite timeout/error
      if (subscriptions[moduleId]?.isSubscribed) {
        setShowModal(false);
        window.dispatchEvent(new CustomEvent("street_sync_close_all_modals"));
        return true;
      }

      toast.error(error.message || "Transaction failed or rejected by user.");
      return false;
    } finally {
      isSubscribingRef.current = false;
    }
  };

  // Cancel/Unsubscribe subscription immediately
  const cancelSubscription = async (moduleId: string): Promise<boolean> => {
    const effectiveWallet = getEffectiveWalletAddress(publicKey);
    if (!effectiveWallet) {
      toast.error("Please connect your wallet first.");
      return false;
    }
    
    const walletKey = effectiveWallet;
    const currentSub = subscriptions[moduleId];

    // Check if stored in localStorage even if state not yet updated
    let storedSub: any = null;
    try {
      const stored = localStorage.getItem(`street_sync_sub_${walletKey}_${moduleId}`);
      if (stored) storedSub = JSON.parse(stored);
    } catch {}

    const isActive = Boolean(
      (currentSub?.isSubscribed && !currentSub?.isCancelled) ||
      (storedSub?.isSubscribed && !storedSub?.isCancelled)
    );

    if (!isActive && (!currentSub || !currentSub.isSubscribed)) {
      toast.error("No active subscription found.");
      return false;
    }

    try {
      const updatedDetails: Subscription = {
        moduleId,
        isSubscribed: false,
        expiresAt: null,
        isCancelled: true,
        txSignature: null,
      };

      // 1. Remove active subscription & pending subscriptions from localStorage
      try {
        localStorage.removeItem(`street_sync_sub_${walletKey}_${moduleId}`);
        localStorage.removeItem("street_sync_pending_subscription");
        localStorage.removeItem("street_sync_last_signed_tx");
        localStorage.removeItem("street_sync_last_tx_signature");
        // Record cancellation tombstone so on-chain memo scan does not resurrect it
        localStorage.setItem(`street_sync_cancelled_${walletKey}_${moduleId}`, String(Date.now()));
      } catch (storageErr) {
        console.warn("Storage write note:", storageErr);
      }

      // 2. Immediately update state and in-memory cache
      setSubscriptions((prev) => ({ ...prev, [moduleId]: updatedDetails }));
      if (walletSubCache.current[walletKey]) {
        walletSubCache.current[walletKey][moduleId] = updatedDetails;
      }

      // 3. Dispatch global events so all components, widgets, modals and pro pages update immediately
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("subscription_updated", { detail: updatedDetails }));
        window.dispatchEvent(new CustomEvent("street_sync_close_all_modals"));
        window.dispatchEvent(new Event("storage"));
      }

      // 4. Persist cancellation to Firestore with safe timeout so network never blocks UX
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Firestore timeout")), 2500)
        );
        await Promise.race([
          setDoc(
            doc(db, "subscriptions", `${walletKey}_${moduleId}`),
            {
              walletAddress: walletKey,
              moduleId,
              isSubscribed: false,
              isCancelled: true,
              expiresAt: Date.now(),
              updatedAt: Date.now(),
            },
            { merge: true }
          ),
          timeoutPromise,
        ]);
      } catch (fsErr) {
        console.warn("Firestore subscription cancel note:", fsErr);
      }

      toast.success(`Unsubscribed from ${MODULE_NAMES[moduleId] || moduleId} successfully. Access terminated.`);
      return true;
    } catch (e) {
      console.error("Failed to unsubscribe:", e);
      toast.error("Failed to unsubscribe.");
      return false;
    }
  };

  // Check access
  const hasAccess = useCallback((moduleId: string): boolean => {
    // Platform Merchant / Admin wallet always has universal Pro access across any browser
    const effectiveWallet = getEffectiveWalletAddress(publicKey);
    if (effectiveWallet === MERCHANT_WALLET) {
      return true;
    }
    const sub = subscriptions[moduleId];
    if (!sub) return false;
    if (!sub.isSubscribed) return false;
    if (sub.isCancelled) return false;
    if (sub.expiresAt && Date.now() > sub.expiresAt) return false;
    return true;
  }, [subscriptions, publicKey]);

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
