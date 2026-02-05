"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { FC, useState, useMemo, useEffect, useCallback, ReactNode } from "react";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { fetchCandyMachine, mintV2, mplCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { publicKey as umiPublicKey, transactionBuilder, some, generateSigner } from "@metaplex-foundation/umi";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import { mplTokenMetadata, fetchAllDigitalAssetByOwner } from "@metaplex-foundation/mpl-token-metadata";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

interface Props {
    onMintSuccess?: () => void;
}

export const CandyMachineMint: FC<Props> = ({ onMintSuccess }) => {
    // ...
    // (Keep existing hooks)
    const { connection } = useConnection();
    const wallet = useWallet();
    const [isMinting, setIsMinting] = useState(false);
    const [status, setStatus] = useState<ReactNode>("");
    const [balance, setBalance] = useState<number | null>(null);

    // Initialize Umi
    const umi = useMemo(() => {
        const u = createUmi("https://api.devnet.solana.com")
            .use(mplCandyMachine())
            .use(mplTokenMetadata());
        
        if (wallet.wallet?.adapter) {
            u.use(walletAdapterIdentity(wallet.wallet.adapter));
        }
        
        return u;
    }, [wallet.wallet]);

    const CANDY_MACHINE_ID = umiPublicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID || "FmiNM5JC6RJgJXVpDT84UrpSjZvMnz7Xcy7mAZjbkvUG");
    const CANDY_GUARD_ID = umiPublicKey(process.env.NEXT_PUBLIC_CANDY_GUARD_ID || "GVGDiH2y1DCEdNaDgSrgiMEofuD9QVQ36kSMrj2n6AQo");
    
    // Limits
    const MAX_MINTS_PER_WALLET = 2;
    const [mintCount, setMintCount] = useState<number | null>(null);
    const [isCheckingLimit, setIsCheckingLimit] = useState(false);

    const checkBalance = useCallback(async () => {
        if (wallet.publicKey) {
            try {
                const bal = await connection.getBalance(wallet.publicKey);
                setBalance(bal / LAMPORTS_PER_SOL);
            } catch (e) {
                console.error("Failed to get balance", e);
            }
        } else {
            setBalance(null);
        }
    }, [connection, wallet.publicKey]);

    const checkEligibility = useCallback(async () => {
        if (!umi || !wallet.publicKey) {
            setMintCount(null);
            return;
        }

        setIsCheckingLimit(true);
        try {
            // 1. Fetch Candy Machine to get collection Mint
            const cm = await fetchCandyMachine(umi, CANDY_MACHINE_ID);
            const collectionMint = cm.collectionMint;

            // 2. Fetch all assets owned by user
            const assets = await fetchAllDigitalAssetByOwner(umi, umiPublicKey(wallet.publicKey));
            
            // 3. Filter for our collection
            // Note: On Devnet/Testnet metadata might be tricky, but we check if the item 
            // belongs to the verified collection of the Candy Machine.
            const userMints = assets.filter(asset => {
                const group = asset.metadata.collection;
                return group && group.__option === 'Some' && group.value.verified && group.value.key === collectionMint;
            });

            console.log("User owns:", userMints.length, "from collection:", collectionMint);
            setMintCount(userMints.length);

        } catch (e) {
            console.error("Failed to check eligibility:", e);
        } finally {
            setIsCheckingLimit(false);
        }
    }, [umi, wallet.publicKey, CANDY_MACHINE_ID]);

    useEffect(() => {
        checkBalance();
        checkEligibility();
    }, [checkBalance, checkEligibility]);

    const handleRequestAirdrop = async () => {
        if (!wallet.publicKey) return;
        setIsMinting(true);
        setStatus("Requesting 0.5 SOL Airdrop...");
        try {
            const signature = await connection.requestAirdrop(wallet.publicKey, 0.5 * LAMPORTS_PER_SOL);
            
            const latestBlockhash = await connection.getLatestBlockhash();
            await connection.confirmTransaction({
                signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
            }, "confirmed");

            setStatus("Airdrop successful! Balance updated.");
            checkBalance();
        } catch (error: any) {
            console.error("Airdrop failed:", error);
            const errMessage = error?.message || JSON.stringify(error);
            if (errMessage.includes("429") || errMessage.includes("limit")) {
                 setStatus(
                    <span>
                        Airdrop limit reached (IP shared). Visit <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="underline text-pink-300 hover:text-white">faucet.solana.com</a>
                    </span>
                 );
            } else {
                 setStatus("Airdrop failed: " + errMessage);
            }
        } finally {
            setIsMinting(false);
        }
    };

    const handleMint = async () => {
        if (!wallet.connected || !wallet.publicKey) {
            setStatus("Please connect your wallet first!");
            return;
        }

        setIsMinting(true);
        setStatus("Initializing mint...");

        try {
            if (!umi) {
                setStatus("Umi not initialized");
                return;
            }

            console.log("Fetching Candy Machine...");
            const candyMachine = await fetchCandyMachine(umi, CANDY_MACHINE_ID);
            
            setStatus("Minting NFT (Confirm Transaction)...");
            console.log("Building Mint Transaction...");

            const nftMint = generateSigner(umi);

            const tx = await transactionBuilder()
                .add(setComputeUnitLimit(umi, { units: 800_000 }))
                .add(mintV2(umi, {
                    candyMachine: candyMachine.publicKey,
                    candyGuard: CANDY_GUARD_ID,
                    collectionMint: candyMachine.collectionMint,
                    collectionUpdateAuthority: candyMachine.authority,
                    nftMint,
                    mintArgs: {
                        solPayment: some({ destination: umiPublicKey("9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu") }),
                    },
                }))
                .sendAndConfirm(umi, {
                    confirm: { commitment: "finalized" }
                });


            console.log("Mint successful!", tx);
            // const signature = tx.signature;
            // Decode signature if needed, but for now just success
            setStatus("Mint successful! Check the gallery.");
            checkBalance();
            checkEligibility();
            
            if (onMintSuccess) {
                onMintSuccess();
            }

        } catch (error: any) {
            console.error("Mint failed:", error);
            let message = "Mint failed! ";
            if (error.message) {
                 message += error.message;
            } else if (error.name) {
                message += error.name;
            }
            setStatus(message);
        } finally {
            setIsMinting(false);
        }
    };

    return (
        <div className="p-6 bg-black/80 backdrop-blur-xl border border-red-900/40 rounded-xl text-center max-w-sm mx-auto shadow-[0_0_30px_rgba(220,38,38,0.15)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 via-transparent to-black pointer-events-none" />
            
            <h2 className="text-2xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-white uppercase italic tracking-tighter transform -skew-x-6 relative z-10">
                Mint NFT
            </h2>
            <p className="text-gray-400 mb-6 text-sm font-light relative z-10">
                Get a unique digital collectible from the Street Sync collection.
            </p>
            
            {balance !== null && (
                 <p className="text-xs text-red-400/80 mb-4 font-mono relative z-10">Balance: {balance.toFixed(3)} SOL</p>
            )}

            <div className="flex flex-col gap-3 relative z-10">
                <button
                    onClick={handleMint}
                    disabled={isMinting || !wallet.connected || (mintCount !== null && mintCount >= MAX_MINTS_PER_WALLET)}
                    className={`
                        w-full py-3 px-6 rounded-none font-black text-white transition-all duration-300 transform skew-x-[-10deg] uppercase tracking-widest border border-transparent
                        ${isMinting 
                            ? 'bg-gray-800 cursor-not-allowed text-gray-500' 
                            : (mintCount !== null && mintCount >= MAX_MINTS_PER_WALLET)
                              ? 'bg-red-900/20 border-red-900/50 text-red-700 cursor-not-allowed'
                              : 'bg-red-600 hover:bg-red-700 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-[1.02] border-red-500/30'}
                    `}
                >
                    {isMinting 
                        ? "Minting..." 
                        : (mintCount !== null && mintCount >= MAX_MINTS_PER_WALLET)
                             ? `Limit Reached (${mintCount}/${MAX_MINTS_PER_WALLET})`
                             : isCheckingLimit 
                                ? "Checking..."
                                : "Mint NFT (0.1 SOL)"
                    }
                </button>

                 {/* Show Airdrop button if balance is low (e.g., < 1 SOL) and connected */}
                {wallet.connected && balance !== null && balance < 1 && (
                     <button
                        onClick={handleRequestAirdrop}
                        disabled={isMinting}
                        className="w-full py-2 px-6 rounded-none font-bold text-red-500 border border-red-900/50 hover:bg-red-900/20 transition-all duration-300 text-xs uppercase tracking-wider transform skew-x-[-10deg]"
                    >
                        Request Funds (0.5 SOL)
                    </button>
                )}
            </div>
            
            {status && (
                <div className={`mt-4 text-xs font-mono relative z-10 ${typeof status === "string" && status.includes("success") ? "text-green-500" : "text-red-400"}`}>
                    {status}
                </div>
            )}
        </div>
    );
};
