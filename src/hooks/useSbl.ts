import { useState, useCallback, useMemo, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider, BN, Idl } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import toast from "react-hot-toast";
import idl from "../idl/snbl_sbl.json";

export const SBL_PROGRAM_ID = new PublicKey(
  (idl as any).address || "EQue3ASSFTXaQdf2B3xA1QyDW4mN2Wr6LFaNBF6KdzMq"
);

export const DEFAULT_MARKET_ID = "SS-SBL-DEVNET-0";

// Standard Devnet Token-2022 USDSS Synthetic Dollar
// When initialized, the market PDA acts as the mint authority
export const findSblMarketAddress = (marketId: string = DEFAULT_MARKET_ID) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sbl_market"), Buffer.from(marketId)],
    SBL_PROGRAM_ID
  )[0];
};

export const findSblReserveAddress = (market: PublicKey, collateralMint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sbl_reserve"), market.toBuffer(), collateralMint.toBuffer()],
    SBL_PROGRAM_ID
  )[0];
};

export const findSblObligationAddress = (market: PublicKey, user: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sbl_obligation"), market.toBuffer(), user.toBuffer()],
    SBL_PROGRAM_ID
  )[0];
};

export interface OnChainCollateralEntry {
  mint: PublicKey;
  amount: number;
}

export interface OnChainObligation {
  user: PublicKey;
  market: PublicKey;
  collateralCount: number;
  collateralEntries: OnChainCollateralEntry[];
  borrowedUsdssPrincipal: number;
  borrowFactorSnapshot: string;
}

export function useSbl() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [obligationData, setObligationData] = useState<OnChainObligation | null>(null);
  const [isObligationCreated, setIsObligationCreated] = useState<boolean>(false);

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
    try {
      return new Program(idl as Idl, provider);
    } catch (e) {
      console.warn("Failed to create Anchor Program instance:", e);
      return null;
    }
  }, [provider]);

  const marketPda = useMemo(() => findSblMarketAddress(DEFAULT_MARKET_ID), []);

  const obligationPda = useMemo(() => {
    if (!publicKey) return null;
    return findSblObligationAddress(marketPda, publicKey);
  }, [marketPda, publicKey]);

  // Fetch On-Chain Obligation if exists
  const fetchObligation = useCallback(async () => {
    if (!program || !obligationPda) return;
    try {
      const account: any = await (program.account as any).obligation.fetchNullable(obligationPda);
      if (account) {
        setIsObligationCreated(true);
        setObligationData({
          user: account.user,
          market: account.market,
          collateralCount: account.collateralCount,
          collateralEntries: account.collateralEntries.slice(0, account.collateralCount).map((entry: any) => ({
            mint: entry.mint,
            amount: entry.amount.toNumber(),
          })),
          borrowedUsdssPrincipal: account.borrowedUsdssPrincipal.toNumber(),
          borrowFactorSnapshot: account.borrowFactorSnapshot.toString(),
        });
      } else {
        setIsObligationCreated(false);
        setObligationData(null);
      }
    } catch (err) {
      console.debug("Obligation not found on-chain or not initialized yet:", err);
      setIsObligationCreated(false);
      setObligationData(null);
    }
  }, [program, obligationPda]);

  useEffect(() => {
    if (connected && program && obligationPda) {
      fetchObligation();
    }
  }, [connected, program, obligationPda, fetchObligation]);

  // 1. Initialize Obligation on Devnet
  const initObligation = useCallback(async () => {
    if (!program || !publicKey || !obligationPda) {
      toast.error("Wallet not connected");
      return null;
    }
    setLoading(true);
    try {
      const tx = await (program.methods as any)
        .initObligation()
        .accounts({
          user: publicKey,
          market: marketPda,
          obligation: obligationPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast.success("Obligation initialized on Solana Devnet!");
      await fetchObligation();
      return tx;
    } catch (err: any) {
      console.error("initObligation error:", err);
      toast.error(err.message || "Failed to initialize obligation");
      return null;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, obligationPda, marketPda, fetchObligation]);

  return {
    program,
    provider,
    loading,
    marketPda,
    obligationPda,
    obligationData,
    isObligationCreated,
    fetchObligation,
    initObligation,
    programId: SBL_PROGRAM_ID,
    isDevnetDeployed: true,
  };
}
