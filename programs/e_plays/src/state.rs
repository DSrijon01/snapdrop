use anchor_lang::prelude::*;

#[account]
pub struct MarketState {
    pub admin: Pubkey,
    pub title: String,
    pub yes_mint: Pubkey,
    pub no_mint: Pubkey,
    pub vault: Pubkey,
    pub total_yes_shares: u64,
    pub total_no_shares: u64,
    pub expiry_ts: i64,
    pub resolved: bool,
    pub outcome: Option<bool>,
    pub bump: u8,
    pub vault_bump: u8,
}

impl MarketState {
    pub fn space(title: &str) -> usize {
        8 +  // discriminator
        32 + // admin
        4 + title.len() + // title (4 bytes length + string bytes)
        32 + // yes_mint
        32 + // no_mint
        32 + // vault
        8 +  // total_yes_shares
        8 +  // total_no_shares
        8 +  // expiry_ts
        1 +  // resolved
        2 +  // outcome (1 byte for Option (Some/None) + 1 byte for bool)
        1 +  // bump
        1    // vault_bump
    }
}
