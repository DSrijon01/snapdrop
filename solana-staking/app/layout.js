import "./globals.css";
import { Toaster } from "react-hot-toast";
import { WalletContextProvider } from "../contexts/WalletContext";
import DashboardLayout from "../components/DashboardLayout";

export const metadata = {
  title: "Solana Staking dApp",
  description:
    "Stake your tokens and earn rewards with our Solana staking dApp",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-900 text-white">
        <WalletContextProvider>
          <DashboardLayout>{children}</DashboardLayout>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#1e293b",
                color: "#fff",
                border: "1px solid #334155",
              },
              success: {
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#1e293b",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#1e293b",
                },
              },
            }}
          />
        </WalletContextProvider>
      </body>
    </html>
  );
}
