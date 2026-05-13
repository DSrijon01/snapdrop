import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-hot-toast";
import useStakingContract from "../hooks/useStakingContract";
import { formatTokenAmount } from "../utils/helpers";
import { TOKEN_DECIMALS } from "../utils/constants";

const AdminPanel = () => {
  const { publicKey } = useWallet();
  const {
    loading,
    initialized,
    isAdmin,
    initializePool,
    addRewards,
    updateRewardRate,
    stakingPool,
  } = useStakingContract();

  const [rewardRate, setRewardRate] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [newRewardRate, setNewRewardRate] = useState("");

  const handleInitialize = async (e) => {
    e.preventDefault();

    if (!rewardRate || isNaN(rewardRate) || parseFloat(rewardRate) <= 0) {
      toast.error("Please enter a valid reward rate");
      return;
    }

    const rateInLamports = Math.floor(
      parseFloat(rewardRate) * Math.pow(10, TOKEN_DECIMALS)
    );

    try {
      await initializePool(rateInLamports);
      setRewardRate("");
    } catch (error) {
      console.error("Error initializing pool:", error);
      toast.error("Failed to initialize staking pool");
    }
  };

  const handleAddRewards = async (e) => {
    e.preventDefault();

    if (!rewardAmount || isNaN(rewardAmount) || parseFloat(rewardAmount) <= 0) {
      toast.error("Please enter a valid reward amount");
      return;
    }

    const amountInLamports = Math.floor(
      parseFloat(rewardAmount) * Math.pow(10, TOKEN_DECIMALS)
    );

    try {
      await addRewards(amountInLamports);
      setRewardAmount("");
    } catch (error) {
      console.error("Error adding rewards:", error);
      toast.error("Failed to add rewards");
    }
  };

  const handleUpdateRewardRate = async (e) => {
    e.preventDefault();

    if (
      !newRewardRate ||
      isNaN(newRewardRate) ||
      parseFloat(newRewardRate) <= 0
    ) {
      toast.error("Please enter a valid reward rate");
      return;
    }

    const rateInLamports = Math.floor(
      parseFloat(newRewardRate) * Math.pow(10, TOKEN_DECIMALS)
    );

    try {
      await updateRewardRate(rateInLamports);
      setNewRewardRate("");
    } catch (error) {
      console.error("Error updating reward rate:", error);
      toast.error("Failed to update reward rate");
    }
  };

  if (!publicKey) {
    return null;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="card border border-amber-500/20 mb-8" id="admin">
      <div className="flex items-center mb-6">
        <div className="bg-amber-500/20 rounded-lg p-2 mr-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-amber-500">Admin Controls</h2>
      </div>

      {!initialized ? (
        <div className="bg-gray-700/30 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            Initialize Staking Pool
          </h3>

          <div className="mb-4">
            <label
              htmlFor="reward-rate"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Initial Reward Rate (tokens per second)
            </label>
            <input
              id="reward-rate"
              type="number"
              placeholder="0.00001"
              value={rewardRate}
              onChange={(e) => setRewardRate(e.target.value)}
              min="0"
              step="0.00001"
              className="input-field"
            />
          </div>

          <button
            onClick={handleInitialize}
            disabled={loading || !rewardRate || parseFloat(rewardRate) <= 0}
            className="btn-primary w-full py-3"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin mr-2 h-5 w-5 border-t-2 border-b-2 border-white rounded-full"></div>
                Initializing...
              </div>
            ) : (
              "Initialize Staking Pool"
            )}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-700/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Add Rewards</h3>

              <div className="mb-4">
                <label
                  htmlFor="reward-amount"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Reward Amount
                </label>
                <input
                  id="reward-amount"
                  type="number"
                  placeholder="0.0"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  min="0"
                  step="0.1"
                  className="input-field"
                />
              </div>

              <button
                onClick={handleAddRewards}
                disabled={
                  loading || !rewardAmount || parseFloat(rewardAmount) <= 0
                }
                className="btn-primary w-full py-3"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin mr-2 h-5 w-5 border-t-2 border-b-2 border-white rounded-full"></div>
                    Adding...
                  </div>
                ) : (
                  "Add Rewards"
                )}
              </button>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Update Reward Rate</h3>

              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <label
                    htmlFor="new-reward-rate"
                    className="block text-sm font-medium text-gray-300"
                  >
                    New Reward Rate (tokens/sec)
                  </label>
                  {stakingPool && (
                    <span className="text-sm text-gray-400">
                      Current:{" "}
                      {formatTokenAmount(
                        stakingPool.rewardRate,
                        TOKEN_DECIMALS
                      )}
                      /sec
                    </span>
                  )}
                </div>
                <input
                  id="new-reward-rate"
                  type="number"
                  placeholder="0.00001"
                  value={newRewardRate}
                  onChange={(e) => setNewRewardRate(e.target.value)}
                  min="0"
                  step="0.00001"
                  className="input-field"
                />
              </div>

              <button
                onClick={handleUpdateRewardRate}
                disabled={
                  loading || !newRewardRate || parseFloat(newRewardRate) <= 0
                }
                className="btn-primary w-full py-3"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin mr-2 h-5 w-5 border-t-2 border-b-2 border-white rounded-full"></div>
                    Updating...
                  </div>
                ) : (
                  "Update Rate"
                )}
              </button>
            </div>
          </div>

          <div className="text-sm text-amber-400/70 p-4 bg-amber-500/10 rounded-lg">
            <p className="flex items-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                <strong>Admin Notice:</strong> Make sure you have enough tokens
                in your wallet before adding rewards. The reward rate determines
                how many tokens are distributed per second to all stakers
                proportionally.
              </span>
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPanel;
