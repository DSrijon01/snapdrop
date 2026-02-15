use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, CloseAccount};

declare_id!("3obPCCswxLT51VpKhY8KgG83geqv4HFPe2oBAEZYDbYY");

#[program]
pub mod street_sync {
    use super::*;

    // 1. List NFT (Move to Escrow)
    pub fn list_nft(ctx: Context<ListNft>, price: u64) -> Result<()> {
        let listing = &mut ctx.accounts.listing_account;
        listing.seller = ctx.accounts.seller.key();
        listing.mint = ctx.accounts.mint.key();
        listing.price = price;
        listing.bump = ctx.bumps.listing_account;

        // Transfer NFT from Seller -> Escrow PDA
        let cpi_accounts = Transfer {
            from: ctx.accounts.seller_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(CpiContext::new(cpi_program, cpi_accounts), 1)?;

        Ok(())
    }

    // 2. Buy NFT (Pay Seller + Fee, Move NFT to Buyer)
    pub fn buy_nft(ctx: Context<BuyNft>) -> Result<()> {
        let listing = &ctx.accounts.listing_account;

        // A. Calculate Splits
        let price = listing.price;
        let fee = (price * 2) / 100; // 2% Fee
        let seller_receive = price - fee;

        // B. Transfer SOL (Buyer -> Seller)
        let transfer_sol_to_seller = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.seller.key(),
            seller_receive,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_sol_to_seller,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.seller.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // C. Transfer SOL (Buyer -> Treasury)
        let transfer_sol_to_treasury = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.treasury.key(),
            fee,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_sol_to_treasury,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // D. Transfer NFT (Escrow PDA -> Buyer)
        let seeds = &[
            b"listing",
            ctx.accounts.mint.to_account_info().key.as_ref(),
            ctx.accounts.seller.to_account_info().key.as_ref(),
            &[listing.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.listing_account.to_account_info(), // The Listing Account IS the PDA
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(CpiContext::new_with_signer(cpi_program, cpi_accounts, signer), 1)?;

        // E. Close Escrow Token Account (Optional, to reclaim rent, but we'll skip for simplicity/safety)
        // Usually we close it to get rent back. 
        let close_accounts = CloseAccount {
            account: ctx.accounts.escrow_token_account.to_account_info(),
            destination: ctx.accounts.seller.to_account_info(),
            authority: ctx.accounts.listing_account.to_account_info(),
        };
        token::close_account(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), close_accounts, signer))?;

        Ok(())
    }

    // 3. Cancel Listing (Return NFT)
    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        let listing = &ctx.accounts.listing_account;

        // A. Transfer NFT back to Seller
        let seeds = &[
            b"listing",
            ctx.accounts.mint.to_account_info().key.as_ref(),
            ctx.accounts.seller.to_account_info().key.as_ref(),
            &[listing.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.seller_token_account.to_account_info(),
            authority: ctx.accounts.listing_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(CpiContext::new_with_signer(cpi_program, cpi_accounts, signer), 1)?;

        // B. Close Escrow Token Account
        let close_accounts = CloseAccount {
            account: ctx.accounts.escrow_token_account.to_account_info(),
            destination: ctx.accounts.seller.to_account_info(),
            authority: ctx.accounts.listing_account.to_account_info(),
        };
        token::close_account(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), close_accounts, signer))?;

        Ok(())
    }
}

// Data Structures

#[account]
pub struct ListingAccount {
    pub seller: Pubkey,
    pub mint: Pubkey,
    pub price: u64,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct ListNft<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    
    pub mint: Account<'info, Mint>,

    #[account(mut, constraint = seller_token_account.mint == mint.key() && seller_token_account.owner == seller.key())]
    pub seller_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = seller,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [b"listing", mint.key().as_ref(), seller.key().as_ref()],
        bump
    )]
    pub listing_account: Account<'info, ListingAccount>,

    #[account(
        init,
        payer = seller,
        token::mint = mint,
        token::authority = listing_account, // PDA is the auth!
        seeds = [b"escrow", mint.key().as_ref(), seller.key().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyNft<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Receive funds
    #[account(mut)]
    pub seller: AccountInfo<'info>,

    /// CHECK: Treasury
    #[account(mut)]
    pub treasury: AccountInfo<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"listing", mint.key().as_ref(), seller.key().as_ref()],
        bump = listing_account.bump,
        close = seller
    )]
    pub listing_account: Account<'info, ListingAccount>,

    #[account(
        mut,
        seeds = [b"escrow", mint.key().as_ref(), seller.key().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"listing", mint.key().as_ref(), seller.key().as_ref()],
        bump = listing_account.bump,
        close = seller
    )]
    pub listing_account: Account<'info, ListingAccount>,

    #[account(
        mut,
        seeds = [b"escrow", mint.key().as_ref(), seller.key().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}
