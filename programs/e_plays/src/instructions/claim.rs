use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};
use crate::state::MarketState;
use crate::errors::MarketError;

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub claimer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"market", market_state.title.as_bytes()],
        bump = market_state.bump
    )]
    pub market_state: Box<Account<'info, MarketState>>,

    #[account(
        mut,
        seeds = [b"vault", market_state.key().as_ref()],
        bump = market_state.vault_bump
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user_mint_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user_collateral: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
    let market_state = &ctx.accounts.market_state;

    // Safety checks
    require!(market_state.resolved, MarketError::MarketNotResolvedYet);

    let winning_outcome = market_state.outcome.unwrap(); // Assumed to be populated if resolved=true

    // Check if the provided mint matches the winning mint
    if winning_outcome {
        require!(ctx.accounts.mint.key() == market_state.yes_mint, MarketError::InvalidLosingMint);
    } else {
        require!(ctx.accounts.mint.key() == market_state.no_mint, MarketError::InvalidLosingMint);
    }

    // Determine how many tokens the user has available to claim
    let user_token_balance = ctx.accounts.user_mint_account.amount;
    require!(user_token_balance > 0, MarketError::NothingToClaim);

    // Pari-Mutuel weight execution math
    // Winning proportion = user_tokens / total_winning_tokens
    // payout = proportion * vault_balance
    let total_winning_shares = if winning_outcome {
        market_state.total_yes_shares
    } else {
        market_state.total_no_shares
    };

    let vault_balance = ctx.accounts.vault.amount;
    
    // Scale precision carefully to avoid u64 truncations
    // We multiply before div: (balance * vault_balance) / total_winning_shares
    // Using checked math and u128 to prevent overflow before division
    let payout = (user_token_balance as u128)
        .checked_mul(vault_balance as u128)
        .unwrap()
        .checked_div(total_winning_shares as u128)
        .unwrap() as u64;

    // 1. Burn user's winning tokens (to prevent double claiming)
    let cpi_burn_accounts = Burn {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.user_mint_account.to_account_info(),
        authority: ctx.accounts.claimer.to_account_info(),
    };
    let cpi_burn_program = ctx.accounts.token_program.to_account_info();
    token::burn(CpiContext::new(cpi_burn_program, cpi_burn_accounts), user_token_balance)?;

    // 2. Transfer proportional wSOL payout from Vault to User
    let title_bytes = market_state.title.as_bytes();
    let bump = market_state.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"market",
        title_bytes,
        &[bump],
    ]];

    let cpi_transfer_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.user_collateral.to_account_info(),
        authority: ctx.accounts.market_state.to_account_info(),
    };
    let cpi_transfer_program = ctx.accounts.token_program.to_account_info();
    token::transfer(
        CpiContext::new_with_signer(cpi_transfer_program, cpi_transfer_accounts, signer_seeds),
        payout,
    )?;

    Ok(())
}
