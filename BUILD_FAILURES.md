# Street Sync Build Failures & Recalibration Guide

This document maintains an incident log of build failures, compilation errors, and CI/CD deployment issues encountered in Street Sync (Next.js, TypeScript, Webpack, Anchor/Solana client polyfills, GitHub Actions), along with exact root causes, step-by-step recalibration procedures, and cross-references to [RECURRING_ISSUES.md](RECURRING_ISSUES.md).

---

## Quick Reference: Build Diagnostics & Pre-Push Checklist

Before pushing commits to `main` or triggering GitHub Actions CI deployment:

```bash
# 1. Type Check (Strict TypeScript validation)
npx tsc --noEmit

# 2. Production Static Build & Optimization
npx --no-install next build --webpack

# 3. Clean Workspace Status
git status -s
```

---

## Build Failure Incidents & Recalibration Log

### Incident #1: TypeScript Callback Signature Parameter Mismatch in AI Trading Terminal
- **Date/Commit**: September 2026 / Colosseum SS AI Trading Platform Update
- **Failed Command**: `npx --no-install next build --webpack` (in GitHub Actions CI / strict TypeScript mode)
- **Error Log**:
  ```text
  ./src/components/features/openclaw/TradingTerminal.tsx:285:46
  Type error: Type '(suggestionSymbol: string, suggestionIsBuy: boolean, suggestionAmount: number) => void' is not assignable to type '(isBuy: boolean, symbol: string, amount: number) => void'.
    Types of parameters 'suggestionSymbol' and 'isBuy' are incompatible.
      Type 'boolean' is not assignable to type 'string'.

    283 |             {/* Signals Column */}
    284 |             <div className="h-[390px]">
  > 285 |               <AiSuggestions prices={prices} onExecuteSuggestion={handleExecuteSuggestion} />
        |                                              ^
    286 |             </div>
  ```
- **Trigger**: Restructuring `TradingTerminal.tsx` into dedicated Tracking vs Configuration tabs and wiring AI trade execution signals from `AiSuggestions.tsx`.
- **Root Cause**:
  `AiSuggestionsProps` defines `onExecuteSuggestion: (isBuy: boolean, symbol: string, amount: number) => void` where `isBuy` is the first parameter. `TradingTerminal.tsx` implemented `handleExecuteSuggestion` with parameters inverted as `(suggestionSymbol: string, suggestionIsBuy: boolean, suggestionAmount: number)`.
