import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, createAndMint, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner, keypairIdentity, percentAmount } from '@metaplex-foundation/umi';

async function main() {
    console.log("Initializing Umi offline builder test...");
    const umi = createUmi('https://api.devnet.solana.com').use(mplTokenMetadata());
    
    const testSigner = generateSigner(umi);
    umi.use(keypairIdentity(testSigner));

    console.log("Minting token...");
    const mint = generateSigner(umi);
    const decimals = 6;
    const totalSupply = "1000";
    const amount = BigInt(totalSupply) * BigInt(Math.pow(10, decimals));

    const builder = createAndMint(umi, {
        mint,
        authority: umi.identity,
        name: "Test Node Coin",
        symbol: "TNC",
        uri: "https://example.com/metadata.json",
        sellerFeeBasisPoints: percentAmount(0),
        decimals,
        amount,
        tokenOwner: umi.identity.publicKey,
        tokenStandard: TokenStandard.Fungible,
    });

    try {
        const tx = builder.getInstructions();
        console.log("Successfully built instructions!");
        console.log("Instruction count:", tx.length);
        console.log("Keys involved:", tx.map(t => t.keys.map(k => k.pubkey.toString())));
    } catch (e: any) {
        console.error("Failed to build instructions:", e);
        process.exit(1);
    }
}

main().catch(console.error);
