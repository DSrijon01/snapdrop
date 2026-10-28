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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function areStylesLoaded() {
                  try {
                    return window.getComputedStyle(document.documentElement).getPropertyValue('--street-sync-styles-loaded').trim() === '1';
                  } catch(e) {
                    return false;
                  }
                }

                function recoverStyles(reason) {
                  if (areStylesLoaded()) return;
                  console.warn('[StreetSync] Missing styles detected (' + reason + '). Recovering...');

                  // 1. Try waking all stylesheet links by updating href with a wake param
                  var links = document.querySelectorAll('link[rel="stylesheet"]');
                  for (var i = 0; i < links.length; i++) {
                    var link = links[i];
                    var href = link.href.split('?')[0];
                    link.href = href + '?wake=' + Date.now();
                  }

                  // 2. If after 250ms styles are still unapplied, trigger a debounced reload
                  setTimeout(function() {
                    if (!areStylesLoaded()) {
                      try {
                        var key = 'street_sync_last_wake_reload';
                        var now = Date.now();
                        var last = parseInt(sessionStorage.getItem(key) || '0', 10);
                        if (now - last > 8000) {
                          sessionStorage.setItem(key, String(now));
                          window.location.reload();
                        }
                      } catch(err) {
                        window.location.reload();
                      }
                    }
                  }, 250);
                }

                // Check on DOM ready
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', function() {
                    setTimeout(function() { recoverStyles('domcontentloaded'); }, 150);
                  });
                } else {
                  setTimeout(function() { recoverStyles('initial'); }, 150);
                }

                // Tab wake-up from background (mobile idle tab restore)
                document.addEventListener('visibilitychange', function() {
                  if (document.visibilityState === 'visible') {
                    setTimeout(function() { recoverStyles('visibilitychange'); }, 150);
                  }
                });

                // bfcache / iOS page restoration
                window.addEventListener('pageshow', function(e) {
                  setTimeout(function() { recoverStyles('pageshow'); }, 150);
                });

                window.addEventListener('focus', function() {
                  setTimeout(function() { recoverStyles('focus'); }, 150);
                });

                // Resource load errors on link elements
                window.addEventListener('error', function(e) {
                  if (e.target && e.target.tagName === 'LINK' && e.target.rel === 'stylesheet') {
                    recoverStyles('link_error');
                  }
                }, true);
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


