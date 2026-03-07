import { Keypair, Connection, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { 
    TOKEN_2022_PROGRAM_ID, 
    ExtensionType, 
    getMintLen, 
    getTypeLen,
    createInitializeMintInstruction,
    createInitializeMetadataPointerInstruction,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    getAssociatedTokenAddressSync,
    TYPE_SIZE,
    LENGTH_SIZE,
    tokenMetadataInitializeWithRentTransfer
} from '@solana/spl-token';
import { createInitializeInstruction as createInitTokenMetadataInstruction, pack } from '@solana/spl-token-metadata';

const GLOBAL_WALLET = new PublicKey("9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu");

async function main() {
    const connection = new Connection("http://127.0.0.1:8899", "confirmed");
    const walletKeypair = Keypair.generate();
    const wallet = walletKeypair.publicKey;
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    const name = "Test";
    const symbol = "TST";
    const metadataUri = "http://example.com/metadata.json";
    const decimals = 6;
    const totalSupply = "1000000000";

    const activeExtensions = [ExtensionType.MetadataPointer];
    
    // UI Logic (Reverted)
    const mintLen = getMintLen(activeExtensions);

    const metaData = {
        updateAuthority: wallet,
        mint: mint,
        name: name,
        symbol: symbol,
        uri: metadataUri,
        additionalMetadata: []
    };

    const exactMetadataSpace = TYPE_SIZE + LENGTH_SIZE + pack(metaData).length;
    const diff = exactMetadataSpace % 4;
    const metadataSpace = diff === 0 ? exactMetadataSpace : exactMetadataSpace + (4 - diff);
    const totalAccountSize = mintLen + metadataSpace;

    console.log("totalAccountSize:", totalAccountSize);

    // Simulate funding
    try {
        const airdropSig = await connection.requestAirdrop(wallet, 10000000000); // 10 SOL
        await connection.confirmTransaction(airdropSig);
    } catch(e) {
        // Devnet airdrop might fail, wait!
    }

    const tx1 = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: wallet,
            newAccountPubkey: mint,
            space: mintLen,
            lamports: await connection.getMinimumBalanceForRentExemption(mintLen),
            programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeMetadataPointerInstruction(
            mint,
            wallet,
            mint,
            TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
            mint,
            decimals,
            wallet,
            null,
            TOKEN_2022_PROGRAM_ID
        )
    );
    tx1.feePayer = wallet;
    tx1.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    console.log("Simulating TX 1...");
    const sig1 = await connection.sendTransaction(tx1, [walletKeypair, mintKeypair]);
    await connection.confirmTransaction(sig1);
    console.log("TX 1 Confirmed:", sig1);

    const globalWalletAta = getAssociatedTokenAddressSync(
        mint,
        GLOBAL_WALLET,
        true,
        TOKEN_2022_PROGRAM_ID
    );

    // Call the SDK method which handles rent transfer and init natively
    console.log("Calling tokenMetadataInitializeWithRentTransfer...");
    const sig2 = await tokenMetadataInitializeWithRentTransfer(
        connection,
        walletKeypair,
        mint,
        wallet,
        walletKeypair, // mint authority
        name,
        symbol,
        metadataUri,
        []
    );
    console.log("TX 2 Confirmed:", sig2);

    const tx3 = new Transaction().add(
        createAssociatedTokenAccountInstruction(
            wallet,
            globalWalletAta,
            GLOBAL_WALLET,
            mint,
            TOKEN_2022_PROGRAM_ID
        ),
        createMintToInstruction(
            mint,
            globalWalletAta,
            wallet,
            BigInt(totalSupply) * BigInt(Math.pow(10, decimals)),
            [],
            TOKEN_2022_PROGRAM_ID
        )
    );
    tx3.feePayer = wallet;
    tx3.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const sig3 = await connection.sendTransaction(tx3, [walletKeypair]);
    await connection.confirmTransaction(sig3);
    console.log("TX 3 Confirmed:", sig3);}

main().catch(console.error);
