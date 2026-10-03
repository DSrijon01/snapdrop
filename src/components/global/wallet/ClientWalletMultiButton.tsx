"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { InstallWalletModal } from "./InstallWalletModal";

const BaseWalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export const ClientWalletMultiButton = (props: any) => {
  const { connected, wallets } = useWallet();
  const { setVisible } = useWalletModal();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [hasPendingInstall, setHasPendingInstall] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isPending = sessionStorage.getItem("street_sync_install_pending");
      setHasPendingInstall(Boolean(isPending));
    }
  }, []);

  const handleClick = () => {
    const isMobile = typeof window !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const hasInjected = typeof window !== "undefined" && Boolean((window as any).solana || (window as any).phantom);

    // If inside an in-app browser with injected provider (e.g. Phantom or Solflare in-app browser)
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
      (w) => w.readyState === WalletReadyState.Installed || (w.adapter.name === "Phantom" && hasInjected)
    );

    if (installedWallets.length === 0 && !hasInjected) {
      setShowInstallModal(true);
    } else {
      setVisible(true);
    }
  };

  if (connected) {
    return <BaseWalletMultiButton {...props} />;
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`wallet-adapter-button ${props.className || ""}`}
        style={{ pointerEvents: 'auto', ...props.style }}
      >
        {props.children || (hasPendingInstall ? "🔄 Reload to Connect" : "Select Wallet")}
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

