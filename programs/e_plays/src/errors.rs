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
}
