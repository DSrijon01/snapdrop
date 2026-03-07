import { Keypair, Connection, Transaction, SystemProgram } from '@solana/web3.js';
import { 
    TOKEN_2022_PROGRAM_ID, 
    ExtensionType, 
    getMintLen, 
    getTypeLen,
    createInitializeMintInstruction,
    createInitializeMetadataPointerInstruction,
    TYPE_SIZE,
    LENGTH_SIZE
} from '@solana/spl-token';
import { createInitializeInstruction as createInitTokenMetadataInstruction, pack } from '@solana/spl-token-metadata';

async function main() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const walletKeypair = Keypair.generate();
    const wallet = walletKeypair.publicKey;
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    const activeExtensions = [ExtensionType.MetadataPointer];
    
    // UI Logic:
    let exactTotalSpace = 82 + 2; // MINT_SIZE (82) + ACCOUNT_TYPE_SIZE (2)
    for (const ext of activeExtensions) {
        exactTotalSpace += TYPE_SIZE + LENGTH_SIZE + getTypeLen(ext);
    }

    const metaData = {
        updateAuthority: wallet,
        mint: mint,
        name: "Test",
        symbol: "TST",
        uri: "http://example.com/metadata.json", // simulate a short URI
        additionalMetadata: []
    };

    const exactMetadataSpace = TYPE_SIZE + LENGTH_SIZE + pack(metaData).length;
    exactTotalSpace += exactMetadataSpace;

    const diff = exactTotalSpace % 4;
    const totalAccountSize = diff === 0 ? exactTotalSpace : exactTotalSpace + (4 - diff);

    console.log("UI exactTotalSpace:", exactTotalSpace);
    console.log("UI totalAccountSize:", totalAccountSize);
    
    // Compare with getMintLen
    const getMintLenSize = getMintLen(activeExtensions);
    console.log("getMintLen(activeExtensions):", getMintLenSize); 

    const lamports = 10000000;
    const tx = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: wallet,
            newAccountPubkey: mint,
            space: totalAccountSize,
            lamports,
            programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeMetadataPointerInstruction(mint, wallet, mint, TOKEN_2022_PROGRAM_ID),
        createInitializeMintInstruction(mint, 6, wallet, null, TOKEN_2022_PROGRAM_ID),
        createInitTokenMetadataInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            metadata: mint,
            updateAuthority: wallet,
            mint: mint,
            mintAuthority: wallet,
            name: metaData.name,
            symbol: metaData.symbol,
            uri: metaData.uri,
        })
    );
    tx.feePayer = wallet;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    const sim = await connection.simulateTransaction(tx, [walletKeypair, mintKeypair]);
    console.log("Sim Result:", sim.value.err ? sim.value.err : "Success");
    if(sim.value.logs && sim.value.err) {
        console.log("Logs:", sim.value.logs);
    }
}
main().catch(console.error);
