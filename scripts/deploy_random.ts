
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createGenericFile, createSignerFromKeypair, signerIdentity, generateSigner, percentAmount, some, sol } from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { create, addConfigLines, fetchCandyMachine, mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine';
import * as fs from 'fs';
import * as path from 'path';

// Load config for basic settings (payment etc)
import config from '../config.json';

const SUPPLY = 100;

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

    // 1. Upload Source Assets (0, 1, 2)
    console.log("\n1. Uploading Source Assets...");
    const ASSET_DIR = path.join(process.cwd(), 'assets');
    const sourceUris: string[] = [];

    for (let i = 0; i < 3; i++) {
        console.log(`Uploading Asset ${i}...`);
        const imgBuffer = fs.readFileSync(path.join(ASSET_DIR, `${i}.png`));
        const imgFile = createGenericFile(imgBuffer, `${i}.png`, { contentType: 'image/png' });
        const [imgUri] = await umi.uploader.upload([imgFile]);

        const jsonContent = JSON.parse(fs.readFileSync(path.join(ASSET_DIR, `${i}.json`), 'utf-8'));
        jsonContent.image = imgUri;
        jsonContent.properties.files = [{ uri: imgUri, type: 'image/png' }];
        // Ensure symbol is DEV
        jsonContent.symbol = "DEV"; 
        const metadataUri = await umi.uploader.uploadJson(jsonContent);
        
        sourceUris.push(metadataUri);
        console.log(` - Asset ${i} URI: ${metadataUri}`);
    }

    // 2. Create Collection NFT
    console.log("\n2. Creating Collection NFT...");
    const collectionMint = generateSigner(umi);
    const collectionImgBuffer = fs.readFileSync(path.join(ASSET_DIR, 'collection.png'));
    const collectionImgFile = createGenericFile(collectionImgBuffer, 'collection.png', { contentType: 'image/png' });
    const [collectionImgUri] = await umi.uploader.upload([collectionImgFile]);
    const collectionJson = JSON.parse(fs.readFileSync(path.join(ASSET_DIR, 'collection.json'), 'utf-8'));
    collectionJson.image = collectionImgUri;
    collectionJson.properties.files = [{ uri: collectionImgUri, type: 'image/png' }];
    const collectionUri = await umi.uploader.uploadJson(collectionJson);

    await createNft(umi, {
        mint: collectionMint,
        name: collectionJson.name,
        symbol: "DEV",
        uri: collectionUri,
        sellerFeeBasisPoints: percentAmount(0),
        isCollection: true,
        updateAuthority: signer,
        creators: [{ address: signer.publicKey, verified: true, share: 100 }],
    }).sendAndConfirm(umi);

    console.log("Collection created:", collectionMint.publicKey.toString());

    // 3. Create Candy Machine
    console.log("\n3. Creating Candy Machine...");
    const candyMachine = generateSigner(umi);

    const createBuilder = await create(umi, {
        candyMachine,
        collectionMint: collectionMint.publicKey,
        collectionUpdateAuthority: signer,
        tokenStandard: 0,
        sellerFeeBasisPoints: percentAmount(5.00), // 5%
        itemsAvailable: SUPPLY,
        creators: [{ address: signer.publicKey, verified: true, percentageShare: 100 }],
        isMutable: true,
        configLineSettings: some({
            prefixName: "",
            nameLength: 32,
            prefixUri: "",
            uriLength: 200,
            isSequential: false,
        }),
        guards: {
            solPayment: some({
                lamports: sol(0.1),
                destination: signer.publicKey,
            }),
        },
    });
    await createBuilder.sendAndConfirm(umi);

    console.log("Candy Machine created:", candyMachine.publicKey.toString());

    // 4. Insert Config Lines (Random Mapping)
    console.log("\n4. Inserting Config Lines...");
    const configLines = [];
    for (let i = 0; i < SUPPLY; i++) {
        // Pick random source URI
        const randomUri = sourceUris[Math.floor(Math.random() * sourceUris.length)];
        configLines.push({
            name: `SnapDrop #${i + 1}`,
            uri: randomUri,
        });
    }

    // Insert in batches of 10
    for (let i = 0; i < SUPPLY; i += 10) {
        const batch = configLines.slice(i, i + 10);
        const addBuilder = await addConfigLines(umi, {
            candyMachine: candyMachine.publicKey,
            index: i,
            configLines: batch,
        });
        await addBuilder.sendAndConfirm(umi);
        console.log(`Inserted lines ${i} to ${Math.min(i + 10, SUPPLY)}`);
    }

    console.log("\n--- DEPLOYMENT SUCCESS ---");
    console.log("Candy Machine ID:", candyMachine.publicKey.toString());
    const cmAccount = await fetchCandyMachine(umi, candyMachine.publicKey);
    console.log("Candy Guard ID:", cmAccount.mintAuthority.toString());
    console.log("--------------------------\n");

    fs.writeFileSync('candy_machine_id_random.txt', candyMachine.publicKey.toString());
    fs.writeFileSync('candy_guard_id_random.txt', cmAccount.mintAuthority.toString());
};

main().catch(console.error);
