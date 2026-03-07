import { Keypair, Connection, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { 
    TOKEN_2022_PROGRAM_ID, 
    ExtensionType, 
    getMintLen, 
    createInitializeMintInstruction,
    createInitializeTransferFeeConfigInstruction,
    createInitializeNonTransferableMintInstruction,
    createInitializePermanentDelegateInstruction,
    createInitializeMintCloseAuthorityInstruction,
    createInitializeDefaultAccountStateInstruction,
    createInitializeMetadataPointerInstruction,
    createInitializeInterestBearingMintInstruction,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    createInitializePausableConfigInstruction,
    getAssociatedTokenAddressSync,
    TYPE_SIZE,
    LENGTH_SIZE
} from '@solana/spl-token';
import { createInitializeInstruction as createInitTokenMetadataInstruction, pack } from '@solana/spl-token-metadata';

async function main() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const walletKeypair = Keypair.generate();
    const wallet = walletKeypair.publicKey;
    
    // Airdrop some SOL
    const sig = await connection.requestAirdrop(wallet, 1000000000);
    await connection.confirmTransaction(sig);

    // Setup toggles (match basic UI state probably: TransferFee=false, NonTransferable=false, MetaData=true)
    const enableMetadataPointer = true;
    const enableTokenMetadata = true;

    const name = "Test";
    const symbol = "TST";
    const metadataUri = "http://example.com";
    const decimals = 6;
    const totalSupply = "1000";

    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;
    const GLOBAL_WALLET = new PublicKey("9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu");

    const activeExtensions = [];
    if (enableMetadataPointer) activeExtensions.push(ExtensionType.MetadataPointer);

    const mintLen = getMintLen(activeExtensions);

    let metadataSpace = 0;
    const metaData = {
        updateAuthority: wallet,
        mint: mint,
        name: name,
        symbol: symbol,
        uri: metadataUri,
        additionalMetadata: []
    };

    if (enableTokenMetadata) {
        metadataSpace = TYPE_SIZE + LENGTH_SIZE + pack(metaData).length; 
    }

    const totalAccountSize = mintLen + metadataSpace;
    const lamports = await connection.getMinimumBalanceForRentExemption(totalAccountSize);

    const transaction = new Transaction();

    transaction.add(
        SystemProgram.createAccount({
            fromPubkey: wallet,
            newAccountPubkey: mint,
            space: totalAccountSize,
            lamports,
            programId: TOKEN_2022_PROGRAM_ID,
        })
    );

    if (enableMetadataPointer) {
        transaction.add(
            createInitializeMetadataPointerInstruction(
                mint,
                wallet,
                mint,
                TOKEN_2022_PROGRAM_ID
            )
        );
    }

    transaction.add(
        createInitializeMintInstruction(
            mint,
            decimals,
            wallet,
            null,
            TOKEN_2022_PROGRAM_ID
        )
    );

    if (enableTokenMetadata) {
        transaction.add(
            createInitTokenMetadataInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                metadata: mint,
                updateAuthority: wallet,
                mint: mint,
                mintAuthority: wallet,
                name: name,
                symbol: symbol,
                uri: metadataUri,
            })
        );
    }

    // 5. Create ATA
    const globalWalletAta = getAssociatedTokenAddressSync(
        mint,
        GLOBAL_WALLET,
        true,
        TOKEN_2022_PROGRAM_ID
    );

    transaction.add(
        createAssociatedTokenAccountInstruction(
            wallet, // payer
            globalWalletAta,  // ata
            GLOBAL_WALLET,    // owner
            mint,             // mint
            TOKEN_2022_PROGRAM_ID
        )
    );

    transaction.add(
        createMintToInstruction(
            mint,
            globalWalletAta,
            wallet, // mint authority
            BigInt(totalSupply) * BigInt(Math.pow(10, decimals)),
            [],
            TOKEN_2022_PROGRAM_ID
        )
    );

    transaction.feePayer = wallet;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.partialSign(mintKeypair);

    try {
        const simulation = await connection.simulateTransaction(transaction, [walletKeypair, mintKeypair]);
        if (simulation.value.err) {
            console.error("Simulation failed:", JSON.stringify(simulation.value.err));
            console.error("Logs:", simulation.value.logs);
        } else {
            console.log("Simulation success!");
        }
    } catch(e) {
        console.error(e);
    }
}
main().catch(console.error);
