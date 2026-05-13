// File: lib.rs
use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("7fbvFUTK5vsZY6gAC4qqpUYVLDk5UQe5FRwDCGojingW");

#[program]
pub mod solana_staking {
    use super::*;

    // Initialize the staking pool
    pub fn initialize(ctx: Context<Initialize>, reward_rate: u64) -> Result<()> {
        let staking_pool = &mut ctx.accounts.staking_pool;
        let authority = &ctx.accounts.authority;

        staking_pool.authority = authority.key();
        staking_pool.reward_rate = reward_rate;
        staking_pool.last_update_time = Clock::get()?.unix_timestamp;
        staking_pool.reward_per_token_stored = 0;
        staking_pool.total_staked = 0;
        staking_pool.token_mint = ctx.accounts.token_mint.key();
        staking_pool.reward_mint = ctx.accounts.reward_mint.key();
        staking_pool.staking_vault = ctx.accounts.staking_vault.key();
        staking_pool.reward_vault = ctx.accounts.reward_vault.key();
        staking_pool.bump = ctx.bumps.staking_pool;

        // Initialize user stake account if not already
        if ctx.accounts.user_stake.staked_amount == 0 {
            let user_stake = &mut ctx.accounts.user_stake;
            user_stake.user = authority.key();
            user_stake.pool = staking_pool.key();
            user_stake.staked_amount = 0;
            user_stake.reward_per_token_paid = 0;
            user_stake.reward_pending = 0;
            user_stake.last_stake_time = Clock::get()?.unix_timestamp;
        }

        Ok(())
    }

    // Stake tokens
    // Stake tokens
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, StakingError::ZeroAmount);

        let user_stake = &mut ctx.accounts.user_stake;
        let clock = Clock::get()?;

        // Initialize user stake account if it's a new account
        if user_stake.staked_amount == 0 && user_stake.user == Pubkey::default() {
            user_stake.user = ctx.accounts.user.key();
            user_stake.pool = ctx.accounts.staking_pool.key();
            user_stake.staked_amount = 0;
            user_stake.reward_per_token_paid = 0;
            user_stake.reward_pending = 0;
            user_stake.last_stake_time = clock.unix_timestamp;
        }

        // Update rewards state
        update_rewards(
            &mut ctx.accounts.staking_pool,
            user_stake,
            clock.unix_timestamp,
        )?;

        // Transfer tokens from user to staking vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.staking_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;

        // Update staking state
        ctx.accounts.staking_pool.total_staked = ctx
            .accounts
            .staking_pool
            .total_staked
            .checked_add(amount)
            .ok_or(StakingError::MathOverflow)?;
        user_stake.staked_amount = user_stake
            .staked_amount
            .checked_add(amount)
            .ok_or(StakingError::MathOverflow)?;
        user_stake.last_stake_time = clock.unix_timestamp;

        Ok(())
    }

    pub fn withdraw_tokens(ctx: Context<WithdrawTokens>, amount: u64) -> Result<()> {
        require!(amount > 0, StakingError::ZeroAmount);

        // Check if the caller is the authority
        require!(
            ctx.accounts.authority.key() == ctx.accounts.staking_pool.authority,
            StakingError::Unauthorized
        );

        // Get token_mint and bump before borrowing staking_pool mutably
        let token_mint = ctx.accounts.staking_pool.token_mint;
        let bump = ctx.accounts.staking_pool.bump;

        // Transfer tokens from staking vault to admin
        let pool_seeds = &[b"staking_pool".as_ref(), token_mint.as_ref(), &[bump]];
        let pool_signer = &[&pool_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.staking_vault.to_account_info(),
            to: ctx.accounts.admin_token_account.to_account_info(),
            authority: ctx.accounts.staking_pool.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, pool_signer);

        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    // Unstake tokens
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        require!(amount > 0, StakingError::ZeroAmount);

        let user_stake = &mut ctx.accounts.user_stake;
        let clock = Clock::get()?;

        require!(
            amount <= user_stake.staked_amount,
            StakingError::InsufficientStakedAmount
        );

        // Get token_mint and bump before borrowing staking_pool mutably
        let token_mint = ctx.accounts.staking_pool.token_mint;
        let bump = ctx.accounts.staking_pool.bump;

        // Update rewards state
        update_rewards(
            &mut ctx.accounts.staking_pool,
            user_stake,
            clock.unix_timestamp,
        )?;

        // Transfer tokens from staking vault to user
        let pool_seeds = &[b"staking_pool".as_ref(), token_mint.as_ref(), &[bump]];
        let pool_signer = &[&pool_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.staking_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.staking_pool.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, pool_signer);

        token::transfer(cpi_ctx, amount)?;

        // Update staking state
        ctx.accounts.staking_pool.total_staked = ctx
            .accounts
            .staking_pool
            .total_staked
            .checked_sub(amount)
            .ok_or(StakingError::MathOverflow)?;
        user_stake.staked_amount = user_stake
            .staked_amount
            .checked_sub(amount)
            .ok_or(StakingError::MathOverflow)?;

        Ok(())
    }

    // Claim rewards
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let user_stake = &mut ctx.accounts.user_stake;
        let clock = Clock::get()?;

        // Get token_mint and bump before borrowing staking_pool mutably
        let token_mint = ctx.accounts.staking_pool.token_mint;
        let bump = ctx.accounts.staking_pool.bump;

        // Update rewards
        update_rewards(
            &mut ctx.accounts.staking_pool,
            user_stake,
            clock.unix_timestamp,
        )?;

        let reward_amount = user_stake.reward_pending;
        require!(reward_amount > 0, StakingError::NoRewardsToClaim);

        // Reset pending rewards
        user_stake.reward_pending = 0;

        // Transfer rewards from reward vault to user
        let pool_seeds = &[b"staking_pool".as_ref(), token_mint.as_ref(), &[bump]];
        let pool_signer = &[&pool_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.reward_vault.to_account_info(),
            to: ctx.accounts.user_reward_account.to_account_info(),
            authority: ctx.accounts.staking_pool.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, pool_signer);

        token::transfer(cpi_ctx, reward_amount)?;

        Ok(())
    }

    // Add rewards to the pool (only authority can call this)
    pub fn add_rewards(ctx: Context<AddRewards>, amount: u64) -> Result<()> {
        require!(amount > 0, StakingError::ZeroAmount);

        // Transfer rewards from funder to reward vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.funder_reward_account.to_account_info(),
            to: ctx.accounts.reward_vault.to_account_info(),
            authority: ctx.accounts.funder.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    // Update reward rate (only authority can call this)
    pub fn update_reward_rate(ctx: Context<UpdateRewardRate>, new_rate: u64) -> Result<()> {
        let staking_pool = &mut ctx.accounts.staking_pool;
        let clock = Clock::get()?;

        // Update reward per token
        if staking_pool.total_staked > 0 {
            let time_elapsed = clock
                .unix_timestamp
                .checked_sub(staking_pool.last_update_time)
                .ok_or(StakingError::MathOverflow)?;

            if time_elapsed > 0 {
                let reward = (staking_pool.reward_rate as u128)
                    .checked_mul(time_elapsed as u128)
                    .ok_or(StakingError::MathOverflow)?;

                let reward_per_token_delta = reward
                    .checked_mul(1_000_000_000_u128) // Precision factor
                    .ok_or(StakingError::MathOverflow)?
                    .checked_div(staking_pool.total_staked as u128)
                    .ok_or(StakingError::MathOverflow)?;

                staking_pool.reward_per_token_stored = staking_pool
                    .reward_per_token_stored
                    .checked_add(reward_per_token_delta)
                    .ok_or(StakingError::MathOverflow)?;
            }
        }

        staking_pool.reward_rate = new_rate;
        staking_pool.last_update_time = clock.unix_timestamp;

        Ok(())
    }
}

