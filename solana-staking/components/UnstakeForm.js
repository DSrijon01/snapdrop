"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-hot-toast";
import useStakingContract from "../hooks/useStakingContract";
import { formatTokenAmount } from "../utils/helpers";
import { TOKEN_DECIMALS } from "../utils/constants";

const UnstakeForm = () => {
  const { publicKey } = useWallet();
  const { loading, initialized, unstakeTokens, userStake } =
    useStakingContract();

  const [amount, setAmount] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const amountInLamports = Math.floor(
      parseFloat(amount) * Math.pow(10, TOKEN_DECIMALS)
    );
    const stakedAmount = userStake ? Number(userStake.stakedAmount) : 0;

    if (amountInLamports > stakedAmount) {
      toast.error("Amount exceeds staked balance");
      return;
    }

    try {
      await unstakeTokens(amountInLamports);
      setAmount("");
    } catch (error) {
      console.error("Error unstaking tokens:", error);
      toast.error("Failed to unstake tokens");
    }
  };

  const handleMax = () => {
    if (userStake && userStake.stakedAmount > 0) {
      setAmount(
        (
          Number(userStake.stakedAmount) / Math.pow(10, TOKEN_DECIMALS)
        ).toString()
      );
    }
  };

  if (!publicKey) {
    return null;
  }

  if (!initialized) {
    return (
      <div className="card mb-8">
        <p className="text-center text-gray-400">
          Staking pool not initialized yet.
        </p>
      </div>
    );
  }

  const stakedAmount = userStake ? Number(userStake.stakedAmount) : 0;

  return (
    <div className="card mb-8">
      <h2 className="text-xl font-bold mb-6">Unstake Tokens</h2>

      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <label
            htmlFor="unstake-amount"
            className="block text-sm font-medium text-gray-300"
          >
            Amount to Unstake
          </label>
          <span className="text-sm text-gray-400">
            Staked: {formatTokenAmount(stakedAmount, TOKEN_DECIMALS)}
          </span>
        </div>

        <div className="relative">
          <input
            id="unstake-amount"
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.1"
            className="input-field pr-20"
          />

          <button
            type="button"
            onClick={handleMax}
            disabled={loading || stakedAmount <= 0}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium px-2 py-1 rounded"
          >
            MAX
          </button>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSubmit}
            disabled={
              loading || !amount || parseFloat(amount) <= 0 || stakedAmount <= 0
            }
            className="btn-outline w-full py-3"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin mr-2 h-5 w-5 border-t-2 border-b-2 border-primary-500 rounded-full"></div>
                Unstaking...
              </div>
            ) : (
              "Unstake Tokens"
            )}
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-400">
          <p>
            Unstaking will withdraw your tokens from the staking pool. You'll
            continue to receive rewards until the unstaking transaction is
            processed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnstakeForm;
