
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createGenericFile, createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
const main = async () => {
    // 1. Setup Umi
    const umi = createUmi('https://api.devnet.solana.com')
        .use(irysUploader());

    // 2. Setup Wallet
    const walletPath = '/Users/srijonbiswas/.config/solana/id.json';
    const wallet = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
    const signer = createSignerFromKeypair(umi, keypair);
    umi.use(signerIdentity(signer));

    console.log("Uploader initialized with wallet:", signer.publicKey.toString());

    // 3. Prepare Assets
    // We will use assets/2.png and assets/2.json as the "Master"
    const ASSET_DIR = path.join(process.cwd(), 'assets');
    const IMAGE_PATH = path.join(ASSET_DIR, '2.png');
    const JSON_PATH = path.join(ASSET_DIR, '2.json');

    if (!fs.existsSync(IMAGE_PATH) || !fs.existsSync(JSON_PATH)) {
        throw new Error("Assets not found. Please ensure assets/2.png and assets/2.json exist.");
    }

    // 4. Upload Image
    const imageBuffer = fs.readFileSync(IMAGE_PATH);
    const imageFile = createGenericFile(imageBuffer, '2.png', { contentType: 'image/png' });

    console.log("Uploading image...");
    const [imageUri] = await umi.uploader.upload([imageFile]);
    console.log("Image uploaded:", imageUri);

    // 5. Upload JSON
    const jsonContent = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
    
    // Update image/files in JSON
    jsonContent.image = imageUri;
    jsonContent.properties.files = [{ uri: imageUri, type: 'image/png' }];

    console.log("Uploading metadata...");
    const metadataUri = await umi.uploader.uploadJson(jsonContent);
    console.log("Metadata uploaded:", metadataUri);

    // 6. Calculate Hash of the JSON file (Required for Hidden Settings)
    // IMPORTANT: Hidden settings requires the hash of the metadata CONFIG SERVER SIDE.
    // Actually, for Candy Machine Hidden Settings, we need the hash of the METADATA JSON itself as it will be constructed.
    // However, usually people use the ID substitution. 
    // The "hash" in hidden settings is a 32-byte hash of the configured metadata.
    // If we use name: "SnapDrop #{number}", uri: "URI", the hash must match what is generated on chain or verified?
    // Wait, Hidden Settings: "hash" is the 32-character hash of the metadata file.
    // The Candy Machine verifies that the minted item's metadata matches this hash when "revealed" (if using reveal).
    // BUT we are doing "Open Edition" where verify is implied or we just want them to look the same.
    // If we are NOT revealing (always hidden), the hash isn't strictly checked against an upload, 
    // but it is good practice to put the hash of the metadata we just uploaded.
    
    // Let's rely on the metadataUri we just got. We will fetch it back to get exact buffer or just stringify the content we sent.
    // Umi uploadJson stringifies it.
    
    const uploadedJsonString = JSON.stringify(jsonContent);
    const hash = crypto.createHash('sha256').update(uploadedJsonString).digest('hex'); // 32 bytes hex? No, hex string is 64 chars.
    // Hidden Settings expects a 32-byte array (Buffer or Uint8Array) usually, but in the config JSON for Sugar/Umi it might expect a base58 or hex string?
    // In config.json `hiddenSettings.hash` expects a 32-byte buffer encoded as assumed format.
    // If we look at Umi docs, it expects a 32-byte array.
    // Let's output the Hex string, we can convert it later.

    console.log("\n--- RESULT ---");
    console.log("Metadata URI:", metadataUri);
    console.log("Metadata Hash (Hex):", hash);
    console.log("----------------\n");
};

main().catch(err => {
    console.error(err);
    process.exit(1);
});
