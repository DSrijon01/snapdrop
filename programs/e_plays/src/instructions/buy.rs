use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};
use crate::state::MarketState;
use crate::errors::MarketError;

#[derive(Accounts)]
pub struct BuyShares<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

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
    pub buyer_collateral: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user_mint_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_buy_shares(ctx: Context<BuyShares>, amount_in: u64, is_yes: bool) -> Result<()> {
    let market_state = &mut ctx.accounts.market_state;

    // Safety checks
    require!(!market_state.resolved, MarketError::MarketResolved);
    require!(
        Clock::get()?.unix_timestamp < market_state.expiry_ts,
        MarketError::MarketExpired
    );

    // Validate the supplied mint matches their choice
    if is_yes {
        require!(ctx.accounts.mint.key() == market_state.yes_mint, MarketError::InvalidMint);
    } else {
        require!(ctx.accounts.mint.key() == market_state.no_mint, MarketError::InvalidMint);
    }

    // 1. Transfer Collateral from Buyer to Vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.buyer_collateral.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.buyer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount_in)?;

    // 2. Mint Shares 1:1 to resolving user's mint account
    let title_bytes = market_state.title.as_bytes();
    let bump = market_state.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"market",
        title_bytes,
        &[bump],
    ]];

    let cpi_mint_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.user_mint_account.to_account_info(),
        authority: market_state.to_account_info(),
    };
    let cpi_mint_program = ctx.accounts.token_program.to_account_info();
    token::mint_to(
        CpiContext::new_with_signer(cpi_mint_program, cpi_mint_accounts, signer_seeds),
        amount_in, // 1:1 Pari-Mutuel weight deposit
    )?;

    // 3. Update Market State Global tracking
    if is_yes {
        market_state.total_yes_shares = market_state.total_yes_shares.checked_add(amount_in).unwrap();
    } else {
        market_state.total_no_shares = market_state.total_no_shares.checked_add(amount_in).unwrap();
    }

    Ok(())
}
