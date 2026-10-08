"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Register service worker at domain root
      const swUrl = "/sw.js";
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          console.log("[PWA] Service Worker registered successfully:", reg.scope);
          // Check for service worker updates on navigation
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });

      // Global window error listener for ChunkLoadError
      const handleWindowError = (event: ErrorEvent) => {
        const msg = (event.message || "").toLowerCase();
        if (msg.includes("loading chunk") || msg.includes("chunkloaderror")) {
          const reloadKey = "street_sync_last_chunk_reload";
          const lastReload = parseInt(sessionStorage.getItem(reloadKey) || "0", 10);
          const now = Date.now();
          if (now - lastReload > 15000) {
            sessionStorage.setItem(reloadKey, String(now));
            window.location.reload();
          }
        }
      };
      window.addEventListener("error", handleWindowError);
      return () => window.removeEventListener("error", handleWindowError);
    }
  }, []);

  return null;
}
