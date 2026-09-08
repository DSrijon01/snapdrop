# Street Sync Solana Devnet Recurring Issues & Troubleshooting Guide

This document maintains a quick-lookup index of recurring issues encountered on Solana Devnet across One-Click Launch, Treasury Custody, Candy Machines, and the NFT Marketplace, along with permanent solutions.

For complete in-depth implementation patterns, architecture diagrams, and checklists, refer to the full [Solana Devnet Runbook](docs/SOLANA_DEVNET_RUNBOOK.md).

---

## Recurring Issues Quick Index

| # | Error / Symptom | Trigger Flow | Root Cause | Fix / Permanent Pattern |
|---|---|---|---|---|
| **1** | `400 Confirmed tx not found` (Irys/Arweave) | One-Click Launch asset upload | Image >= 100 KiB triggers Devnet funding tx; Irys bundler nodes lag behind Solana | Pass files through `compressImageForDevnet()` (`src/utils/imageCompressor.ts`) to ensure < 100 KiB (free upload, zero funding tx). |
| **2** | `Simulation failed: Blockhash not found` (Stale Blockhash) | Any transaction submission | Public RPC node desync / stale blockhash | Use dedicated Helius Devnet RPC (`src/utils/solanaRpc.ts`), Anchor `createConfirmedProvider`, and wrap in `withSolanaRetry()`. |
| **3** | `Simulation failed: Blockhash not found` (Preflight drop) | Anchor `.rpc()` or Metaplex `sendAndConfirm()` | Preflight simulation simulates transactions locally before newly minted accounts are indexed | Add `{ skipPreflight: true }` to Anchor `.rpc()` calls and `{ send: { skipPreflight: true } }` to Metaplex builders. |
| **4** | `Transaction was not confirmed in 30.00 seconds` (`TransactionExpiredTimeoutError`) | Listing tokens / stacks / secondary marketplace | Anchor's internal `sendAndConfirm` calls `connection.confirmTransaction(sig)` with a string signature, invoking `@solana/web3.js`'s 30s legacy watchdog timer | Override `provider.sendAndConfirm` in `createConfirmedProvider` (`src/utils/solanaRetry.ts`) to use modern `{ signature, blockhash, lastValidBlockHeight }` exceedance confirmation + `maxRetries: 5`, and attach priority fees (`100,000` microLamports). |
| **5** | `You are currently in Testnet Mode` | Phantom wallet banner | Phantom defaults developer mode to Testnet instead of Devnet | In Phantom: Settings ⚙️ ➔ Developer Settings ➔ Change Network ➔ Select **Solana Devnet**. |
| **6** | `TransactionExpiredBlockheightExceededError: block height exceeded` | Direct Minting & Candy Machine Minting | 0 priority fee with high Compute Units (800k); transaction sits in validator queue past 150 slots (~60–90s) | Prepend `setComputeUnitPrice(umi, { microLamports: 100_000 })`, lower CU limit to 400k, pass `maxRetries: 5`, and wrap in `withSolanaRetry()`. |
| **7** | `WalletSendTransactionError: Unexpected error` | e-Plays trading (`buyShares`) / Module Subscription / SOL transfers | Using wallet adapter `sendTransaction(tx, connection)` delegates simulation and routing to Phantom's internal RPC which fails/mismatches with app RPC | Replace `sendTransaction` with Anchor `(program.methods as any).buyShares(...)...rpc({ skipPreflight: true })` powered by `createConfirmedProvider` (or `signTransaction` + `connection.sendRawTransaction(rawTx, { skipPreflight: true, maxRetries: 5 })`). |

---

## Key Utility Reference

1. **Image Compression for Free Arweave Uploads (< 100 KiB)**:
   - File: [`src/utils/imageCompressor.ts`](src/utils/imageCompressor.ts)
   - Function: `compressImageForDevnet(file: File): Promise<File>`

2. **Dedicated Devnet RPC Configuration**:
   - File: [`src/utils/solanaRpc.ts`](src/utils/solanaRpc.ts)
   - Constants: `HELIUS_DEVNET_RPC`, `HELIUS_DEVNET_WS`

3. **Blockhash Expiry & Network Resilience Retry Wrapper**:
   - File: [`src/utils/solanaRetry.ts`](src/utils/solanaRetry.ts)
   - Function: `withSolanaRetry<T>(operation: () => Promise<T>, maxRetries = 4, delayMs = 1500): Promise<T>`

4. **Confirmed Anchor Provider Creation**:
   - File: [`src/utils/anchorProvider.ts`](src/utils/anchorProvider.ts)
   - Function: `createConfirmedProvider(connection, wallet)`

---

## Transaction Best-Practice Rules

1. **Always add priority fees**:
   - Anchor / Web3: `ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 })`
   - Metaplex Umi: `setComputeUnitPrice(umi, { microLamports: 100_000 })`
2. **Always tune compute units**:
   - Metaplex Umi: `setComputeUnitLimit(umi, { units: 400_000 })` (Direct mint takes ~180k-250k CUs)
3. **Always set `maxRetries: 5` and `skipPreflight: true` for Metaplex builders**:
   ```typescript
   await withSolanaRetry(async () => {
       await builder.sendAndConfirm(umi, {
           send: { skipPreflight: true, maxRetries: 5 },
           confirm: { commitment: 'confirmed' }
       });
   });
   ```
4. **Never call `connection.confirmTransaction` after Anchor `.rpc()`**.
