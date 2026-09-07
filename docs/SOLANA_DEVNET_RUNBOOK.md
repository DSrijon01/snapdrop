# Solana Devnet Recurring Issues, Root Causes & Fixes Runbook

> **Repository:** `DSrijon01/snapdrop` (Street Sync)  
> **Last Updated:** September 7, 2026  
> **Target Network:** Solana Devnet  
> **Dedicated RPC:** Helius Devnet (`https://devnet.helius-rpc.com/?api-key=...`)

---

## 1. Overview of Platform Architecture & Flow

The core lifecycle of digital assets in Street Sync consists of four stages:
1. **Creation (One-Click Launch)**:
   - Minting 1-of-1 NFTs (`NFTStudio.tsx` Direct Mint) or deploying Candy Machines (`NFTStudio.tsx` Candy Machine) using Metaplex Umi and Irys/Arweave.
2. **Treasury Custody**:
   - Minted NFTs are stored in the connected Admin / Treasury Wallet (`9CmjZcTQ8iovjbBKYgWyH6iEKFZpqAuyDpsmbQj5nRHu`).
3. **Listing to Gallery**:
   - Treasury NFTs are bundled into stacks and listed on-chain via the `ss_nft_gallery` smart contract (`TreasuryNFTs.tsx`).
4. **Secondary Marketplace & Trading**:
   - Users browse and purchase listed NFTs or token stacks (`ForSale.tsx`, `SellTokens.tsx`, `ListingModal.tsx`).

Because Solana Devnet is an active testbed with frequent slot skips, validator reboots, and network load, client applications can experience sudden breakages if unhardened. This runbook documents every recurring issue, its root cause, the exact fix applied, and how to maintain stability.

---

## 2. Issue Catalog & Solutions

### Issue #1: Irys / Arweave Bundler `400 Confirmed tx not found`

#### Symptom:
During direct minting or Candy Machine cover/asset upload, the process stops with:
```text
Error: failed to post funding tx - <TX_HASH> - keep this id! - HTTP Error: Posting transaction <TX_HASH> information to the bundler: 400 Confirmed tx not found
```

#### Root Cause:
Metaplex uses Irys (`https://devnet.irys.xyz`) to upload images and metadata to Arweave.
- When an uploaded file is **>= 100 KiB**, Irys requires an on-chain Devnet funding transaction.
- On Solana Devnet, Irys bundler nodes frequently lag behind Solana validators and fail to see or confirm the funding transaction, throwing `400 Confirmed tx not found`.
- When an uploaded file is **< 100 KiB**, Irys Devnet uploads are **100% free** and **completely skip the funding transaction**.

