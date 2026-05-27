import { useEffect, useState, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, ComputeBudgetProgram } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, getMint, ExtensionType, getExtensionTypes } from '@solana/spl-token';
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
    isToken2022?: boolean;
    activeExtensions?: ExtensionType[];
};

export type FixedPriceVaultAccount = {
    publicKey: PublicKey;
    account: {
        creator: PublicKey;
        mint: PublicKey;
        pricePerToken: BN;
        totalSupply: BN;
        remainingSupply: BN;
        bump: number;
    };
    isToken2022?: boolean;
    activeExtensions?: ExtensionType[];
};

export type TokenListingAccount = {
    publicKey: PublicKey;
    account: {
        seller: PublicKey;
        mint: PublicKey;
        amount: BN;
        price: BN;
        bump: number;
    };
    isToken2022?: boolean;
    activeExtensions?: ExtensionType[];
};

export const useLaunchpad = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [program, setProgram] = useState<Program<Idl> | null>(null);
    const [curves, setCurves] = useState<BondingCurveAccount[]>([]);
    const [fixedPriceVaults, setFixedPriceVaults] = useState<FixedPriceVaultAccount[]>([]);
    const [tokenListings, setTokenListings] = useState<TokenListingAccount[]>([]);
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
            
            // Fetch mint accounts to determine program and extensions
            const mintPubkeys = accounts.map((acc: any) => acc.account.mint);
            const mintInfos = await connection.getMultipleAccountsInfo(mintPubkeys);

            const enrichedAccounts = accounts.map((acc: any, index: number) => {
                const mintInfo = mintInfos[index];
                let isToken2022 = false;
                let activeExtensions: ExtensionType[] = [];

                if (mintInfo) {
                    isToken2022 = mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
                    if (isToken2022) {
                        try {
                            // Extract extension types from mint data
                            activeExtensions = getExtensionTypes(mintInfo.data);
                        } catch (e) {
                            console.error("Error parsing extensions for mint:", acc.account.mint.toBase58(), e);
                        }
                    }
                }

                return {
                    ...acc,
                    isToken2022,
                    activeExtensions
                };
            });

            console.log("Fetched and enriched curves:", enrichedAccounts);
            setCurves(enrichedAccounts);
        } catch (error) {
            console.error("Error fetching curves:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFixedPriceVaults = async () => {
        if (!program) return;
        try {
            console.log("Fetching fixed price vaults...");
            // @ts-ignore
            const accounts = await program.account.fixedPriceVault.all();
            
            const mintPubkeys = accounts.map((acc: any) => acc.account.mint);
            const mintInfos = await connection.getMultipleAccountsInfo(mintPubkeys);

            const enrichedAccounts = accounts.map((acc: any, index: number) => {
                const mintInfo = mintInfos[index];
                let isToken2022 = false;
                let activeExtensions: ExtensionType[] = [];

                if (mintInfo) {
                    isToken2022 = mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
                    if (isToken2022) {
                        try {
                            activeExtensions = getExtensionTypes(mintInfo.data);
                        } catch (e) {
                            console.error("Error parsing extensions for mint:", acc.account.mint.toBase58(), e);
                        }
                    }
                }

                return {
                    ...acc,
                    isToken2022,
                    activeExtensions
                };
            });

            console.log("Fetched fixed price vaults:", enrichedAccounts);
            setFixedPriceVaults(enrichedAccounts);
        } catch (error) {
            console.error("Error fetching fixed price vaults:", error);
        }
    };

    const fetchTokenListings = async () => {
        if (!program) return;
        try {
            console.log("Fetching secondary token listings...");
            // @ts-ignore
            const accounts = await program.account.tokenListing.all();
            
            const mintPubkeys = accounts.map((acc: any) => acc.account.mint);
            const mintInfos = await connection.getMultipleAccountsInfo(mintPubkeys);

            const enrichedAccounts = accounts.map((acc: any, index: number) => {
                const mintInfo = mintInfos[index];
                let isToken2022 = false;
                let activeExtensions: ExtensionType[] = [];

                if (mintInfo) {
                    isToken2022 = mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
                    if (isToken2022) {
                        try {
                            activeExtensions = getExtensionTypes(mintInfo.data);
                        } catch (e) {
                            console.error("Error parsing extensions for mint:", acc.account.mint.toBase58(), e);
                        }
                    }
                }

                return {
                    ...acc,
                    isToken2022,
                    activeExtensions
                };
            });

            console.log("Fetched token listings:", enrichedAccounts);
            setTokenListings(enrichedAccounts);
        } catch (error) {
            console.error("Error fetching token listings:", error);
        }
    };

    useEffect(() => {
        if (program) {
            fetchCurves();
            fetchFixedPriceVaults();
            fetchTokenListings();
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

    const buyTokensFixedPrice = async (vault: FixedPriceVaultAccount, amount: number) => {
        if (!program || !wallet.publicKey) throw new Error("Wallet not connected");

        const mint = vault.account.mint;
        const mintAccountInfo = await connection.getAccountInfo(mint);
        if (!mintAccountInfo) throw new Error("Mint not found");

        const tokenProgramId = mintAccountInfo.owner;
        const buyerTokenAccount = getAssociatedTokenAddressSync(
            mint,
            wallet.publicKey,
            false,
            tokenProgramId
        );

        const vaultAta = getAssociatedTokenAddressSync(
            mint,
            vault.publicKey,
            true,
            tokenProgramId
        );

        const mintAccount = await getMint(connection, mint, "confirmed", tokenProgramId);
        const decimals = mintAccount.decimals;
        const atomicAmount = new BN(Math.floor(amount * Math.pow(10, decimals)));

        const tx = await program.methods
            .buyTokensFixedPrice(atomicAmount)
            .preInstructions([
                ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
            ])
            .accounts({
                vaultAccount: vault.publicKey,
                mint: mint,
                vault: vaultAta,
                buyer: wallet.publicKey,
                buyerTokenAccount: buyerTokenAccount,
                globalWallet: vault.account.creator,
                tokenProgram: tokenProgramId,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        return tx;
    };

    const listTokenSecondary = async (mint: PublicKey, amount: number, priceSol: number) => {
        if (!program || !wallet.publicKey) throw new Error("Wallet not connected");

        const mintAccountInfo = await connection.getAccountInfo(mint);
        if (!mintAccountInfo) throw new Error("Mint not found");

        const tokenProgramId = mintAccountInfo.owner;
        const sellerTokenAccount = getAssociatedTokenAddressSync(
            mint,
            wallet.publicKey,
            false,
            tokenProgramId
        );

        const [listingPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("token_listing"), mint.toBuffer(), wallet.publicKey.toBuffer()],
            program.programId
        );

        const escrowAta = getAssociatedTokenAddressSync(
            mint,
            listingPda,
            true,
            tokenProgramId
        );

        const mintAccount = await getMint(connection, mint, "confirmed", tokenProgramId);
        const decimals = mintAccount.decimals;
        const atomicAmount = new BN(Math.floor(amount * Math.pow(10, decimals)));
        const priceLamports = new BN(priceSol * 1_000_000_000);

        const tx = await program.methods
            .listTokenSecondary(atomicAmount, priceLamports)
            .accounts({
                seller: wallet.publicKey,
                mint: mint,
                sellerTokenAccount: sellerTokenAccount,
                listingAccount: listingPda,
                escrowTokenAccount: escrowAta,
                tokenProgram: tokenProgramId,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        return tx;
    };

    const buyTokenSecondary = async (listing: TokenListingAccount) => {
        if (!program || !wallet.publicKey) throw new Error("Wallet not connected");

        const mint = listing.account.mint;
        const mintAccountInfo = await connection.getAccountInfo(mint);
        if (!mintAccountInfo) throw new Error("Mint not found");

        const tokenProgramId = mintAccountInfo.owner;
        const buyerTokenAccount = getAssociatedTokenAddressSync(
            mint,
            wallet.publicKey,
            false,
            tokenProgramId
        );

        const escrowAta = getAssociatedTokenAddressSync(
            mint,
            listing.publicKey,
            true,
            tokenProgramId
        );

        const tx = await program.methods
            .buyTokenSecondary()
            .accounts({
                buyer: wallet.publicKey,
                seller: listing.account.seller,
                treasury: TREASURY_WALLET,
                mint: mint,
                listingAccount: listing.publicKey,
                escrowTokenAccount: escrowAta,
                buyerTokenAccount: buyerTokenAccount,
                tokenProgram: tokenProgramId,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        return tx;
    };

    const cancelTokenSecondary = async (listing: TokenListingAccount) => {
        if (!program || !wallet.publicKey) throw new Error("Wallet not connected");

        const mint = listing.account.mint;
        const mintAccountInfo = await connection.getAccountInfo(mint);
        if (!mintAccountInfo) throw new Error("Mint not found");

        const tokenProgramId = mintAccountInfo.owner;
        const sellerTokenAccount = getAssociatedTokenAddressSync(
            mint,
            wallet.publicKey,
            false,
            tokenProgramId
        );

        const escrowAta = getAssociatedTokenAddressSync(
            mint,
            listing.publicKey,
            true,
            tokenProgramId
        );

        const tx = await program.methods
            .cancelTokenSecondary()
            .accounts({
                seller: wallet.publicKey,
                mint: mint,
                listingAccount: listing.publicKey,
                escrowTokenAccount: escrowAta,
                sellerTokenAccount: sellerTokenAccount,
                tokenProgram: tokenProgramId,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        return tx;
    };

    return {
        program,
        curves,
        fixedPriceVaults,
        tokenListings,
        loading,
        fetchCurves,
        fetchFixedPriceVaults,
        fetchTokenListings,
        buyTokens,
        buyTokensFixedPrice,
        listTokenSecondary,
        buyTokenSecondary,
        cancelTokenSecondary,
    };
};
