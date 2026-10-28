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
        msg.includes("failed to fetch dynamically imported module") ||
        msg.includes("stylesheet load failed") ||
        msg.includes("broken site styles")
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

    // Capture resource load errors (e.g. stylesheet 404s) which do not bubble to window
    const handleCaptureResourceError = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target && target.tagName === "LINK" && (target as HTMLLinkElement).rel === "stylesheet") {
        console.warn("[PWA] Critical stylesheet failed to load:", (target as HTMLLinkElement).href);
        recoverFromChunkError("stylesheet load failed");
      }
    };

    // 4. Stylesheet health check: Verify critical styles actually loaded within 2 seconds
    const checkStyleHealth = () => {
      try {
        const isLoaded = getComputedStyle(document.documentElement).getPropertyValue("--street-sync-styles-loaded").trim();
        if (!isLoaded || isLoaded !== "1") {
          console.warn("[PWA] Broken site load detected! Styles not loaded after mount/wake, recovering...");
          recoverFromChunkError("broken site styles");
        }
      } catch {}
    };

    const styleHealthCheck = setTimeout(checkStyleHealth, 2000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setTimeout(checkStyleHealth, 200);
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setTimeout(checkStyleHealth, 200);
      }
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("error", handleCaptureResourceError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      clearTimeout(styleHealthCheck);
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("error", handleCaptureResourceError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return null;
}
