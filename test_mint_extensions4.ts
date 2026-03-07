import { Keypair, Connection, Transaction, SystemProgram } from '@solana/web3.js';
import { 
    TOKEN_2022_PROGRAM_ID, 
    createInitializeMintInstruction,
    createInitializeTransferFeeConfigInstruction,
    createInitializeNonTransferableMintInstruction,
    createInitializePermanentDelegateInstruction,
    createInitializeMintCloseAuthorityInstruction,
    createInitializeDefaultAccountStateInstruction,
    createInitializeMetadataPointerInstruction,
    createInitializeInterestBearingMintInstruction,
    createInitializePausableConfigInstruction,
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

    // Hardcode size of extensions
    const extSizes = {
        MetadataPointer: 68 + 4,
        TransferFeeConfig: 108 + 4,
        NonTransferable: 0 + 4,
        InterestBearingConfig: 52 + 4,
        PermanentDelegate: 32 + 4,
        MintCloseAuthority: 32 + 4,
        DefaultAccountState: 1 + 4,
        PausableConfig: 32 + 4,
    };
    
    // Note: MINT_SIZE = 82, ACCOUNT_TYPE_SIZE = 2
    let exactSize = 84 + 
        extSizes.MetadataPointer + 
        extSizes.TransferFeeConfig + 
        extSizes.NonTransferable + 
        extSizes.InterestBearingConfig + 
        extSizes.PermanentDelegate + 
        extSizes.MintCloseAuthority + 
        extSizes.DefaultAccountState + 
        extSizes.PausableConfig;

    const metaData = {
        updateAuthority: wallet,
        mint: mint,
        name: "Test Token",
        symbol: "TST",
        uri: "http://example.com/metadata.json",
        additionalMetadata: []
    };

    const exactMetadataSpace = TYPE_SIZE + LENGTH_SIZE + pack(metaData).length;
    exactSize += exactMetadataSpace;

    // Pad total Account Size to multiple of 4? No, pad the REMAINING space to multiple of 4!
    // We want (totalAccountSize - usedSpace) % 4 == 0.
    // If we just pad exactSize to a multiple of 4, will it work? No, because the remaining space is Uninitialized.
    // Wait, the Uninitialized extensions are length 0, so 4 bytes.
    // We just need exactSize to encompass exactly the extensions, AND the uninitialized space must be a multiple of 4.
    // Actually, if we just pad exactSize so that the remaining space is divisible by 4...
    // Let's just calculate `diff = exactSize % 4` and pad exactSize? Wait!
    // The sizes: 84 + 357 + 109 = 550.
    // If total size is 550.
    // Used space before InitializeMint = 84 + 357 = 441.
    // Remaining space = 550 - 441 = 109. 109 is NOT divisible by 4.
    // We need Remaining space to be divisible by 4.
    // Remaining Space = totalAccountSize - 441.
    // So totalAccountSize must be 441 + 112 = 553.
    // So if we just pad `exactMetadataSpace` to 112, then total is 441 + 112 = 553.
    // 553 - 441 = 112, which is divisible by 4!

    const diff = exactMetadataSpace % 4;
    const paddedMetadataSpace = diff === 0 ? exactMetadataSpace : exactMetadataSpace + (4 - diff);
    const totalAccountSize = 84 + 357 + paddedMetadataSpace;

    console.log("totalAccountSize:", totalAccountSize, "padded metadata:", paddedMetadataSpace);
    
    const lamports = 10000000;
    const tx = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: wallet,
            newAccountPubkey: mint,
            space: totalAccountSize,
            lamports,
            programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeMetadataPointerInstruction(mint, wallet, mint, TOKEN_2022_PROGRAM_ID),
        createInitializeTransferFeeConfigInstruction(mint, wallet, wallet, 50, BigInt(1000), TOKEN_2022_PROGRAM_ID),
        createInitializePermanentDelegateInstruction(mint, wallet, TOKEN_2022_PROGRAM_ID),
        createInitializeMintCloseAuthorityInstruction(mint, wallet, TOKEN_2022_PROGRAM_ID),
        createInitializeDefaultAccountStateInstruction(mint, 1, TOKEN_2022_PROGRAM_ID),
        createInitializeInterestBearingMintInstruction(mint, wallet, 5, TOKEN_2022_PROGRAM_ID),
        createInitializeNonTransferableMintInstruction(mint, TOKEN_2022_PROGRAM_ID),
        createInitializePausableConfigInstruction(mint, wallet, TOKEN_2022_PROGRAM_ID),
        // Wait, TransferFeeConfig -> PermanentDelegate -> MintCloseAuthority -> DefaultAccountState -> InterestBearing -> NonTransferable -> Pausable
        createInitializeMintInstruction(mint, 6, wallet, wallet, TOKEN_2022_PROGRAM_ID),
        createInitTokenMetadataInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            metadata: mint,
            updateAuthority: wallet,
            mint: mint,
            mintAuthority: wallet,
            name: metaData.name,
            symbol: metaData.symbol,
            uri: metaData.uri,
        })
    );
    tx.feePayer = wallet;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    // Simulate
    const sim = await connection.simulateTransaction(tx, [walletKeypair, mintKeypair]);
    console.log("Sim Result:", sim.value.err ? sim.value.err : "Success");
    if(sim.value.logs && sim.value.err) {
        console.log("Logs:", sim.value.logs);
    }
}
main().catch(console.error);
