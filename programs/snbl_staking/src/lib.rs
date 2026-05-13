use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Burn, Token, TokenAccount};
use anchor_lang::solana_program::system_instruction;

declare_id!("4Emh8zTvZz6mYTqa3c5UMQFgaMgFPx7fB4YaMNNKhoBw");

#[program]
pub mod snbl_staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let pool = &mut ctx.accounts.pool_state;
        pool.authority = ctx.accounts.authority.key();
        pool.ss_mint = ctx.accounts.ss_mint.key();
        pool.total_sol_staked = 0;
        pool.total_ss_minted = 0;
        pool.bump = ctx.bumps.pool_state;
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount_sol: u64) -> Result<()> {
        require!(amount_sol > 0, StakingError::ZeroAmount);

        let ss_to_mint = {
            let pool = &ctx.accounts.pool_state;
            if pool.total_ss_minted == 0 || pool.total_sol_staked == 0 {
                amount_sol // 1:1 ratio initially
            } else {
                (amount_sol as u128)
                    .checked_mul(pool.total_ss_minted as u128)
                    .unwrap()
                    .checked_div(pool.total_sol_staked as u128)
                    .unwrap() as u64
            }
        };

        // 1. Transfer SOL from user to pool
        let transfer_ix = system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.pool_state.key(),
            amount_sol,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.pool_state.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // 2. Mint ssSOL to user
        let bump = ctx.accounts.pool_state.bump;
        let seeds = &[b"liquid_pool".as_ref(), &[bump]];
        let signer = &[&seeds[..]];

        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.ss_mint.to_account_info(),
                to: ctx.accounts.user_ss_account.to_account_info(),
                authority: ctx.accounts.pool_state.to_account_info(),
            },
            signer,
        );
        token::mint_to(mint_ctx, ss_to_mint)?;

        // Update state
        let pool = &mut ctx.accounts.pool_state;
        pool.total_sol_staked = pool.total_sol_staked.checked_add(amount_sol).unwrap();
        pool.total_ss_minted = pool.total_ss_minted.checked_add(ss_to_mint).unwrap();

        Ok(())
    }

    pub fn unstake(ctx: Context<Unstake>, ss_amount: u64) -> Result<()> {
        require!(ss_amount > 0, StakingError::ZeroAmount);
        
        let sol_to_return = {
            let pool = &ctx.accounts.pool_state;
            require!(pool.total_ss_minted >= ss_amount, StakingError::InsufficientPoolLiquidity);

            (ss_amount as u128)
                .checked_mul(pool.total_sol_staked as u128)
                .unwrap()
                .checked_div(pool.total_ss_minted as u128)
                .unwrap() as u64
        };

        // 1. Burn ssSOL from user
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.ss_mint.to_account_info(),
                from: ctx.accounts.user_ss_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::burn(burn_ctx, ss_amount)?;

        // 2. Transfer SOL from pool back to user
        let pool_lamports = ctx.accounts.pool_state.to_account_info().lamports();
        **ctx.accounts.pool_state.to_account_info().try_borrow_mut_lamports()? = pool_lamports
            .checked_sub(sol_to_return)
            .unwrap();
            
        let user_lamports = ctx.accounts.user.to_account_info().lamports();
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? = user_lamports
            .checked_add(sol_to_return)
            .unwrap();

        // Update state
        let pool = &mut ctx.accounts.pool_state;
        pool.total_sol_staked = pool.total_sol_staked.checked_sub(sol_to_return).unwrap();
        pool.total_ss_minted = pool.total_ss_minted.checked_sub(ss_amount).unwrap();

        Ok(())
    }

    pub fn deposit_rewards(ctx: Context<DepositRewards>, reward_amount: u64) -> Result<()> {
        require!(reward_amount > 0, StakingError::ZeroAmount);

        let transfer_ix = system_instruction::transfer(
            &ctx.accounts.authority.key(),
            &ctx.accounts.pool_state.key(),
            reward_amount,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_ix,
            &[
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.pool_state.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let pool = &mut ctx.accounts.pool_state;
        pool.total_sol_staked = pool.total_sol_staked.checked_add(reward_amount).unwrap();

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<LiquidPool>(),
        seeds = [b"liquid_pool".as_ref()],
        bump
    )]
    pub pool_state: Account<'info, LiquidPool>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = pool_state,
    )]
    pub ss_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(
        mut,
        seeds = [b"liquid_pool".as_ref()],
        bump = pool_state.bump,
    )]
    pub pool_state: Account<'info, LiquidPool>,

    #[account(mut, address = pool_state.ss_mint)]
    pub ss_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_ss_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(
        mut,
        seeds = [b"liquid_pool".as_ref()],
        bump = pool_state.bump,
    )]
    pub pool_state: Account<'info, LiquidPool>,

    #[account(mut, address = pool_state.ss_mint)]
    pub ss_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_ss_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositRewards<'info> {
    #[account(
        mut,
        seeds = [b"liquid_pool".as_ref()],
        bump = pool_state.bump,
        has_one = authority,
    )]
    pub pool_state: Account<'info, LiquidPool>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct LiquidPool {
    pub authority: Pubkey,
    pub ss_mint: Pubkey,
    pub total_sol_staked: u64,
    pub total_ss_minted: u64,
    pub bump: u8,
}

#[error_code]
pub enum StakingError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Insufficient pool liquidity")]
    InsufficientPoolLiquidity,
}
