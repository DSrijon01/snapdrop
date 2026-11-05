# Street Sync Solana Devnet Recurring Issues & Troubleshooting Guide

This document maintains a quick-lookup index of recurring issues encountered on Solana Devnet across One-Click Launch, Treasury Custody, Candy Machines, and the NFT Marketplace, along with permanent solutions.

For complete in-depth implementation patterns, architecture diagrams, and checklists, refer to the full [Solana Devnet Runbook](docs/SOLANA_DEVNET_RUNBOOK.md).  
For build failures, compilation errors, and CI recalibration playbooks, see [Build Failures & Recalibration Guide](BUILD_FAILURES.md).  
For planned stage pushes (Avatar, Arcade) and pending performance optimizations, see [Future Improvements & Roadmap](docs/FUTURE_IMPROVEMENTS_AND_ROADMAP.md).

---

## Recurring Issues Quick Index

| # | Error / Symptom | Trigger Flow | Root Cause | Fix / Permanent Pattern |
|---|---|---|---|---|
| **1** | `400 Confirmed tx not found` (Irys/Arweave) | One-Click Launch asset upload | Image >= 100 KiB triggers Devnet funding tx; Irys bundler nodes lag behind Solana | Pass files through `compressImageForDevnet()` (`src/utils/imageCompressor.ts`) to ensure < 100 KiB (free upload, zero funding tx). |
| **2** | `Simulation failed: Blockhash not found` (Stale Blockhash) | Any transaction submission | Public RPC node desync / stale blockhash | Use dedicated Helius Devnet RPC (`src/utils/solanaRpc.ts`), Anchor `createConfirmedProvider`, and wrap in `withSolanaRetry()`. |
| **3** | `Simulation failed: Blockhash not found` (Preflight drop) | Anchor `.rpc()` or Metaplex `sendAndConfirm()` | Preflight simulation simulates transactions locally before newly minted accounts are indexed | Add `{ skipPreflight: true }` to Anchor `.rpc()` calls and `{ send: { skipPreflight: true } }` to Metaplex builders. |
| **4** | `Transaction was not confirmed in 30.00 seconds` (`TransactionExpiredTimeoutError`) | Listing tokens / stacks / secondary marketplace | Anchor's internal `sendAndConfirm` calls `connection.confirmTransaction(sig)` with a string signature, invoking `@solana/web3.js`'s 30s legacy watchdog timer | Override `provider.sendAndConfirm` in `createConfirmedProvider` (`src/utils/solanaRetry.ts`) to use modern `{ signature, blockhash, lastValidBlockHeight }` exceedance confirmation + `maxRetries: 5`, and attach priority fees (`100,000` microLamports). |
| **5** | `WalletSignTransactionError: Unexpected error` / `Simulation Failed: Unexpected error` | Prediction Market (`buyShares`), NFT Minting, Token Listing | Phantom wallet is set to **Testnet Mode** (shows yellow top banner `You are currently in Testnet Mode`) while the dApp and Anchor contracts run on **Devnet**. When Phantom attempts internal simulation on Testnet, accounts/programs aren't found (`AccountNotFound`), causing Phantom to abort with `Unexpected error`. | In Phantom: Settings ⚙️ ➔ Developer Settings ➔ Change Network ➔ Select **Solana Devnet**. Handled in `createConfirmedProvider` & `parseSolanaErrorMessage` (`src/utils/solanaRetry.ts`) with clear instructions displayed in the UI. |
| **6** | `TransactionExpiredBlockheightExceededError: block height exceeded` | Direct Minting & Candy Machine Minting | 0 priority fee with high Compute Units (800k); transaction sits in validator queue past 150 slots (~60–90s) | Prepend `setComputeUnitPrice(umi, { microLamports: 100_000 })`, lower CU limit to 400k, pass `maxRetries: 5`, and wrap in `withSolanaRetry()`. |
| **7** | `WalletSendTransactionError: Unexpected error` | e-Plays trading (`buyShares`) / Module Subscription / SOL transfers | Using wallet adapter `sendTransaction(tx, connection)` delegates simulation and routing to Phantom's internal RPC which fails/mismatches with app RPC | Replace `sendTransaction` with Anchor `(program.methods as any).buyShares(...)...rpc({ skipPreflight: true })` powered by `createConfirmedProvider` (or `signTransaction` + `connection.sendRawTransaction(rawTx, { skipPreflight: true, maxRetries: 5 })`). |
| **8** | Broken Images / `[image]` alt text / Pink Placeholders / HTTP 404 on NFT & Token cards | Exclusive Drops, Your Stream, NFTs For Sale, Token Launchpad | 1. Ephemeral devnet Irys nodes (`devnet.irys.xyz`) wipe test files after 30 days (404). 2. Metaplex `\0` null-byte padding. 3. Gateway rate-limiting. 4. Returning `image: ""` renders native broken icon. | 1. Switched creation uploaders (`TokenGenerator`, `Token2022Studio`, `NFTStudio`) to **Pinata IPFS** via `pinataUploader()` (`src/utils/umiPinataUploader.ts`) with dedicated gateway. 2. Pinned files never expire. 3. Stripped null bytes and added procedural Cyberpunk SVG data-URI fallback + gateway failover via `src/utils/nftImageResolver.ts`. |
| **9** | Broken Subscription Redirect / Unexpected Error Boundary (`GlobalErrorPage`) | Subscribing to Pro tiers on mobile (Chrome / Safari / Android WebShell) via Phantom or Solflare | 1. `src/app/page.tsx` hijacked `window.location.href = targetProRoute` prematurely before `processPhantomMobileRedirect` could decrypt returning `nonce`/`data`, dropping parameters and leaving user unsubscribed. 2. `handlePendingMobileSubscription` and `resumePendingTransactions` fought in duplicate broadcast race conditions. 3. Missing Solflare mobile event listeners (`solflare_mobile_tx_signed`, `solflare_mobile_tx_sent`, `solflare_mobile_error`). 4. Unconditional `catch` in `subscribe()` wiped pending subscription on app-switch unloads. 5. Uncaught `QuotaExceededError` in `safeLocalStorageSet`. | 1. Never redirect synchronously in `page.tsx` before decryption; allow `handleGlobalResumption()` and `resumePendingTransactions()` to run first. 2. Delegate mobile subscription broadcasting directly to `resumePendingTransactions`. 3. Register dual Phantom and Solflare mobile event listeners across `SubscriptionContext.tsx` and `SubscriptionModal.tsx`. 4. Guard pending state against app-switch unload clearing. 5. Make `safeLocalStorageSet` resilient against storage quotas without throwing. |

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

