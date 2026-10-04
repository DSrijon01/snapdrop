"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useFirebaseAuth, SignInWithSolanaResult } from "@/lib/l2database/auth";
import { SIWSModal } from "./SIWSModal";
import toast from "react-hot-toast";

interface SIWSContextValue {
  isAuthenticated: boolean;
  isGuest: boolean;
  user: any;
  loading: boolean;
  openSIWSModal: (options?: { reason?: string; onSuccess?: () => void }) => void;
  closeSIWSModal: () => void;
  requireAuth: (action: () => void, reason?: string) => void;
  signIn: () => Promise<SignInWithSolanaResult | null>;
  signInAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const SIWSContext = createContext<SIWSContextValue | null>(null);

export function SIWSProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, signMessage, connected } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { user, isGuest, isAuthenticated, loading, loginWithWallet, loginAsGuest, logout } = useFirebaseAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalReason, setModalReason] = useState<string>("Sign in with your Solana wallet to unlock real-time social posting, live chat, and virtual rooms.");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const openSIWSModal = useCallback((options?: { reason?: string; onSuccess?: () => void }) => {
    if (options?.reason) {
      setModalReason(options.reason);
    } else {
      setModalReason("Sign in with your Solana wallet to unlock real-time social posting, live chat, and virtual rooms.");
    }
    if (options?.onSuccess) {
      setPendingAction(() => options.onSuccess);
    } else {
      setPendingAction(null);
    }
    setIsModalOpen(true);
  }, []);

  const closeSIWSModal = useCallback(() => {
    setIsModalOpen(false);
    setIsSigning(false);
    setPendingAction(null);
  }, []);

  const signIn = useCallback(async (): Promise<SignInWithSolanaResult | null> => {
    if (!publicKey) {
      setWalletModalVisible(true);
      return null;
    }

    if (!signMessage) {
      toast.error("Connected wallet does not support message signing. Please use Phantom or Solflare.");
      return null;
    }

    setIsSigning(true);
    try {
      const result = await loginWithWallet(publicKey, signMessage);
      toast.success("Signed in with Solana (SIWS) successfully!", {
        icon: "⚡",
        style: {
          borderRadius: "12px",
          background: "#18181b",
          color: "#fff",
          border: "1px solid #27272a",
        },
      });

      // Execute queued action if any
      if (pendingAction) {
        try {
          pendingAction();
        } catch (actErr) {
          console.warn("[SIWS] Failed to execute pending action:", actErr);
        }
        setPendingAction(null);
      }

      setIsModalOpen(false);
      return result;
    } catch (err: any) {
      console.error("[SIWS] Sign-in error:", err);
      toast.error(err?.message || "Failed to sign in with Solana.");
      return null;
    } finally {
      setIsSigning(false);
    }
  }, [publicKey, signMessage, loginWithWallet, pendingAction, setWalletModalVisible]);

  const signInAsGuest = useCallback(async () => {
    setIsSigning(true);
    try {
      await loginAsGuest();
      toast.success("Connected in browser as Guest (L2 Identity)!", {
        icon: "⚡",
        style: {
          borderRadius: "12px",
          background: "#18181b",
          color: "#fff",
          border: "1px solid #27272a",
        },
      });

      if (pendingAction) {
        try {
          pendingAction();
        } catch (actErr) {
          console.warn("[SIWS] Failed to execute pending action:", actErr);
        }
        setPendingAction(null);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error("[SIWS] Guest sign-in error:", err);
      toast.error(err?.message || "Failed to continue as browser guest.");
    } finally {
      setIsSigning(false);
    }
  }, [loginAsGuest, pendingAction]);

  const requireAuth = useCallback((action: () => void, reason?: string) => {
    if (isAuthenticated) {
      action();
    } else {
      openSIWSModal({
        reason: reason || "Sign In with Solana (SIWS) is required to perform this action.",
        onSuccess: action,
      });
    }
  }, [isAuthenticated, openSIWSModal]);

  return (
    <SIWSContext.Provider
      value={{
        isAuthenticated,
        isGuest,
        user,
        loading,
        openSIWSModal,
        closeSIWSModal,
        requireAuth,
        signIn,
        signInAsGuest,
        logout,
      }}
    >
      {children}
      <SIWSModal
        isOpen={isModalOpen}
        onClose={closeSIWSModal}
        reason={modalReason}
        isSigning={isSigning}
        isConnected={connected && !!publicKey}
        walletAddress={publicKey?.toBase58()}
        onSignIn={signIn}
        onConnectWallet={() => {
          setIsModalOpen(false);
          setWalletModalVisible(true);
        }}
        onContinueAsGuest={signInAsGuest}
      />
    </SIWSContext.Provider>
  );
}

export function useSIWS() {
  const context = useContext(SIWSContext);
  if (!context) {
    throw new Error("useSIWS must be used within a SIWSProvider");
  }
  return context;
}
