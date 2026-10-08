"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError] Uncaught Root Layout Exception:", error);

    // Auto-recover from stale Next.js chunks or Service Worker desyncs
    const errMsg = (error?.message || "").toLowerCase();
    const isChunkOrHydration =
      errMsg.includes("loading chunk") ||
      errMsg.includes("chunkloaderror") ||
      errMsg.includes("failed to fetch dynamically imported module") ||
      errMsg.includes("hydration");

    if (isChunkOrHydration) {
      const reloadKey = "street_sync_root_chunk_reload";
      let lastReload = 0;
      try {
        lastReload = parseInt(sessionStorage.getItem(reloadKey) || "0", 10);
      } catch {}

      const now = Date.now();
      // Reload automatically once per 20s if stale chunk detected
      if (now - lastReload > 20000) {
        try {
          sessionStorage.setItem(reloadKey, String(now));
        } catch {}

        if (typeof window !== "undefined") {
          // Unregister service workers and purge caches
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then((regs) => {
              for (const r of regs) r.unregister();
            });
          }
          if ("caches" in window) {
            window.caches.keys().then((names) => {
              Promise.all(names.map((n) => window.caches.delete(n))).finally(() => {
                window.location.reload();
              });
            });
          } else {
            window.location.reload();
          }
        }
      }
    }
  }, [error]);

  const handleHardRefresh = () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.clear();
      } catch {}

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          for (const r of regs) r.unregister();
        });
      }

      if ("caches" in window) {
        window.caches.keys().then((names) => {
          Promise.all(names.map((n) => window.caches.delete(n))).finally(() => {
            window.location.href = "/";
          });
        });
      } else {
        window.location.href = "/";
      }
    }
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <title>Street Sync | Refresh Needed</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background-color: #0c0d12;
            color: #f4f4f5;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
            overflow: hidden;
          }
          .card {
            background: rgba(24, 24, 27, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 32px 24px;
            max-width: 420px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 40px rgba(218, 41, 28, 0.15);
          }
          .logo {
            width: 64px;
            height: 64px;
            border-radius: 18px;
            background: linear-space(#DA291C, #9e1c12);
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 20px rgba(218, 41, 28, 0.4);
          }
          .logo img {
            width: 48px;
            height: 48px;
            object-fit: contain;
          }
          h1 {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.5px;
            text-transform: uppercase;
            margin-bottom: 8px;
            color: #ffffff;
          }
          p {
            font-size: 13px;
            color: #a1a1aa;
            line-height: 1.5;
            margin-bottom: 24px;
          }
          .btn-primary {
            display: block;
            width: 100%;
            background: #DA291C;
            color: #ffffff;
            border: none;
            padding: 14px 20px;
            border-radius: 14px;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            cursor: pointer;
            margin-bottom: 12px;
            box-shadow: 0 4px 14px rgba(218, 41, 28, 0.35);
            transition: transform 0.1s, opacity 0.1s;
          }
          .btn-primary:active {
            transform: scale(0.98);
            opacity: 0.9;
          }
          .btn-secondary {
            display: block;
            width: 100%;
            background: rgba(255, 255, 255, 0.06);
            color: #d4d4d8;
            border: 1px solid rgba(255, 255, 255, 0.12);
            padding: 12px 20px;
            border-radius: 14px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            cursor: pointer;
            transition: background 0.1s;
          }
          .btn-secondary:active {
            background: rgba(255, 255, 255, 0.12);
          }
          .digest {
            font-family: monospace;
            font-size: 10px;
            color: #71717a;
            margin-top: 18px;
            word-break: break-all;
          }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="logo">
            <img
              src="https://api.dicebear.com/7.x/bottts/svg?seed=StreetSync&backgroundColor=transparent"
              alt="Street Sync"
            />
          </div>
          <h1>Update Street Sync</h1>
          <p>
            A new version of Street Sync is available or your browser cached an older deployment bundle.
          </p>
          <button type="button" className="btn-primary" onClick={handleHardRefresh}>
            Reload &amp; Update App
          </button>
          <button type="button" className="btn-secondary" onClick={() => reset()}>
            Retry Session
          </button>
          {error?.digest && (
            <div className="digest">Error ID: {error.digest}</div>
          )}
        </div>
      </body>
    </html>
  );
}