#### Permanent Code Pattern:
Always pass user-uploaded images through client-side compression before sending to Irys:
```typescript
import { compressImageForDevnet } from '@/utils/imageCompressor';

// Compress before upload:
const compressedFile = await compressImageForDevnet(rawFile);
const buffer = await compressedFile.arrayBuffer();
const genericFile = createGenericFile(
    new Uint8Array(buffer), 
    compressedFile.name, 
    { contentType: compressedFile.type }
);
const [uri] = await umi.uploader.upload([genericFile]);
```
- Utility location: [`src/utils/imageCompressor.ts`](file:///Users/srijonbiswas/.gemini/antigravity/scratch/snapdrop/src/utils/imageCompressor.ts)
- Maximum target size: 92 KiB (safe margin below 100 KiB).

---

### Issue #2: Public RPC Rate Limiting (`429 Connection rate limits exceeded`)

#### Symptom:
Actions that read recent blockhashes or fetch account info fail with:
```text
Error: failed to get recent blockhash: Error: 429 : {"jsonrpc":"2.0","error":{"code": 429, "message":"Connection rate limits exceeded"}}
```

#### Root Cause:
Solana's default public endpoint (`https://api.devnet.solana.com`) enforces a strict limit of 40 requests per 10 seconds across all public consumers. Rapid UI updates or multiple batch requests quickly saturate this limit.

#### Permanent Code Pattern:
1. Use the dedicated Helius Devnet RPC endpoint throughout the application:
   - Config file: [`src/utils/solanaRpc.ts`](file:///Users/srijonbiswas/.gemini/antigravity/scratch/snapdrop/src/utils/solanaRpc.ts)
   - Fallback chain: `process.env.NEXT_PUBLIC_SOLANA_RPC_URL || HELIUS_DEVNET_RPC || clusterApiUrl("devnet")`
2. Wrap critical on-chain RPC calls in [`withSolanaRetry`](file:///Users/srijonbiswas/.gemini/antigravity/scratch/snapdrop/src/utils/solanaRetry.ts):
```typescript
const result = await withSolanaRetry(async () => {
    return await program.methods.myMethod().rpc({ skipPreflight: true });
});
```

---

### Issue #3: Preflight Simulation `Blockhash not found`

#### Symptom:
When clicking a button to list, buy, or mint, the wallet throws:
```text
Error: Simulation failed. Message: Transaction simulation failed: Blockhash not found. Logs: []. Catch the 'SendTransactionError' and call 'getLogs()' on it for full details.
```

#### Root Cause:
By default, Anchor and Solana web3.js execute a **preflight simulation** before submitting transactions (`skipPreflight: false`).
Devnet validator slots roll over rapidly (~400–800ms). If an RPC node's simulation runtime has not committed the blockhash slot yet, or if there is slight clock drift, the local simulation immediately fails and halts transaction broadcast.

#### Permanent Code Pattern:
Always configure Anchor providers and transaction senders to bypass preflight simulation:
1. **For Anchor Hooks & Components**:
   Use `createConfirmedProvider` from [`src/utils/solanaRetry.ts`](file:///Users/srijonbiswas/.gemini/antigravity/scratch/snapdrop/src/utils/solanaRetry.ts):
   ```typescript
   import { createConfirmedProvider } from '@/utils/solanaRetry';

   const provider = createConfirmedProvider(connection, wallet);
   ```
2. **For Anchor `.rpc()` calls**:
   Always pass `{ skipPreflight: true }`:
   ```typescript
   await program.methods.listNft(price).accounts({...}).rpc({ skipPreflight: true });
   ```
3. **For Metaplex Umi**:
   Always pass `send: { skipPreflight: true }` and `confirm: { commitment: "confirmed" }`:
   ```typescript
   await builder.sendAndConfirm(umi, {
       send: { skipPreflight: true },
       confirm: { commitment: "confirmed" }
   });
   ```
4. **For Raw `wallet.sendTransaction`**:
   ```typescript
   await wallet.sendTransaction(tx, connection, {
       skipPreflight: true,
       preflightCommitment: "confirmed",
   });
   ```

---

### Issue #4: Duplicate Confirmation Watchdog Timeout (`Transaction was not confirmed in 30.00 seconds`)

#### Symptom:
The transaction is signed by the wallet and broadcast, but the UI displays:
```text
Error: Transaction was not confirmed in 30.00 seconds. It is unknown if it succeeded or failed. Check signature <SIG> using the Solana Explorer or CLI tools.
```

#### Root Cause:
1. **Redundant confirmation**: Anchor's `.rpc()` method **already sends and confirms the transaction internally**.
2. If code executes `await connection.confirmTransaction(...)` *after* `.rpc()`, `@solana/web3.js` sets up a WebSocket listener waiting for a signature notification. Because the transaction already landed on-chain, no future event is fired. The listener hangs until the 30-second watchdog expires.
3. **Missing Priority Fees**: Transactions sent with 0 priority fees can sit in validator mempools during Devnet congestion.

#### Permanent Code Pattern:
1. **Do NOT call `connection.confirmTransaction` after `.rpc()`**:
   ```typescript
   // CORRECT:
   const txSig = await program.methods.listNft(priceLamports)
       .accounts({...})
       .preInstructions([...])
       .rpc({ skipPreflight: true });

   // DO NOT ADD: await connection.confirmTransaction(txSig); <-- Redundant & causes 30s timeout!
   ```
2. **Attach Compute Budget Priority Fees to all state-modifying instructions**:
   ```typescript
   import { ComputeBudgetProgram } from '@solana/web3.js';

   .preInstructions([
       ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
       ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
   ])
   ```

---

### Issue #5: Phantom Developer Mode & Network Settings

#### Symptom:
Phantom displays a yellow banner: `You are currently in Testnet Mode`.

#### Explanation:
- Phantom flags any non-mainnet network with developer mode active.
- **Solana Testnet is NOT Solana Devnet**. Devnet contracts (`ss_nft_gallery`, Candy Machines, SPL tokens) exist solely on **Devnet**.
- If Phantom's network setting is accidentally switched to *Testnet* instead of *Devnet*, transactions fail immediately because the accounts do not exist on Testnet.

#### Verification:
1. Open Phantom ➔ Click **Settings ⚙️** (bottom right).
2. Click **Developer Settings** ➔ **Change Network**.
3. Verify that **Devnet** is selected.

---

## 3. Quick Checklist for Adding New Transaction Flows

Before pushing any new Solana contract interaction to this codebase, verify:
- [ ] Is image upload passing through `compressImageForDevnet()`? (< 100 KiB)
- [ ] Is the Anchor provider created via `createConfirmedProvider(connection, wallet)`?
- [ ] Does every `.rpc()` call have `{ skipPreflight: true }`?
- [ ] Does every Metaplex `sendAndConfirm()` call have `{ send: { skipPreflight: true }, confirm: { commitment: "confirmed" } }`?
- [ ] Are priority fees attached via `ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 })`?
- [ ] Is there **NO** redundant `connection.confirmTransaction` call after `.rpc()`?
- [ ] Does `npx tsc --noEmit` pass with **0 errors**?
