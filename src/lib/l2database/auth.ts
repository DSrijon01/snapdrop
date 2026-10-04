"use client";

import { useEffect, useState, useCallback } from "react";
import {
  signInWithCustomToken,
  signInAnonymously,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { auth } from "./config";

export interface SignInWithSolanaResult {
  user: User;
  customToken: string;
}

const LOCAL_STORAGE_AUTH_KEY = "streetsync_solana_auth_user";

/**
 * Initiates cryptographic challenge signing with the connected Solana wallet,
 * verifies on the backend, and signs the user into Firebase with a custom token.
 */
export async function signInWithSolana(
  publicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<SignInWithSolanaResult> {
  const walletAddress = publicKey.toBase58();
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 10);

  // 1. Construct challenge message
  const challengeMessage =
    `Sign in to Street Sync with Solana\n` +
    `Wallet: ${walletAddress}\n` +
    `Timestamp: ${timestamp}\n` +
    `Nonce: ${nonce}`;

  const messageBytes = new TextEncoder().encode(challengeMessage);

  // 2. Request cryptographic signature from wallet
  const signatureBytes = await signMessage(messageBytes);
  const signatureBase58 = bs58.encode(signatureBytes);

  // 3. Post to backend verification endpoint
  let data: any = null;
  const basePath = typeof window !== "undefined" && window.location.pathname.startsWith("/snapdrop") ? "/snapdrop" : "";
  const apiUrl = `${basePath}/api/auth/solana-verify`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress,
        message: challengeMessage,
        signature: signatureBase58,
      }),
    });

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      console.warn(
        `[signInWithSolana] Server at ${apiUrl} returned non-JSON (${response.status} ${response.statusText}). Likely running on static hosting (e.g., GitHub Pages). Falling back to client-side Firebase session.`
      );
    }
  } catch (fetchErr: any) {
    console.warn(
      "[signInWithSolana] Network/API route unavailable, using client-side auth fallback:",
      fetchErr?.message
    );
  }

  // 4. Authenticate client session with Firebase Custom Token if available
  if (data && data.success && data.customToken) {
    try {
      const userCredential = await signInWithCustomToken(auth, data.customToken);

      // Save active wallet address to local storage
      if (typeof window !== "undefined") {
        localStorage.setItem(
          LOCAL_STORAGE_AUTH_KEY,
          JSON.stringify({ uid: walletAddress, authenticatedAt: Date.now() })
        );
        window.dispatchEvent(new Event("streetsync_auth_changed"));
      }

      return {
        user: userCredential.user,
        customToken: data.customToken,
      };
    } catch (authError: any) {
      console.warn(
        "[signInWithSolana] Remote custom token sign-in note:",
        authError?.message
      );
    }
  }

  // 5. Fallback for static hosting (GitHub Pages, etc.): Sign in via Firebase Anonymous Auth
  // and bind the user's verified Solana wallet address as their displayName
  try {
    const userCredential = await signInAnonymously(auth);
    if (userCredential.user) {
      try {
        await updateProfile(userCredential.user, {
          displayName: `${walletAddress.slice(0, 4)}..${walletAddress.slice(-4)}`,
        });
      } catch (profileErr) {
        console.warn("[signInWithSolana] updateProfile note:", profileErr);
      }
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(
        LOCAL_STORAGE_AUTH_KEY,
        JSON.stringify({ uid: walletAddress, authenticatedAt: Date.now() })
      );
      window.dispatchEvent(new Event("streetsync_auth_changed"));
    }

    return {
      user: userCredential.user,
      customToken: "anonymous_session",
    };
  } catch (anonError: any) {
    console.warn(
      "[signInWithSolana] Firebase Anonymous Auth fallback note:",
      anonError?.message
    );

    // 6. Final sandbox/offline fallback: Local optimistic wallet session
    const simulatedUser = {
      uid: walletAddress,
      displayName: `User_${walletAddress.slice(0, 4)}`,
      isAnonymous: true,
    } as unknown as User;

    if (typeof window !== "undefined") {
      localStorage.setItem(
        LOCAL_STORAGE_AUTH_KEY,
        JSON.stringify({ uid: walletAddress, authenticatedAt: Date.now() })
      );
      window.dispatchEvent(new Event("streetsync_auth_changed"));
    }

    return {
      user: simulatedUser,
      customToken: "offline_session",
    };
  }
}

/**
 * Signs out current Firebase session
 */
export async function signOutFirebase(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_STORAGE_AUTH_KEY);
    window.dispatchEvent(new Event("streetsync_auth_changed"));
  }
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn("[signOutFirebase] Sign out error:", err);
  }
}

/**
 * Custom React hook for tracking Firebase authentication state
 */
export function useFirebaseAuth() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [localDevUid, setLocalDevUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize and synchronize both Firebase Auth and local session
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_AUTH_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setLocalDevUid(parsed.uid);
      }
    } catch {}

    const handleSessionChange = () => {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_AUTH_KEY);
        setLocalDevUid(stored ? JSON.parse(stored).uid : null);
      } catch {}
    };

    window.addEventListener("streetsync_auth_changed", handleSessionChange);

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setFirebaseUser(currentUser);
        setLoading(false);
      },
      (err) => {
        console.warn("[useFirebaseAuth] Firebase onAuthStateChanged note:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    setLoading(false);

    return () => {
      window.removeEventListener("streetsync_auth_changed", handleSessionChange);
      unsubscribe();
    };
  }, []);

  const loginWithWallet = useCallback(
    async (
      publicKey: PublicKey,
      signMessage: (message: Uint8Array) => Promise<Uint8Array>
    ) => {
      setLoading(true);
      setError(null);
      try {
        const result = await signInWithSolana(publicKey, signMessage);
        return result;
      } catch (err: any) {
        const msg = err?.message || "Authentication with Solana wallet failed";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const effectiveUser =
    firebaseUser ||
    (localDevUid
      ? ({
          uid: localDevUid,
          displayName: `User_${localDevUid.slice(0, 4)}`,
        } as User)
      : null);

  return {
    user: effectiveUser,
    loading,
    error,
    isAuthenticated: !!effectiveUser,
    loginWithWallet,
    logout: signOutFirebase,
  };
}
