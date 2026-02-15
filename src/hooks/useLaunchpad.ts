import { useEffect, useState, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, ComputeBudgetProgram } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, getMint } from '@solana/spl-token';
import idl from '../idl/launchpad.json';

const PROGRAM_ID = new PublicKey("5k5WjHFfW8WUY3VXaJKKyuiFSwt4fowY78gnNJHeE1eV");
const TREASURY_WALLET = new PublicKey("9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu");

export type BondingCurveAccount = {
    publicKey: PublicKey;
    account: {
        creator: PublicKey;
        mint: PublicKey;
        virtualSolReserves: BN;
        virtualTokenReserves: BN;
        realTokenReserves: BN;
        bump: number;
    };
};

export const useLaunchpad = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [program, setProgram] = useState<Program<Idl> | null>(null);
    const [curves, setCurves] = useState<BondingCurveAccount[]>([]);
    const [loading, setLoading] = useState(false);

    const provider = useMemo(() => {
        if (wallet && wallet.publicKey) {
            return new AnchorProvider(connection, wallet as any, {
                preflightCommitment: 'confirmed',
            });
        } else {
            // Read-only provider
            const dummyWallet = {
                publicKey: PublicKey.default,
                signTransaction: async (tx: any) => tx,
                signAllTransactions: async (txs: any[]) => txs,
            };
            return new AnchorProvider(connection, dummyWallet, {
                preflightCommitment: 'confirmed',
            });
        }
    }, [connection, wallet]);

    useEffect(() => {
        if (provider) {
            try {
                const prog = new Program(idl as Idl, provider);
                setProgram(prog);
            } catch (e) {
                console.error("Failed to init program:", e);
            }
        }
    }, [provider]);

    const fetchCurves = async () => {
        if (!program) return;
        setLoading(true);
        try {
            console.log("Fetching bonding curves...");
            // @ts-ignore
            const accounts = await program.account.bondingCurve.all();
            console.log("Fetched curves:", accounts);
            setCurves(accounts);
        } catch (error) {
            console.error("Error fetching curves:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (program) {
            fetchCurves();
        }
    }, [program]);

    const buyTokens = async (curve: BondingCurveAccount, amount: number) => {
        if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
        
        const mint = curve.account.mint;
        // Determine token program (standard or 2022)
        // We need to check the account owner of the mint.
        const mintAccountInfo = await connection.getAccountInfo(mint);
        if (!mintAccountInfo) throw new Error("Mint not found");
        
        const tokenProgramId = mintAccountInfo.owner;
        const isToken2022 = tokenProgramId.equals(TOKEN_2022_PROGRAM_ID);

        const buyerTokenAccount = getAssociatedTokenAddressSync(
            mint,
            wallet.publicKey,
            false,
            tokenProgramId
        );

        const vault = getAssociatedTokenAddressSync(
            mint,
            curve.publicKey,
            true, // allowOwnerOffCurve = true for PDA
            tokenProgramId
        );

        // Calculate amount in BN (assuming decimals... need to fetch?)
        // The Launchpad doesn't store decimals. We should fetch mint decimals.
        // Logs for debugging
        console.log("Buying Tokens:");
        console.log("Mint:", mint.toBase58());
        console.log("Token Program:", tokenProgramId.toBase58());
        console.log("Buyer ATA:", buyerTokenAccount.toBase58());
        console.log("Vault ATA:", vault.toBase58());

        const mintAccount = await getMint(connection, mint, "confirmed", tokenProgramId);
        const decimals = mintAccount.decimals;
        
        // Convert to atomic units
        // amount is in "Tokens", we need "Raw Units"
        const atomicAmount = new BN(Math.floor(amount * Math.pow(10, decimals)));
        console.log("Amount (Atomic):", atomicAmount.toString());

        const tx = await program.methods
            .buyTokens(atomicAmount)
            .preInstructions([
                ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
            ])
            .accounts({
                curve: curve.publicKey,
                mint: mint,
                vault: vault,
                buyer: wallet.publicKey,
                buyerTokenAccount: buyerTokenAccount,
                globalWallet: TREASURY_WALLET,
                tokenProgram: tokenProgramId,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            // .signers([]) // wallet signs automatically
            .rpc();
        
        return tx;
    };

    return {
        program,
        curves,
        loading,
        fetchCurves,
        buyTokens,
    };
};
