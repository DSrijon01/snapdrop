import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { SsNftGallery } from "../utils/types/ss_nft_gallery";
import IDL from "../utils/idl/ss_nft_gallery.json";
import { createConfirmedProvider } from "@/utils/solanaRetry";

export const SS_NFT_GALLERY_PROGRAM_ID = new PublicKey("DTwegYcmbFfU8xwSigwZ14e9zrGHfErjENrXCSpLJxso");

export function useSsNftGallery() {
    const { connection } = useConnection();
    const wallet = useWallet();

    const program = useMemo(() => {
        if (!wallet.publicKey) return null;

        const provider = createConfirmedProvider(connection, wallet);

        return new Program(IDL as Idl, provider) as unknown as Program<SsNftGallery>;
    }, [connection, wallet]);

    return { program };
}
