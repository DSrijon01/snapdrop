"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import WalletConnect from "../../components/WalletConnect";
import ClaimRewards from "../../components/ClaimRewards";
import StakingStats from "../../components/StakingStats";
import useStakingContract from "../../hooks/useStakingContract";
import { formatTokenAmount, formatDate } from "../../utils/helpers";
import { TOKEN_DECIMALS } from "../../utils/constants";

export default function RewardsPage() {
  const { publicKey } = useWallet();
  const { initialized, fetchStakingData, userStake, stakingPool } =
    useStakingContract();

  useEffect(() => {
    if (publicKey) {
      fetchStakingData();
    }
  }, [publicKey, fetchStakingData]);

  if (!publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="max-w-md w-full">
          <WalletConnect />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Rewards</h1>
        <p className="text-gray-400">Manage and claim your staking rewards</p>
      </div>

      {/* Staking Stats */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Rewards Overview</h2>
        <StakingStats />
      </section>

      {/* Rewards Claim */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-6">Claim Your Rewards</h2>
        <ClaimRewards />
      </section>

      {/* Rewards Details */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-6">Rewards Details</h2>
        <div className="card bg-gray-800/80">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Current Reward Rate
                </h3>
                <div className="flex items-center">
                  <div className="mr-4 bg-gray-700 rounded-full p-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-primary-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {stakingPool
                        ? formatTokenAmount(
                            stakingPool.rewardRate,
                            TOKEN_DECIMALS
                          )
                        : "0"}{" "}
                      tokens/sec
                    </div>
                    <div className="text-gray-400">
                      Current rate for all stakers
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Last Staking Activity
                </h3>
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
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {userStake
                        ? formatDate(userStake.lastStakeTime)
                        : "Never"}
                    </div>
                    <div className="text-gray-400">
                      Last time you staked tokens
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rewards FAQ */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Rewards FAQ</h2>
        <div className="space-y-4">
          <div className="card bg-gray-800/80 p-6">
            <h3 className="text-lg font-semibold mb-2">
              How often can I claim rewards?
            </h3>
            <p className="text-gray-400">
              You can claim your rewards at any time. However, due to network
              transaction fees, it might be more economical to claim larger
              amounts less frequently.
            </p>
          </div>

          <div className="card bg-gray-800/80 p-6">
            <h3 className="text-lg font-semibold mb-2">
              Do rewards compound automatically?
            </h3>
            <p className="text-gray-400">
              No, rewards do not compound automatically. You need to claim your
              rewards and stake them again to achieve a compounding effect.
            </p>
          </div>

          <div className="card bg-gray-800/80 p-6">
            <h3 className="text-lg font-semibold mb-2">
              What happens to my rewards if I unstake?
            </h3>
            <p className="text-gray-400">
              When you unstake, any unclaimed rewards remain available for you
              to claim. Unstaking doesn't affect your accrued rewards.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
