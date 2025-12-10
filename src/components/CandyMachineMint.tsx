"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { FC, useState, useMemo } from "react";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { fetchCandyMachine, mintV2, mplCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { publicKey as umiPublicKey, transactionBuilder, some, generateSigner } from "@metaplex-foundation/umi";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";

interface Props {
    onMintSuccess?: () => void;
}

export const CandyMachineMint: FC<Props> = ({ onMintSuccess }) => {
    // ...
    // (Keep existing hooks)
    const wallet = useWallet();
    const [isMinting, setIsMinting] = useState(false);
    const [status, setStatus] = useState<string>("");

    // Initialize Umi
    const umi = useMemo(() => {
        const u = createUmi("https://api.devnet.solana.com")
            .use(mplCandyMachine());
        
        if (wallet.wallet?.adapter) {
            u.use(walletAdapterIdentity(wallet.wallet.adapter));
        }
        
        return u;
    }, [wallet.wallet]);

    const CANDY_MACHINE_ID = umiPublicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID!);
    const CANDY_GUARD_ID = umiPublicKey(process.env.NEXT_PUBLIC_CANDY_GUARD_ID!); // Random Drop IDs

    const handleMint = async () => {
        if (!wallet.connected || !wallet.publicKey) {
            setStatus("Please connect your wallet first!");
            return;
        }

        // Check Balance
        const balance = await umi.rpc.getBalance(umiPublicKey(wallet.publicKey));
        if (balance.basisPoints < BigInt(10_000_000)) { // 0.01 SOL
             setStatus("Not Enough SOL");
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
            
            if (onMintSuccess) {
                onMintSuccess();
            }

        } catch (error: unknown) {
            console.error("Mint failed:", error);
            let message = "Mint failed! ";
            if (error instanceof Error) {
                 message += error.message;
            } else {
                message += String(error);
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
                {isMinting ? "Minting..." : "Mint NFT (0.01 SOL)"}
            </button>
            
            {status && (
                <p className={`mt-4 text-sm ${status.includes("success") ? "text-green-400" : "text-pink-400"}`}>
                    {status}
                </p>
            )}
        </div>
    );
};
