"use client";

import { FC, ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import {
  WalletModalProvider,
  useWalletModal,
} from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import { clusterApiUrl } from "@solana/web3.js";
import toast from "react-hot-toast";

// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css";

import { HELIUS_DEVNET_RPC } from "@/utils/solanaRpc";

/**
 * Listens for newly installed wallet extensions and handles auto-reconnect on reload
 * without forcing the user to manually retype the URL.
 */
const WalletExtensionWatcher: FC = () => {
  const { setVisible } = useWalletModal();
  const { connected } = useWallet();

  // 1. Auto-open modal after reload
  useEffect(() => {
    if (typeof window === "undefined" || connected) return;

    const autoOpen = sessionStorage.getItem("street_sync_auto_open_modal");
    if (autoOpen === "true") {
      sessionStorage.removeItem("street_sync_auto_open_modal");
      sessionStorage.removeItem("street_sync_install_pending");

      const timer = setTimeout(() => {
        setVisible(true);
        toast.success("Wallet extension detected! Select Phantom to connect.", {
          duration: 5000,
          icon: "👻",
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [setVisible, connected]);

  // 2. Tab focus listener when install is pending
  useEffect(() => {
    if (typeof window === "undefined" || connected) return;

    const handleTabFocus = () => {
      const isPending = sessionStorage.getItem("street_sync_install_pending");
      if (!isPending) return;

      const hasSolana = Boolean((window as any).solana || (window as any).phantom);
      if (hasSolana) {
        sessionStorage.removeItem("street_sync_install_pending");
        setVisible(true);
        toast.success("Phantom detected! Ready to connect.", { icon: "👻" });
      } else {
        // Show non-blocking interactive toast
        toast(
          (t) => (
            <div className="flex items-center gap-3 py-1">
              <span className="text-xl">👻</span>
              <div className="text-xs">
                <p className="font-bold text-foreground">Finished installing Phantom?</p>
                <p className="text-muted-foreground">Click to activate the extension in this tab.</p>
              </div>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  sessionStorage.setItem("street_sync_auto_open_modal", "true");
                  sessionStorage.removeItem("street_sync_install_pending");
                  window.location.reload();
                }}
                className="px-3 py-1.5 bg-primary text-primary-foreground font-bold rounded-lg text-xs hover:bg-primary/90 transition-all shrink-0 ml-2 shadow-sm font-display uppercase tracking-wider"
              >
                Reload & Connect
              </button>
            </div>
          ),
          { id: "phantom-install-toast", duration: 12000 }
        );
      }
    };

    window.addEventListener("focus", handleTabFocus);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleTabFocus();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleTabFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [setVisible, connected]);

  return null;
};

export const WalletContextProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL || HELIUS_DEVNET_RPC || clusterApiUrl(network),
    [network]
  );

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletExtensionWatcher />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
