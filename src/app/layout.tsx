import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { DevnetBanner } from "@/components/DevnetBanner";
import { ThemeProvider } from "@/components/ThemeProvider";

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
          <DevnetBanner />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
