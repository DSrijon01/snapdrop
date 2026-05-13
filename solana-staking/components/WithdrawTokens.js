"use client";

import { useState } from "react";
import { formatTokenAmount } from "../utils/helpers";
import { TOKEN_DECIMALS } from "../utils/constants";

const WithdrawTokens = ({ onWithdraw, rewardVaultBalance, loading }) => {
  const [amount, setAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const withdrawAmount = Math.floor(
      parseFloat(amount) * Math.pow(10, TOKEN_DECIMALS)
    );

    if (withdrawAmount > rewardVaultBalance) {
      toast.error("Amount exceeds available balance");
      return;
    }

    setIsWithdrawing(true);
    try {
      const success = await onWithdraw(withdrawAmount);
      if (success) {
        setAmount("");
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleMax = () => {
    if (rewardVaultBalance > 0) {
      setAmount((rewardVaultBalance / Math.pow(10, TOKEN_DECIMALS)).toString());
    }
  };

  return (
    <div className="bg-red-900/20 rounded-lg p-6 border border-red-500/30">
      <h3 className="text-lg font-semibold mb-4 text-red-400">
        Withdraw Tokens
      </h3>
      <p className="text-gray-300 mb-4">
        As an admin, you can withdraw tokens from the staking vault. Use this
        feature carefully as it will reduce the available rewards.
      </p>

      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <label
            htmlFor="withdraw-amount"
            className="block text-sm font-medium text-gray-300"
          >
            Amount to Withdraw
          </label>
          <span className="text-sm text-gray-400">
            Available: {formatTokenAmount(rewardVaultBalance, TOKEN_DECIMALS)}
          </span>
        </div>

        <div className="relative">
          <input
            id="withdraw-amount"
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.1"
            className="input-field pr-20"
            disabled={isWithdrawing || loading}
          />

          <button
            type="button"
            onClick={handleMax}
            disabled={isWithdrawing || loading || rewardVaultBalance <= 0}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium px-2 py-1 rounded"
          >
            MAX
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-red-400">
          <p className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2h2a1 1 0 100-2H9z"
                clipRule="evenodd"
              />
            </svg>
            Admin function only
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={
            isWithdrawing ||
            loading ||
            !amount ||
            parseFloat(amount) <= 0 ||
            parseFloat(amount) >
              rewardVaultBalance / Math.pow(10, TOKEN_DECIMALS)
          }
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isWithdrawing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin mr-2 h-5 w-5 border-t-2 border-b-2 border-white rounded-full"></div>
              Withdrawing...
            </div>
          ) : (
            "Withdraw Tokens"
          )}
        </button>
      </div>
    </div>
  );
};

export default WithdrawTokens;
