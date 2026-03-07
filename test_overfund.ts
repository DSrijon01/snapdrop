import { Keypair, Connection, Transaction, SystemProgram } from '@solana/web3.js';
import { 
    TOKEN_2022_PROGRAM_ID, 
    createInitializeMintInstruction,
    createInitializeMetadataPointerInstruction,
    getMintLen,
    ExtensionType
} from '@solana/spl-token';
import { createInitializeInstruction } from '@solana/spl-token-metadata';

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

    const mintLen = getMintLen([ExtensionType.MetadataPointer]); // 234
    // Overfund by 1 SOL
    const lamports = (await connection.getMinimumBalanceForRentExemption(300)) + 1000000000;
    
    console.log("Creating Mint Account with overkill lamports...");
    const tx1 = new Transaction().add(
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
        )
    );
    tx1.feePayer = wallet;
    tx1.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const sig1 = await connection.sendTransaction(tx1, [walletKeypair, mintKeypair]);
    await connection.confirmTransaction(sig1);
    console.log("Initializes Mint -> TX Confirmed:", sig1);

    console.log("Initializing Token Metadata...");
    const tx2 = new Transaction().add(
        createInitializeInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            metadata: mint,
            updateAuthority: wallet,
            mint: mint,
            mintAuthority: wallet,
            name: "Test",
            symbol: "TST",
            uri: "http://example.com"
        })
    );
    tx2.feePayer = wallet;
    tx2.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const sim2 = await connection.simulateTransaction(tx2, [walletKeypair]);
    if (sim2.value.err) {
        console.log("SIM FAILS:", sim2.value.err);
        if (sim2.value.logs) console.log(sim2.value.logs);
    } else {
        const sig2 = await connection.sendTransaction(tx2, [walletKeypair]);
        await connection.confirmTransaction(sig2);
        console.log("Token Metadata Initialized -> TX Confirmed:", sig2);
    }
}
main().catch(console.error);
