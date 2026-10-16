---
name: solana-borrowing-lending
description: >-
  Specialized skill for building, deploying, and testing Solana Borrowing and Lending Protocols
  (Money Markets like Kamino, Save, Solend). Covers isolated reserve topology, share-collateral vaults,
  the cumulative borrow accumulation factor (10^18 wad), kinked interest rate curves, oracle freshness
  & confidence checks, liquidation engines (close factors & bonuses), and permissionless cranks.
  Derived from 'Building Financial Software on Solana' (Chapter 17).
---

# Solana Borrowing and Lending Architecture

This skill defines the complete blueprint for developing production-grade, devnet-ready
Lending and Borrowing protocols on Solana based on Chapter 17 of *Building Financial Software on Solana*.

---

## 1. Protocol Architecture & Account Topology

A complete lending protocol consists of three primary account hierarchies:
1. **Lending Market**: Root config entity establishing a risk-isolated venue.
2. **Reserves**: One per asset (e.g., SOL, USDC, BONK).
   - Holds the liquidity vault.
   - Mints reserve share tokens (cTokens / deposit receipts).
   - Tracks borrow accumulation factor and interest curve.
3. **Obligations**: Per-user debt and collateral portfolio account.

### 1.1 Account PDAs & Derivations
- **Lending Market PDA**: `[b"lending_market", market_id.as_ref()]`
- **Reserve PDA**: `[b"reserve", market.key().as_ref(), mint.key().as_ref()]`
  - Liquidity Vault Token Account: owned by Reserve PDA.
  - Share Mint: mint authority is Reserve PDA.
- **Obligation PDA**: `[b"obligation", market.key().as_ref(), user.key().as_ref()]`
- **Obligation Collateral Vault**: `[b"obligation_collateral", obligation.key().as_ref(), reserve.key().as_ref()]`
  - **Key Design Insight**: Users pledge **reserve share tokens**, NOT raw underlying tokens. Pledged collateral continues to earn lending APY while locked as collateral!

---

## 2. The Arithmetic of Interest: The Borrow Accumulation Factor

Interest accrues continuously without ever iterating over individual borrower loans.

### 2.1 The Wad Scale ($10^{18}$)
- The program maintains one `borrow_accumulation_factor` per reserve.
- Initialized at $1.0 = 10^{18}$.
- At this scale, 1 second of accrued interest on high APYs never truncates to zero, and $u128$ avoids overflow.

### 2.2 Updating the Factor on `refresh_reserve()`
$$\Delta t = \text{Clock::get()?.unix\_timestamp} - \text{reserve.last\_accrual\_timestamp}$$
$$\text{utilization} = \frac{\text{borrowed\_principal\_total} \times \text{factor}}{\text{available\_liquidity} + (\text{borrowed\_principal\_total} \times \text{factor})}$$
$$\text{rate\_per\_second} = \frac{\text{calculate\_kinked\_apr}(\text{utilization})}{\text{SECONDS\_PER\_YEAR}}$$
$$\text{new\_factor} = \text{old\_factor} \times \left(1 + \frac{\text{rate\_per\_second} \times \Delta t}{10^{18}}\right)$$

### 2.3 Rounding Rule for Debt
- **Utilization, interest rate, and new factor MUST always round UP**.
- When borrowing an amount $D$:
  $$\text{obligation.borrowed\_principal} \mathrel{+}= \left\lceil \frac{D \times 10^{18}}{\text{new\_factor}} \right\rceil$$
- Current live debt is always evaluated dynamically:
  $$\text{live\_debt} = \left\lceil \frac{\text{obligation.borrowed\_principal} \times \text{current\_factor}}{10^{18}} \right\rceil$$
- Debt always rounds against the borrower: the protocol never loses a minor unit.

### 2.4 Kinked Interest Rate Curve
- **Below Kink (e.g. 80% Utilization)**:
  $$\text{APR} = \text{base\_rate} + \text{utilization} \times \frac{\text{kink\_rate} - \text{base\_rate}}{\text{kink\_utilization}}$$
