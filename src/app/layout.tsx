import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { DevnetBanner } from "@/components/global/wallet/DevnetBanner";
import { ThemeProvider } from "@/components/global/theme-logo/ThemeProvider";
import { Sidebar } from "@/components/global/layout/Sidebar";
import { GlobalHeader } from "@/components/global/layout/GlobalHeader";
import { Footer } from "@/components/global/layout/Footer";
import { MobileNavDock } from "@/components/global/layout/MobileNavDock";
import { WalletGate } from "@/components/global/wallet/WalletGate";
import { WalletContextProvider } from "@/components/global/wallet/WalletContextProvider";
import { Toaster } from "react-hot-toast";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { SubscriptionModal } from "@/components/global/subscription/SubscriptionModal";
import { PWARegister } from "@/components/global/pwa/PWARegister";
import { InstallPromptModal } from "@/components/global/pwa/InstallPromptModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#DA291C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Street Sync | Sync Your Street",
  description: "The next generation of digital collectibles. Connect your wallet to access the marketplace.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Street Sync",
  },
  icons: {
    icon: "/pwa-192x192.png",
    shortcut: "/pwa-192x192.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Street Sync" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Defensive Anti-FOUC & WebKit Idle Fallback Styles */
              .hidden, [hidden] { display: none !important; }
              html, body { background-color: #000000; color: #ffffff; margin: 0; padding: 0; }
              img { max-width: 100%; height: auto; }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function areStylesActive() {
                  try {
                    var val = window.getComputedStyle(document.documentElement).getPropertyValue('--street-sync-styles-loaded');
                    return Boolean(val && val.trim() === '1');
                  } catch (e) {
                    return false;
                  }
                }

                function restoreStylesIfBroken() {
                  if (areStylesActive()) return;

                  console.warn('[StreetSync] Idle tab wake-up: Detached styles detected. Restoring...');

                  // 1. Fast-Path: Touch & re-link Next.js stylesheets with timestamp query
                  var links = document.querySelectorAll('link[rel="stylesheet"]');
                  for (var i = 0; i < links.length; i++) {
                    var link = links[i];
                    if (link.href && link.href.indexOf('/_next/static/css/') !== -1) {
                      var cleanHref = link.href.split('?')[0];
                      link.href = cleanHref + '?wake=' + Date.now();
                    }
                  }

                  // 2. Safety Fallback: If touching link tags did not re-resolve styles within 150ms, do clean reload
                  setTimeout(function() {
                    if (!areStylesActive()) {
                      var key = 'street_sync_idle_reload';
                      var now = Date.now();
                      var last = parseInt(sessionStorage.getItem(key) || '0', 10);
                      if (now - last > 5000) {
                        sessionStorage.setItem(key, String(now));
                        if (window.caches && caches.keys) {
                          caches.keys().then(function(keys) {
                            return Promise.all(keys.map(function(k) { return caches.delete(k); }));
                          }).finally(function() {
                            window.location.reload();
                          });
                        } else {
                          window.location.reload();
                        }
                      }
                    }
                  }, 150);
                }

                // A. Resource error listener (e.g. 404 or network drop on <link>)
                window.addEventListener('error', function(e) {
                  if (e.target && e.target.tagName === 'LINK' && e.target.rel === 'stylesheet') {
                    console.warn('[StreetSync] Stylesheet load error detected:', e.target.href);
                    restoreStylesIfBroken();
                  }
                }, true);

                // B. Listen for background tab wake-up (Page Visibility API)
                document.addEventListener('visibilitychange', function() {
                  if (document.visibilityState === 'visible') {
                    restoreStylesIfBroken();
                  }
                });

                // C. Listen for iOS WebKit Back-Forward Cache (bfcache) restoration
                window.addEventListener('pageshow', function(e) {
                  if (e.persisted) {
                    restoreStylesIfBroken();
                  }
                });

                // D. Listen for window refocus
                window.addEventListener('focus', function() {
                  restoreStylesIfBroken();
                });
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <ThemeProvider defaultTheme="light">
          <WalletContextProvider>
            <SubscriptionProvider>
              <PWARegister />
              <DevnetBanner />
              <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
                <GlobalHeader />
                <div className="flex flex-1 overflow-hidden relative">
                  <Sidebar />
                  <main className="flex-1 overflow-y-auto relative w-full pb-20 md:pb-0">
                    <WalletGate>
                      {children}
                    </WalletGate>
                  </main>
                </div>
                <Footer />
                <MobileNavDock />
              </div>
              <InstallPromptModal />
              <Toaster position="bottom-right" />
              <SubscriptionModal />
            </SubscriptionProvider>
          </WalletContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


