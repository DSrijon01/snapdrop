
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey } from '@metaplex-foundation/umi';

const main = async () => {
    const umi = createUmi('https://api.devnet.solana.com');
    const ataProgramId = publicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
    
    console.log("Checking ATA Program:", ataProgramId);
    
    const account = await umi.rpc.getAccount(ataProgramId);
    
    if (account.exists) {
        console.log("ATA Program FOUND. Executable:", account.executable);
    } else {
        console.error("ATA Program NOT FOUND on devnet!");
    }
    
    // Check blockhash to ensure connectivity
    const bh = await umi.rpc.getLatestBlockhash();
    console.log("Latest Blockhash:", bh.blockhash);
};

main().catch(console.error);
