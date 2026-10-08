"use client";

import { useEffect } from "react";
import { SessionsBoard } from "@/components/features/sessions/SessionsBoard";
import { ModuleSubscriptionWidget } from "@/components/global/subscription/ModuleSubscriptionWidget";
import { processPhantomMobileRedirect } from "@/lib/wallet/phantomDeeplink";

export default function SessionsPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (
        window.location.search.includes("phantom_encryption_public_key") ||
        window.location.search.includes("nonce") ||
        window.location.search.includes("data")
      ) {
        processPhantomMobileRedirect();
      }
    } catch (e) {
      console.warn("[SessionsPage] Mobile redirect parse note:", e);
    }
  }, []);
  return (
    <div className="flex flex-col items-center justify-start p-2.5 sm:p-6 md:p-8 min-h-full w-full">
      <div className="w-full max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6 border-b border-border/40 pb-3 sm:pb-6 mb-3 sm:mb-8 shrink-0">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-4xl font-black mb-1 sm:mb-2 font-display uppercase tracking-tight">Sessions</h1>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-2xl">
            Monitor and join active live trading sessions in the Street Sync network.
          </p>
        </div>
        <ModuleSubscriptionWidget moduleId="sessions" />
      </div>
      
      <div className="w-full flex-1">
        <SessionsBoard />
      </div>
    </div>
  );
}
