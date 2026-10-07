"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { InstallWalletModal } from "./InstallWalletModal";

import { getStoredPhantomSession } from "@/lib/wallet/phantomDeeplink";
import { isStandaloneApp } from "@/utils/isStandaloneApp";

const BaseWalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export const ClientWalletMultiButton = (props: any) => {
  const { connected, wallets, select, connect } = useWallet();
  const { setVisible } = useWalletModal();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [hasPendingInstall, setHasPendingInstall] = useState(false);
  const [hasMobileSession, setHasMobileSession] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isPending = sessionStorage.getItem("street_sync_install_pending");
      setHasPendingInstall(Boolean(isPending));

      const session = getStoredPhantomSession();
      setHasMobileSession(Boolean(session && session.publicKey));

      setIsStandalone(isStandaloneApp());

      const handleConnect = () => setHasMobileSession(true);
      const handleDisconnect = () => setHasMobileSession(false);
      window.addEventListener("phantom_mobile_connected", handleConnect);
      window.addEventListener("phantom_mobile_disconnected", handleDisconnect);
      return () => {
        window.removeEventListener("phantom_mobile_connected", handleConnect);
        window.removeEventListener("phantom_mobile_disconnected", handleDisconnect);
      };
    }
  }, []);

  const handleClick = () => {
    // In standalone native Android app: directly connect via Mobile Wallet Adapter without browser redirects
    if (isStandaloneApp()) {
      const mwaWallet = wallets.find(
        (w) => w.adapter.name === "Mobile Wallet Adapter"
      );
      if (mwaWallet) {
        select(mwaWallet.adapter.name);
        connect().catch((err) => {
          console.debug("MWA direct connect error/rejected:", err);
        });
        return;
      }
      setVisible(true);
      return;
    }

    const isMobile = typeof window !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const hasInjected = typeof window !== "undefined" && Boolean(
      (window as any).solana ||
      (window as any).phantom ||
      (window as any).solflare ||
      (window as any).coinbaseSolana ||
      (window as any).backpack
    );

    // If inside an in-app browser with injected provider (e.g. Phantom, Solflare, or Coinbase in-app browser)
    if (hasInjected) {
      setVisible(true);
      return;
    }

    // On mobile web browsers (Safari, Chrome, etc.), show the mobile-optimized modal with 1-tap Phantom app deep-link & MWA
    if (isMobile) {
      setShowInstallModal(true);
      return;
    }

    // On desktop: check if any browser extension wallet is installed
    const installedWallets = wallets.filter(
      (w) =>
        w.readyState === WalletReadyState.Installed ||
        ((w.adapter.name === "Phantom" || w.adapter.name === "Solflare") && hasInjected)
    );

    if (installedWallets.length === 0 && !hasInjected) {
      setShowInstallModal(true);
    } else {
      setVisible(true);
    }
  };

  if (connected || hasMobileSession) {
    return <BaseWalletMultiButton {...props} />;
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`wallet-adapter-button ${props.className || ""}`}
        style={{ pointerEvents: 'auto', ...props.style }}
      >
        {props.children || (hasPendingInstall ? "🔄 Reload to Connect" : isStandalone ? "Connect Mobile Wallet" : "Select Wallet")}
      </button>

      <InstallWalletModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        onOpenStandardModal={() => {
          setShowInstallModal(false);
          setVisible(true);
        }}
      />
    </>
  );
};

