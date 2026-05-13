"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-hot-toast";
import useStakingContract from "../hooks/useStakingContract";
import { formatTokenAmount } from "../utils/helpers";
import { TOKEN_DECIMALS } from "../utils/constants";

const StakeForm = () => {
  const { publicKey } = useWallet();
  const { loading, initialized, stakeTokens, tokenBalance } =
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

    if (amountInLamports > tokenBalance) {
      toast.error("Insufficient token balance");
      return;
    }

    try {
      await stakeTokens(amountInLamports);
      setAmount("");
    } catch (error) {
      console.error("Error staking tokens:", error);
      toast.error("Failed to stake tokens");
    }
  };

  const handleMax = () => {
    if (tokenBalance > 0) {
      setAmount((tokenBalance / Math.pow(10, TOKEN_DECIMALS)).toString());
    }
  };

  if (!publicKey) {
    return null;
  }

  if (!initialized) {
    return (
      <div className="card mb-8" id="stake">
        <p className="text-center text-gray-400">
          Staking pool not initialized yet.
        </p>
      </div>
    );
  }

  return (
    <div className="card mb-8" id="stake">
      <h2 className="text-xl font-bold mb-6">Stake Tokens</h2>

      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <label
            htmlFor="stake-amount"
            className="block text-sm font-medium text-gray-300"
          >
            Amount to Stake
          </label>
          <span className="text-sm text-gray-400">
            Balance: {formatTokenAmount(tokenBalance, TOKEN_DECIMALS)}
          </span>
        </div>

        <div className="relative">
          <input
            id="stake-amount"
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
            disabled={loading || tokenBalance <= 0}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium px-2 py-1 rounded"
          >
            MAX
          </button>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSubmit}
            disabled={loading || !amount || parseFloat(amount) <= 0}
            className="btn-primary w-full py-3"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin mr-2 h-5 w-5 border-t-2 border-b-2 border-white rounded-full"></div>
                Staking...
              </div>
            ) : (
              "Stake Tokens"
            )}
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-400">
          <p>
            By staking your tokens, you'll start earning rewards based on the
            current APY. You can unstake your tokens at any time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StakeForm;
