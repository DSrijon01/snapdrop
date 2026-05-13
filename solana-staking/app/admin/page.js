"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import AdminPanel from "../../components/AdminPanel";
import WithdrawTokens from "../../components/WithdrawTokens";
import useStakingContract from "../../hooks/useStakingContract";
import { formatTokenAmount } from "../../utils/helpers";
import { TOKEN_DECIMALS } from "../../utils/constants";
import { useConnection } from "@solana/wallet-adapter-react";

export default function AdminPage() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const {
    isAdmin,
    initialized,
    stakingPool,
    fetchStakingData,
    withdrawTokens,
  } = useStakingContract();

  const [rewardVaultBalance, setRewardVaultBalance] = useState(0);
  const [rewardVaultAddress, setRewardVaultAddress] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (publicKey) {
      fetchStakingData();
    }
  }, [publicKey, fetchStakingData]);

  // Fetch reward vault balance
  useEffect(() => {
    const fetchRewardVaultBalance = async () => {
      if (stakingPool && stakingPool.rewardVault && connection) {
        try {
          setLoading(true);
          const rewardVaultPubkey = stakingPool.rewardVault;
          setRewardVaultAddress(rewardVaultPubkey.toString());

          // Get account info for the reward vault
          const tokenAccountInfo = await getAccount(
            connection,
            rewardVaultPubkey
          );
          setRewardVaultBalance(Number(tokenAccountInfo.amount));
        } catch (error) {
          console.error("Error fetching reward vault balance:", error);
          setRewardVaultBalance(0);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchRewardVaultBalance();
  }, [stakingPool, connection]);

  // Fetch staking vault balance as well
  const [stakingVaultBalance, setStakingVaultBalance] = useState(0);
  const [stakingVaultAddress, setStakingVaultAddress] = useState(null);

  useEffect(() => {
    const fetchStakingVaultBalance = async () => {
      if (stakingPool && stakingPool.stakingVault && connection) {
        try {
          setLoading(true);
          const stakingVaultPubkey = stakingPool.stakingVault;
          setStakingVaultAddress(stakingVaultPubkey.toString());

          // Get account info for the staking vault
          const tokenAccountInfo = await getAccount(
            connection,
            stakingVaultPubkey
          );
          setStakingVaultBalance(Number(tokenAccountInfo.amount));
        } catch (error) {
          console.error("Error fetching staking vault balance:", error);
          setStakingVaultBalance(0);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchStakingVaultBalance();
  }, [stakingPool, connection]);

  // Handle token withdrawal
  const handleWithdraw = async (amount) => {
    return await withdrawTokens(amount);
  };

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="card p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4">Admin Access</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to access admin features.
          </p>
          <button className="btn-primary px-8 py-3">Connect Wallet</button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="text-amber-500 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-4V7a3 3 0 00-3-3H6m12 0a3 3 0 00-3 3v7m3 0a3 3 0 100 6 3 3 0 000-6z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
          <p className="text-gray-400 mb-2">
            This area is only accessible to admin users.
          </p>
          <p className="text-gray-500 text-sm">
            Connected wallet: {publicKey.toString()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Manage your staking pool settings</p>
      </div>

      {/* Vault Balances */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-6">Vault Balances</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reward Vault Balance */}
          <div className="card bg-gradient-to-r from-amber-900/30 to-amber-600/20 border border-amber-500/30">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-amber-400 mb-4">
                Reward Vault
              </h3>
              <div className="flex items-baseline mb-2">
                <span className="text-3xl font-bold text-white">
                  {loading ? (
                    <div className="animate-pulse bg-gray-700 h-8 w-32 rounded"></div>
                  ) : (
                    formatTokenAmount(rewardVaultBalance, TOKEN_DECIMALS)
                  )}
                </span>
                <span className="ml-2 text-gray-300">Tokens</span>
              </div>
              {rewardVaultAddress && (
                <p className="text-xs text-gray-400 mb-3">
                  Vault: {rewardVaultAddress.slice(0, 8)}...
                  {rewardVaultAddress.slice(-8)}
                </p>
              )}

              {rewardVaultBalance <= 0 ? (
                <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 mt-2">
                  <p className="text-red-400 font-medium flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Reward vault is empty!
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Staking Vault Balance */}
          <div className="card bg-gradient-to-r from-blue-900/30 to-blue-600/20 border border-blue-500/30">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-4">
                Staking Vault
              </h3>
              <div className="flex items-baseline mb-2">
                <span className="text-3xl font-bold text-white">
                  {loading ? (
                    <div className="animate-pulse bg-gray-700 h-8 w-32 rounded"></div>
                  ) : (
                    formatTokenAmount(stakingVaultBalance, TOKEN_DECIMALS)
                  )}
                </span>
                <span className="ml-2 text-gray-300">Tokens</span>
              </div>
              {stakingVaultAddress && (
                <p className="text-xs text-gray-400 mb-3">
                  Vault: {stakingVaultAddress.slice(0, 8)}...
                  {stakingVaultAddress.slice(-8)}
                </p>
              )}

              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 mt-2">
                <p className="text-blue-400 font-medium flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2h2a1 1 0 100-2H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  This is the total amount staked by all users
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Estimated Reward Duration */}
      {stakingPool &&
        stakingPool.rewardRate > 0 &&
        stakingPool.totalStaked > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-6">Reward Forecast</h2>
            <div className="card bg-gray-800/80 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2">Current Rate</h3>
                  <div className="text-2xl font-bold">
                    {formatTokenAmount(stakingPool.rewardRate, TOKEN_DECIMALS)}{" "}
                    / sec
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    ≈{" "}
                    {formatTokenAmount(
                      stakingPool.rewardRate * 86400,
                      TOKEN_DECIMALS
                    )}{" "}
                    / day
                  </p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2">Total Staked</h3>
                  <div className="text-2xl font-bold">
                    {formatTokenAmount(stakingPool.totalStaked, TOKEN_DECIMALS)}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Across all stakers
                  </p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2">
                    Estimated Duration
                  </h3>
                  <div className="text-2xl font-bold">
                    {loading ? (
                      <div className="animate-pulse bg-gray-600 h-8 w-24 rounded"></div>
                    ) : stakingPool.rewardRate > 0 ? (
                      `${Math.floor(
                        rewardVaultBalance / stakingPool.rewardRate / 86400
                      )} days`
                    ) : (
                      "N/A"
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Until rewards are depleted
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

      {/* Admin Controls */}
      <section className="mb-10" id="add-rewards-section">
        <h2 className="text-2xl font-bold mb-6">Pool Administration</h2>
        <AdminPanel />
      </section>

      {/* Withdraw Tokens Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-6">Emergency Controls</h2>
        <WithdrawTokens
          onWithdraw={handleWithdraw}
          rewardVaultBalance={rewardVaultBalance}
          loading={loading}
        />
      </section>

      {/* Pool Statistics */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-6">Pool Statistics</h2>
        {stakingPool ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card bg-gray-800/80 p-5">
              <h3 className="text-gray-400 text-sm font-medium mb-1">
                Total Staked
              </h3>
              <div className="text-xl font-bold text-white">
                {formatTokenAmount(stakingPool.totalStaked, TOKEN_DECIMALS)}{" "}
                Tokens
              </div>
            </div>

            <div className="card bg-gray-800/80 p-5">
              <h3 className="text-gray-400 text-sm font-medium mb-1">
                Current Reward Rate
              </h3>
              <div className="text-xl font-bold text-white">
                {formatTokenAmount(stakingPool.rewardRate, TOKEN_DECIMALS)}/sec
              </div>
            </div>

            <div className="card bg-gray-800/80 p-5">
              <h3 className="text-gray-400 text-sm font-medium mb-1">
                Last Updated
              </h3>
              <div className="text-xl font-bold text-white">
                {new Date(stakingPool.lastUpdateTime * 1000).toLocaleString()}
              </div>
            </div>

            <div className="card bg-gray-800/80 p-5">
              <h3 className="text-gray-400 text-sm font-medium mb-1">
                Pool Authority
              </h3>
              <div
                className="text-xl font-bold text-white truncate"
                title={stakingPool.authority.toString()}
              >
                {stakingPool.authority.toString().slice(0, 6)}...
                {stakingPool.authority.toString().slice(-4)}
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-6 text-center">
            <p className="text-gray-400">
              Staking pool not initialized or data loading...
            </p>
          </div>
        )}
      </section>

      {/* Admin Guide */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-6">Admin Guide</h2>
        <div className="card bg-gray-800/80">
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Initializing the Pool
                </h3>
                <p className="text-gray-400">
                  If the pool isn't initialized yet, use the initialization
                  controls to set up the staking pool with an initial reward
                  rate. This only needs to be done once.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Adding Rewards</h3>
                <p className="text-gray-400">
                  Add tokens to the reward pool to be distributed to stakers.
                  You'll need to have the token in your wallet before adding
                  rewards. Monitor the reward vault balance and add more tokens
                  when it gets low.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Updating Reward Rate
                </h3>
                <p className="text-gray-400">
                  The reward rate determines how many tokens are distributed per
                  second to all stakers proportionally. Adjust this rate based
                  on the desired token emission schedule and available rewards.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-red-400">
                  Emergency Withdrawals
                </h3>
                <p className="text-gray-400">
                  The withdraw function allows you to remove tokens from the
                  reward vault in case of emergency. Use this feature with
                  caution as it will reduce the available rewards for users.
                </p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <h3 className="text-amber-500 text-lg font-semibold mb-2">
                  Important Notes
                </h3>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  <li>
                    Make sure you have enough tokens in your wallet before
                    adding rewards
                  </li>
                  <li>
                    Changes to the reward rate affect all stakers immediately
                  </li>
                  <li>
                    Monitor the total staked tokens to ensure a healthy
                    distribution rate
                  </li>
                  <li>
                    Keep track of the reward pool balance to ensure continuous
                    rewards
                  </li>
                  <li>
                    If rewards run out, users will stop accruing new rewards
                    until more are added
                  </li>
                  <li>
                    Use the withdraw function only in emergency situations
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
