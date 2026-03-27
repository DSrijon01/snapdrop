use anchor_lang::prelude::*;

#[error_code]
pub enum MarketError {
    #[msg("Market expiration time must be in the future.")]
    InvalidExpiry,
    #[msg("Market title is too long (max 100 characters).")]
    TitleTooLong,
    #[msg("Trading in this market has already expired.")]
    MarketExpired,
    #[msg("This market has already been resolved.")]
    MarketResolved,
    #[msg("Invalid YES or NO mint provided.")]
    InvalidMint,
    #[msg("Unauthorized: Only the admin can resolve this market.")]
    UnauthorizedAdmin,
    #[msg("Market hasn't expired yet.")]
    MarketNotExpiredYet,
    #[msg("Market hasn't been resolved yet.")]
    MarketNotResolvedYet,
    #[msg("Invalid Mint: This token did not win the market!")]
    InvalidLosingMint,
    #[msg("No tokens available to claim.")]
    NothingToClaim,
}
