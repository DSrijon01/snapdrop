
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { fetchCandyMachine, safeFetchCandyGuard, mplCandyMachine } from "@metaplex-foundation/mpl-candy-machine";
import { publicKey } from "@metaplex-foundation/umi";

async function main() {
    const umi = createUmi("https://api.devnet.solana.com")
        .use(mplCandyMachine());

    const cmId = publicKey("FmiNM5JC6RJgJXVpDT84UrpSjZvMnz7Xcy7mAZjbkvUG");
    const guardId = publicKey("GVGDiH2y1DCEdNaDgSrgiMEofuD9QVQ36kSMrj2n6AQo");

    const cm = await fetchCandyMachine(umi, cmId);
    console.log("Candy Machine Authority:", cm.authority.toString());
    console.log("Candy Machine Mint Authority (Guard?):", cm.mintAuthority.toString());
    console.log("Candy Machine Collection Mint:", cm.collectionMint.toString());
    
    if (cm.mintAuthority.toString() !== guardId.toString()) {
        console.warn("WARNING: Candy Machine Mint Authority does NOT match the hardcoded Guard ID!");
        console.log("Fetching the ACTUAL Guard:", cm.mintAuthority.toString());
        const actualGuard = await safeFetchCandyGuard(umi, cm.mintAuthority);
         if (actualGuard) {
            console.log("ACTUAL Guards:", JSON.stringify(actualGuard.guards, (key, value) => 
                typeof value === 'bigint' ? value.toString() : value
            , 2));
        }
    }

    console.log("\nFetching Hardcoded Candy Guard:", guardId.toString());
    const guard = await safeFetchCandyGuard(umi, guardId);
    
    if (guard) {
        console.log("Guards:", JSON.stringify(guard.guards, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value
        , 2));

        if (guard.groups.length > 0) {
            console.log("Groups:", JSON.stringify(guard.groups, (key, value) => 
                typeof value === 'bigint' ? value.toString() : value
            , 2));
        } else {
            console.log("No groups defined.");
        }
    } else {
        console.log("Candy Guard not found.");
    }
}

main().catch(console.error);
