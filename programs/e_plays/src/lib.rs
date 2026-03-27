use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("77vsiKoC6gxYZwbds54Qgqah1du7oDFYPEW84ykAQ7Y4");

#[program]
pub mod e_plays {
    use super::*;

    pub fn init_market(ctx: Context<InitMarket>, title: String, expiry_ts: i64) -> Result<()> {
        handle_init_market(ctx, title, expiry_ts)
    }

    pub fn init_yes_mint(ctx: Context<InitYesMint>, title: String) -> Result<()> {
        handle_init_yes_mint(ctx, title)
    }

    pub fn init_no_mint(ctx: Context<InitNoMint>, title: String) -> Result<()> {
        handle_init_no_mint(ctx, title)
    }

    pub fn init_vault(ctx: Context<InitVault>, title: String) -> Result<()> {
        handle_init_vault(ctx, title)
    }

    pub fn buy_shares(ctx: Context<BuyShares>, amount_in: u64, is_yes: bool) -> Result<()> {
        handle_buy_shares(ctx, amount_in, is_yes)
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>, is_yes: bool) -> Result<()> {
        handle_resolve_market(ctx, is_yes)
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        handle_claim_winnings(ctx)
    }
}
