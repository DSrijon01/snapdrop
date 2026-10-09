"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Proactively purge legacy caches that may contain stale Next.js HTML documents
    if (typeof caches !== "undefined" && typeof caches.keys === "function") {
      caches.keys().then((keys) => {
        for (const key of keys) {
          if (key !== "street-sync-cache-v4") {
            console.log("[PWA] Purging outdated browser cache:", key);
            caches.delete(key);
          }
        }
      }).catch(() => {});
    }

    // 2. Register Service Worker with automatic update checks
    if ("serviceWorker" in navigator) {
      const swUrl = "/sw.js";
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          console.log("[PWA] Service Worker registered successfully:", reg.scope);
          // Check for service worker updates on navigation
          reg.update().catch(() => {});
          
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
    }

    // 3. Global error listeners to automatically recover from stale webpack chunks & hydration desyncs
    const recoverFromChunkError = (rawMsg: string) => {
      const msg = (rawMsg || "").toLowerCase();
      if (
        msg.includes("loading chunk") ||
        msg.includes("chunkloaderror") ||
        msg.includes("failed to fetch dynamically imported module")
      ) {
        const reloadKey = "street_sync_last_chunk_reload";
        let lastReload = 0;
        try {
          lastReload = parseInt(sessionStorage.getItem(reloadKey) || "0", 10);
        } catch {}

        const now = Date.now();
        if (now - lastReload > 15000) {
          try {
            sessionStorage.setItem(reloadKey, String(now));
          } catch {}

          if (typeof caches !== "undefined" && typeof caches.keys === "function") {
            caches.keys().then((names) => {
              return Promise.all(names.map((n) => caches.delete(n)));
            }).finally(() => {
              window.location.reload();
            });
          } else {
            window.location.reload();
          }
        }
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      recoverFromChunkError(event.message || (event.error?.message ?? ""));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = typeof reason === "string" ? reason : reason?.message || "";
      recoverFromChunkError(msg);
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
