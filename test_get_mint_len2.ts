import { Keypair, Connection, Transaction, SystemProgram } from '@solana/web3.js';
import { 
    TOKEN_2022_PROGRAM_ID, 
    ExtensionType, 
    getMintLen,
    createInitializeMintInstruction,
    createInitializeMetadataPointerInstruction
} from '@solana/spl-token';
import { createInitializeInstruction as createInitTokenMetadataInstruction, pack } from '@solana/spl-token-metadata';

async function main() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const walletKeypair = Keypair.generate();
    const wallet = walletKeypair.publicKey;
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

    // Use the variableLengthExtensions argument
    const mintLen = getMintLen([ExtensionType.MetadataPointer], {
        [ExtensionType.TokenMetadata]: pack(metaData).length // The docs say type/length prefixes are added inside getLen
    });

    console.log("MintLen with variableLengthExtensions is:", mintLen);
}
main().catch(console.error);
