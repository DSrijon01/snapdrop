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
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
    }
  }, []);

  return null;
}
