import { Keypair, Connection, Transaction, SystemProgram } from '@solana/web3.js';
import { 
    TOKEN_2022_PROGRAM_ID, 
    createInitializeMintInstruction,
    createInitializeMetadataPointerInstruction,
    getMintLen,
    ExtensionType,
    TYPE_SIZE,
    LENGTH_SIZE
} from '@solana/spl-token';
import { createInitializeInstruction as createInitTokenMetadataInstruction, pack } from '@solana/spl-token-metadata';

async function main() {
    const connection = new Connection("http://127.0.0.1:8899", "confirmed");
    const walletKeypair = Keypair.generate();
    const wallet = walletKeypair.publicKey;
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;
    
    try {
        const sig = await connection.requestAirdrop(wallet, 10000000000); 
        await connection.confirmTransaction(sig);
    } catch(e) {}

    const metaData = {
        updateAuthority: wallet,
        mint: mint,
        name: "Test",
        symbol: "TST",
        uri: "http://example.com/metadata.json",
        additionalMetadata: []
    };

    // Calculate space using SDK officially!
    const mintLen = getMintLen(
        [ExtensionType.MetadataPointer],
        { [ExtensionType.TokenMetadata]: pack(metaData).length }
    );
    // Let's see what mintLen is
    console.log("Official mintLen:", mintLen);
    
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
    
    const tx = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: wallet,
            newAccountPubkey: mint,
            space: mintLen,
            lamports,
            programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeMetadataPointerInstruction(
            mint,
            wallet,
            mint,
            TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
            mint,
            6,
            wallet,
            null,
            TOKEN_2022_PROGRAM_ID
        ),
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
    if(sim.value.err) {
        console.log(`Failed!`, sim.value.err);
        if(sim.value.logs) console.log(sim.value.logs);
    } else {
        console.log(`SUCCESS!`);
    }
}
main().catch(console.error);
