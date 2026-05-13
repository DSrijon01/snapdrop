"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

const WalletConnect = () => {
  const { connected } = useWallet();

  return (
    <div className="card text-center p-8">
      <h2 className="text-2xl font-bold mb-6">Connect Your Wallet</h2>

      <div className="mb-6">
        <p className="text-gray-300 mb-4">
          Connect your Solana wallet to start staking and earning rewards.
        </p>

        <div className="flex justify-center">
          <WalletMultiButton className="btn-primary px-8 py-3 text-lg" />
        </div>
      </div>

      {!connected && (
        <div className="mt-8 bg-gray-700 rounded-lg p-4 text-sm text-gray-300">
          <p>
            Don't have a Solana wallet yet? We recommend{" "}
            <a
              href="https://phantom.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 hover:underline"
            >
              Phantom
            </a>{" "}
            or{" "}
            <a
              href="https://solflare.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 hover:underline"
            >
              Solflare
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;
