---
name: solana-devnet-functional
description: >-
  Specialized skill for transitioning Solana financial prototypes into fully functional,
  deployable, and tested programs on Solana Devnet. Covers Anchor configuration, Devnet SPL/Token-2022
  mints, Pyth/Switchboard Devnet oracle integration, compute budget management, atomic instruction bundling,
  and client wallet adapter integration.
  Derived from 'Building Financial Software on Solana' (Chapters 2, 8, 10, 17, 21).
---

# Transitioning Solana Financial Protocols to Devnet

This skill provides the operational runbook and developer patterns for taking prototyped
Solana programs (Trading, Staking, Borrow-Lend) and deploying them as functional Devnet applications.

---

## 1. Devnet Environment & Configuration

### 1.1 `Anchor.toml` Cluster Setup
Configure Anchor for Devnet deployment with explicit program addresses and commitment:

```toml
[features]
seeds = true
skip-lint = false

[programs.devnet]
snbl_staking = "4Emh8zTvZz6mYTqa3c5UMQFgaMgFPx7fB4YaMNNKhoBw"
# Add trading / lending program IDs once generated:
# solana_amm = "..."
# solana_lending = "..."

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[workspace]
members = [
    "programs/snbl_staking",
    "programs/launchpad",
    "programs/street_sync",
    "programs/e_plays"
]
```

### 1.2 Program Keypair & Address Generation
Before deploying a new program to Devnet, generate its persistent keypair so the program ID remains constant:
```bash
solana-keygen new -o target/deploy/solana_lending-keypair.json --no-bip39-passphrase --force
solana address -k target/deploy/solana_lending-keypair.json
# Update declare_id!("...") in programs/<name>/src/lib.rs and Anchor.toml
```

---

## 2. Devnet Token & Oracle Infrastructure

### 2.1 Test Token Mints (USDC & Base Tokens)
Financial contracts require tokens with standard decimals to prevent arithmetic distortion:
- **USDC Mock**: 6 decimals.
- **SOL / WSOL**: 9 decimals.
- **Mock Token Setup Script**:
```typescript
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

// Create Devnet USDC Mint
const usdcMint = await createMint(connection, payer, payer.publicKey, null, 6);
// Mint 1,000,000 USDC to user ATA for testing
await mintTo(connection, payer, usdcMint, userAta.address, payer, 1_000_000 * 10 ** 6);
```

### 2.2 Pyth Devnet Oracles
Pyth provides official Devnet price feeds on Solana:
- **Pyth Devnet Program ID**: `gSbePebfvPy7tRqimPoVecS2UsBvYv46QBSSQ3NfWBQ` (Pyth Push Oracle) or legacy `FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH`.
- **Feed Accounts (Devnet)**:
  - SOL/USD: `J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix`
  - BTC/USD: `HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J`
  - USDC/USD: `52vDALVTsqDoKiCz1usHirbt15nPGjDXpxWpkNDZvgx`

*Devnet Tip*: When developing isolated components, also build a lightweight `mock_oracle` program that allows the test suite to arbitrarily simulate price crashes, volatility, and slot drift without waiting for external feeds.

---

## 3. Transaction Bundling: The 3 Golden Rules

On Devnet, transactions that fail often do so because of dropped slots, unmanaged compute budgets, or missing crank executions. Always follow these rules:

### 3.1 Prepend Compute Budget & Priority Fees
```typescript
import { ComputeBudgetProgram, Transaction } from "@solana/web3.js";

const tx = new Transaction()
  .add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5_000 }) // 5000 micro-lamports priority fee
  );
```

### 3.2 Atomic Crank Bundling
Every action in Lending, Perp, or AMM venues that relies on current slot data **must** bundle the crank call in the very same transaction:
```typescript
// For Borrowing / Liquidating:
tx.add(
  await program.methods.refreshReserve().accounts({ reserve, priceFeed, clock: SYSVAR_CLOCK_PUBKEY }).instruction(),
  await program.methods.refreshObligation().accounts({ obligation, lendingMarket }).instruction(),
  await program.methods.borrowObligationLiquidity(amount).accounts({ ... }).instruction()
);
```

### 3.3 Confirm with Finalized or Confirmed Commitment
```typescript
const signature = await sendAndConfirmTransaction(connection, tx, [userKeypair], {
  commitment: "confirmed",
  preflightCommitment: "confirmed",
  skipPreflight: false,
});
```

---

## 4. UI to Onchain Contract Integration Bridge

1. **Export IDL to Web App**:
   ```bash
   anchor build
   cp target/idl/*.json src/idl/
   ```
2. **Anchor Provider Setup in React**:
   ```typescript
   import { AnchorProvider, Program } from "@coral-xyz/anchor";
   import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";

   const { connection } = useConnection();
   const wallet = useAnchorWallet();

   const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
   const program = new Program(idl, provider);
   ```
3. **Parse Program Custom Errors**:
   Use Anchor's `ProgramError` to parse custom enum error messages (e.g. `ObligationStale`, `ZeroAmount`, `InsufficientPoolLiquidity`) and surface clean toast notifications to users.
