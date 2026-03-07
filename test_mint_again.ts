import { Keypair, Connection, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { 
    TOKEN_2022_PROGRAM_ID, 
    ExtensionType, 
    getMintLen, 
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
    
    const sig = await connection.requestAirdrop(wallet, 100000000);
    await connection.confirmTransaction(sig);

    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    const metaData = {
        updateAuthority: wallet,
        mint: mint,
        name: "Test",
        symbol: "TST",
        uri: "http://example.com",
        additionalMetadata: []
    };

    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    const metadataSpace = TYPE_SIZE + LENGTH_SIZE + pack(metaData).length; 
    const totalAccountSize = mintLen + metadataSpace;
    const lamports = await connection.getMinimumBalanceForRentExemption(totalAccountSize);

    const transaction = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: wallet,
            newAccountPubkey: mint,
            space: totalAccountSize,
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

    transaction.feePayer = wallet;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.partialSign(mintKeypair, walletKeypair); // FIX: partially sign with wallet!

    const simulation = await connection.simulateTransaction(transaction);
    if (simulation.value.err) {
        console.error("Simulation failed:", JSON.stringify(simulation.value.err));
        console.error("Logs:", simulation.value.logs);
    } else {
        console.log("Simulation success!");
    }
}
main().catch(console.error);
