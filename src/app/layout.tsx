import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { DevnetBanner } from "@/components/global/wallet/DevnetBanner";
import { ThemeProvider } from "@/components/global/theme-logo/ThemeProvider";
import { Sidebar } from "@/components/global/layout/Sidebar";
import { GlobalHeader } from "@/components/global/layout/GlobalHeader";
import { Footer } from "@/components/global/layout/Footer";
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
                  <main className="flex-1 overflow-y-auto relative w-full">
                    <WalletGate>
                      {children}
                    </WalletGate>
                  </main>
                </div>
                <Footer />
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


