import { Keypair, Connection, Transaction, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, createInitializeMintInstruction, createInitializeMetadataPointerInstruction, getMintLen, ExtensionType, TYPE_SIZE, LENGTH_SIZE } from "@solana/spl-token";
import { pack, createInitializeInstruction as createInitTokenMetadataInstruction } from "@solana/spl-token-metadata";
import fs from "fs";

const execute = async () => {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const secret = JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf-8'));
    const payer = Keypair.fromSecretKey(new Uint8Array(secret));

    const mint = Keypair.generate();
    const metaData = {
        updateAuthority: payer.publicKey,
        mint: mint.publicKey,
        name: "OPOS",
        symbol: "OPOS",
        uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
        additionalMetadata: [["description", "Only Possible On Solana"]] as [string, string][]
    };
    
    const extensionSpace = TYPE_SIZE + LENGTH_SIZE + pack(metaData).length; 
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);

    // Send the lamports for the FULL size
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + extensionSpace);

    const tx = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mint.publicKey,
            space: mintLen, // ONLY ALLOCATE MINT LEN
            lamports,       // BUT TRANSFER LAMPORTS FOR FULL SIZE
            programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeMetadataPointerInstruction(
            mint.publicKey,
            payer.publicKey,
            mint.publicKey,
            TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
            mint.publicKey,
            6,
            payer.publicKey,
            payer.publicKey,
            TOKEN_2022_PROGRAM_ID
        ),
        // THEN call Metadata Init
        createInitTokenMetadataInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            metadata: mint.publicKey,
            updateAuthority: payer.publicKey,
            mint: mint.publicKey,
            mintAuthority: payer.publicKey,
            name: metaData.name,
            symbol: metaData.symbol,
            uri: metaData.uri,
        })
    );

    try {
        const txSig = await connection.simulateTransaction(tx, [payer, mint]);
        console.log("SIM ERROR:", txSig.value.err);
    } catch (e: any) {
        console.error("Error:", e);
    }
};
execute();
