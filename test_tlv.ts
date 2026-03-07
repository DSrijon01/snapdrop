import { Keypair, Connection, Transaction, SystemProgram } from '@solana/web3.js';
import { 
    TOKEN_2022_PROGRAM_ID, 
    ExtensionType, 
    createInitializeMintInstruction,
    createInitializeMetadataPointerInstruction,
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

    // 82 + 2 = 84
    // MetadataPointer = 64 + 4 = 68
    // Try varying metadata size
    for (let extra = 0; extra < 16; extra+=4) {
        const space = 84 + 68 + extra;
        const lamports = await connection.getMinimumBalanceForRentExemption(space);
        
        const tx = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: wallet,
                newAccountPubkey: mint,
                space: space,
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
        tx.feePayer = wallet;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        
        const sim = await connection.simulateTransaction(tx, [walletKeypair, mintKeypair]);
        console.log(`Space ${space} (extra ${extra}):`, sim.value.err ? sim.value.err : "Success");
    }
}
main().catch(console.error);
