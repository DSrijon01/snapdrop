import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { SsNftGallery } from "../utils/types/ss_nft_gallery";
import IDL from "../utils/idl/ss_nft_gallery.json";

export const SS_NFT_GALLERY_PROGRAM_ID = new PublicKey("DTwegYcmbFfU8xwSigwZ14e9zrGHfErjENrXCSpLJxso");

export function useSsNftGallery() {
    const { connection } = useConnection();
    const wallet = useWallet();

    const program = useMemo(() => {
        if (!wallet.publicKey) return null;

        const provider = new AnchorProvider(
            connection,
            wallet as any,
            { commitment: "confirmed" }
        );

        return new Program(IDL as Idl, provider) as unknown as Program<SsNftGallery>;
    }, [connection, wallet]);

    return { program };
}