// Helper function to update rewards
fn update_rewards<'info>(
    staking_pool: &mut Account<'info, StakingPool>,
    user_stake: &mut Account<'info, UserStake>,
    current_time: i64,
) -> Result<()> {
    // Update reward per token
    if staking_pool.total_staked > 0 {
        let time_elapsed = current_time
            .checked_sub(staking_pool.last_update_time)
            .ok_or(StakingError::MathOverflow)?;

        if time_elapsed > 0 {
            let reward = (staking_pool.reward_rate as u128)
                .checked_mul(time_elapsed as u128)
                .ok_or(StakingError::MathOverflow)?;

            let reward_per_token_delta = reward
                .checked_mul(1_000_000_000_u128) // Precision factor
                .ok_or(StakingError::MathOverflow)?
                .checked_div(staking_pool.total_staked as u128)
                .ok_or(StakingError::MathOverflow)?;

            staking_pool.reward_per_token_stored = staking_pool
                .reward_per_token_stored
                .checked_add(reward_per_token_delta)
                .ok_or(StakingError::MathOverflow)?;
        }
    }

    // Calculate user's earned rewards
    if user_stake.staked_amount > 0 {
        let reward_per_token_delta = staking_pool
            .reward_per_token_stored
            .checked_sub(user_stake.reward_per_token_paid)
            .ok_or(StakingError::MathOverflow)?;

        let earned = (user_stake.staked_amount as u128)
            .checked_mul(reward_per_token_delta)
            .ok_or(StakingError::MathOverflow)?
            .checked_div(1_000_000_000_u128) // Precision factor
            .ok_or(StakingError::MathOverflow)?;

        user_stake.reward_pending = user_stake
            .reward_pending
            .checked_add(earned as u64)
            .ok_or(StakingError::MathOverflow)?;
    }

    // Update user's reward per token paid
    user_stake.reward_per_token_paid = staking_pool.reward_per_token_stored;
    staking_pool.last_update_time = current_time;

    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<StakingPool>(),
        seeds = [b"staking_pool".as_ref(), token_mint.key().as_ref()],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + std::mem::size_of::<UserStake>(),
        seeds = [b"user_stake".as_ref(), authority.key().as_ref()],
        bump
    )]
    pub user_stake: Account<'info, UserStake>,

    pub token_mint: Account<'info, Mint>,
    pub reward_mint: Account<'info, Mint>,

    #[account(
        constraint = staking_vault.mint == token_mint.key(),
        constraint = staking_vault.owner == staking_pool.key(),
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    #[account(
        constraint = reward_vault.mint == reward_mint.key(),
        constraint = reward_vault.owner == staking_pool.key(),
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool".as_ref(), staking_pool.token_mint.as_ref()],
        bump = staking_pool.bump,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        init_if_needed,  // Add this to create the account if it doesn't exist
        payer = user,    // User pays for their own account creation
        space = 8 + std::mem::size_of::<UserStake>(),  // Specify size
        seeds = [b"user_stake".as_ref(), user.key().as_ref()],
        bump,
    )]
    pub user_stake: Account<'info, UserStake>,

    #[account(
        mut,
        constraint = staking_vault.mint == staking_pool.token_mint,
        constraint = staking_vault.owner == staking_pool.key(),
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_token_account.mint == staking_pool.token_mint,
        constraint = user_token_account.owner == user.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>, // Add this for account creation
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool".as_ref(), staking_pool.token_mint.as_ref()],
        bump = staking_pool.bump,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [b"user_stake".as_ref(), user.key().as_ref()],
        bump,
        constraint = user_stake.user == user.key(),
        constraint = user_stake.pool == staking_pool.key(),
    )]
    pub user_stake: Account<'info, UserStake>,

    #[account(
        mut,
        constraint = staking_vault.mint == staking_pool.token_mint,
        constraint = staking_vault.owner == staking_pool.key(),
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_token_account.mint == staking_pool.token_mint,
        constraint = user_token_account.owner == user.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool".as_ref(), staking_pool.token_mint.as_ref()],
        bump = staking_pool.bump,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [b"user_stake".as_ref(), user.key().as_ref()],
        bump,
        constraint = user_stake.user == user.key(),
        constraint = user_stake.pool == staking_pool.key(),
    )]
    pub user_stake: Account<'info, UserStake>,

    #[account(
        mut,
        constraint = reward_vault.mint == staking_pool.reward_mint,
        constraint = reward_vault.owner == staking_pool.key(),
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_reward_account.mint == staking_pool.reward_mint,
        constraint = user_reward_account.owner == user.key(),
    )]
    pub user_reward_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AddRewards<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool".as_ref(), staking_pool.token_mint.as_ref()],
        bump = staking_pool.bump,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        mut,
        constraint = reward_vault.mint == staking_pool.reward_mint,
        constraint = reward_vault.owner == staking_pool.key(),
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = funder_reward_account.mint == staking_pool.reward_mint,
    )]
    pub funder_reward_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub funder: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateRewardRate<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool".as_ref(), staking_pool.token_mint.as_ref()],
        bump = staking_pool.bump,
        constraint = staking_pool.authority == authority.key(),
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account]
pub struct StakingPool {
    pub authority: Pubkey,             // 32 bytes
    pub token_mint: Pubkey,            // 32 bytes
    pub reward_mint: Pubkey,           // 32 bytes
    pub staking_vault: Pubkey,         // 32 bytes
    pub reward_vault: Pubkey,          // 32 bytes
    pub reward_rate: u64,              // 8 bytes
    pub last_update_time: i64,         // 8 bytes
    pub reward_per_token_stored: u128, // 16 bytes
    pub total_staked: u64,             // 8 bytes
    pub bump: u8,                      // 1 byte
                                       // Total: 169 bytes + 8 bytes for discriminator = 177 bytes
}

