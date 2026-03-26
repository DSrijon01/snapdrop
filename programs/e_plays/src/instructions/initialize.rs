use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::MarketState;
use crate::errors::MarketError;

#[derive(Accounts)]
#[instruction(title: String, expiry_ts: i64)]
pub struct InitMarket<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = MarketState::space(&title),
        seeds = [b"market", title.as_bytes()],
        bump
    )]
    pub market_state: Box<Account<'info, MarketState>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct InitYesMint<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut, seeds = [b"market", title.as_bytes()], bump = market_state.bump)]
    pub market_state: Box<Account<'info, MarketState>>,

    #[account(
        init,
        payer = admin,
        mint::decimals = 9,
        mint::authority = market_state,
        seeds = [b"yes_mint", market_state.key().as_ref()],
        bump
    )]
    pub yes_mint: Box<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct InitNoMint<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut, seeds = [b"market", title.as_bytes()], bump = market_state.bump)]
    pub market_state: Box<Account<'info, MarketState>>,

    #[account(
        init,
        payer = admin,
        mint::decimals = 9,
        mint::authority = market_state,
        seeds = [b"no_mint", market_state.key().as_ref()],
        bump
    )]
    pub no_mint: Box<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct InitVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut, seeds = [b"market", title.as_bytes()], bump = market_state.bump)]
    pub market_state: Box<Account<'info, MarketState>>,

    pub collateral_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = admin,
        token::mint = collateral_mint,
        token::authority = market_state,
        seeds = [b"vault", market_state.key().as_ref()],
        bump
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}


// --- HANDLERS ---

pub fn handle_init_market(ctx: Context<InitMarket>, title: String, expiry_ts: i64) -> Result<()> {
    require!(title.len() <= 100, MarketError::TitleTooLong);
    require!(expiry_ts > Clock::get()?.unix_timestamp, MarketError::InvalidExpiry);

    let market_state = &mut ctx.accounts.market_state;
    market_state.admin = ctx.accounts.admin.key();
    market_state.title = title;
    
    // Will be populated in subsequent ops
    market_state.yes_mint = Pubkey::default();
    market_state.no_mint = Pubkey::default();
    market_state.vault = Pubkey::default();
    
    market_state.total_yes_shares = 0;
    market_state.total_no_shares = 0;
    
    market_state.expiry_ts = expiry_ts;
    market_state.resolved = false;
    market_state.outcome = None;
    
    market_state.bump = ctx.bumps.market_state;

    Ok(())
}

pub fn handle_init_yes_mint(ctx: Context<InitYesMint>, _title: String) -> Result<()> {
    let market_state = &mut ctx.accounts.market_state;
    market_state.yes_mint = ctx.accounts.yes_mint.key();
    Ok(())
}

pub fn handle_init_no_mint(ctx: Context<InitNoMint>, _title: String) -> Result<()> {
    let market_state = &mut ctx.accounts.market_state;
    market_state.no_mint = ctx.accounts.no_mint.key();
    Ok(())
}

pub fn handle_init_vault(ctx: Context<InitVault>, _title: String) -> Result<()> {
    let market_state = &mut ctx.accounts.market_state;
    market_state.vault = ctx.accounts.vault.key();
    market_state.vault_bump = ctx.bumps.vault;
    Ok(())
}
