import type { Metadata } from "next";
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
  // Loading as variable font to support all weights including 900 if available, 
  // or at least allow browser synthesis without fallback
});

export const metadata: Metadata = {
  title: "Street Sync | Sync Your Street",
  description: "The next generation of digital collectibles. Connect your wallet to access the marketplace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <ThemeProvider defaultTheme="light">
          <WalletContextProvider>
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
              <Toaster position="bottom-right" />
            </WalletContextProvider>
          </ThemeProvider>
      </body>
    </html>
  );
}

