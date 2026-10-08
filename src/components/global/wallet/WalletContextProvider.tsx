"use client";

import { FC, ReactNode, useMemo, useEffect } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  TrustWalletAdapter,
} from "@solana/wallet-adapter-wallets";
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
import {
  processPhantomMobileRedirect,
  getStoredPhantomSession,
} from "@/lib/wallet/phantomDeeplink";
import {
  PhantomMobileWalletAdapter,
  PhantomMobileWalletName,
} from "@/lib/wallet/PhantomMobileWalletAdapter";
import { isStandaloneApp } from "@/utils/isStandaloneApp";

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
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || isStandaloneApp()) return;

    const autoOpen = sessionStorage.getItem("street_sync_auto_open_modal");
    if (autoOpen === "true") {
      sessionStorage.removeItem("street_sync_auto_open_modal");
      sessionStorage.removeItem("street_sync_install_pending");

      const timer = setTimeout(() => {
        setVisible(true);
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-in fade-in zoom-in-95 duration-200" : "animate-out fade-out duration-150"
              } max-w-sm w-full bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-3 flex items-center gap-3`}
            >
              <div className="w-10 h-10 rounded-xl bg-secondary/80 border border-border flex items-center justify-center p-1 relative shrink-0">
                <img
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=StreetSync&backgroundColor=transparent"
                  alt="Street Sync Bot"
                  className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(255,24,1,0.5)]"
                />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse border-2 border-card" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black font-display uppercase tracking-wide text-foreground">
                  Wallet Detected
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Ready to connect.
                </p>
              </div>
            </div>
          ),
          { duration: 4000 }
        );
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [setVisible, connected]);

  // 2. Tab focus listener when install is pending (desktop browser extensions only)
  useEffect(() => {
    if (typeof window === "undefined" || connected) return;
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || isStandaloneApp()) return;

    const handleTabFocus = () => {
      const isPending = sessionStorage.getItem("street_sync_install_pending");
      if (!isPending) return;

      const hasSolana = Boolean((window as any).solana || (window as any).phantom || (window as any).solflare);
      if (hasSolana) {
        sessionStorage.removeItem("street_sync_install_pending");
        setVisible(true);
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-in fade-in zoom-in-95 duration-200" : "animate-out fade-out duration-150"
              } max-w-sm w-full bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-3 flex items-center gap-3`}
            >
              <div className="w-10 h-10 rounded-xl bg-secondary/80 border border-border flex items-center justify-center p-1 relative shrink-0">
                <img
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=StreetSync&backgroundColor=transparent"
                  alt="Street Sync Bot"
                  className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(255,24,1,0.5)]"
                />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse border-2 border-card" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black font-display uppercase tracking-wide text-foreground">
                  Wallet Extension Ready
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Select your wallet to connect.
                </p>
              </div>
            </div>
          ),
          { duration: 4000 }
        );
      } else {
        // Show non-blocking interactive toast
        toast(
          (t) => (
            <div className="flex items-center gap-3 py-1">
              <img
                src="https://api.dicebear.com/7.x/bottts/svg?seed=EW9U&backgroundColor=transparent"
                alt="Street Sync Bot"
                className="w-8 h-8 object-contain shrink-0"
              />
              <div className="text-xs">
                <p className="font-bold text-foreground">Finished installing your wallet?</p>
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
 * Listens for mobile browser and standalone app returns from Phantom / Solflare deep links.
 * Decrypts connection payload, auto-selects adapter, calls connect, and dismisses any
 * open wallet selection modals so no duplicate/mock selection screens linger.
 */
const PhantomMobileRedirectWatcher: FC = () => {
  const { select, connect, wallet } = useWallet();
  const { setVisible } = useWalletModal();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const activateConnectedWallet = (walletType?: string, pubKeyStr?: string) => {
      // 1. Immediately dismiss any open wallet adapter modals so no duplicate/mock selection screen appears
      setVisible(false);

      // 2. Dispatch event to dismiss all custom modals (InstallWalletModal, SIWSModal)
      window.dispatchEvent(new CustomEvent("street_sync_close_all_modals"));

      // 3. Ensure localStorage has walletName set for WalletProvider autoConnect
      const targetWalletName =
        walletType === "solflare" ? "Solflare" : PhantomMobileWalletName;
      try {
        localStorage.setItem("walletName", JSON.stringify(targetWalletName));
      } catch {}

      // 4. Select the adapter
      select(targetWalletName as any);

      // 5. Connect the adapter immediately and in subsequent ticks to ensure WalletProvider syncs
      const tryConnect = () => {
        connect().catch((err) => {
          console.debug("[PhantomMobileRedirectWatcher] connect note:", err);
        });
      };
      tryConnect();
      const t1 = setTimeout(tryConnect, 50);
      const t2 = setTimeout(tryConnect, 150);
      const t3 = setTimeout(tryConnect, 350);

      // 6. Ensure SIWS auth syncs with the newly connected wallet
      if (pubKeyStr) {
        try {
          localStorage.setItem(
            "streetsync_solana_auth_user",
            JSON.stringify({
              uid: pubKeyStr,
              walletAddress: pubKeyStr,
              displayName: `${pubKeyStr.slice(0, 4)}..${pubKeyStr.slice(-4)}`,
              isGuest: false,
              authenticatedAt: Date.now(),
            })
          );
          window.dispatchEvent(new Event("streetsync_auth_changed"));
        } catch {}
      }

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    };

    // Check on initial load (in case of page reload or initial deep link URL)
    const res = processPhantomMobileRedirect();
    if (res.handled) {
      if (res.type === "connect" && res.publicKey) {
        const storedWalletType =
          sessionStorage.getItem("mobile_wallet_type") || "phantom";
        activateConnectedWallet(storedWalletType, res.publicKey);

        // Show avatar-based toast banner
        const shortKey = `${res.publicKey.slice(0, 4)}..${res.publicKey.slice(-4)}`;
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-in fade-in zoom-in-95 duration-200" : "animate-out fade-out duration-150"
              } max-w-sm w-full bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-3 flex items-center gap-3 pointer-events-auto`}
            >
              <div className="w-10 h-10 rounded-xl bg-secondary/80 border border-border flex items-center justify-center p-1 relative shrink-0">
                <img
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${res.publicKey}&backgroundColor=transparent`}
                  alt="Street Sync Bot"
                  className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(255,24,1,0.5)]"
                />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse border-2 border-card" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black font-display uppercase tracking-wide text-foreground">
                  Wallet Connected
                </p>
                <p className="text-[11px] text-muted-foreground font-mono truncate">
                  {shortKey}
                </p>
              </div>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors text-xs"
              >
                ✕
              </button>
            </div>
          ),
          { duration: 4000, id: "mobile-wallet-connected-toast" }
        );
      } else if (res.type === "error") {
        toast.error(res.error || "Connection cancelled.");
      }
    } else {
      // Also check if an active mobile session was already stored, ensure WalletProvider is selected & connected
      const stored = getStoredPhantomSession();
      if (stored && stored.publicKey && !wallet) {
        const storedWalletType = stored.walletType || "phantom";
        activateConnectedWallet(storedWalletType, stored.publicKey);
      }
    }

    // Listen for in-memory deep links returned to Android WebView via evaluateJavascript
    const handleMobileConnectedEvent = (e: any) => {
      const detail = e.detail;
      const walletType =
        detail?.walletType || sessionStorage.getItem("mobile_wallet_type") || "phantom";
      activateConnectedWallet(walletType, detail?.publicKey);

      if (detail?.publicKey) {
        const shortKey = `${detail.publicKey.slice(0, 4)}..${detail.publicKey.slice(-4)}`;
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-in fade-in zoom-in-95 duration-200" : "animate-out fade-out duration-150"
              } max-w-sm w-full bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-3 flex items-center gap-3 pointer-events-auto`}
            >
              <div className="w-10 h-10 rounded-xl bg-secondary/80 border border-border flex items-center justify-center p-1 relative shrink-0">
                <img
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${detail.publicKey}&backgroundColor=transparent`}
                  alt="Street Sync Bot"
                  className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(255,24,1,0.5)]"
                />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse border-2 border-card" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black font-display uppercase tracking-wide text-foreground">
                  Wallet Connected
                </p>
                <p className="text-[11px] text-muted-foreground font-mono truncate">
                  {shortKey}
                </p>
              </div>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors text-xs"
              >
                ✕
              </button>
            </div>
          ),
          { duration: 4000, id: "mobile-wallet-connected-toast" }
        );
      }
    };

    window.addEventListener("phantom_mobile_connected", handleMobileConnectedEvent);
    return () => {
      window.removeEventListener("phantom_mobile_connected", handleMobileConnectedEvent);
    };
  }, [select, connect, wallet, setVisible]);

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
      const isAndroid =
        typeof window !== "undefined" &&
        (/Android/i.test(navigator.userAgent) || isStandaloneApp());
      const hasInjectedPhantom =
        typeof window !== "undefined" &&
        Boolean((window as any).phantom?.solana);

      // Native Solana Mobile Wallet Adapter (Saga, Seeker, Android MWA & Seed Vault apps)
      const mwaAdapter = new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: "Street Sync",
          uri: origin,
          icon: "/pwa-192x192.png",
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        chain: network === WalletAdapterNetwork.Devnet ? "solana:devnet" : "solana:mainnet",
        onWalletNotFound: createMwaAdapterNotFoundHandler(),
      });

      // On mobile browsers without desktop extension:
      // Both Android and iOS use PhantomMobileWalletAdapter for 2-way universal deeplinks to Phantom app.
      // mwaAdapter is registered separately for Solana Mobile Standard / Saga / Seed Vault devices.
      const phantomAdapter =
        isMobile && !hasInjectedPhantom
          ? new PhantomMobileWalletAdapter()
          : new PhantomWalletAdapter();

      return [
        mwaAdapter,
        phantomAdapter,
        new SolflareWalletAdapter(),
        new CoinbaseWalletAdapter(),
        new TrustWalletAdapter(),
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
