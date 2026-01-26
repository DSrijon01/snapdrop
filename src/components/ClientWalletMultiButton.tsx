"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import dynamic from "next/dynamic";

const BaseWalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ClientWalletMultiButton = (props: any) => {
  const { connected, wallets } = useWallet();
  const { setVisible } = useWalletModal();

  const handleClick = () => {
    // Check if any wallet is installed (readyState === "Installed")
    const installedWallets = wallets.filter((w) => w.readyState === WalletReadyState.Installed);

    if (installedWallets.length === 0) {
      // No wallet installed -> Redirect to Phantom
      window.open("https://phantom.app/", "_blank");
    } else {
      // Wallet installed -> Open Modal
      setVisible(true);
    }
  };

  if (connected) {
    return <BaseWalletMultiButton {...props} />;
  }

  return (
    <button
      onClick={handleClick}
      className={`wallet-adapter-button ${props.className || ""}`}
      style={{ pointerEvents: 'auto', ...props.style }}
    >
      {props.children || "Select Wallet"}
    </button>
  );
};
