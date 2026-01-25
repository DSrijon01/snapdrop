/* eslint-disable */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createGenericFile, createSignerFromKeypair, signerIdentity, generateSigner, percentAmount, some, sol } from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { createNft, findMetadataPda, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { create, DefaultGuardSetArgs, fetchCandyMachine, mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine';
import * as fs from 'fs';
import * as path from 'path';

// Load config
import config from '../config.json';

const main = async () => {
    console.log("Initializing...");
    const umi = createUmi('https://api.devnet.solana.com')
        .use(irysUploader())
        .use(mplTokenMetadata())
        .use(mplCandyMachine());

    // Setup Wallet
    const walletPath = '/Users/srijonbiswas/.config/solana/id.json';
    const wallet = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
    const signer = createSignerFromKeypair(umi, keypair);
    umi.use(signerIdentity(signer));

    console.log("Wallet:", signer.publicKey.toString());

    // 1. Create Collection NFT
    console.log("\n1. Creating Collection NFT...");
    const collectionMint = generateSigner(umi);
    const ASSET_DIR = path.join(process.cwd(), 'assets');
    
    // Upload Collection Image
    const collectionImgBuffer = fs.readFileSync(path.join(ASSET_DIR, 'collection.png'));
    const collectionImgFile = createGenericFile(collectionImgBuffer, 'collection.png', { contentType: 'image/png' });
    const [collectionImgUri] = await umi.uploader.upload([collectionImgFile]);
    
    // Upload Collection Metadata
    const collectionJson = JSON.parse(fs.readFileSync(path.join(ASSET_DIR, 'collection.json'), 'utf-8'));
    collectionJson.image = collectionImgUri;
    collectionJson.properties.files = [{ uri: collectionImgUri, type: 'image/png' }];
    const collectionUri = await umi.uploader.uploadJson(collectionJson);

    console.log("Collection Details:");
    console.log(" - Mint:", collectionMint.publicKey.toString());
    console.log(" - URI:", collectionUri);

    await createNft(umi, {
        mint: collectionMint,
        name: collectionJson.name,
        symbol: collectionJson.symbol,
        uri: collectionUri,
        sellerFeeBasisPoints: percentAmount(0),
        isCollection: true,
        updateAuthority: signer,
        creators: [
            {
                address: signer.publicKey,
                verified: true,
                share: 100,
            }
        ],
    }).sendAndConfirm(umi);

    console.log("Collection NFT created.");

    // 2. Create Candy Machine
    console.log("\n2. Creating Candy Machine...");
    const candyMachine = generateSigner(umi);

    // Prepare Hidden Settings
    // Hash must be 32 bytes. Config has it as hex string 64 chars.
    // We need to convert hex string to Uint8Array (32 bytes).
    const hashString = config.hiddenSettings.hash;
    const hashBuffer = Buffer.from(hashString, 'hex');
    const hashBytes = new Uint8Array(hashBuffer);

    if (hashBytes.length !== 32) {
        throw new Error(`Hash must be 32 bytes, got ${hashBytes.length}`);
    }

    // Prepare Guards
    const guards: any = {
        solPayment: some({
            lamports: sol(config.guards.default.solPayment.value),
            destination: signer.publicKey,
        }),
    };

    const createBuilder = await create(umi, {
        candyMachine: candyMachine,
        collectionMint: collectionMint.publicKey,
        collectionUpdateAuthority: signer,
        tokenStandard: 0, // NFT
        sellerFeeBasisPoints: percentAmount(config.sellerFeeBasisPoints / 100),
        itemsAvailable: config.number,
        creators: [
            {
                address: signer.publicKey,
                verified: true,
                percentageShare: 100,
            }
        ],
        hiddenSettings: some({
            name: config.hiddenSettings.name,
            uri: config.hiddenSettings.uri,
            hash: hashBytes,
        }),
        guards: guards,
    });

    await createBuilder.sendAndConfirm(umi);

    console.log("\n--- DEPLOYMENT SUCCESS ---");
    console.log("Candy Machine ID:", candyMachine.publicKey.toString());
    
    // Fetch the CM to get the Guard ID (mintAuthority)
    const cmAccount = await fetchCandyMachine(umi, candyMachine.publicKey);
    console.log("Candy Guard ID:", cmAccount.mintAuthority.toString());
    console.log("Collection Mint:", collectionMint.publicKey.toString());
    console.log("--------------------------\n");
    
    // Save to a file for easy access
    fs.writeFileSync('candy_machine_id.txt', candyMachine.publicKey.toString());
    fs.writeFileSync('candy_guard_id.txt', cmAccount.mintAuthority.toString());
};

main().catch(console.error);
