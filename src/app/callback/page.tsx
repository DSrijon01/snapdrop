"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { processPhantomMobileRedirect } from "@/lib/wallet/phantomDeeplink";
import { Connection } from "@solana/web3.js";
import { HELIUS_DEVNET_RPC } from "@/utils/solanaRpc";
import { resumePendingTransactions } from "@/utils/pendingTransactions";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function CallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Processing wallet response...");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const processCallback = async () => {
      try {
        const result = processPhantomMobileRedirect();
        if (result.handled) {
          setStatus("Wallet action confirmed! Resuming transaction...");
          try {
            const connection = new Connection(HELIUS_DEVNET_RPC, "confirmed");
            await resumePendingTransactions(connection);
          } catch (resErr) {
            console.warn("[CallbackPage] Resumption note:", resErr);
          }
        }
      } catch (e) {
        console.warn("[CallbackPage] Error parsing redirect:", e);
      }

      let returnUrl = localStorage.getItem("phantom_mobile_return_url") || sessionStorage.getItem("phantom_mobile_return_url") || "/";
      try {
        const rawPending = localStorage.getItem("street_sync_pending_mobile_action");
        if (rawPending) {
          const parsed = JSON.parse(rawPending);
          if (parsed.type && String(parsed.type).startsWith("EPLAYS_")) {
            returnUrl = "/e-plays";
          } else if (parsed.type && String(parsed.type).startsWith("SESSION")) {
            returnUrl = "/sessions";
          }
        }
      } catch {}

      // Check for pending SIWS or Sessions intent
      const pendingSiwsRaw = localStorage.getItem("street_sync_pending_siws");
      if (pendingSiwsRaw || returnUrl.toLowerCase().includes("sessions")) {
        returnUrl = "/sessions";
        try {
          if (pendingSiwsRaw) {
            const pendingSiws = JSON.parse(pendingSiwsRaw);
            const targetWallet = pendingSiws.walletAddress;
            const sig = localStorage.getItem("street_sync_last_tx_signature");
            if (targetWallet) {
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
              setStatus("Signed in with Solana! Returning to Sessions...");
            }
          }
        } catch (siwsErr) {
          console.warn("[CallbackPage] SIWS finalization note:", siwsErr);
        }
      }

      const cleanReturn = returnUrl.startsWith("http")
        ? new URL(returnUrl).pathname
        : returnUrl;

      setTimeout(() => {
        router.replace(cleanReturn);
      }, 500);
    };

    processCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#090a0f] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 animate-pulse">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
      <h2 className="text-xl font-black font-display uppercase tracking-tight mb-2">
        Street Sync
      </h2>
      <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest max-w-xs">
        {status}
      </p>
    </div>
  );
}
