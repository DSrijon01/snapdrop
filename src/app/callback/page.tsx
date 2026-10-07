"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { processPhantomMobileRedirect } from "@/lib/wallet/phantomDeeplink";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function CallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Processing wallet response...");

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const result = processPhantomMobileRedirect();
      if (result.handled) {
        setStatus("Wallet action confirmed! Redirecting...");
      }
    } catch (e) {
      console.warn("[CallbackPage] Error parsing redirect:", e);
    }

    const returnUrl = sessionStorage.getItem("phantom_mobile_return_url") || "/";
    const cleanReturn = returnUrl.startsWith("http")
      ? new URL(returnUrl).pathname
      : returnUrl;

    const timer = setTimeout(() => {
      router.replace(cleanReturn);
    }, 600);

    return () => clearTimeout(timer);
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
