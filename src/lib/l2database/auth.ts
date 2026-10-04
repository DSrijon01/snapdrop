"use client";

import { useEffect, useState, useCallback } from "react";
import {
  signInWithCustomToken,
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
  const response = await fetch("/api/auth/solana-verify", {
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

  const data = await response.json();

  if (!response.ok || !data.success || !data.customToken) {
    throw new Error(data.error || "Failed to verify Solana wallet on server");
  }

  // 4. Authenticate client session with Firebase Custom Token
  const userCredential = await signInWithCustomToken(auth, data.customToken);

  return {
    user: userCredential.user,
    customToken: data.customToken,
  };
}

/**
 * Signs out current Firebase session
 */
export async function signOutFirebase(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Custom React hook for tracking Firebase authentication state
 */
export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      },
      (err) => {
        console.error("[useFirebaseAuth] Auth state error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
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

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    loginWithWallet,
    logout: signOutFirebase,
  };
}
