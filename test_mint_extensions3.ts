import { Keypair, Connection, Transaction, SystemProgram } from '@solana/web3.js';
import { 
    TOKEN_2022_PROGRAM_ID, 
    ExtensionType, 
    getMintLen, 
    createInitializeMintInstruction,
    createInitializeMetadataPointerInstruction,
    createInitializeGroupPointerInstruction,
    createInitializeGroupInstruction,
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
    } catch(e) {
        return;
    }

    const activeExtensions = [
        ExtensionType.MetadataPointer,
        ExtensionType.GroupPointer,
        ExtensionType.TokenGroup
    ];
    const mintLen = getMintLen(activeExtensions);

    const metaData = {
        updateAuthority: wallet,
        mint: mint,
        name: "Test Group Token",
        symbol: "TGT",
        uri: "http://example.com/metadata.json",
        additionalMetadata: []
    };

    const exactMetadataSpace = TYPE_SIZE + LENGTH_SIZE + pack(metaData).length;
    const diff = exactMetadataSpace % 4;
    const metadataSpace = diff === 0 ? exactMetadataSpace : exactMetadataSpace + (4 - diff);
    const totalAccountSize = mintLen + metadataSpace;
    const lamports = await connection.getMinimumBalanceForRentExemption(totalAccountSize);

    const tx = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: wallet,
            newAccountPubkey: mint,
            space: totalAccountSize,
            lamports,
            programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeMetadataPointerInstruction(mint, wallet, mint, TOKEN_2022_PROGRAM_ID),
        createInitializeGroupPointerInstruction(mint, wallet, mint, TOKEN_2022_PROGRAM_ID),
        
        // Is InitializeGroup before or after InitializeMint? Let's do after like TokenMetadata!
        createInitializeMintInstruction(mint, 6, wallet, wallet, TOKEN_2022_PROGRAM_ID),
        
        createInitializeGroupInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            mint: mint,
            group: mint,
            maxSize: BigInt(100),
            updateAuthority: wallet,
            mintAuthority: wallet
        }),
        
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
    
    // Simulate first
    const sim = await connection.simulateTransaction(tx, [walletKeypair, mintKeypair]);
    console.log("Sim Result (Group after Mint):", sim.value.err ? sim.value.err : "Success");
    if(sim.value.logs && sim.value.err) console.log("Logs:", sim.value.logs);
}
main().catch(console.error);
