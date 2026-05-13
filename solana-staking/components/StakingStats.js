"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import useStakingContract from "../hooks/useStakingContract";
import { formatTokenAmount, calculateAPY, formatDate } from "../utils/helpers";
import { TOKEN_DECIMALS } from "../utils/constants";

const StakingStats = () => {
  const { publicKey } = useWallet();
  const {
    loading,
    initialized,
    stakingPool,
    userStake,
    tokenBalance,
    fetchStakingData,
  } = useStakingContract();

  const [apy, setApy] = useState(0);

  useEffect(() => {
    if (stakingPool) {
      console.log("StakingStats received stakingPool:", stakingPool);
      // Calculate APY
      const calculatedApy = calculateAPY(
        Number(stakingPool.rewardRate),
        Number(stakingPool.totalStaked)
      );
      setApy(calculatedApy);

      // Update every minute
      const interval = setInterval(() => {
        fetchStakingData();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [stakingPool, fetchStakingData]);

  if (!publicKey) {
    return null;
  }

  if (!initialized) {
    return (
      <div className="card bg-gray-800/50 p-6 mb-8">
        <p className="text-center text-gray-400">
          Staking pool not initialized yet.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card bg-gray-800/50 p-6 mb-8">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        title="Your Staked Amount"
        value={
          userStake
            ? formatTokenAmount(userStake.stakedAmount, TOKEN_DECIMALS)
            : "0"
        }
        suffix="Tokens"
        icon="💰"
      />

      <StatCard
        title="Pending Rewards"
        value={
          userStake
            ? formatTokenAmount(userStake.rewardPending, TOKEN_DECIMALS)
            : "0"
        }
        suffix="Tokens"
        icon="✨"
      />

      <StatCard
        title="Current APY"
        value={apy.toFixed(2)}
        suffix="%"
        icon="📈"
      />

      <StatCard
        title="Total Pool Staked"
        value={
          stakingPool
            ? formatTokenAmount(stakingPool.totalStaked, TOKEN_DECIMALS)
            : "0"
        }
        suffix="Tokens"
        icon="🏦"
      />

      <StatCard
        title="Last Staked"
        value={userStake ? formatDate(userStake.lastStakeTime) : "Never"}
        icon="🕒"
        className="md:col-span-2"
      />

      <StatCard
        title="Reward Rate"
        value={
          stakingPool
            ? formatTokenAmount(stakingPool.rewardRate, TOKEN_DECIMALS)
            : "0"
        }
        suffix="Tokens/sec"
        icon="⏱️"
        className="md:col-span-2"
      />
    </div>
  );
};

const StatCard = ({ title, value, suffix, icon, className = "" }) => {
  return (
    <div
      className={`card bg-gray-800/80 hover:bg-gray-800 transition-colors p-5 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
          <div className="flex items-baseline">
            <span className="text-xl font-bold text-white">{value}</span>
            {suffix && (
              <span className="ml-1 text-gray-400 text-sm">{suffix}</span>
            )}
          </div>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
};

export default StakingStats;
