"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import WalletConnect from "../../components/WalletConnect";
import StakeForm from "../../components/StakeForm";
import UnstakeForm from "../../components/UnstakeForm";
import StakingStats from "../../components/StakingStats";
import useStakingContract from "../../hooks/useStakingContract";

export default function StakePage() {
  const { publicKey } = useWallet();
  const { initialized, fetchStakingData } = useStakingContract();

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
        <h1 className="text-3xl font-bold mb-2">Stake & Unstake</h1>
        <p className="text-gray-400">Manage your staked tokens</p>
      </div>

      {/* Staking Stats */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Your Staking Overview</h2>
        <StakingStats />
      </section>

      {/* Staking Actions */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Staking Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StakeForm />
          <UnstakeForm />
        </div>
      </section>

      {/* Staking Info */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6">How Staking Works</h2>
        <div className="card bg-gray-800/80">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-600 text-white text-xl font-bold mb-4">
                  1
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Stake Your Tokens
                </h3>
                <p className="text-gray-400">
                  Lock your tokens in the staking pool to start earning rewards.
                  The more you stake, the more you earn.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-600 text-white text-xl font-bold mb-4">
                  2
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Accumulate Rewards
                </h3>
                <p className="text-gray-400">
                  Rewards accumulate over time based on your staked amount and
                  the current APY rate.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-600 text-white text-xl font-bold mb-4">
                  3
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Claim or Compound
                </h3>
                <p className="text-gray-400">
                  Claim your rewards anytime, or stake more tokens to compound
                  your earnings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div className="card bg-gray-800/80 p-6">
            <h3 className="text-lg font-semibold mb-2">
              How are rewards calculated?
            </h3>
            <p className="text-gray-400">
              Rewards are calculated based on your staked amount, the reward
              rate, and the time elapsed since your last claim. The APY can vary
              depending on the total amount staked in the pool.
            </p>
          </div>

          <div className="card bg-gray-800/80 p-6">
            <h3 className="text-lg font-semibold mb-2">
              Can I unstake at any time?
            </h3>
            <p className="text-gray-400">
              Yes, you can unstake your tokens at any time. There's no lock-up
              period. When you unstake, you'll receive the tokens back in your
              wallet.
            </p>
          </div>

          <div className="card bg-gray-800/80 p-6">
            <h3 className="text-lg font-semibold mb-2">Are there any fees?</h3>
            <p className="text-gray-400">
              There are no direct fees for staking or unstaking. However, you
              will need to pay a small amount of SOL for transaction fees on the
              Solana network.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
