import { Keypair, Connection, Transaction, SystemProgram } from '@solana/web3.js';
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
    createInitializePausableConfigInstruction,
    TYPE_SIZE,
    LENGTH_SIZE
} from '@solana/spl-token';
import { createInitializeInstruction as createInitTokenMetadataInstruction, pack } from '@solana/spl-token-metadata';

async function main() {
    const connection = new Connection("http://127.0.0.1:8899", "confirmed");
    const walletKeypair = Keypair.generate();
    const wallet = walletKeypair.publicKey;
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    try {
        const sig = await connection.requestAirdrop(wallet, 10000000000);
        await connection.confirmTransaction(sig);
    } catch(e) {
        return;
    }

    const activeExtensions = [
        ExtensionType.MetadataPointer,
        ExtensionType.TransferFeeConfig,
        ExtensionType.NonTransferable,
        ExtensionType.InterestBearingConfig,
        ExtensionType.PermanentDelegate,
        ExtensionType.MintCloseAuthority,
        ExtensionType.DefaultAccountState,
        ExtensionType.PausableConfig
    ];
    const mintLen = getMintLen(activeExtensions);

    const metaData = {
        updateAuthority: wallet,
        mint: mint,
        name: "Test Token",
        symbol: "TST",
        uri: "http://example.com/metadata.json",
        additionalMetadata: []
    };

    const exactMetadataSpace = TYPE_SIZE + LENGTH_SIZE + pack(metaData).length;
    const diff = exactMetadataSpace % 4;
    const metadataSpace = diff === 0 ? exactMetadataSpace : exactMetadataSpace + (4 - diff);
    const totalAccountSize = mintLen + metadataSpace;
    console.log("mintLen:", mintLen);
    console.log("metadataSpace:", metadataSpace);
    console.log("totalAccountSize:", totalAccountSize);
    console.log("totalAccountSize % 4:", totalAccountSize % 4);
    const lamports = await connection.getMinimumBalanceForRentExemption(totalAccountSize);

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
    
    // Simulate first
    const sim = await connection.simulateTransaction(tx, [walletKeypair, mintKeypair]);
    console.log("Sim Result:", sim.value.err ? sim.value.err : "Success");
    if(sim.value.logs && sim.value.err) {
        console.log("Logs:", sim.value.logs);
    }

    try {
        const txid = await connection.sendTransaction(tx, [walletKeypair, mintKeypair]);
        await connection.confirmTransaction(txid);
        console.log("Tx success:", txid);
    } catch (e: any) {
        console.log("Tx Error:", e.message);
    }
}
main().catch(console.error);