- **Recalibration & Fix**:
  In [`src/components/features/openclaw/TradingTerminal.tsx`](src/components/features/openclaw/TradingTerminal.tsx#L135), align parameter order with `AiSuggestionsProps`:
  ```typescript
  // Before (Broken):
  const handleExecuteSuggestion = (suggestionSymbol: string, suggestionIsBuy: boolean, suggestionAmount: number) => { ... }

  // After (Fixed):
  const handleExecuteSuggestion = (suggestionIsBuy: boolean, suggestionSymbol: string, suggestionAmount: number) => {
    setActiveSymbol(suggestionSymbol);
    setIsBuy(suggestionIsBuy);
    setAmount(suggestionAmount.toString());
    setActiveTab("configuration");
    engine.addLog(`AI Suggestion loaded: ${suggestionIsBuy ? "BUY" : "SELL"} ${suggestionAmount} ${suggestionSymbol}`, "info");
  };
  ```
- **Correlation with `RECURRING_ISSUES.md`**:
  *Not a Solana runtime issue.* This is a **Frontend Component Interface Mismatch**. To prevent local builds from masking this, always execute `npx tsc --noEmit` before git push.

---

### Incident #2: Webpack 5 Missing Node Polyfills for Solana / Metaplex / Anchor
- **Failed Command**: `next build` / `npm run build`
- **Error Log**:
  ```text
  Module not found: Can't resolve 'fs'
  Module not found: Can't resolve 'stream'
  Module not found: Can't resolve 'crypto'
  Module not found: Can't resolve 'node:crypto'
  ```
- **Trigger**: Importing `@solana/web3.js`, `@coral-xyz/anchor`, `@metaplex-foundation/umi`, or `@irys/upload` into client-side components (`"use client"`).
- **Root Cause**: Next.js (Webpack 5) does not include Node core module polyfills by default. Certain Solana libraries require `crypto`, `stream`, and `events`, while node file system (`fs`, `path`) must be disabled in browser bundles.
- **Recalibration & Fix**:
  Configured in [`next.config.ts`](next.config.ts):
  1. Add browser polyfills: `crypto-browserify`, `stream-browserify`, `events/`.
  2. Disable server-only modules: `fs: false`, `path: false`, `os: false`, `child_process: false`.
  3. Strip `node:` prefixes with `null-loader` and fallback maps.
  4. Alias `@irys/upload: false` and `@irys/upload-solana: false`.
- **Correlation with `RECURRING_ISSUES.md`**:
  Directly related to **Issue #1 & #8** in `RECURRING_ISSUES.md` (transitioning away from buggy Irys Bundler to Pinata IPFS Uploader).

---

### Incident #3: GitHub Pages Static Export (`output: 'export'`) Pre-Rendering & API Failures
- **Failed Command**: `next build --webpack` in CI environment with `NODE_ENV=production`
- **Error Log**:
  ```text
  Error: Page "/api/news" cannot be exported as static HTML. Dynamic server usage.
  ```
- **Trigger**: GitHub Pages deployment workflow (`.github/workflows/nextjs.yml`) enforcing static HTML export via `output: 'export'`.
- **Root Cause**: GitHub Pages does not run a Node.js server. All pages and API endpoints must pre-render to static files at build time (`./out`). Any uncaught API failure during build halts the pipeline.
- **Recalibration & Fix**:
  1. Wrap build-time data fetches (`src/app/api/news/route.ts` & `market-news/page.tsx`) in try-catch with reliable fallback mock data (`Falling back to mock data`).
  2. Set explicit static export flags in `next.config.ts`:
     ```typescript
     const isExport = process.env.NODE_ENV === 'production';
     const nextConfig: NextConfig = {
       ...(isExport ? { output: 'export' as const, basePath: '/snapdrop' } : {}),
       images: { unoptimized: true },
       ...
     };
     ```
- **Correlation with `RECURRING_ISSUES.md`**:
  Build infrastructure constraint. Solved permanently by providing offline fallbacks during static export.

---

### Incident #4: Baseline Browser Mapping Outdated Warning & Cache Invalidation
- **Log / Warning**:
  ```text
  [baseline-browser-mapping] The data in this module is over two months old.
  To ensure accurate Baseline data, please update: npm i baseline-browser-mapping@latest -D
  ⚠ No build cache found.
  ```
- **Nature**: Non-fatal informational warning from Next.js 16/Webpack.
- **Recalibration**:
  Update package when bumping devDependencies:
  ```bash
  npm i baseline-browser-mapping@latest -D
  ```

---

## Classification Guide: Build Failure vs. Recurring Runtime Issue

When investigating a failure, use this guide to identify the appropriate troubleshooting playbook:

| Category | Typical Symptoms | Document to Check | Immediate Action |
|---|---|---|---|
| **TypeScript / Interface Mismatch** | `Type '(...) => void' is not assignable`, `Property 'x' does not exist on type 'y'` | **`BUILD_FAILURES.md`** | Run `npx tsc --noEmit` and align component prop types |
| **Webpack Polyfill / Bundling** | `Module not found: Can't resolve 'fs'`, `crypto`, `stream` | **`BUILD_FAILURES.md`** | Check `next.config.ts` fallback rules |
| **Static Export / CI Workflow** | `cannot be exported as static HTML`, Exit code 1 in GitHub Actions `nextjs.yml` | **`BUILD_FAILURES.md`** | Check `output: 'export'` and API fetch try-catch fallbacks |
| **Solana RPC / Stale Blockhash** | `Blockhash not found`, `TransactionExpiredTimeoutError` | **`RECURRING_ISSUES.md`** (Issues #2, #3, #4) | Use `withSolanaRetry` and `createConfirmedProvider` |
| **Phantom Wallet Simulation** | `WalletSignTransactionError: Unexpected error`, `AccountNotFound` | **`RECURRING_ISSUES.md`** (Issue #5) | Switch Phantom from Testnet to Devnet mode |
| **Transaction Expiry / Compute Units** | `TransactionExpiredBlockheightExceededError` | **`RECURRING_ISSUES.md`** (Issue #6) | Add `setComputeUnitPrice` (100k) and tune CU limit |
| **Asset Uploads / Broken Images** | `400 Confirmed tx not found`, Pink placeholders, 404 on IPFS | **`RECURRING_ISSUES.md`** (Issues #1, #8) | Use `pinataUploader()` & `resolveNftImageUrl()` |
