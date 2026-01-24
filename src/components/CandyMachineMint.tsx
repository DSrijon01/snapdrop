"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { FC, useState, useMemo, useEffect, useCallback, ReactNode } from "react";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { fetchCandyMachine, mintV2, mplCandyMachine, safeFetchCandyGuard } from "@metaplex-foundation/mpl-candy-machine";
import { publicKey as umiPublicKey, transactionBuilder, some, generateSigner } from "@metaplex-foundation/umi";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
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
            .use(mplCandyMachine());
        
        if (wallet.wallet?.adapter) {
            u.use(walletAdapterIdentity(wallet.wallet.adapter));
        }
        
        return u;
    }, [wallet.wallet]);

    const CANDY_MACHINE_ID = umiPublicKey("FmiNM5JC6RJgJXVpDT84UrpSjZvMnz7Xcy7mAZjbkvUG");
    const CANDY_GUARD_ID = umiPublicKey("GVGDiH2y1DCEdNaDgSrgiMEofuD9QVQ36kSMrj2n6AQo"); // From sugar guard show

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

    useEffect(() => {
        checkBalance();
    }, [checkBalance]);

    const handleRequestAirdrop = async () => {
        if (!wallet.publicKey) return;
        setIsMinting(true);
        setStatus("Requesting 1 SOL Airdrop...");
        try {
            const signature = await connection.requestAirdrop(wallet.publicKey, 1 * LAMPORTS_PER_SOL);
            await connection.confirmTransaction(signature, "confirmed");
            setStatus("Airdrop successful! Balance updated.");
            checkBalance();
        } catch (error: any) {
            console.error("Airdrop failed:", error);
            const errStr = JSON.stringify(error);
            if (errStr.includes("429") || errStr.includes("limit")) {
                 setStatus(
                    <span>
                        Airdrop limit reached. Visit <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer" className="underline text-pink-300 hover:text-white">faucet.solana.com</a>
                    </span>
                 );
            } else {
                 setStatus("Airdrop failed: " + (error.message || error.name));
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
            const signature = tx.signature;
            // Decode signature if needed, but for now just success
            setStatus("Mint successful! Check the gallery.");
            checkBalance();
            
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
        <div className="p-6 bg-black/60 backdrop-blur-md border border-pink-500/30 rounded-xl text-center max-w-sm mx-auto shadow-[0_0_20px_rgba(236,72,153,0.3)]">
            <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-pink-500">
                SnapDrop Mint
            </h2>
            <p className="text-gray-300 mb-6 text-sm">
                Get a random unique NFT from our collection.
            </p>
            
            {balance !== null && (
                 <p className="text-xs text-gray-400 mb-4">Balance: {balance.toFixed(3)} SOL</p>
            )}

            <div className="flex flex-col gap-3">
                <button
                    onClick={handleMint}
                    disabled={isMinting || !wallet.connected}
                    className={`
                        w-full py-3 px-6 rounded-lg font-bold text-white transition-all duration-300
                        ${isMinting 
                            ? 'bg-gray-600 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-green-500 to-pink-600 hover:scale-105 hover:shadow-lg hover:shadow-pink-500/25'}
                    `}
                >
                    {isMinting ? "Processing..." : "Mint NFT (0.1 SOL)"}
                </button>

                 {/* Show Airdrop button if balance is low (e.g., < 1 SOL) and connected */}
                {wallet.connected && balance !== null && balance < 1 && (
                     <button
                        onClick={handleRequestAirdrop}
                        disabled={isMinting}
                        className="w-full py-2 px-6 rounded-lg font-bold text-pink-400 border border-pink-500/50 hover:bg-pink-500/10 transition-all duration-300 text-sm"
                    >
                        Request Airdrop (1 SOL)
                    </button>
                )}
            </div>
            
            {status && (
                <div className={`mt-4 text-sm ${typeof status === "string" && status.includes("success") ? "text-green-400" : "text-pink-400"}`}>
                    {status}
                </div>
            )}
        </div>
    );
};
