---
name: solana-staking-modules
description: >-
  Specialized skill for designing, implementing, and securing Solana Staking & Liquid Staking
  Protocols (e.g. ssSOL, SNBL Staking, SPL Stake Pools). Covers share exchange rate mechanics,
  donation/inflation attack defenses, rent exemption safety, and lazy yield distribution.
  Derived from 'Building Financial Software on Solana' (Chapters 7, 9, 15, 17).
---

# Solana Staking & Liquid Staking Architecture

This skill provides production design patterns for building single-asset staking,
liquid staking (LST), and yield-bearing vault programs on Solana.

---

## 1. Core Mathematical Model (Share Accounting)

### 1.1 The Pricing Equation
A staking pool holds an underlying asset (e.g., SOL or a token like USDC) and issues
fungible share tokens (e.g., `ssSOL` or pool shares) representing fractional ownership:

- **When Depositing (Staking)**:
  $$\text{shares\_to\_mint} = \left\lfloor \frac{\text{deposit\_amount} \times \text{total\_shares\_supply}}{\text{total\_staked\_reserves}} \right\rfloor$$
- **When Withdrawing (Unstaking)**:
  $$\text{assets\_to\_return} = \left\lfloor \frac{\text{burned\_shares} \times \text{total\_staked\_reserves}}{\text{total\_shares\_supply}} \right\rfloor$$

### 1.2 Yield Accrual Without User Loops
- When validator rewards, trading fees, or protocol interest accrue into the pool:
  $$\text{total\_staked\_reserves} \leftarrow \text{total\_staked\_reserves} + \text{reward\_amount}$$
- The `total_shares_supply` does **not** change.
- Consequently, each share represents a progressively larger amount of the underlying asset over time.
- **Zero per-user state iteration**: The contract maintains $O(1)$ constant compute cost regardless of having 10 or 10,000,000 stakers.

---

## 2. Critical Vulnerabilities & How to Prevent Them

### 2.1 The Empty Pool Inflation / Donation Attack
- **The Exploit**:
  1. An attacker is the first staker: deposits 1 lamport, gets 1 share.
  2. Attacker transfers 100 SOL directly to the pool's vault account without calling `stake()`.
  3. The pool's total assets become $100 \times 10^9 + 1$ lamports for 1 share.
  4. The next genuine user deposits 50 SOL:
     $$\text{shares} = \left\lfloor \frac{50 \times 10^9 \times 1}{100 \times 10^9 + 1} \right\rfloor = 0$$
  5. The user's 50 SOL is stolen/absorbed by the pool with 0 shares minted to them.
- **The Defense (The Book's Rule)**:
  1. **Do NOT price off raw account balances**: Never use `to_account_info().lamports()` or token account `amount` directly in pricing formulas. Always track an internal state counter (`total_staked` / `available_liquidity`). Direct donations do not move the internal counter.
  2. **Withhold Minimum Shares (`MINIMUM_SHARES`)**:
     On the very first deposit, withhold 1,000 minor units of shares (minted to a dead PDA or burned forever):
     ```rust
     if pool.total_shares == 0 {
         require!(deposit_amount >= MINIMUM_INITIAL_DEPOSIT, StakingError::InitialDepositTooSmall);
         let initial_shares = deposit_amount;
         shares_to_user = initial_shares.checked_sub(MINIMUM_SHARES).unwrap();
         pool.total_shares = initial_shares;
     }
     ```
     This renders inflation attacks mathematically and economically impossible.

### 2.2 Rent Exemption Violation on Direct Lamport Mutation
- **The Bug in Naive Implementations**:
  Using `**pool.to_account_info().try_borrow_mut_lamports()? -= sol_to_return;`
  If users unstake and withdraw lamports directly from the program state PDA, the account's lamports can fall below `Rent::get()?.minimum_balance(space)`.
  The Solana runtime will immediately fail the transaction or purge the account on epoch boundary!
- **The Solution**:
  - Keep protocol state data in a metadata PDA (`PoolState`).
  - Keep staked SOL in a separate **Sol Reserve PDA** (`[b"sol_vault", pool_state.key().as_ref()]`) that maintains its own permanent rent-exempt reserve.
  - Or for SPL tokens, use a dedicated Token Account PDA vault.

### 2.3 Rounding Direction Invariant
- **Rule**: Rounding MUST always favor the pool, never the user.
- When minting shares $\to$ floor down (user gets fewer shares).
- When redeeming assets $\to$ floor down (user receives fewer assets, dust stays in the pool).
- When depositing rewards $\to$ update internal counter cleanly.

---

## 3. Account Structure & Implementation Template

```rust
#[account]
pub struct StakingPool {
    pub authority: Pubkey,
    pub asset_mint: Pubkey,         // Native SOL represented by WSOL or Pubkey::default()
    pub share_mint: Pubkey,         // ssSOL Mint
    pub vault: Pubkey,              // Isolated vault PDA
    pub total_staked: u64,          // Internal tracked assets (immune to donations)
    pub total_shares: u64,          // Total minted shares (including dead shares)
    pub min_deposit: u64,
    pub unstake_lock_period: i64,   // Cooldown or instant unstake fee
    pub fee_basis_points: u16,      // Protocol fee on rewards
    pub bump: u8,
}
```

---

## 4. Devnet Testing & Verification Checklist

- [ ] First deposit with small amount ($< 1,000$ minor units) fails with `InitialDepositTooSmall`.
- [ ] Direct token or lamport donation does not inflate the share price.
- [ ] 50 consecutive stake/unstake round trips generate zero fake yield (`deposit_redeem_round_trip_creates_no_value`).
- [ ] Depositing 0 units is strictly rejected (`ZeroAmount`).
- [ ] Unstaking more shares than user owns or pool liquidity allows fails cleanly.
- [ ] Vault balance always equals or exceeds `total_staked` + minimum rent exemption.
