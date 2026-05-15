import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { StreetSync } from "../utils/types/street_sync";
import IDL from "../utils/idl/street_sync.json";

export const STREET_SYNC_PROGRAM_ID = new PublicKey("3obPCCswxLT51VpKhY8KgG83geqv4HFPe2oBAEZYDbYY");

export function useStreetSync() {
    const { connection } = useConnection();
    const wallet = useWallet();

    const program = useMemo(() => {
        if (!wallet.publicKey) return null;

        const provider = new AnchorProvider(
            connection,
            wallet as any,
            { commitment: "confirmed" }
        );

        return new Program(IDL as Idl, STREET_SYNC_PROGRAM_ID, provider) as unknown as Program<StreetSync>;
    }, [connection, wallet]);

    return { program };
}
