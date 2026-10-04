"use client";

import { FC, ReactNode, useMemo, useEffect } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import {
  WalletModalProvider,
  useWalletModal,
} from "@solana/wallet-adapter-react-ui";
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler as createMwaAdapterNotFoundHandler,
} from "@solana-mobile/wallet-adapter-mobile";
import {
  registerMwa,
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler as createMwaStandardNotFoundHandler,
} from "@solana-mobile/wallet-standard-mobile";
import { clusterApiUrl } from "@solana/web3.js";
import toast from "react-hot-toast";

// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css";

import { HELIUS_DEVNET_RPC } from "@/utils/solanaRpc";
import { processPhantomMobileRedirect } from "@/lib/wallet/phantomDeeplink";
import {
  PhantomMobileWalletAdapter,
  PhantomMobileWalletName,
} from "@/lib/wallet/PhantomMobileWalletAdapter";

/**
 * Listens for newly installed wallet extensions on desktop and handles auto-reconnect on reload
 * without forcing the user to manually retype the URL.
 * Automatically bypassed on mobile devices where Mobile Wallet Adapter (MWA) handles native apps.
 */
const WalletExtensionWatcher: FC = () => {
  const { setVisible } = useWalletModal();
  const { connected } = useWallet();

  // 1. Auto-open modal after reload (desktop browser extensions only)
  useEffect(() => {
    if (typeof window === "undefined" || connected) return;
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;

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

  // 2. Tab focus listener when install is pending (desktop browser extensions only)
  useEffect(() => {
    if (typeof window === "undefined" || connected) return;
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;

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

/**
 * Listens for mobile browser returns from Phantom App deep-links.
 * Decrypts the connection payload, extracts the public key, and activates the session.
 */
const PhantomMobileRedirectWatcher: FC = () => {
  const { select } = useWallet();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const res = processPhantomMobileRedirect();
    if (res.handled) {
      if (res.type === "connect" && res.publicKey) {
        select(PhantomMobileWalletName);
        toast.success(
          `Connected Phantom: ${res.publicKey.slice(0, 4)}..${res.publicKey.slice(-4)}! Returned to browser.`,
          {
            icon: "👻",
            duration: 5000,
          }
        );
      } else if (res.type === "error") {
        toast.error(res.error || "Phantom connection cancelled.");
      }
    }
  }, [select]);

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

  // Register Solana Mobile Wallet Standard (MWA) for mobile web and Solana Mobile WebShell
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const origin = window.location.origin.startsWith("http")
        ? window.location.origin
        : "https://streetsync-ss.com";

      registerMwa({
        appIdentity: {
          name: "Street Sync",
          uri: origin,
          icon: "/pwa-192x192.png",
        },
        authorizationCache: createDefaultAuthorizationCache(),
        chains: [
          network === WalletAdapterNetwork.Devnet
            ? ("solana:devnet" as const)
            : ("solana:mainnet" as const),
        ] as any,
        chainSelector: createDefaultChainSelector(),
        onWalletNotFound: createMwaStandardNotFoundHandler(),
      });
    } catch (e) {
      // Non-fatal if environment doesn't allow registration (e.g. non-secure dev context or unsupported browser)
      console.debug("MWA auto-registration note:", e);
    }
  }, [network]);

  const wallets = useMemo(
    () => {
      const origin =
        typeof window !== "undefined" && window.location.origin.startsWith("http")
          ? window.location.origin
          : "https://streetsync-ss.com";

      const isMobile =
        typeof window !== "undefined" &&
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const hasInjectedPhantom =
        typeof window !== "undefined" &&
        Boolean((window as any).phantom?.solana);

      // On mobile browsers without desktop extension, use PhantomMobileWalletAdapter for 2-way deep linking
      const phantomAdapter =
        isMobile && !hasInjectedPhantom
          ? new PhantomMobileWalletAdapter()
          : new PhantomWalletAdapter();

      return [
        // Native Solana Mobile Wallet Adapter (Saga, Seeker, Android MWA & Seed Vault apps)
        new SolanaMobileWalletAdapter({
          addressSelector: createDefaultAddressSelector(),
          appIdentity: {
            name: "Street Sync",
            uri: origin,
            icon: "/pwa-192x192.png",
          },
          authorizationResultCache: createDefaultAuthorizationResultCache(),
          chain: network === WalletAdapterNetwork.Devnet ? "solana:devnet" : "solana:mainnet",
          onWalletNotFound: createMwaAdapterNotFoundHandler(),
        }),
        phantomAdapter,
        new SolflareWalletAdapter(),
      ];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletExtensionWatcher />
          <PhantomMobileRedirectWatcher />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

