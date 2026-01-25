
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { fetchCandyMachine, safeFetchCandyGuard, mplCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { publicKey } from "@metaplex-foundation/umi";

async function main() {
    const umi = createUmi("https://api.devnet.solana.com")
        .use(mplCandyMachine());

    // IDs from .github/workflows/nextjs.yml
    const cmId = publicKey("DdU4yDWH7UgAboiEYe8D5ZQm5z7ES2n5wvgNKNYxQMF1");
    const guardId = publicKey("7K2opq28esRjAxjpyyPnhRCZzjdBJh8S2Cha1XgRW4DV");

    console.log("--- Inspecting Workflow IDs on DEVNET ---");
    console.log("Fetching Candy Machine:", cmId.toString());
    try {
        const cm = await fetchCandyMachine(umi, cmId);
        console.log("Success! CM Authority:", cm.authority.toString());
        console.log("CM Mint Authority (Guard?):", cm.mintAuthority.toString());
    } catch (e) {
        console.log("Failed to fetch CM on Devnet:", e.message || e);
    }

    console.log("\nFetching Candy Guard:", guardId.toString());
    try {
        const guard = await safeFetchCandyGuard(umi, guardId);
        if (guard) {
             console.log("Success! Guards:", JSON.stringify(guard.guards, (key, value) => 
                typeof value === 'bigint' ? value.toString() : value
            , 2));
        } else {
            console.log("Guard Account not found/initialized.");
        }
    } catch (e) {
        console.log("Failed to fetch Guard on Devnet:", e.message || e);
    }
}

main().catch(console.error);
