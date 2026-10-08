"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useFirebaseAuth, SignInWithSolanaResult } from "@/lib/l2database/auth";
import { SIWSModal } from "./SIWSModal";
import toast from "react-hot-toast";

interface SIWSContextValue {
  isAuthenticated: boolean;
  isGuest: boolean;
  user: any;
  authenticatedWallet: string | null;
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
  const {
    user,
    isGuest,
    isAuthenticated,
    loading,
    loginWithWallet,
    loginAsGuest,
    logout,
    authenticatedWallet,
  } = useFirebaseAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalReason, setModalReason] = useState<string>("");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  // Auto-establish Web3 wallet identity when wallet is actively connected
  useEffect(() => {
    if (loading) return;
    if (connected && publicKey) {
      const pubkeyStr = publicKey.toBase58();
      try {
        const stored = localStorage.getItem("streetsync_solana_auth_user");
        const parsed = stored ? JSON.parse(stored) : null;
        if (!parsed || parsed.walletAddress !== pubkeyStr) {
          localStorage.setItem(
            "streetsync_solana_auth_user",
            JSON.stringify({
              uid: pubkeyStr,
              walletAddress: pubkeyStr,
              displayName: `${pubkeyStr.slice(0, 4)}..${pubkeyStr.slice(-4)}`,
              isGuest: false,
              authenticatedAt: Date.now(),
            })
          );
          window.dispatchEvent(new Event("streetsync_auth_changed"));
        }
      } catch (err) {
        console.warn("[SIWS] Auto-sync wallet session error:", err);
      }
    }
  }, [connected, publicKey, loading]);

  // Resumption handler for Mobile Wallet SIWS returns
  useEffect(() => {
    const checkAndCompleteMobileSIWS = (signatureFromEvent?: string) => {
      try {
        const pendingRaw = localStorage.getItem("street_sync_pending_siws");
        if (!pendingRaw) return;

        const pending = JSON.parse(pendingRaw);
        // Valid for up to 15 minutes
        if (Date.now() - pending.timestamp > 15 * 60 * 1000) {
          localStorage.removeItem("street_sync_pending_siws");
          return;
        }

        const sig =
          signatureFromEvent ||
          localStorage.getItem("street_sync_last_tx_signature");

        const targetWallet = pending.walletAddress || (publicKey ? publicKey.toBase58() : null);
        if (!targetWallet) return;

        console.log("[SIWS] Finalizing pending mobile SIWS authentication for:", targetWallet);
        localStorage.setItem(
          "streetsync_solana_auth_user",
          JSON.stringify({
            uid: targetWallet,
            walletAddress: targetWallet,
            displayName: `${targetWallet.slice(0, 4)}..${targetWallet.slice(-4)}`,
            isGuest: false,
            authenticatedAt: Date.now(),
            signature: sig || undefined,
          })
        );
        localStorage.removeItem("street_sync_pending_siws");
        window.dispatchEvent(new Event("streetsync_auth_changed"));

        toast.success("Signed in with Solana (SIWS) successfully!", {
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
            console.warn("[SIWS] Pending action execution note:", actErr);
          }
          setPendingAction(null);
        }
      } catch (err) {
        console.warn("[SIWS] Error completing mobile SIWS:", err);
      }
    };

    // Check on mount
    checkAndCompleteMobileSIWS();

    const handleSigned = (e: any) => {
      checkAndCompleteMobileSIWS(e.detail);
    };

    window.addEventListener("phantom_mobile_signed", handleSigned);
    window.addEventListener("phantom_mobile_connected", () => checkAndCompleteMobileSIWS());
    return () => {
      window.removeEventListener("phantom_mobile_signed", handleSigned);
      window.removeEventListener("phantom_mobile_connected", () => checkAndCompleteMobileSIWS());
    };
  }, [publicKey, pendingAction]);

  // Invalidate session ONLY when an actively connected wallet explicitly differs from the authenticated wallet
  useEffect(() => {
    if (loading) return;

    if (isAuthenticated && !isGuest && connected && publicKey && authenticatedWallet) {
      const currentPubkey = publicKey.toBase58();
      if (
        currentPubkey.length >= 32 &&
        authenticatedWallet.length >= 32 &&
        authenticatedWallet !== currentPubkey
      ) {
        console.log(
          `[SIWS] Active wallet changed from ${authenticatedWallet} to ${currentPubkey}. Invalidating previous session.`
        );
        logout().catch(console.error);
        toast(
          `Wallet changed to ${currentPubkey.slice(0, 4)}..${currentPubkey.slice(-4)}. Please sign in with active wallet.`,
          {
            icon: "🔄",
            style: {
              borderRadius: "12px",
              background: "#18181b",
              color: "#fff",
              border: "1px solid #27272a",
            },
          }
        );
      }
    }
  }, [connected, publicKey, authenticatedWallet, isAuthenticated, isGuest, loading, logout]);

  const openSIWSModal = useCallback((options?: { reason?: string; onSuccess?: () => void }) => {
    setModalReason(options?.reason || "");
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

  useEffect(() => {
    const handleClose = () => {
      closeSIWSModal();
      setWalletModalVisible(false);
    };
    window.addEventListener("street_sync_close_all_modals", handleClose);
    return () => {
      window.removeEventListener("street_sync_close_all_modals", handleClose);
    };
  }, [closeSIWSModal, setWalletModalVisible]);

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
    const isWalletConnected = Boolean(connected && publicKey);
    if (isAuthenticated || isWalletConnected) {
      if (!isAuthenticated && publicKey) {
        const pubkeyStr = publicKey.toBase58();
        try {
          localStorage.setItem(
            "streetsync_solana_auth_user",
            JSON.stringify({
              uid: pubkeyStr,
              walletAddress: pubkeyStr,
              displayName: `${pubkeyStr.slice(0, 4)}..${pubkeyStr.slice(-4)}`,
              isGuest: false,
              authenticatedAt: Date.now(),
            })
          );
          window.dispatchEvent(new Event("streetsync_auth_changed"));
        } catch {}
      }
      action();
    } else {
      openSIWSModal({
        reason: reason || undefined,
        onSuccess: action,
      });
    }
  }, [isAuthenticated, connected, publicKey, openSIWSModal]);

  return (
    <SIWSContext.Provider
      value={{
        isAuthenticated,
        isGuest,
        user,
        authenticatedWallet,
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
        isAuthenticated={isAuthenticated}
        onSignIn={signIn}
        onSignOut={logout}
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

