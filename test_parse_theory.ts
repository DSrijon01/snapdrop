import { Keypair, Connection, Transaction, SystemProgram } from '@solana/web3.js';
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
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    // We don't have SOL for the fee payer, so simulateTransaction might fail with AccountNotFound.
    // Instead we will just verify if the length calculation is what we expect.
    const metaData = {
        updateAuthority: wallet,
        mint: mint,
        name: "Test",
        symbol: "TST",
        uri: "http://example.com",
        additionalMetadata: []
    };
    
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    // 109 bytes exactly
    const exactMetadataSpace = TYPE_SIZE + LENGTH_SIZE + pack(metaData).length;
    // Pad to multiple of 4
    const diff = exactMetadataSpace % 4;
    const metadataSpace = diff === 0 ? exactMetadataSpace : exactMetadataSpace + (4 - diff);

    const totalAccountSize = mintLen + metadataSpace;
    console.log(`Original MintLen: ${mintLen}`);
    console.log(`Exact Metadata Space: ${exactMetadataSpace}`);
    console.log(`Padded Metadata Space: ${metadataSpace}`);
    console.log(`Total Account Size: ${totalAccountSize}`);
    console.log(`Total % 4 == 0 ? ${(totalAccountSize - mintLen) % 4 === 0}`);
}
main().catch(console.error);
