# Solana Financial Architecture & Devnet Rules

Derived from *Building Financial Software on Solana* by Mike MacCana.
These rules must be observed by all agents developing financial programs, smart contracts,
and client interfaces within this workspace.

---

## 1. The Golden Rules of Money Arithmetic

1. **Zero Floats Near Funds**: Floating point numbers (`f32`, `f64`) do not exist onchain. All currency amounts are represented as integers at an explicit declared decimal scale (minor units).
2. **Multiply Before Divide**: Always perform multiplications first, widening intermediate operations into `u128` (or `i128` for signed values like PnL) to prevent loss of precision and avoid 64-bit integer overflow.
3. **Round Against the User (Floor Assets, Ceil Liabilities)**:
   - What the user receives (swap outputs, LP share mints, unstaking redemption, collateral withdrawals) MUST round **DOWN** (floor).
   - What the user owes (trading fees, admin fees, borrowing debt, interest accumulation, liquidation requirements) MUST round **UP** (ceiling).
   - The protocol must never lose a minor unit to rounding.
4. **All Math Must Be Checked**: Always use `.checked_*().ok_or(ErrorCode::MathOverflow)?`. Never use naked arithmetic operators (`+`, `-`, `*`, `/`) that can panic or overflow.

---

## 2. Vault Safety & Anti-Exploit Invariants

1. **Never Calculate Share Prices From Raw Vault Balances**:
   - Reading `vault.amount` or `vault.lamports` directly creates vulnerability to **donation and inflation attacks**.
   - Always maintain internal state tracking (`available_liquidity`, `total_staked`, `total_borrowed`). Direct token donations to the vault cannot move internal accounting.
2. **Withhold Minimum Initial Shares**:
   - On the first deposit into any pool (AMM, Staking, or Lending Reserve), permanently withhold `MINIMUM_SHARES` (1,000 minor units) so that `total_shares` can never be reduced to zero.
3. **Preserve Rent Exemption on State PDAs**:
   - NEVER transfer SOL out of a program metadata PDA using `try_borrow_mut_lamports` if the remaining balance could drop below the rent-exempt minimum. Staked SOL must reside in a dedicated Vault PDA.
4. **Assert Invariants After State Transitions**:
   - AMMs: Assert $K_{\text{new}} \ge K_{\text{prev}}$ after all swaps.
   - Lending: Assert that `total_vault_balance >= available_liquidity`.
   - Order Book: Assert that `vault_balance >= sum(open_orders_escrow) + unsettled_balances`.

---

## 3. Oracles, Freshness & Cranks

1. **Slot Freshness Enforcement**:
   - Reject any price feed whose publication slot does not match the current transaction slot (or within configured freshness limit, $\le 2$ slots).
2. **Oracle Confidence Interval Checks**:
   - Pyth and Switchboard confidence intervals must be checked:
     $$\text{confidence} \times 10,000 \le \text{price} \times \text{max\_confidence\_bps}$$
   - Reject wider bands with `OracleConfidenceTooWide`.
3. **Idempotent, Permissionless Cranks**:
   - Maintenance handlers like `refresh_reserve()` and `refresh_obligation()` must be callable by anyone and succeed cleanly if already fresh (no-op).
   - Cranks must never pay caller-specified addresses directly.

---

## 4. Devnet Execution Standards

1. Always prepend `ComputeBudgetProgram.setComputeUnitLimit` and `setComputeUnitPrice` in transaction builders.
2. Bundle required refresh cranks atomically in the same transaction as borrow, trade, or liquidate actions.
3. Keep IDL definitions synchronized in `src/idl/` to guarantee client-contract type safety.