5. **Pinata Permanent IPFS Uploader Plugin**:
   - File: [`src/utils/umiPinataUploader.ts`](src/utils/umiPinataUploader.ts)
   - Usage: `umi.use(pinataUploader())` (drop-in replacement for `irysUploader` across all studios)

6. **Solana NFT Image & Gateway Failover Resolver**:
   - File: [`src/utils/nftImageResolver.ts`](src/utils/nftImageResolver.ts)
   - Function: `resolveNftImageUrl(rawUri, title)`, `getFallbackImage(title, seed)`, `handleImageFallback(e, title)`

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

---

## Deep Dive: Issue #9 — Mobile Wallet Deep Link Callbacks & Subscription Resumption

### Why Mobile Deep Link Callbacks Fail
1. **Premature Route Hijacking on Initial Mount**:
   When mobile wallets (Phantom / Solflare) approve a transaction or connect a session, they return to `https://streetsync-ss.com/?nonce=...&data=...` (or with `errorCode=...`).
   If the root landing page or router checks `localStorage.getItem("street_sync_pending_subscription")` and invokes `window.location.href = targetProRoute` synchronously on mount, the browser navigates away immediately, stripping `?nonce=...&data=...`.
   The cryptographic payload is **never decrypted**, the signed transaction is **never broadcast**, and the subscription is **never activated**.
