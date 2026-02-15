use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked},
};

declare_id!("5k5WjHFfW8WUY3VXaJKKyuiFSwt4fowY78gnNJHeE1eV");

#[program]
pub mod launchpad {
    use super::*;

    pub fn initialize_curve(
        ctx: Context<InitializeCurve>,
        virtual_sol_reserves: u64,
        virtual_token_reserves: u64,
        real_token_reserves: u64,
    ) -> Result<()> {
        let curve = &mut ctx.accounts.curve;
        curve.creator = ctx.accounts.creator.key();
        curve.mint = ctx.accounts.mint.key();
        curve.virtual_sol_reserves = virtual_sol_reserves;
        curve.virtual_token_reserves = virtual_token_reserves;
        curve.real_token_reserves = real_token_reserves;
        curve.bump = ctx.bumps.curve;

        // Transfer tokens from creator to vault
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.creator_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer_checked(cpi_ctx, real_token_reserves, ctx.accounts.mint.decimals)?;

        Ok(())
    }

    pub fn buy_tokens(ctx: Context<BuyTokens>, amount: u64) -> Result<()> {
        let curve = &mut ctx.accounts.curve;
        
        // Calculate SOL cost (XY=K)
        // K = V_SOL * V_TOK
        // New_V_TOK = V_TOK - amount
        // New_V_SOL = K / New_V_TOK
        // Cost = New_V_SOL - V_SOL
        
        let k = (curve.virtual_sol_reserves as u128)
            .checked_mul(curve.virtual_token_reserves as u128)
            .ok_or(ErrorCode::MathOverflow)?;
            
        let new_virtual_token_reserves = (curve.virtual_token_reserves as u128)
            .checked_sub(amount as u128)
            .ok_or(ErrorCode::InsufficientStock)?;
            
        let new_virtual_sol_reserves = k
            .checked_div(new_virtual_token_reserves)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_add(1).ok_or(ErrorCode::MathOverflow)?; // Round up +1 for safety margin/slippage/dust
            
        let sol_cost = new_virtual_sol_reserves
            .checked_sub(curve.virtual_sol_reserves as u128)
            .ok_or(ErrorCode::MathOverflow)? as u64;

        // Update state
        curve.virtual_sol_reserves = new_virtual_sol_reserves as u64;
        curve.virtual_token_reserves = new_virtual_token_reserves as u64;
        curve.real_token_reserves = curve.real_token_reserves
            .checked_sub(amount)
            .ok_or(ErrorCode::InsufficientStock)?;

        // Transfer SOL from buyer to global wallet (creator)
        // using system program transfer
        let sol_transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &curve.creator,
            sol_cost,
        );
        anchor_lang::solana_program::program::invoke(
            &sol_transfer_ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.global_wallet.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Transfer Tokens from Vault to Buyer
        let seeds = &[
            b"bonding_curve",
            curve.mint.as_ref(),
            &[curve.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.vault.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: curve.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

        Ok(())
    }
}

#[account]
pub struct BondingCurve {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_token_reserves: u64,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct InitializeCurve<'info> {
    #[account(
        init, 
        payer = creator, 
        space = 8 + 32 + 32 + 8 + 8 + 8 + 1, 
        seeds = [b"bonding_curve", mint.key().as_ref()], 
        bump
    )]
    pub curve: Account<'info, BondingCurve>,
    #[account(mut)]
    pub creator: Signer<'info>, 
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = curve,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub creator_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut, seeds = [b"bonding_curve", mint.key().as_ref()], bump = curve.bump)]
    pub curve: Account<'info, BondingCurve>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut, 
        associated_token::mint = mint, 
        associated_token::authority = curve,
        associated_token::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        init_if_needed, 
        payer = buyer, 
        associated_token::mint = mint, 
        associated_token::authority = buyer,
        associated_token::token_program = token_program
    )]
    pub buyer_token_account: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: Validated as creator in instruction
    #[account(mut, address = curve.creator)]
    pub global_wallet: AccountInfo<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Math Overflow")]
    MathOverflow,
    #[msg("Insufficient Stock")]
    InsufficientStock,
}
