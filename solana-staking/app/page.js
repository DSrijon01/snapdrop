"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import WalletConnect from "../components/WalletConnect";
import StakingStats from "../components/StakingStats";
import useStakingContract from "../hooks/useStakingContract";
import { formatTokenAmount } from "../utils/helpers";
import { TOKEN_DECIMALS } from "../utils/constants";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

export default function Dashboard() {
  const { publicKey } = useWallet();
  const {
    initialized,
    stakingPool,
    userStake,
    tokenBalance,
    fetchStakingData,
  } = useStakingContract();

  /// Fetch data when component mounts
  useEffect(() => {
    if (publicKey) {
      fetchStakingData();
    }
  }, [publicKey, fetchStakingData]);

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-secondary-400">
              Welcome to SolStake
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Stake your tokens on the Solana blockchain and earn rewards with
              our secure staking protocol.
            </p>
          </div>
          <WalletConnect />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400">Overview of your staking activity</p>
      </div>

      {/* Staking Stats */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Your Staking Overview</h2>
        <StakingStats />
      </section>

      {/* Quick Actions */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card bg-gray-800/90 hover:bg-gray-800/100 transition-colors">
            <div className="flex flex-col items-center justify-center p-6">
              <div className="bg-primary-600/20 rounded-full p-4 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-primary-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Stake Tokens</h3>
              <p className="text-gray-400 text-center mb-4">
                Lock your tokens to earn rewards over time.
              </p>
              <a href="/stake" className="btn-primary w-full text-center">
                Stake Now
              </a>
            </div>
          </div>

          <div className="card bg-gray-800/90 hover:bg-gray-800/100 transition-colors">
            <div className="flex flex-col items-center justify-center p-6">
              <div className="bg-secondary-600/20 rounded-full p-4 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-secondary-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 9a2 2 0 11-4 0 2 2 0 014 0zm6 8a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v10z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Claim Rewards</h3>
              <p className="text-gray-400 text-center mb-4">
                Harvest earned rewards from your staked tokens.
              </p>
              <a href="/rewards" className="btn-secondary w-full text-center">
                Claim Now
              </a>
            </div>
          </div>

          <div className="card bg-gray-800/90 hover:bg-gray-800/100 transition-colors">
            <div className="flex flex-col items-center justify-center p-6">
              <div className="bg-gray-600/20 rounded-full p-4 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Unstake Tokens</h3>
              <p className="text-gray-400 text-center mb-4">
                Withdraw your staked tokens back to your wallet.
              </p>
              <a href="/stake" className="btn-outline w-full text-center">
                Unstake
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Wallet Summary */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Wallet Summary</h2>
        <div className="card bg-gray-800/80">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Token Balance</h3>
                <div className="flex items-center">
                  <div className="mr-4 bg-gray-700 rounded-full p-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-primary-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                      <path
                        fillRule="evenodd"
                        d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">
                      {formatTokenAmount(tokenBalance, TOKEN_DECIMALS)}
                    </div>
                    <div className="text-gray-400">Available for staking</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Staked Balance</h3>
                <div className="flex items-center">
                  <div className="mr-4 bg-gray-700 rounded-full p-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-secondary-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">
                      {userStake
                        ? formatTokenAmount(
                            userStake.stakedAmount,
                            TOKEN_DECIMALS
                          )
                        : "0"}
                    </div>
                    <div className="text-gray-400">Currently staked</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
