// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
// import { Launchpad } from "../target/types/launchpad";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createMint, getAssociatedTokenAddress, getAccount, createAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import assert from "assert";

describe("launchpad", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Launchpad;

  const creator = Keypair.generate();
  const buyer = Keypair.generate();
  let mint: PublicKey;
  let curvePda: PublicKey;
  let curveBump: number;
  let vaultPda: PublicKey;

  before(async () => {
      // Airdrop SOL to creator and buyer
      const signature1 = await provider.connection.requestAirdrop(creator.publicKey, 10 * LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(signature1);
      const signature2 = await provider.connection.requestAirdrop(buyer.publicKey, 100 * LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(signature2);

      // Create Mint
      mint = await createMint(
          provider.connection,
          creator,
          creator.publicKey,
          null,
          6 
      );

      // Find PDAs
      [curvePda, curveBump] = PublicKey.findProgramAddressSync(
          [Buffer.from("bonding_curve"), mint.toBuffer()],
          program.programId
      );

      vaultPda = await getAssociatedTokenAddress(
          mint,
          curvePda,
          true
      );
  });

  it("Is initialized!", async () => {
    // Mint tokens to creator first (simulating initial supply)
    // Actually, initialize_curve takes tokens from creator and puts them in vault?
    // Let's check lib.rs logic. 
    // Usually creator mints supply and deposits to vault.
    // Or Initialize mints directly?
    // In my lib.rs: `pub fn initialize_curve(...)` has `creator_token_account`.
    // It transfers from `creator_token_account` to `vault`.

    const creatorTokenAccount = await createAssociatedTokenAccount(
        provider.connection,
        creator,
        mint,
        creator.publicKey
    );

    // Mint initial supply
    const initialSupply = 1_000_000_000_000_000; // 1B tokens with 6 decimals
    await mintTo(
        provider.connection,
        creator,
        mint,
        creatorTokenAccount,
        creator,
        initialSupply
    );

    const virtualSol = new anchor.BN(30 * LAMPORTS_PER_SOL);
    const virtualToken = new anchor.BN(1_073_000_000_000_000); // slightly more for k calculation safety
    const realToken = new anchor.BN(800_000_000_000_000); // 80% for sale

    const tx = await program.methods
      .initializeCurve(virtualSol, virtualToken, realToken)
      .accounts({
        curve: curvePda,
        creator: creator.publicKey,
        mint: mint,
        vault: vaultPda,
        creatorTokenAccount: creatorTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    console.log("Your transaction signature", tx);

    const curveAccount = await program.account.bondingCurve.fetch(curvePda);
    assert.ok(curveAccount.virtualSolReserves.eq(virtualSol));
    assert.ok(curveAccount.realTokenReserves.eq(realToken));
    assert.ok(curveAccount.mint.equals(mint));
  });

  it("Buys tokens", async () => {
      const amountToBuy = new anchor.BN(1_000_000); // 1 token
      const buyerTokenAccount = await getAssociatedTokenAddress(
          mint,
          buyer.publicKey
      );

      const tx = await program.methods
          .buyTokens(amountToBuy)
          .accounts({
              curve: curvePda,
              mint: mint,
              vault: vaultPda,
              buyer: buyer.publicKey,
              buyerTokenAccount: buyerTokenAccount,
              globalWallet: new PublicKey("9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu"),
              tokenProgram: TOKEN_PROGRAM_ID,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
          })
          .signers([buyer])
          .rpc();
        
      console.log("Buy transaction signature", tx);

      const buyerAccount = await getAccount(provider.connection, buyerTokenAccount);
      assert.ok(new anchor.BN(buyerAccount.amount.toString()).eq(amountToBuy));
      
      const curveAccount = await program.account.bondingCurve.fetch(curvePda);
      // Check reserves changed
      // virtualSol should increase
      // virtualToken should decrease
  });
});
