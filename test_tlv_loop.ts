import { Keypair, Connection, Transaction, SystemProgram } from '@solana/web3.js';
import { 
    TOKEN_2022_PROGRAM_ID, 
    createInitializeMintInstruction,
    createInitializeMetadataPointerInstruction,
    getMintLen,
    ExtensionType
} from '@solana/spl-token';

async function main() {
    const connection = new Connection("http://127.0.0.1:8899", "confirmed");
    const walletKeypair = Keypair.generate();
    const wallet = walletKeypair.publicKey;
    
    try {
        const sig = await connection.requestAirdrop(wallet, 10000000000); 
        await connection.confirmTransaction(sig);
    } catch(e) {}

    const mintLen = getMintLen([ExtensionType.MetadataPointer]); // 234

    // Test sizes from 234 up to 260
    for (let extra = 0; extra < 32; extra++) {
        const space = mintLen + extra;
        const mintKeypair = Keypair.generate();
        const mint = mintKeypair.publicKey;
        
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
        if(!sim.value.err) {
            console.log(`Space ${space} (extra ${extra}) -> SUCCESS!`);
        } else {
            // console.log(`Space ${space} (extra ${extra}) -> Failed`);
        }
    }
}
main().catch(console.error);
