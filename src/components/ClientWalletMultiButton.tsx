"use client";

import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ClientWalletMultiButton = (props: any) => {
  return <WalletMultiButton {...props} />;
};
