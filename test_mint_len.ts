import { ExtensionType, getMintLen } from '@solana/spl-token';

try {
    const len = getMintLen([ExtensionType.MetadataPointer, ExtensionType.TokenMetadata]);
    console.log("Len:", len);
} catch (e: any) {
    console.log("Error:", e.message);
}