2. **Duplicate Broadcast Race Conditions**:
   If both `SubscriptionContext.tsx` (`handlePendingMobileSubscription`) and `pendingTransactions.ts` (`resumePendingTransactions`) attempt to call `connection.sendRawTransaction()` on the same signed bytes concurrently, one will fail with `This transaction has already been processed`.
3. **App-Switching Unload Trap**:
   Calling `window.location.href = baseUrl + "?" + params` to trigger an external wallet app triggers a window blur/unload cycle. In some mobile browsers, the pending Promise rejects or throws before suspension. If the calling code's `catch` block unconditionally clears `street_sync_pending_subscription`, the pending state is wiped before the user returns from the wallet.
4. **Storage Quota Exceeded**:
   In iOS Safari private browsing or after storing large activity feeds, `localStorage.setItem` throws `QuotaExceededError`. If unhandled, this crashes React component lifecycles into `src/app/error.tsx`.

### The Permanent Pattern
1. **Never Hijack Routes Before Resumption**:
   Always allow `handleGlobalResumption()` and `processPhantomMobileRedirect()` to execute first. Only redirect after the transaction signature is confirmed or `subscription_updated` is fired.
2. **Unified Broadcast Delegation**:
   Delegate all returning raw transaction broadcasts to `resumePendingTransactions(connection)` in [`src/utils/pendingTransactions.ts`](src/utils/pendingTransactions.ts). It gracefully handles `already been processed`, `0x0`, and duplicate submissions as success states.
3. **Dual-Wallet Event Handlers**:
   Both Phantom and Solflare mobile event pairs MUST always be registered:
   - `phantom_mobile_tx_signed` & `solflare_mobile_tx_signed`
   - `phantom_mobile_tx_sent` & `solflare_mobile_tx_sent`
   - `phantom_mobile_error` & `solflare_mobile_error`
4. **Quota-Safe Storage Setter**:
   Use `safeLocalStorageSet` to prune volatile feed caches (`sessions_posts`, `sessions_chat`, `sync_feed_pro_posts`) when storage is full, and never throw uncaught exceptions to caller components.

---

## Mandatory Pre-Deployment Checklist

Before pushing commits to `main` or triggering GitHub Actions deployment, verify every item below:

- [ ] **1. Strict TypeScript Validation**:
  ```bash
  npx tsc --noEmit
  ```
  Must exit with code 0 without any parameter or type mismatches.

- [ ] **2. Static Production Build Verification**:
  ```bash
  npx --no-install next build --webpack
  ```
  Must successfully compile all 25 static & dynamic routes and generate `/out`.

- [ ] **3. No Premature Deep Link Forwarding in `src/app/page.tsx`**:
  Ensure `src/app/page.tsx` does NOT synchronously redirect `window.location.href = targetProRoute` when `hasDeeplinkCallbackParams` is true. `handleGlobalResumption()` must run first.

- [ ] **4. Dual Mobile Wallet Event Coverage**:
  Verify both Phantom and Solflare mobile event listeners are present in `SubscriptionContext.tsx`, `SubscriptionModal.tsx`, and `WalletContextProvider.tsx`.

- [ ] **5. Pending State Resilience Across App Unload**:
  Verify `subscribe()` does not delete `street_sync_pending_subscription` in its `catch` block when navigating out to a mobile wallet.

- [ ] **6. Storage Quota Safety**:
  Verify `safeLocalStorageSet()` catches `QuotaExceededError` and never throws unhandled errors.

- [ ] **7. Dedicated Helius Devnet RPC & Priority Fees**:
  Verify all Anchor and web3 transactions use `HELIUS_DEVNET_RPC` with priority fees (`ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 })`) and `maxRetries: 5`.
