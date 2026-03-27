import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as fs from 'fs';
import * as os from 'os';

// Load IDL
const idlPath = './target/idl/e_plays.json';
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

// Wallet
const keypairPath = `${os.homedir()}/.config/solana/id.json`;
const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, 'utf8'))));
const wallet = new anchor.Wallet(keypair);

// Connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: 'confirmed' });
anchor.setProvider(provider);

const program = new Program(idl, provider);
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

async function runTest() {
    console.log("=== 🚀 Starting E-Plays Prediction Market E2E Devnet Flow ===");
    console.log(`Actor: ${keypair.publicKey.toBase58()}`);

    // Market Params
    const title = "Will E-Plays hit $1B TVL? " + Date.now().toString().slice(-4);
    const expiry = new BN(Math.floor(Date.now() / 1000) + 86400 * 30); // 30 days future

    console.log(`\n📦 Initializing Market: "${title}"`);

    // PDAs
    const [marketState] = PublicKey.findProgramAddressSync([Buffer.from("market"), Buffer.from(title)], program.programId);
    const [yesMint] = PublicKey.findProgramAddressSync([Buffer.from("yes_mint"), marketState.toBuffer()], program.programId);
    const [noMint] = PublicKey.findProgramAddressSync([Buffer.from("no_mint"), marketState.toBuffer()], program.programId);
    const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), marketState.toBuffer()], program.programId);

    try {
        // Step 1: Init Architecture
        await program.methods.initMarket(title, expiry).accounts({
            admin: keypair.publicKey,
            marketState,
            systemProgram: SystemProgram.programId,
        }).rpc();
        console.log("✅ 1. init_market successful");

        await program.methods.initYesMint(title).accounts({
            admin: keypair.publicKey,
            marketState,
            yesMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        }).rpc();
        console.log("✅ 2. init_yes_mint successful");

        await program.methods.initNoMint(title).accounts({
            admin: keypair.publicKey,
            marketState,
            noMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        }).rpc();
        console.log("✅ 3. init_no_mint successful");

        await program.methods.initVault(title).accounts({
            admin: keypair.publicKey,
            marketState,
            collateralMint: WSOL_MINT,
            vault,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        }).rpc();
        console.log("✅ 4. init_vault successful");

        // Verify state is zeroed
        let state = await (program.account as any).marketState.fetch(marketState);
        console.log(`\n📊 Market State Check - Total YES: ${state.totalYesShares.toString()} | Total NO: ${state.totalNoShares.toString()}`);

        // Step 2: Trade
        console.log(`\n💸 Simulating native WSOL wrapping & YES token purchase (0.1 ◎)...`);
        const amountIn = new BN(0.1 * 1e9);

        const buyerCollateral = getAssociatedTokenAddressSync(WSOL_MINT, keypair.publicKey, false);
        const userYesAta = getAssociatedTokenAddressSync(yesMint, keypair.publicKey, false);

        const tx = new Transaction();

        // Ensure user has WSOL ATA 
        tx.add(createAssociatedTokenAccountIdempotentInstruction(keypair.publicKey, buyerCollateral, keypair.publicKey, WSOL_MINT));
        // Wrap SOL
        tx.add(SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: buyerCollateral, lamports: Number(amountIn) }));
        tx.add(createSyncNativeInstruction(buyerCollateral));
        
        // Ensure user has YES ATA
        tx.add(createAssociatedTokenAccountIdempotentInstruction(keypair.publicKey, userYesAta, keypair.publicKey, yesMint));

        // Inject our Smart Contract purchase logic
        const buyIx = await (program.methods as any).buyShares(amountIn, true).accounts({
            buyer: keypair.publicKey,
            marketState,
            vault,
            buyerCollateral,
            userMintAccount: userYesAta,
            mint: yesMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        }).instruction();

        tx.add(buyIx);

        const sig = await provider.sendAndConfirm(tx);
        console.log(`✅ 5. buy_shares successful! Signature: ${sig}`);

        state = await (program.account as any).marketState.fetch(marketState);
        console.log(`\n📈 Post-Trade Execution Check:`);
        console.log(`Total YES: ${state.totalYesShares.toNumber() / 1e9} shares`);
        console.log(`Total NO: ${state.totalNoShares.toNumber() / 1e9} shares`);
        if (state.totalYesShares.toNumber() === Number(amountIn)) {
            console.log("🏆 Verification PASSED: Pari-Mutuel 1:1 scaling mapped successfully.");
        } else {
            console.log("❌ Verification FAILED: Scale math mismatched");
        }

    } catch (e: any) {
        console.error("❌ E2E Flow Failed:", e);
        if (e.logs) console.error("Program Logs:", e.logs);
    }
}

runTest();
