import { useState, useCallback, useMemo, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import toast from "react-hot-toast";
import idl from "../idl/snbl_cbl.json";

export const CBL_PROGRAM_ID = new PublicKey(
  (idl as any).address || "5b5TiXtDoo1twykQe5eHhZ7vXbQffVwN4G9mmfA4UNqz"
);

export const DEFAULT_CBL_MARKET_ID = "SS-CBL-DEVNET-0";

export const findCblMarketAddress = (marketId: string = DEFAULT_CBL_MARKET_ID) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("cbl_market"), Buffer.from(marketId)],
    CBL_PROGRAM_ID
  )[0];
};

export const findCblReserveAddress = (market: PublicKey, collateralMint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("cbl_reserve"), market.toBuffer(), collateralMint.toBuffer()],
    CBL_PROGRAM_ID
  )[0];
};

export const findCblObligationAddress = (
  market: PublicKey,
  user: PublicKey,
  collateralMint: PublicKey
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("cbl_obligation"),
      market.toBuffer(),
      user.toBuffer(),
      collateralMint.toBuffer(),
    ],
    CBL_PROGRAM_ID
  )[0];
};

export interface CblOnChainObligation {
  user: PublicKey;
  market: PublicKey;
  collateralMint: PublicKey;
  collateralAmount: number;
  borrowedUsdssPrincipal: number;
  loanStartTimestamp: number;
  durationSeconds: number;
  dueTimestamp: number;
  interestRateBps: number;
  accruedInterestUsdss: number;
  isLocked: boolean;
  isSettled: boolean;
}

export function useCbl() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions, connected } = useWallet();
  const [loading, setLoading] = useState(false);

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
      console.warn("Failed to create Anchor Program for snbl_cbl:", e);
      return null;
    }
  }, [provider]);

  const marketPda = useMemo(() => findCblMarketAddress(DEFAULT_CBL_MARKET_ID), []);

  return {
    program,
    provider,
    loading,
    marketPda,
    programId: CBL_PROGRAM_ID,
    isDevnetDeployed: true,
  };
}
