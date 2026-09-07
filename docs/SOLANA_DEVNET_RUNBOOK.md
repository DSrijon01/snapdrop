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

## 2. Recurring Issues Master Matrix

| # | Error / Symptom | Trigger Point | Root Cause | Solution & Code Fix |
|---|---|---|---|---|
| **#1** | `400 Confirmed tx not found` (Irys/Arweave) | Uploading assets in One-Click Launch | Asset file size >= 100 KiB requires Devnet funding tx; Irys bundler nodes lag behind Solana | Pass all uploads through `compressImageForDevnet()` to ensure < 100 KiB (free uploads, 0 funding tx needed) |
| **#2** | `Simulation failed: Blockhash not found` | Transaction submission across apps | Stale blockhash or out-of-sync public RPC endpoints | Use dedicated Helius Devnet RPC, set `createConfirmedProvider`, wrap calls in `withSolanaRetry()` |
| **#3** | `Simulation failed: Blockhash not found` (preflight drop) | Anchor `.rpc()` / Metaplex `sendAndConfirm()` | Preflight simulation on client tries to simulate state before accounts are indexed | Add `{ skipPreflight: true }` to Anchor `.rpc()` and `{ send: { skipPreflight: true } }` to Metaplex |
| **#4** | `Transaction was not confirmed in 30.00 seconds` | Listing stacks / state changes | Duplicate confirmation watchdog (`connection.confirmTransaction`) after Anchor `.rpc()` | Remove redundant `confirmTransaction()`, attach `ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 })` |
| **#5** | `You are currently in Testnet Mode` | Phantom wallet banner | Phantom defaults developer mode to Testnet instead of Devnet | Settings ⚙️ ➔ Developer Settings ➔ Change Network ➔ Select **Solana Devnet** |
| **#6** | `TransactionExpiredBlockheightExceededError: block height exceeded` | Direct Minting & Candy Machine Minting | 0 priority fee with 800k CU request; transaction expires past 150 slots (~60-90s) | Prepend `setComputeUnitPrice(umi, { microLamports: 100_000 })`, set CU limit to 400k, pass `maxRetries: 5`, wrap in `withSolanaRetry` |
| **#7** | `WalletSendTransactionError: Unexpected error` | Module Subscription / Direct Transfers | Phantom executes preflight simulation & broadcasts via its own internal RPC; also missing `skipPreflight` | Use `wallet.signTransaction` for user approval, then broadcast signed bytes via `connection.sendRawTransaction` on dedicated Helius RPC with `skipPreflight: true`. Verify Phantom network is set to Devnet. |

---

## 3. Detailed Issue Catalog & Solutions

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

### Issue #6: Transaction Blockheight Expiry (`TransactionExpiredBlockheightExceededError: Signature ... has expired: block height exceeded`)

#### Symptom:
During direct minting or Candy Machine deployment/minting:
```text
TransactionExpiredBlockheightExceededError: Signature <SIG> has expired: block height exceeded.
    at rk.confirmTransactionUsingBlockHeightExceedanceStrategy
    at async rk.confirmTransaction
    at async o.sendAndConfirm
```

#### Root Cause:
1. **0 Priority Fee with High Compute Unit Requests**: Transactions requesting large compute unit limits (e.g. 800,000 CUs) with 0 priority fees are heavily deprioritized or dropped by leader validators during Devnet load.
2. **Blockhash Lifetime Exceeded**: A Solana blockhash is valid for approximately 150 slots (~60–90 seconds). If slot skips or validator queues delay the transaction beyond the blockhash's `lastValidBlockHeight`, the transaction expires on-chain and is discarded.
3. **No Retries / Rebroadcasting**: Without `maxRetries: 5` and retry wrappers (`withSolanaRetry`), the RPC will not rebroadcast across consecutive leader slots, causing single slot misses to fail permanently.

#### Permanent Code Pattern:
1. **Prepend both `setComputeUnitPrice` and reasonable `setComputeUnitLimit`**:
   ```typescript
   import { setComputeUnitLimit, setComputeUnitPrice } from "@metaplex-foundation/mpl-toolbox";

   builder = builder
       .prepend(setComputeUnitLimit(umi, { units: 400_000 }))
       .prepend(setComputeUnitPrice(umi, { microLamports: 100_000 }));
   ```
2. **Always include `maxRetries: 5` in Metaplex `sendAndConfirm`**:
   ```typescript
   await withSolanaRetry(async () => {
       await builder.sendAndConfirm(umi, {
           send: { skipPreflight: true, maxRetries: 5 },
           confirm: { commitment: 'confirmed' }
       });
   });
   ```

---

### Issue #7: Wallet Preflight Rejection (`WalletSendTransactionError: Unexpected error`)

#### Symptom:
During module subscription payment, direct transfers, or staking, the wallet fails with:
```text
Subscription payment failed: WalletSendTransactionError: Unexpected error
    at tA.sendTransaction
```

#### Root Cause:
1. **Wallet Internal RPC vs App RPC**:
   When using `wallet.sendTransaction(tx, connection)`, the Solana wallet adapter invokes Phantom's internal method. Phantom attempts to simulate and broadcast the transaction using Phantom's internal public Devnet RPC node (often `https://api.devnet.solana.com`). When Phantom's internal node rate-limits or fails simulation, Phantom throws `Unexpected error`.
2. **Missing `skipPreflight: true`**:
   Without `skipPreflight: true`, Phantom executes client-side simulation on its own node before opening the approval popup or finalizing submission.
3. **Phantom Network Misconfiguration**:
   If Phantom's Developer Settings have "Testnet" selected instead of "Devnet", the blockhash from the dApp (fetched from Devnet) does not exist on Testnet, causing an immediate rejection.

#### Permanent Code Pattern:
Use `signTransaction` to request the user's signature only, then serialize and broadcast directly through our dedicated Helius Devnet RPC via `connection.sendRawTransaction`:
```typescript
let signature: string;
if (signTransaction) {
    const signedTx = await signTransaction(transaction);
    signature = await withSolanaRetry(async () => {
        return await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true,
            maxRetries: 5,
            preflightCommitment: "confirmed",
        });
    });
} else {
    signature = await withSolanaRetry(async () => {
        return await sendTransaction(transaction, connection, {
            skipPreflight: true,
            preflightCommitment: "confirmed",
        });
    });
}
```

---

## 4. Quick Checklist for Adding New Transaction Flows

Before pushing any new Solana contract interaction to this codebase, verify:
- [ ] Is image upload passing through `compressImageForDevnet()`? (< 100 KiB)
- [ ] Is the Anchor provider created via `createConfirmedProvider(connection, wallet)`?
- [ ] Does every `.rpc()` call have `{ skipPreflight: true }`?
- [ ] Does every Metaplex `sendAndConfirm()` call have `{ send: { skipPreflight: true, maxRetries: 5 }, confirm: { commitment: "confirmed" } }`?
- [ ] For raw Web3/SPL transactions, is `signTransaction` + `sendRawTransaction` used with `skipPreflight: true`?
- [ ] Are priority fees attached via `ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 })` or `setComputeUnitPrice(umi, { microLamports: 100_000 })`?
- [ ] Are transactions wrapped in `withSolanaRetry(...)` where applicable?
- [ ] Is there **NO** redundant `connection.confirmTransaction` call after `.rpc()`?
- [ ] Does `npx tsc --noEmit` pass with **0 errors**?
