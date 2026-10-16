---
name: solana-trading-modules
description: >-
  Specialized skill for building, auditing, and deploying Solana Trading Modules:
  Constant-Product AMMs, Order Book Exchanges (limit orders, tick/lot math, resting bids/asks),
  Prop/RFQ AMMs, and Perpetual Futures venues on Solana Devnet/Mainnet.
  Derived from 'Building Financial Software on Solana' (Chapters 14, 15, 16, 20).
---

# Solana Trading Modules: Production & Devnet Architecture

This skill provides the exact specifications, account topologies, mathematical invariants,
and failure mode defenses for building onchain trading mechanisms on Solana using Anchor.

---

## 1. Constant-Product AMM ($x \cdot y = k$)

### 1.1 Account Topology & PDAs
- **Pool State PDA**: Seeds `[b"amm_pool", mint_a.key().as_ref(), mint_b.key().as_ref()]`
  - Stores: `mint_a`, `mint_b`, `vault_a`, `vault_b`, `lp_mint`, `fee_bps`, `admin_fee_bps`, `admin`, `bump`.
  - Also tracks **internal balances**: `reserve_a`, `reserve_b`, and `accumulated_admin_fee_a`, `accumulated_admin_fee_b`.
  - **CRITICAL**: Never calculate pricing off raw `vault.amount` because token donations will alter the price or trigger inflation exploits.
- **Token Vaults A & B**: Owned by the Pool State PDA.
- **LP Token Mint**: Mint authority is the Pool State PDA.

### 1.2 The Invariant: $k$ Must Not Decrease
- On every swap:
  $$\text{Effective } X \times \text{Effective } Y \ge K_{\text{prev}}$$
- The check MUST be evaluated onchain **after** token transfers, not merely assumed algebraically.
- Admin fees are separated and NEVER participate in LP reserve pricing.

### 1.3 Swap Math & Rounding Rules
- **Exact Input $\to$ Minimum Output**:
  $$\text{gross\_output} = \frac{\Delta x \times \text{reserve}_y}{\text{reserve}_x + \Delta x}$$
  $$\text{fee} = \left\lceil \frac{\Delta x \times \text{fee\_bps}}{10,000} \right\rceil$$
  $$\text{net\_input} = \Delta x - \text{fee}$$
  $$\text{actual\_output} = \left\lfloor \frac{\text{net\_input} \times \text{reserve}_y}{\text{reserve}_x + \text{net\_input}} \right\rfloor$$
- **Rounding Direction**:
  - Swap output floors (against the trader).
  - Trading fee ceilings (against the trader).
  - Admin fee ceilings (against LPs).
  - Dust remains in the pool for existing LPs.

### 1.4 Inflation Attack & Empty Pool Defense
- On `initialize_pool()`:
  - First deposit: compute $L_0 = \lfloor \sqrt{x_0 \times y_0} \rfloor$.
  - Permanently lock `MINIMUM_LIQUIDITY` (1,000 minor units) by minting them to a zero PDA address or withholding them from total supply.
  - Require both $x_0 \ge 1,000$ and $y_0 \ge 1,000$.
- Guard against zero reserves: refuse execution if `reserve_a == 0 || reserve_b == 0` (`EmptyPoolReserve`).

---

## 2. Order Book Exchange (CLOB)

### 2.1 Why Trees, Not Lists
- Unsorted lists require linear $O(N)$ searches inside transaction compute limits.
- On Solana, an Order Book is organized as an unrolled binary radix tree / red-black tree or price-tick bucket array (like Phoenix or OpenBook v2) with fixed-size account allocations.

### 2.2 Lots and Ticks Math
- Avoid storing raw minor units directly in order structs; store quantities in **Lots**:
  - `base_lot_size`: e.g., $10^{\text{base\_decimals} - \text{quote\_decimals}}$ (or 100 raw units).
  - `quote_lot_size`: minimum tick unit.
  - $\text{raw\_base} = \text{quantity\_lots} \times \text{base\_lot\_size}$
  - $\text{raw\_quote} = \text{price\_ticks} \times \text{quantity\_lots} \times \text{quote\_lot\_size}$
- **Intermediate Arithmetic**: Multiply 3 `u64` values (`price * qty * lot_size`) by promoting to `u128` before dividing, preventing overflow.

### 2.3 Order Lifecycle & Vault Invariants
- **Bid**: Buyer locks `limit_price * quantity * quote_lot_size` in quote vault.
- **Ask**: Seller locks `quantity * base_lot_size` in base vault.
- **Price Improvement**: If a crossing taker order executes at a better resting maker price, the difference MUST be refunded or credited to the taker's unsettled account.
- **Invariant**: The vaults MUST always hold $\ge$ sum of all resting orders' escrowed tokens plus all unsettled user balances.
- **Order States**: `Open` $\to$ `PartiallyFilled` $\to$ `Filled` or `Cancelled`.
- **Rent Reclamation**: Once an order is fully filled or cancelled, close the order account and return rent lamports to the maker.

---

## 3. Perpetual Futures (Perp DEX)

### 3.1 Architecture: Counterparty Pool & Virtual Positions
- Liquidity Providers supply collateral (USDC) into a unified Liquidity Pool.
- Traders post margin (collateral) and open Long or Short synthetic positions against the Pool.
- No physical token swaps take place; positions are accounted with synthetic sizes and mark prices.

### 3.2 Key Math & Accruals
1. **Mark Price & TWAP Oracle**:
   - The contract reads Pyth/Switchboard oracle price in current slot.
   - Calculates pool TWAP over a rolling window (e.g., 30 slots) to defend against flash loan price manipulation.
   - Rejects trade if spot price deviates outside allowed band from TWAP.
2. **Signed PnL ($i128$)**:
   $$\text{PnL}_{\text{long}} = (\text{mark\_price} - \text{entry\_price}) \times \text{position\_size}$$
   $$\text{PnL}_{\text{short}} = (\text{entry\_price} - \text{mark\_price}) \times \text{position\_size}$$
   - Floored against the trader: losses round up, gains round down.
3. **Funding Rate Accruals**:
   - $\text{Imbalance} = \text{OpenInterest}_{\text{long}} - \text{OpenInterest}_{\text{short}}$.
   - Heavier side pays funding to lighter side (or to the pool).
   - Tracked via cumulative funding index per side: zero per-user loops.
4. **Liquidation**:
   - Position is liquidatable when:
     $$\text{Equity} = \text{Collateral} \pm \text{PnL} - \text{AccruedFunding} \le \text{MaintenanceMargin}$$
   - Liquidator triggers `liquidate_position()`, earns a liquidation fee, and closes position into the pool.
5. **Solvency & Haircuts**:
   - Pool maintains an Insurance Fund.
   - If pool utilization / capacity reaches stress threshold, a haircut factor scales positive PnL payouts downwards so pool can never be drained.

---

## 4. Devnet Implementation Checklist

- [ ] **Anchor Setup**: Initialize `declare_id!`, configure seeds and explicit `space`.
- [ ] **Token-2022 / SPL Compatibility**: Use Anchor SPL CPI wrappers.
- [ ] **Mock Oracles**: Deploy mock Pyth feeds or admin-writable price accounts for Devnet testing.
- [ ] **Compute Budget**: Prepend `ComputeBudgetProgram::set_compute_unit_limit(400_000)` on multi-account order book matches or perp liquidations.
- [ ] **Crank Bundling**: Always bundle any needed refresh instructions in the same atomic transaction prior to trading.
