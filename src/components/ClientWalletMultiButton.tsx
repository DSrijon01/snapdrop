"use client";

import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export const ClientWalletMultiButton = (props: any) => {
  return <WalletMultiButton {...props} />;
};