#[account]
pub struct UserStake {
    pub user: Pubkey,                // 32 bytes
    pub pool: Pubkey,                // 32 bytes
    pub staked_amount: u64,          // 8 bytes
    pub reward_per_token_paid: u128, // 16 bytes
    pub reward_pending: u64,         // 8 bytes
    pub last_stake_time: i64,        // 8 bytes
                                     // Total: 104 bytes + 8 bytes for discriminator = 112 bytes
}

// Add this to your account structs
#[derive(Accounts)]
pub struct WithdrawTokens<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool".as_ref(), staking_pool.token_mint.as_ref()],
        bump = staking_pool.bump,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        mut,
        constraint = staking_vault.mint == staking_pool.token_mint,
        constraint = staking_vault.owner == staking_pool.key(),
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = admin_token_account.mint == staking_pool.token_mint,
        constraint = admin_token_account.owner == authority.key(),
    )]
    pub admin_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = authority.key() == staking_pool.authority,
    )]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum StakingError {
    #[msg("Math operation overflow")]
    MathOverflow,
    #[msg("Zero amount not allowed")]
    ZeroAmount,
    #[msg("Insufficient staked amount")]
    InsufficientStakedAmount,
    #[msg("No rewards to claim")]
    NoRewardsToClaim,
    #[msg("Unauthorized access")]
    Unauthorized,
}
