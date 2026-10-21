import { useState, useEffect, useCallback, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Keypair,
  Transaction,
  StakeProgram,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import toast from "react-hot-toast";
import { withSolanaRetry, confirmTransactionRobust } from "@/utils/solanaRetry";
import { savePendingAction, clearPendingAction } from "@/utils/pendingTransactions";
import { PhantomMobileWalletName } from "@/lib/wallet/PhantomMobileWalletAdapter";
import { isStandaloneApp } from "@/utils/isStandaloneApp";

export interface DevnetValidator {
  votePubkey: string;
  nodePubkey: string;
  commission: number;
  activatedStake: number;
  name?: string;
}

export interface UserStakeAccount {
  pubkey: PublicKey;
  lamports: number;
  solBalance: number;
  staker: string;
  withdrawer: string;
  voter: string | null;
  status: "activating" | "active" | "deactivating" | "inactive";
  activeStake: number;
  activationEpoch?: number;
  deactivationEpoch?: number;
}

export interface EpochDetails {
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  progressPercent: number;
  estimatedRemainingTime: string;
  slotDurationSec: number;
}

export function useNativeStaking() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction, wallet } = useWallet();

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [rentExemptReserve, setRentExemptReserve] = useState<number>(2282880); // standard ~0.00228 SOL
  const [validators, setValidators] = useState<DevnetValidator[]>([]);
  const [stakeAccounts, setStakeAccounts] = useState<UserStakeAccount[]>([]);
  const [epochInfo, setEpochInfo] = useState<EpochDetails | null>(null);

  // 1. Fetch live validators and rent exemption on mount
  const fetchGlobalData = useCallback(async () => {
    try {
      // Minimum rent for a stake account (space = 200 bytes)
      const rent = await withSolanaRetry(() =>
        connection.getMinimumBalanceForRentExemption(StakeProgram.space)
      );
      setRentExemptReserve(rent);

      // Epoch Information
      const epoch = await withSolanaRetry(() => connection.getEpochInfo());
      const remainingSlots = Math.max(0, epoch.slotsInEpoch - epoch.slotIndex);

      // Measure real slot duration from performance samples on cluster
      let slotDurationSec = 0.4;
      try {
        const perfSamples = await connection.getRecentPerformanceSamples(4);
        if (perfSamples && perfSamples.length > 0) {
          const totalSecs = perfSamples.reduce((acc, s) => acc + s.samplePeriodSecs, 0);
          const totalSlots = perfSamples.reduce((acc, s) => acc + s.numSlots, 0);
          if (totalSlots > 0) {
            slotDurationSec = totalSecs / totalSlots;
          }
        }
      } catch (perfErr) {
        console.warn("Could not fetch cluster performance samples, using default slot duration:", perfErr);
      }

      const estTime = formatRemainingTime(remainingSlots, slotDurationSec);

      setEpochInfo({
        epoch: epoch.epoch,
        slotIndex: epoch.slotIndex,
        slotsInEpoch: epoch.slotsInEpoch,
        progressPercent: Number(((epoch.slotIndex / epoch.slotsInEpoch) * 100).toFixed(1)),
        estimatedRemainingTime: estTime,
        slotDurationSec,
      });

      // Active Devnet Validators
      const voteAccounts = await withSolanaRetry(() => connection.getVoteAccounts());
      const activeValidators: DevnetValidator[] = voteAccounts.current
        .map((v) => ({
          votePubkey: v.votePubkey,
          nodePubkey: v.nodePubkey,
          commission: v.commission,
          activatedStake: Number(v.activatedStake) / LAMPORTS_PER_SOL,
          name: formatValidatorName(v.votePubkey),
        }))
        .sort((a, b) => b.activatedStake - a.activatedStake);

      setValidators(activeValidators);
    } catch (err: any) {
      console.error("Error fetching global staking data:", err);
    }
  }, [connection]);

  // 2. Fetch User-Specific Stake Accounts & Native Balance
  const fetchUserData = useCallback(async () => {
    if (!publicKey) {
      setSolBalance(0);
      setStakeAccounts([]);
      return;
    }

    try {
      setLoading(true);

      // Wallet SOL Balance
      const balance = await withSolanaRetry(() => connection.getBalance(publicKey));
      setSolBalance(balance);

      // Query all parsed stake accounts where user is staker or withdrawer
      const [stakerAccounts, withdrawerAccounts] = await Promise.all([
        withSolanaRetry(() =>
          connection.getParsedProgramAccounts(StakeProgram.programId, {
            filters: [
              {
                memcmp: {
                  offset: 12, // authorized.staker offset
                  bytes: publicKey.toBase58(),
                },
              },
            ],
          })
        ),
        withSolanaRetry(() =>
          connection.getParsedProgramAccounts(StakeProgram.programId, {
            filters: [
              {
                memcmp: {
                  offset: 44, // authorized.withdrawer offset
                  bytes: publicKey.toBase58(),
                },
              },
            ],
          })
        ),
      ]);

      // Deduplicate by public key
      const accountsMap = new Map<string, any>();
      for (const item of [...stakerAccounts, ...withdrawerAccounts]) {
        accountsMap.set(item.pubkey.toBase58(), item);
      }

      const currentEpoch = epochInfo?.epoch ?? (await withSolanaRetry(() => connection.getEpochInfo())).epoch;
      const parsedList: UserStakeAccount[] = [];

      for (const item of Array.from(accountsMap.values())) {
        const pubkey = item.pubkey;
        const lamports = item.account.lamports;
        const parsedInfo = item.account.data?.parsed?.info;

        if (!parsedInfo) continue;

        const staker = parsedInfo.meta?.authorized?.staker || "";
        const withdrawer = parsedInfo.meta?.authorized?.withdrawer || "";
        const delegation = parsedInfo.stake?.delegation;
        const voter = delegation?.voter || null;
        const activationEpoch = delegation?.activationEpoch ? parseInt(delegation.activationEpoch) : undefined;
        const deactivationEpoch = delegation?.deactivationEpoch ? parseInt(delegation.deactivationEpoch) : undefined;

        // Derive consensus status directly from parsed stake delegation (matches Solana core runtime state machine)
        let status: UserStakeAccount["status"] = "inactive";
        let activeStake = 0;

        if (!delegation || !voter || delegation.stake === "0") {
          status = "inactive";
        } else {
          const actEpoch = activationEpoch !== undefined ? activationEpoch : -1;
          const deactEpoch = deactivationEpoch !== undefined ? deactivationEpoch : -1;

          if (actEpoch === deactEpoch) {
            // Deactivated in the same epoch it was delegated: was never active, already inactive and ready to withdraw!
            status = "inactive";
            activeStake = 0;
          } else if (currentEpoch < actEpoch) {
            status = "activating";
            activeStake = 0;
          } else if (currentEpoch === actEpoch) {
            status = deactEpoch !== -1 && deactEpoch <= currentEpoch ? "inactive" : "activating";
            activeStake = 0;
          } else if (currentEpoch > actEpoch) {
            if (deactEpoch === -1 || deactEpoch > currentEpoch) {
              status = "active";
              activeStake = Number(delegation.stake) / LAMPORTS_PER_SOL;
            } else if (deactEpoch === currentEpoch) {
              status = "deactivating";
              activeStake = Number(delegation.stake) / LAMPORTS_PER_SOL;
            } else {
              // currentEpoch > deactEpoch
              status = "inactive";
              activeStake = 0;
            }
          }
        }

        parsedList.push({
          pubkey,
          lamports,
          solBalance: lamports / LAMPORTS_PER_SOL,
          staker,
          withdrawer,
          voter,
          status,
          activeStake,
          activationEpoch,
          deactivationEpoch,
        });
      }

      setStakeAccounts(parsedList);
    } catch (err: any) {
      console.error("Error fetching user stake accounts:", err);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, epochInfo?.epoch]);

  useEffect(() => {
    fetchGlobalData();
  }, [fetchGlobalData]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Listen for mobile transaction resumption events
  useEffect(() => {
    const handleUpdate = () => {
      fetchUserData();
      fetchGlobalData();
    };
    window.addEventListener("stake_accounts_updated", handleUpdate);
    window.addEventListener("snbl_updated", handleUpdate);
    return () => {
      window.removeEventListener("stake_accounts_updated", handleUpdate);
      window.removeEventListener("snbl_updated", handleUpdate);
    };
  }, [fetchUserData, fetchGlobalData]);

  // 3. Delegate Stake (Creates Stake Account & Delegates Atomically)
  const delegateStake = async (amountSol: number, validatorVotePubkey: string) => {
    if (!publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    const lamportsToStake = Math.floor(amountSol * LAMPORTS_PER_SOL);
    const totalRequiredLamports = lamportsToStake + rentExemptReserve;

    if (solBalance < totalRequiredLamports) {
      toast.error(
        `Insufficient SOL balance. You need ${(totalRequiredLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL (including rent-exempt reserve).`
      );
      return;
    }

    const toastId = toast.loading("Creating Stake Account & Delegating to Validator...");
    setActionLoading(true);

    try {
      const stakeAccount = Keypair.generate();
      const votePubkey = new PublicKey(validatorVotePubkey);

      const tx = new Transaction();
      // Compute Budget for fast Devnet inclusion
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 250_000 }));
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5_000 }));

      // 1. Create the Stake Account
      const createStakeAccountIx = StakeProgram.createAccount({
        fromPubkey: publicKey,
        stakePubkey: stakeAccount.publicKey,
        authorized: {
          staker: publicKey,
          withdrawer: publicKey,
        },
        lamports: totalRequiredLamports,
      });

      // 2. Delegate the Stake Account to the Validator
      const delegateIx = StakeProgram.delegate({
        stakePubkey: stakeAccount.publicKey,
        authorizedPubkey: publicKey,
        votePubkey,
      });

      tx.add(createStakeAccountIx, delegateIx);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      // Partial sign with new stake account
      tx.partialSign(stakeAccount);

      savePendingAction("SNBL_STAKE", {
        amountSol,
        validator: validatorVotePubkey,
        returnUrl: typeof window !== "undefined" ? window.location.href : "/snbl",
      });

      let signature = "";
      const isMobile = typeof window !== "undefined" && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || isStandaloneApp());
      const isPhantomMobile = Boolean((wallet?.adapter as any)?.isPhantomMobileAdapter) || (isMobile && !Boolean((window as any).phantom?.solana));

      if (isPhantomMobile) {
        signature = await sendTransaction(tx, connection, {
          signers: [stakeAccount],
          skipPreflight: true,
          preflightCommitment: "confirmed",
        });
      } else if (signTransaction) {
        const signedTx = await signTransaction(tx);
        signature = await withSolanaRetry(async () => {
          return await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: "confirmed",
          });
        });
      } else {
        signature = await sendTransaction(tx, connection, {
          signers: [stakeAccount],
          preflightCommitment: "confirmed",
        });
      }

      await confirmTransactionRobust(connection, signature, blockhash, lastValidBlockHeight);
      clearPendingAction();

      toast.success(
        `Successfully staked ${amountSol} SOL! Stake account created and delegated.`,
        { id: toastId }
      );

      await fetchUserData();
      await fetchGlobalData();
    } catch (err: any) {
      console.error("Delegate stake error:", err);
      toast.error(`Delegation failed: ${err.message || "Unknown error"}`, { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Deactivate Stake (Initiates Cooldown)
  const deactivateStake = async (stakeAccountPubkey: PublicKey) => {
    if (!publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    const targetAccount = stakeAccounts.find((a) => a.pubkey.equals(stakeAccountPubkey));
    if (targetAccount?.status === "activating") {
      toast.error(
        `Stake is currently in the warmup phase for Epoch #${epochInfo?.epoch || ""}. Solana consensus requires completing this epoch before it can be deactivated.`,
        { duration: 6000 }
      );
      return;
    }

    if (targetAccount?.status === "deactivating") {
      toast.error("This stake account is already deactivating and cooling down until epoch end.");
      return;
    }

    if (targetAccount && targetAccount.staker && targetAccount.staker !== publicKey.toBase58()) {
      toast.error("Connected wallet is not authorized as staker for this stake account.");
      return;
    }

    const toastId = toast.loading("Deactivating stake account...");
    setActionLoading(true);

    try {
      const tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 150_000 }));
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5_000 }));

      const deactivateIx = StakeProgram.deactivate({
        stakePubkey: stakeAccountPubkey,
        authorizedPubkey: publicKey,
      });
      tx.add(deactivateIx);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      savePendingAction("SNBL_DEACTIVATE", {
        stakeAccount: stakeAccountPubkey.toBase58(),
        returnUrl: typeof window !== "undefined" ? window.location.href : "/snbl",
      });

      let signature = "";
      const isMobile = typeof window !== "undefined" && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || isStandaloneApp());
      const isPhantomMobile = Boolean((wallet?.adapter as any)?.isPhantomMobileAdapter) || (isMobile && !Boolean((window as any).phantom?.solana));

      if (isPhantomMobile) {
        signature = await sendTransaction(tx, connection, {
          skipPreflight: true,
          preflightCommitment: "confirmed",
        });
      } else if (signTransaction) {
        const signedTx = await signTransaction(tx);
        signature = await withSolanaRetry(async () => {
          return await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: "confirmed",
          });
        });
      } else {
        signature = await sendTransaction(tx, connection, {
          preflightCommitment: "confirmed",
        });
      }

      await confirmTransactionRobust(connection, signature, blockhash, lastValidBlockHeight);
      clearPendingAction();

      toast.success(
        "Stake account successfully deactivated. It will become fully withdrawable at epoch end.",
        { id: toastId }
      );
      await fetchUserData();
    } catch (err: any) {
      console.error("Deactivate error:", err);
      const errStr = (err?.message || "").toLowerCase();
      if (errStr.includes("already deactivated") || errStr.includes("0x2")) {
        toast.error("Stake account is already cooling down and waiting for epoch end.", { id: toastId });
      } else if (errStr.includes("unexpected error") || errStr.includes("simulation failed") || errStr.includes("0x0")) {
        toast.error(
          `Deactivation rejected by Solana: stake is warming up in Epoch #${epochInfo?.epoch || ""}. Please wait until the next epoch boundary.`,
          { id: toastId, duration: 6000 }
        );
      } else {
        toast.error(`Deactivation failed: ${err.message || "Unknown error"}`, { id: toastId });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Withdraw Stake (Returns SOL and closes account if withdrawing all)
  const withdrawStake = async (stakeAccountPubkey: PublicKey, lamportsToWithdraw: number) => {
    if (!publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    const toastId = toast.loading("Withdrawing SOL to your wallet...");
    setActionLoading(true);

    try {
      const tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 150_000 }));
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5_000 }));

      const withdrawIx = StakeProgram.withdraw({
        stakePubkey: stakeAccountPubkey,
        authorizedPubkey: publicKey,
        toPubkey: publicKey,
        lamports: lamportsToWithdraw,
      });
      tx.add(withdrawIx);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      savePendingAction("SNBL_WITHDRAW", {
        stakeAccount: stakeAccountPubkey.toBase58(),
        lamports: lamportsToWithdraw,
        returnUrl: typeof window !== "undefined" ? window.location.href : "/snbl",
      });

      let signature = "";
      const isMobile = typeof window !== "undefined" && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || isStandaloneApp());
      const isPhantomMobile = Boolean((wallet?.adapter as any)?.isPhantomMobileAdapter) || (isMobile && !Boolean((window as any).phantom?.solana));

      if (isPhantomMobile) {
        signature = await sendTransaction(tx, connection, {
          skipPreflight: true,
          preflightCommitment: "confirmed",
        });
      } else if (signTransaction) {
        const signedTx = await signTransaction(tx);
        signature = await withSolanaRetry(async () => {
          return await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: "confirmed",
          });
        });
      } else {
        signature = await sendTransaction(tx, connection, {
          preflightCommitment: "confirmed",
        });
      }

      await confirmTransactionRobust(connection, signature, blockhash, lastValidBlockHeight);
      clearPendingAction();

      toast.success(
        `Successfully withdrawn ${(lamportsToWithdraw / LAMPORTS_PER_SOL).toFixed(4)} SOL!`,
        { id: toastId }
      );
      await fetchUserData();
    } catch (err: any) {
      console.error("Withdraw error:", err);
      toast.error(`Withdrawal failed: ${err.message || "Unknown error"}`, { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  return {
    loading,
    actionLoading,
    solBalance,
    rentExemptReserve,
    validators,
    stakeAccounts,
    epochInfo,
    delegateStake,
    deactivateStake,
    withdrawStake,
    refreshData: async () => {
      await Promise.all([fetchGlobalData(), fetchUserData()]);
    },
  };
}

// Helpers
function formatValidatorName(votePubkey: string): string {
  const shortKey = `${votePubkey.slice(0, 4)}...${votePubkey.slice(-4)}`;
  return `Validator (${shortKey})`;
}

function formatRemainingTime(remainingSlots: number, slotDurationSec: number = 0.4): string {
  const totalSeconds = Math.max(0, Math.floor(remainingSlots * slotDurationSec));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `~${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `~${hours}h ${minutes}m`;
  }
  return `~${minutes}m`;
}