- **Above Kink (80% to 100%)**:
  $$\text{APR} = \text{kink\_rate} + \frac{\text{utilization} - \text{kink}}{\text{1.0} - \text{kink}} \times (\text{max\_rate} - \text{kink\_rate})$$
- Sharp escalation above 80% heavily incentivizes repayments and attracts new suppliers.

---

## 3. Oracles, Freshness, and Validation

Price errors cause instantaneous multi-million dollar insolvency or catastrophic liquidations.
Every reserve refresh enforces strict validation:

1. **Slot Freshness**:
   - The price feed must be updated in the **current slot** or within a maximum freshness window (e.g. $\le 2$ slots).
   - If stale $\to$ fail with `ReserveStale` or `OraclePriceStale`.
2. **Confidence Band Verification**:
   - Pyth and Switchboard output a confidence interval ($\sigma$).
   - The contract verifies:
     $$\text{confidence} \times 10,000 \le \text{price} \times \text{max\_confidence\_bps}$$
   - Multiplied in $u128$ to avoid truncation. If confidence interval is wider than allowed (e.g., 100 bps / 1%) $\to$ reject with `OracleConfidenceTooWide`.
3. **Cross-Market Smuggling Defense**:
   - When depositing collateral or borrowing, verify that the reserve belongs to the exact `market` key stored on the obligation:
     `require_keys_eq!(reserve.market, obligation.market, LendingError::MarketMismatch);`

---

## 4. Liquidation Engine

### 4.1 Health Factor & Liquidation Threshold
- **Total Collateral Value**:
  $$\text{CollateralValue} = \sum (\text{collateral\_shares}_i \times \text{share\_price}_i \times \text{oracle\_price}_i)$$
- **Allowed Borrow Value (LTV)**:
  $$\text{BorrowLimit} = \sum (\text{CollateralValue}_i \times \text{LTV}_i)$$
- **Liquidation Threshold**:
  $$\text{ThresholdValue} = \sum (\text{CollateralValue}_i \times \text{LiquidationThreshold}_i)$$
- **Rule**: $\text{LTV} < \text{LiquidationThreshold}$ always, ensuring a safety buffer.
- When $\text{TotalDebtValue} > \text{ThresholdValue}$, the position is **unhealthy** and liquidatable.

### 4.2 Liquidation Mechanics
1. **Healthy Positions Cannot Be Liquidated**:
   - Reject with `ObligationHealthy` if within threshold.
2. **Close Factor (50%)**:
   - Liquidator can repay at most 50% of the active debt in a single transaction.
3. **Liquidation Bonus (e.g., 5%)**:
   - Liquidator repays debt token, seizes collateral shares valued at:
     $$\text{SeizedValue} = \text{RepaidValue} \times (1 + \text{bonus\_bps} / 10,000)$$
4. **Cap Protection**:
   - If seized collateral would exceed the obligation's entire collateral balance $\to$ fail with `LiquidationTooLarge` (never silently under-compensate the liquidator).

---

## 5. Permissionless Cranks

1. **`refresh_reserve(reserve)`**: Updates interest rates and cached valuations.
2. **`refresh_obligation(obligation)`**: Updates debt and collateral values based on refreshed reserves.
3. **Properties**:
   - **Permissionless**: Any wallet can call them.
   - **Idempotent**: Calling multiple times in the same slot is a clean no-op.
   - **Client Transactions**: Always prepend `refresh_reserve` and `refresh_obligation` in the same bundle as `borrow`, `withdraw`, or `liquidate`.

---

## 6. Devnet Implementation & Testing Matrix

- [ ] **Config Guards**: Reject LTV $\ge$ Liquidation Threshold at initialization.
- [ ] **Rate Ceiling**: Reject interest curves with $> 300\%$ APR.
- [ ] **Donation Immunity**: Direct token donation to reserve vault does not change share exchange rate.
- [ ] **Stale Rejection**: Attempting borrow without same-slot refresh fails with `ObligationStale`.
- [ ] **Wide Confidence Rejection**: Injected volatile price with wide confidence fails with `OracleConfidenceTooWide`.
- [ ] **Healthy Liquidation Rejection**: Calling liquidate on healthy obligation fails with `ObligationHealthy`.
