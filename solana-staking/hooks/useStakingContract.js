"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { Program, AnchorProvider, BN, web3 } from "@project-serum/anchor";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { toast } from "react-hot-toast";
import {
  PROGRAM_ID,
  TOKEN_MINT,
  REWARD_MINT,
  ADMIN_WALLET,
  CONNECTION_CONFIG,
} from "../utils/constants";
import {
  findStakingPoolAddress,
  findUserStakeAddress,
  debugStakingPool,
} from "../utils/helpers";
import IDL from "../lib/idl.json";

// Import the IDL
const idl = IDL;

const useStakingContract = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction } = useWallet();

  const [loading, setLoading] = useState(false);
  const [stakingPool, setStakingPool] = useState(null);
  const [userStake, setUserStake] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [reCall, setReCall] = useState(0);

  // Create provider and program
  const getProvider = useCallback(() => {
    if (!publicKey) return null;

    const provider = new AnchorProvider(
      connection,
      {
        publicKey,
        signTransaction: async (tx) => {
          try {
            return await signTransaction(tx);
          } catch (err) {
            console.error("Error signing transaction:", err);
            throw err;
          }
        },
        signAllTransactions: async (txs) => {
          try {
            return await Promise.all(txs.map((tx) => signTransaction(tx)));
          } catch (err) {
            console.error("Error signing transactions:", err);
            throw err;
          }
        },
      },
      { commitment: "confirmed" }
    );

    return provider;
  }, [connection, publicKey, signTransaction]);

  const getProgram = useCallback(() => {
    const provider = getProvider();
    if (!provider) return null;

    return new Program(idl, PROGRAM_ID, provider);
  }, [getProvider]);

  // Check if user is admin
  useEffect(() => {
    if (publicKey) {
      const isUserAdmin = publicKey.toString() === ADMIN_WALLET.toString();
      setIsAdmin(isUserAdmin);
    } else {
      setIsAdmin(false);
    }
  }, [publicKey]);

  // Check wallet balance
  const checkBalance = useCallback(async () => {
    if (!publicKey || !connection) return;

    try {
      const balance = await connection.getBalance(publicKey);
      console.log(`Wallet SOL balance: ${balance / 1000000000} SOL`);

      if (balance < 10000000) {
        console.warn(
          "Low SOL balance - might not be enough for transaction fees"
        );
        toast.warning("Low SOL balance. You need SOL for transaction fees.");
      }
    } catch (err) {
      console.error("Error checking balance:", err);
    }
  }, [publicKey, connection]);

  // Fetch staking pool and user stake info
  const fetchStakingData = useCallback(async () => {
    if (!publicKey || !connection) {
      console.log("Wallet not connected or connection not established");
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching staking data...");

      const program = getProgram();
      if (!program) {
        console.log("Program not initialized");
        return;
      }

      // Find PDAs
      console.log("Finding PDAs...");
      const stakingPoolAddress = await findStakingPoolAddress(
        PROGRAM_ID,
        TOKEN_MINT
      );
      console.log("Staking pool address:", stakingPoolAddress.toString());

      const userStakeAddress = await findUserStakeAddress(
        PROGRAM_ID,
        publicKey
      );
      console.log("User stake address:", userStakeAddress.toString());

      // First check if token accounts exist
      try {
        const userTokenAccount = await getAssociatedTokenAddress(
          TOKEN_MINT,
          publicKey
        );

        console.log(
          "Checking user token account:",
          userTokenAccount.toString()
        );
        try {
          const accountInfo = await getAccount(connection, userTokenAccount);
          setTokenBalance(Number(accountInfo.amount));
          console.log("User token balance:", Number(accountInfo.amount));
        } catch (err) {
          console.log(
            "No token account found, user may need to create a token account"
          );
          setTokenBalance(0);
        }
      } catch (err) {
        console.error("Error checking token account:", err);
        setTokenBalance(0);
      }

      // Try to fetch staking pool using debug helper
      console.log("Fetching staking pool data...");
      const poolData = await debugStakingPool(
        connection,
        publicKey,
        getProgram,
        TOKEN_MINT,
        PROGRAM_ID
      );

      if (poolData) {
        setStakingPool(poolData);
        setInitialized(true);

        // Try to fetch user stake
        try {
          const userStakeAccount = await program.account.userStake.fetch(
            userStakeAddress
          );
          console.log("User stake found");
          setUserStake(userStakeAccount);
        } catch (err) {
          console.log("User stake not initialized yet:", err.message);
          setUserStake(null);
        }
      } else {
        console.log("Staking pool not initialized yet");
        setStakingPool(null);
        setInitialized(false);
      }
    } catch (error) {
      console.error("Error fetching staking data:", error);

      // More specific error message based on the error type
      let errorMessage = "Failed to fetch staking data";
      if (error.message && error.message.includes("account not found")) {
        errorMessage = "Staking accounts not initialized yet";
      } else if (error.message && error.message.includes("network error")) {
        errorMessage =
          "Network connection issue. Please check your internet connection";
      } else if (error.message && error.message.includes("timeout")) {
        errorMessage = "Request timed out. Solana network may be congested";
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, getProgram]);

  // Fetch data on wallet connection or refresh trigger
  useEffect(() => {
    if (publicKey) {
      checkBalance();
      fetchStakingData();
    } else {
      setStakingPool(null);
      setUserStake(null);
      setTokenBalance(0);
      setInitialized(false);
    }
  }, [publicKey, fetchStakingData, checkBalance, refreshTrigger, reCall]);

  // Initialize staking pool
  const initializePool = async (rewardRate) => {
    if (!publicKey || !connection) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!isAdmin) {
      toast.error("Only admin can initialize the staking pool");
      return;
    }

    try {
      setLoading(true);
      console.log("Starting pool initialization...");

      // Check if pool is already initialized
      const stakingPoolAddress = await findStakingPoolAddress(
        PROGRAM_ID,
        TOKEN_MINT
      );
      const accountInfo = await connection.getAccountInfo(stakingPoolAddress);

      if (accountInfo) {
        console.log("Staking pool already exists");
        toast.error("Staking pool is already initialized");
        setLoading(false);
        return;
      }

      // Check SOL balance
      const balance = await connection.getBalance(publicKey);
      console.log("Current SOL balance:", balance / 1000000000, "SOL");

      if (balance < 10000000) {
        // Less than 0.01 SOL
        toast.error("Insufficient SOL balance for transaction fees");
        setLoading(false);
        return;
      }

      // Create a simplified provider with commitment level
      const provider = new AnchorProvider(
        connection,
        {
          publicKey,
          signTransaction: async (tx) => {
            try {
              return await signTransaction(tx);
            } catch (err) {
              console.error("Error signing transaction:", err);
              throw err;
            }
          },
          signAllTransactions: async (txs) => {
            try {
              return await Promise.all(txs.map((tx) => signTransaction(tx)));
            } catch (err) {
              console.error("Error signing transactions:", err);
              throw err;
            }
          },
        },
        { commitment: "processed" }
      );

      // Create program with provider
      const program = new Program(idl, PROGRAM_ID, provider);

      // Find necessary PDAs and accounts
      const userStakeAddress = await findUserStakeAddress(
        PROGRAM_ID,
        publicKey
      );

      // Step 1: Create staking vault
      const stakingVault = await getAssociatedTokenAddress(
        TOKEN_MINT,
        stakingPoolAddress,
        true // allowOwnerOffCurve
      );

      try {
        await getAccount(connection, stakingVault);
        console.log("Staking vault already exists");
      } catch (err) {
        console.log("Creating staking vault...");
        const createStakingVaultTx = new Transaction();
        createStakingVaultTx.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            stakingVault,
            stakingPoolAddress,
            TOKEN_MINT
          )
        );

        try {
          const signature = await sendTransaction(
            createStakingVaultTx,
            connection
          );
          await connection.confirmTransaction(signature, "confirmed");
          setReCall(reCall + 1);
          console.log("Staking vault created successfully");
        } catch (err) {
          console.error("Error creating staking vault:", err);
          toast.error("Failed to create staking vault");
          setLoading(false);
          setReCall(reCall + 1);
          return;
        }
      }

      // Step 2: Create reward vault
      const rewardVault = await getAssociatedTokenAddress(
        REWARD_MINT,
        stakingPoolAddress,
        true // allowOwnerOffCurve
      );

      try {
        await getAccount(connection, rewardVault);
        console.log("Reward vault already exists");
      } catch (err) {
        console.log("Creating reward vault...");
        const createRewardVaultTx = new Transaction();
        createRewardVaultTx.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            rewardVault,
            stakingPoolAddress,
            REWARD_MINT
          )
        );

        try {
          const signature = await sendTransaction(
            createRewardVaultTx,
            connection
          );
          await connection.confirmTransaction(signature, "confirmed");
          console.log("Reward vault created successfully");
        } catch (err) {
          console.error("Error creating reward vault:", err);
          toast.error("Failed to create reward vault");
          setLoading(false);
          return;
        }
      }

      // Step 3: Initialize the staking pool
      console.log("Initializing staking pool...");
      try {
        const tx = await program.methods
          .initialize(new BN(rewardRate))
          .accounts({
            stakingPool: stakingPoolAddress,
            userStake: userStakeAddress,
            tokenMint: TOKEN_MINT,
            rewardMint: REWARD_MINT,
            stakingVault: stakingVault,
            rewardVault: rewardVault,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .transaction();

        const signature = await sendTransaction(tx, connection);
        console.log("Initialization transaction sent:", signature);

        toast.success("Initialization transaction sent! Confirming...");

        const confirmation = await connection.confirmTransaction(
          signature,
          "confirmed"
        );
        console.log("Staking pool initialized successfully:", confirmation);

        toast.success("Staking pool initialized successfully!");

        // Add delay before refreshing data
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Trigger a refresh
        setRefreshTrigger((prev) => prev + 1);
      } catch (err) {
        console.error("Error initializing staking pool:", err);

        if (err.logs) {
          console.error("Transaction logs:", err.logs);
        }

        toast.error(`Failed to initialize staking pool: ${err.message}`);
      }
    } catch (error) {
      console.error("Error in initialization process:", error);
      toast.error(`Initialization error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Stake tokens
  const stakeTokens = async (amount) => {
    if (!publicKey || !connection) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!initialized) {
      toast.error("Staking pool not initialized yet");
      return;
    }

    try {
      setLoading(true);
      console.log("Staking with account:", publicKey.toString());

      // Check SOL balance first for transaction fees
      const solBalance = await connection.getBalance(publicKey);
      console.log("SOL Balance:", solBalance / 1000000000, "SOL");

      if (solBalance < 10000000) {
        // Less than 0.01 SOL
        toast.error("Insufficient SOL for transaction fees");
        setLoading(false);
        return;
      }

      // Convert amount to lamports
      const amountBN = new BN(amount);

      // Find addresses
      const stakingPoolAddress = await findStakingPoolAddress(
        PROGRAM_ID,
        TOKEN_MINT
      );
      const userStakeAddress = await findUserStakeAddress(
        PROGRAM_ID,
        publicKey
      );

      console.log("PDAs:", {
        stakingPool: stakingPoolAddress.toString(),
        userStake: userStakeAddress.toString(),
      });

      // Check token account and balance
      const userTokenAccount = await getAssociatedTokenAddress(
        TOKEN_MINT,
        publicKey
      );

      // Create token account if it doesn't exist
      try {
        await getAccount(connection, userTokenAccount);
        console.log("Token account exists");
      } catch (err) {
        console.log("Token account doesn't exist, creating...");

        const createAtaIx = createAssociatedTokenAccountInstruction(
          publicKey,
          userTokenAccount,
          publicKey,
          TOKEN_MINT
        );

        const createAtaTx = new Transaction().add(createAtaIx);
        const signature = await sendTransaction(createAtaTx, connection);
        await connection.confirmTransaction(signature, "confirmed");

        console.log("Token account created");

        // Check if token account has tokens
        const tokenAccount = await getAccount(connection, userTokenAccount);
        if (Number(tokenAccount.amount) === 0) {
          toast.error("Your token account has no tokens to stake");
          setLoading(false);
          return;
        }
      }

      // Get staking vault address
      const stakingVault = await getAssociatedTokenAddress(
        TOKEN_MINT,
        stakingPoolAddress,
        true // allowOwnerOffCurve
      );

      const program = getProgram();

      // Create a separate transaction for creating the user stake account if needed
      let userStakeExists = false;
      try {
        await program.account.userStake.fetch(userStakeAddress);
        userStakeExists = true;
        console.log("User stake account exists");
      } catch (err) {
        console.log("User stake account doesn't exist");

        // For non-admin users, we need to create the account first
        if (publicKey.toString() !== ADMIN_WALLET.toString()) {
          try {
            console.log("Creating user stake account manually...");

            // Get space and rent for UserStake
            const space = 112; // Size of UserStake account
            const lamports = await connection.getMinimumBalanceForRentExemption(
              space
            );

            const createAccountTx = new Transaction();

            // Add system program create account instruction
            createAccountTx.add(
              SystemProgram.createAccount({
                fromPubkey: publicKey,
                newAccountPubkey: userStakeAddress,
                lamports,
                space,
                programId: PROGRAM_ID,
              })
            );

            // Set blockhash and fee payer
            const { blockhash } = await connection.getLatestBlockhash();
            createAccountTx.recentBlockhash = blockhash;
            createAccountTx.feePayer = publicKey;

            // Send account creation transaction
            console.log("Sending account creation transaction...");
            try {
              const createSig = await sendTransaction(
                createAccountTx,
                connection
              );
              await connection.confirmTransaction(createSig, "confirmed");
              console.log("Account created:", createSig);
              userStakeExists = true;
            } catch (createError) {
              console.error("Error creating account:", createError);
              // If this fails, we'll try with the stake instruction that includes system program
            }
          } catch (err) {
            console.error("Error preparing account creation:", err);
            // Continue to try staking with system program included
          }
        }
      }

      // Create staking transaction
      const stakeTx = new Transaction();

      // Get latest blockhash for the transaction
      const { blockhash } = await connection.getLatestBlockhash();
      stakeTx.recentBlockhash = blockhash;
      stakeTx.feePayer = publicKey;

      // Add stake instruction with ALL required accounts
      stakeTx.add(
        await program.methods
          .stake(amountBN)
          .accounts({
            stakingPool: stakingPoolAddress,
            userStake: userStakeAddress,
            stakingVault: stakingVault,
            userTokenAccount: userTokenAccount,
            user: publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId, // Include system program for account creation
            rent: web3.SYSVAR_RENT_PUBKEY, // Include rent sysvar which might be needed
          })
          .instruction()
      );

      // Send the transaction with lower commitment for faster confirmation
      console.log("Sending stake transaction...");
      const signature = await sendTransaction(stakeTx, connection, {
        skipPreflight: false,
        preflightCommitment: "processed",
      });

      console.log("Transaction sent:", signature);
      toast.success("Staking transaction sent!");

      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");
      console.log("Transaction confirmed!");

      toast.success("Tokens staked successfully!");
      setReCall(reCall + 1);

      // Refresh data after a small delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error staking tokens:", error);
      setReCall(reCall + 1);
      // More detailed error message
      let errorMessage = "Failed to stake tokens";

      if (error.message) {
        if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient SOL for transaction fees";
        } else if (error.message.includes("already in use")) {
          errorMessage = "Account already in use - try again later";
        } else if (error.message.includes("invalid account owner")) {
          errorMessage =
            "Invalid account owner - account might belong to another program";
        } else if (error.logs) {
          // Log any transaction logs from the error
          console.error("Transaction logs:", error.logs);
          errorMessage = "Transaction failed - check console for details";
        }
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  // Unstake tokens
  const unstakeTokens = async (amount) => {
    if (!publicKey || !connection) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!initialized) {
      toast.error("Staking pool not initialized yet");
      return;
    }

    try {
      setLoading(true);
      const program = getProgram();

      // Convert amount to lamports
      const amountBN = new BN(amount);

      // Find PDAs
      const stakingPoolAddress = await findStakingPoolAddress(
        PROGRAM_ID,
        TOKEN_MINT
      );
      const userStakeAddress = await findUserStakeAddress(
        PROGRAM_ID,
        publicKey
      );

      // Get token accounts
      const userTokenAccount = await getAssociatedTokenAddress(
        TOKEN_MINT,
        publicKey
      );

      const stakingVault = await getAssociatedTokenAddress(
        TOKEN_MINT,
        stakingPoolAddress,
        true // allowOwnerOffCurve
      );

      // Create transaction
      const transaction = new Transaction();

      // Add unstake instruction
      transaction.add(
        await program.methods
          .unstake(amountBN)
          .accounts({
            stakingPool: stakingPoolAddress,
            userStake: userStakeAddress,
            stakingVault: stakingVault,
            userTokenAccount: userTokenAccount,
            user: publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction()
      );

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      toast.success("Unstaking transaction sent! Confirming...");

      await connection.confirmTransaction(signature, "confirmed");

      toast.success("Tokens unstaked successfully!");
      setReCall(reCall + 1);
      // Add a delay before refreshing data
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Trigger refresh
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error unstaking tokens:", error);
      toast.error(`Failed to unstake tokens: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Claim rewards
  const claimRewards = async () => {
    if (!publicKey || !connection) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!initialized) {
      toast.error("Staking pool not initialized yet");
      return;
    }

    try {
      setLoading(true);
      const program = getProgram();

      // Find PDAs
      const stakingPoolAddress = await findStakingPoolAddress(
        PROGRAM_ID,
        TOKEN_MINT
      );
      const userStakeAddress = await findUserStakeAddress(
        PROGRAM_ID,
        publicKey
      );

      // Get token accounts
      const userRewardAccount = await getAssociatedTokenAddress(
        REWARD_MINT,
        publicKey
      );

      const rewardVault = await getAssociatedTokenAddress(
        REWARD_MINT,
        stakingPoolAddress,
        true // allowOwnerOffCurve
      );

      // Create transaction
      const transaction = new Transaction();

      // Check if user has a reward token account, if not create it
      try {
        await getAccount(connection, userRewardAccount);
      } catch (err) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            userRewardAccount,
            publicKey,
            REWARD_MINT
          )
        );
      }

      // Add claim rewards instruction ONLY ONCE
      transaction.add(
        await program.methods
          .claimRewards()
          .accounts({
            stakingPool: stakingPoolAddress,
            userStake: userStakeAddress,
            rewardVault: rewardVault,
            userRewardAccount: userRewardAccount,
            user: publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction()
      );

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      toast.success("Claiming rewards transaction sent! Confirming...");

      await connection.confirmTransaction(signature, "confirmed");

      toast.success("Rewards claimed successfully!");
      setReCall(reCall + 1);
      // Add a delay before refreshing data
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Trigger refresh
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error claiming rewards:", error);
      toast.error(`Failed to claim rewards: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add rewards (admin only)
  const addRewards = async (amount) => {
    if (!publicKey || !connection) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!isAdmin) {
      toast.error("Only admin can add rewards");
      return;
    }

    if (!initialized) {
      toast.error("Staking pool not initialized yet");
      return;
    }

    try {
      setLoading(true);
      const program = getProgram();

      // Convert amount to lamports
      const amountBN = new BN(amount);

      // Find PDAs
      const stakingPoolAddress = await findStakingPoolAddress(
        PROGRAM_ID,
        TOKEN_MINT
      );

      // Get token accounts
      const funderRewardAccount = await getAssociatedTokenAddress(
        REWARD_MINT,
        publicKey
      );

      const rewardVault = await getAssociatedTokenAddress(
        REWARD_MINT,
        stakingPoolAddress,
        true // allowOwnerOffCurve
      );

      // Create transaction
      const transaction = new Transaction();

      // Add rewards instruction
      transaction.add(
        await program.methods
          .addRewards(amountBN)
          .accounts({
            stakingPool: stakingPoolAddress,
            rewardVault: rewardVault,
            funderRewardAccount: funderRewardAccount,
            funder: publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction()
      );

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      toast.success("Adding rewards transaction sent! Confirming...");

      await connection.confirmTransaction(signature, "confirmed");

      toast.success("Rewards added successfully!");
      setReCall(reCall + 1);
      // Add a delay before refreshing data
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Trigger refresh
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error adding rewards:", error);
      toast.error(`Failed to add rewards: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update reward rate (admin only)
  const updateRewardRate = async (newRate) => {
    if (!publicKey || !connection) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!isAdmin) {
      toast.error("Only admin can update reward rate");
      return;
    }

    if (!initialized) {
      toast.error("Staking pool not initialized yet");
      return;
    }

    try {
      setLoading(true);
      const program = getProgram();

      // Convert rate to lamports
      const newRateBN = new BN(newRate);

      // Find PDAs
      const stakingPoolAddress = await findStakingPoolAddress(
        PROGRAM_ID,
        TOKEN_MINT
      );

      // Create transaction
      const transaction = new Transaction();

      // Add update reward rate instruction
      transaction.add(
        await program.methods
          .updateRewardRate(newRateBN)
          .accounts({
            stakingPool: stakingPoolAddress,
            authority: publicKey,
          })
          .instruction()
      );

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      toast.success("Updating reward rate transaction sent! Confirming...");

      await connection.confirmTransaction(signature, "confirmed");

      toast.success("Reward rate updated successfully!");
      setReCall(reCall + 1);
      // Add a delay before refreshing data
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Trigger refresh
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error updating reward rate:", error);
      toast.error(`Failed to update reward rate: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Force refresh function
  const forceRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Withdraw tokens from the contract (admin only)
  const withdrawTokens = async (amount) => {
    if (!publicKey || !connection) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!isAdmin) {
      toast.error("Only admin can withdraw tokens");
      return;
    }

    if (!initialized) {
      toast.error("Staking pool not initialized yet");
      return;
    }

    try {
      setLoading(true);
      const program = getProgram();

      // Convert amount to lamports
      const amountBN = new BN(amount);

      // Find PDAs
      const stakingPoolAddress = await findStakingPoolAddress(
        PROGRAM_ID,
        TOKEN_MINT
      );

      // Get token accounts
      const adminTokenAccount = await getAssociatedTokenAddress(
        TOKEN_MINT,
        publicKey
      );

      const stakingVault = await getAssociatedTokenAddress(
        TOKEN_MINT,
        stakingPoolAddress,
        true // allowOwnerOffCurve
      );

      // Get vault balance first to check if enough tokens are available
      try {
        const vaultAccount = await getAccount(connection, stakingVault);
        const vaultBalance = Number(vaultAccount.amount);

        if (vaultBalance < amount) {
          toast.error(
            `Insufficient balance in vault. Available: ${formatTokenAmount(
              vaultBalance,
              TOKEN_DECIMALS
            )}`
          );
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error checking vault balance:", err);
        toast.error("Could not check vault balance");
        setLoading(false);
        return;
      }

      // Create transaction
      const transaction = new Transaction();

      // Get vault signer PDA
      const poolBump = stakingPool.bump;
      const poolTokenMint = stakingPool.tokenMint;
      const poolSeeds = [
        Buffer.from("staking_pool"),
        poolTokenMint.toBuffer(),
        Buffer.from([poolBump]),
      ];

      // Add withdraw instruction
      transaction.add(
        await program.methods
          .withdrawTokens(amountBN)
          .accounts({
            stakingPool: stakingPoolAddress,
            stakingVault: stakingVault,
            adminTokenAccount: adminTokenAccount,
            authority: publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction()
      );

      // Set blockhash and fee payer
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction
      console.log("Sending withdraw transaction...");
      const signature = await sendTransaction(transaction, connection);
      toast.success("Withdraw transaction sent! Confirming...");

      await connection.confirmTransaction(signature, "confirmed");

      toast.success("Tokens withdrawn successfully!");
      setReCall(reCall + 1);
      // Refresh data after a small delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setRefreshTrigger((prev) => prev + 1);

      return true;
    } catch (error) {
      console.error("Error withdrawing tokens:", error);

      let errorMessage = "Failed to withdraw tokens";

      if (error.message) {
        if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient SOL for transaction fees";
        } else if (error.message.includes("0x1")) {
          errorMessage = "Transaction simulation failed";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    initialized,
    stakingPool,
    userStake,
    tokenBalance,
    isAdmin,
    fetchStakingData,
    initializePool,
    stakeTokens,
    unstakeTokens,
    claimRewards,
    addRewards,
    updateRewardRate,
    forceRefresh,
    withdrawTokens,
  };
};

export default useStakingContract;
