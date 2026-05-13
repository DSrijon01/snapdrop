"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import useStakingContract from "../hooks/useStakingContract";
import { formatTokenAmount } from "../utils/helpers";
import { TOKEN_DECIMALS } from "../utils/constants";

const ClaimRewards = () => {
  const { publicKey } = useWallet();
  const { loading, initialized, claimRewards, userStake } =
    useStakingContract();

  const handleClaim = async () => {
    try {
      await claimRewards();
    } catch (error) {
      console.error("Error claiming rewards:", error);
    }
  };

  if (!publicKey) {
    return null;
  }

  if (!initialized) {
    return (
      <div className="card mb-8" id="rewards">
        <p className="text-center text-gray-400">
          Staking pool not initialized yet.
        </p>
      </div>
    );
  }

  const pendingRewards = userStake ? Number(userStake.rewardPending) : 0;
  const hasRewards = pendingRewards > 0;

  return (
    <div className="card mb-8" id="rewards">
      <h2 className="text-xl font-bold mb-6">Claim Rewards</h2>

      <div className="mb-4">
        <div className="bg-gray-700/50 rounded-lg p-6 text-center mb-6">
          <p className="text-gray-300 mb-2">Your Pending Rewards</p>
          <div className="text-3xl font-bold text-white mb-2">
            {formatTokenAmount(pendingRewards, TOKEN_DECIMALS)}
          </div>
          <p className="text-sm text-gray-400">Tokens</p>
        </div>

        <button
          onClick={handleClaim}
          disabled={loading || !hasRewards}
          className="btn-secondary w-full py-3"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin mr-2 h-5 w-5 border-t-2 border-b-2 border-white rounded-full"></div>
              Claiming...
            </div>
          ) : (
            "Claim Rewards"
          )}
        </button>

        {!hasRewards && (
          <p className="mt-4 text-sm text-gray-400 text-center">
            You don't have any rewards to claim yet. Stake your tokens to start
            earning!
          </p>
        )}

        <div className="mt-4 text-sm text-gray-400">
          <p>
            Rewards are automatically calculated based on your staked amount and
            the time elapsed. You can claim your rewards at any time without
            affecting your staked tokens.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClaimRewards;
