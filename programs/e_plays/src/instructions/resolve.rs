use anchor_lang::prelude::*;
use crate::state::MarketState;
use crate::errors::MarketError;

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market_state.title.as_bytes()],
        bump = market_state.bump,
        constraint = market_state.admin == admin.key() @ MarketError::UnauthorizedAdmin
    )]
    pub market_state: Box<Account<'info, MarketState>>,

    pub system_program: Program<'info, System>,
}

pub fn handle_resolve_market(ctx: Context<ResolveMarket>, is_yes: bool) -> Result<()> {
    let market_state = &mut ctx.accounts.market_state;

    // Safety checks
    require!(!market_state.resolved, MarketError::MarketResolved);
    require!(
        Clock::get()?.unix_timestamp >= market_state.expiry_ts,
        MarketError::MarketNotExpiredYet
    );

    // Resolve exactly as the Admin requested
    market_state.resolved = true;
    market_state.outcome = Some(is_yes);

    Ok(())
}
