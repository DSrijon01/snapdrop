
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

const checkATA = async () => {
    const connection = new Connection("https://api.devnet.solana.com");
    const mint = new PublicKey("4xTT67AzpXVbt44mCbkmjHhCE1hr16y4zUAd1iinLEAb");
    const owner = new PublicKey("BUkY94HxyN8dcsxgAw7r3wPgqaW1b3Qg9cP4B85Y91v5");

    const ata = await getAssociatedTokenAddress(mint, owner);
    console.log("Calculated ATA:", ata.toBase58());

    const info = await connection.getAccountInfo(ata);
    if (info) {
        console.log("ATA Owner:", info.owner.toBase58());
        console.log("ATA Exists. Data Length:", info.data.length);
    } else {
        console.log("ATA Does NOT Exist (Uninitialized System Account?)");
    }
};

checkATA();
