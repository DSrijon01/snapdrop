import { useState, useEffect, useCallback, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  Keypair,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import toast from "react-hot-toast";

// Use the IDL from src directory which is tracked by git
import { SnblStaking } from "../types/snbl_staking";
import idl from "../idl/snbl_staking.json";

export const STAKING_PROGRAM_ID = new PublicKey((idl as any).address || "4Emh8zTvZz6mYTqa3c5UMQFgaMgFPx7fB4YaMNNKhoBw");

export const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET
  ? new PublicKey(process.env.NEXT_PUBLIC_ADMIN_WALLET)
  : new PublicKey("9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu");

const LIQUID_POOL_SEED = Buffer.from("liquid_pool");

export const findLiquidPoolAddress = (programId: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [LIQUID_POOL_SEED],
    programId
  )[0];
};

export function useStaking() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction, signAllTransactions } = useWallet();

  const [loading, setLoading] = useState(false);
  const [liquidPool, setLiquidPool] = useState<any>(null);
  const [solBalance, setSolBalance] = useState(0); 
  const [ssBalance, setSsBalance] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const provider = useMemo(() => {
    if (!publicKey) return null;
    return new AnchorProvider(
      connection,
      {
        publicKey,
        signTransaction: signTransaction as any,
        signAllTransactions: signAllTransactions as any,
      },
      { commitment: "confirmed" }
    );
  }, [connection, publicKey, signTransaction, signAllTransactions]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(idl as any, provider as any) as unknown as Program<SnblStaking>;
  }, [provider]);

  useEffect(() => {
    if (publicKey) {
      setIsAdmin(publicKey.equals(ADMIN_WALLET));
    } else {
      setIsAdmin(false);
    }
  }, [publicKey]);

  const fetchStakingData = useCallback(async () => {
    if (!publicKey || !program) return;

    try {
      setLoading(true);

      // Fetch Native SOL Balance
      try {
        const balance = await connection.getBalance(publicKey);
        setSolBalance(balance);
      } catch {
        setSolBalance(0);
      }

      // Fetch Pool State
      const poolAddress = findLiquidPoolAddress(STAKING_PROGRAM_ID);
      try {
        const poolAccount = await program.account.liquidPool.fetch(poolAddress);
        setLiquidPool(poolAccount);
        setInitialized(true);

        const totalSol = new BN(poolAccount.totalSolStaked).toNumber();
        const totalSs = new BN(poolAccount.totalSsMinted).toNumber();
        if (totalSs > 0 && totalSol > 0) {
          setExchangeRate(totalSol / totalSs);
        } else {
          setExchangeRate(1);
        }

        // Fetch User ssSOL Balance
        try {
          const userAta = await getAssociatedTokenAddress(poolAccount.ssMint, publicKey);
          const balance = await connection.getTokenAccountBalance(userAta);
          setSsBalance(parseInt(balance.value.amount));
        } catch {
          setSsBalance(0);
        }

      } catch {
        setLiquidPool(null);
        setInitialized(false);
        setExchangeRate(1);
        setSsBalance(0);
      }
    } catch (error) {
      console.error("Fetch staking data error:", error);
    } finally {
      setLoading(false);
    }
  }, [publicKey, program, connection]);

  useEffect(() => {
    fetchStakingData();
  }, [fetchStakingData, refreshTrigger]);

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  const initializePool = async () => {
    if (!publicKey || !program || !isAdmin) return;

    try {
      setLoading(true);
      const poolAddress = findLiquidPoolAddress(STAKING_PROGRAM_ID);
      const ssMintKeypair = Keypair.generate();

      const tx = new Transaction();

      const initIx = await program.methods
        .initialize()
        .accounts({
          poolState: poolAddress,
          ssMint: ssMintKeypair.publicKey,
          authority: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        } as any)
        .instruction();

      tx.add(initIx);

      const signature = await sendTransaction(tx, connection, { signers: [ssMintKeypair] });
      await connection.confirmTransaction(signature, "confirmed");
      toast.success(`LST Pool Initialized!`);
      refreshData();
    } catch (error: any) {
      toast.error(`Init failed: ${error.message}`);
      console.error("Init error detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const stakeTokens = async (amountLamports: number) => {
    if (!publicKey || !program || !initialized || !liquidPool) return;

    try {
      setLoading(true);
      const poolAddress = findLiquidPoolAddress(STAKING_PROGRAM_ID);
      const userAta = await getAssociatedTokenAddress(liquidPool.ssMint, publicKey);

      let currentBalance = await connection.getBalance(publicKey);

      if (currentBalance < amountLamports + 10000000) {
        toast.error("Insufficient SOL balance to stake (plus fees).");
        setLoading(false);
        return;
      }

      const tx = new Transaction();

      // Check if ATA exists, if not, create it
      const ataInfo = await connection.getAccountInfo(userAta);
      if (!ataInfo) {
        tx.add(createAssociatedTokenAccountInstruction(publicKey, userAta, publicKey, liquidPool.ssMint));
      }

      const stakeIx = await program.methods
        .stake(new BN(amountLamports))
        .accounts({
          poolState: poolAddress,
          ssMint: liquidPool.ssMint,
          userSsAccount: userAta,
          user: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .instruction();

      tx.add(stakeIx);

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");
      toast.success("Successfully Staked! Received ssSOL.");
      refreshData();
    } catch (error: any) {
      toast.error(`Stake failed: ${error.message}`);
      console.error("Stake error detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const unstakeTokens = async (amountSsLamports: number) => {
    if (!publicKey || !program || !initialized || !liquidPool) return;

    try {
      setLoading(true);
      const poolAddress = findLiquidPoolAddress(STAKING_PROGRAM_ID);
      const userAta = await getAssociatedTokenAddress(liquidPool.ssMint, publicKey);

      const tx = new Transaction();

      const unstakeIx = await program.methods
        .unstake(new BN(amountSsLamports))
        .accounts({
          poolState: poolAddress,
          ssMint: liquidPool.ssMint,
          userSsAccount: userAta,
          user: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .instruction();

      tx.add(unstakeIx);

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");
      toast.success("Unstaked successfully! Received Native SOL.");
      refreshData();
    } catch (error: any) {
      toast.error(`Unstake failed: ${error.message}`);
      console.error("Unstake error detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const depositRewards = async (amountLamports: number) => {
    if (!publicKey || !program || !initialized || !liquidPool || !isAdmin) return;

    try {
      setLoading(true);
      const poolAddress = findLiquidPoolAddress(STAKING_PROGRAM_ID);

      const tx = new Transaction();

      const depositIx = await program.methods
        .depositRewards(new BN(amountLamports))
        .accounts({
          poolState: poolAddress,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .instruction();

      tx.add(depositIx);

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");
      toast.success("Rewards Deposited! ssSOL value increased.");
      refreshData();
    } catch (error: any) {
      toast.error(`Deposit failed: ${error.message}`);
      console.error("Deposit error detail:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    liquidPool,
    solBalance,
    ssBalance,
    exchangeRate,
    isAdmin,
    initialized,
    initializePool,
    stakeTokens,
    unstakeTokens,
    depositRewards,
    refreshData,
  };
}
