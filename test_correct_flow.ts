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

import * as fs from 'fs';

async function main() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync('/Users/srijonbiswas/.config/solana/id.json', 'utf8')));
    const walletKeypair = Keypair.fromSecretKey(secretKey);
    const wallet = walletKeypair.publicKey;
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    const metaData = {
        updateAuthority: wallet,
        mint: mint,
        name: "Test",
        symbol: "TST",
        uri: "http://example.com/metadata.json",
        additionalMetadata: []
    };

    const mintLen = getMintLen([ExtensionType.MetadataPointer]); // 234

    // Calculate final length required for lamports
    const exactMetadataSpace = TYPE_SIZE + LENGTH_SIZE + pack(metaData).length;
    const finalLength = mintLen + exactMetadataSpace + 4; // Add some padding buffer just in case

    // Fund the createAccount strictly for the FINAL length
    const lamports = await connection.getMinimumBalanceForRentExemption(finalLength);
    
    const tx = new Transaction().add(
        // 1. Create account with INITIAL space, but FINAL lamports
        SystemProgram.createAccount({
            fromPubkey: wallet,
            newAccountPubkey: mint,
            space: mintLen, 
            lamports: lamports,
            programId: TOKEN_2022_PROGRAM_ID,
        }),
        // 2. Initialize Metadata Pointer
        createInitializeMetadataPointerInstruction(
            mint,
            wallet,
            mint,
            TOKEN_2022_PROGRAM_ID
        ),
        // 3. Initialize Mint
        createInitializeMintInstruction(
            mint,
            6,
            wallet,
            null,
            TOKEN_2022_PROGRAM_ID
        ),
        // 4. Initialize Metadata (this triggers `realloc`)
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
    
    console.log("Simulating Canonical Flow...");
    const sim = await connection.simulateTransaction(tx, [walletKeypair, mintKeypair]);
    if(sim.value.err) {
        console.log(`Simulation Failed:`, sim.value.err);
        if(sim.value.logs) console.log(sim.value.logs);
    } else {
        console.log(`Simulation SUCCESS! Sending Transaction...`);
        const sig = await connection.sendTransaction(tx, [walletKeypair, mintKeypair]);
        await connection.confirmTransaction(sig);
        console.log("Confirmed Sig:", sig);
    }
}

main().catch(console.error);
