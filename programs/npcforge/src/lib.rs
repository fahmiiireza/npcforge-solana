use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod npcforge {
    use super::*;

    /// Initialize the NPC marketplace
    pub fn initialize_marketplace(ctx: Context<InitializeMarketplace>) -> Result<()> {
        let marketplace = &mut ctx.accounts.marketplace;
        marketplace.authority = ctx.accounts.authority.key();
        marketplace.npc_count = 0;
        marketplace.fee_percent = 250; // 2.5% fee
        Ok(())
    }

    /// Register a new NPC
    pub fn register_npc(
        ctx: Context<RegisterNpc>,
        name: String,
        description: String,
        npc_type: NpcType,
        price_per_interaction: u64,
        monthly_price: u64,
        api_endpoint: String,
        capabilities: Vec<String>,
    ) -> Result<()> {
        require!(name.len() <= 50, NpcForgeError::NameTooLong);
        require!(description.len() <= 500, NpcForgeError::DescriptionTooLong);
        require!(api_endpoint.len() <= 200, NpcForgeError::EndpointTooLong);
        require!(price_per_interaction > 0 || monthly_price > 0, NpcForgeError::InvalidPrice);

        let npc = &mut ctx.accounts.npc;
        let marketplace = &mut ctx.accounts.marketplace;

        npc.creator = ctx.accounts.creator.key();
        npc.name = name;
        npc.description = description;
        npc.npc_type = npc_type;
        npc.price_per_interaction = price_per_interaction;
        npc.monthly_price = monthly_price;
        npc.api_endpoint = api_endpoint;
        npc.capabilities = capabilities;
        npc.is_active = true;
        npc.total_hires = 0;
        npc.rating_sum = 0;
        npc.rating_count = 0;
        npc.created_at = Clock::get()?.unix_timestamp;

        marketplace.npc_count += 1;

        emit!(NpcRegistered {
            npc_id: npc.key(),
            creator: npc.creator,
            name: npc.name.clone(),
        });

        Ok(())
    }

    /// Hire an NPC (create a hire record)
    pub fn hire_npc(
        ctx: Context<HireNpc>,
        hire_type: HireType,
        duration_months: Option<u8>,
    ) -> Result<()> {
        let npc = &ctx.accounts.npc;
        let hire = &mut ctx.accounts.hire;
        
        require!(npc.is_active, NpcForgeError::NpcNotActive);

        let amount = match hire_type {
            HireType::PerInteraction => npc.price_per_interaction,
            HireType::Monthly => {
                let months = duration_months.ok_or(NpcForgeError::InvalidDuration)?;
                require!(months > 0 && months <= 12, NpcForgeError::InvalidDuration);
                npc.monthly_price * months as u64
            }
        };

        require!(amount > 0, NpcForgeError::InvalidPrice);

        // Transfer payment to escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.developer_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.developer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        hire.developer = ctx.accounts.developer.key();
        hire.npc = npc.key();
        hire.creator = npc.creator;
        hire.hire_type = hire_type;
        hire.amount = amount;
        hire.escrow_token_account = ctx.accounts.escrow_token_account.key();
        hire.is_active = true;
        hire.created_at = Clock::get()?.unix_timestamp;
        hire.expires_at = match hire_type {
            HireType::PerInteraction => None,
            HireType::Monthly => {
                let months = duration_months.unwrap();
                Some(Clock::get()?.unix_timestamp + (months as i64 * 30 * 24 * 60 * 60))
            }
        };

        emit!(NpcHired {
            hire_id: hire.key(),
            npc_id: npc.key(),
            developer: hire.developer,
            amount,
        });

        Ok(())
    }

    /// Release payment to creator after service delivered
    pub fn release_payment(ctx: Context<ReleasePayment>) -> Result<()> {
        let hire = &mut ctx.accounts.hire;
        let marketplace = &ctx.accounts.marketplace;

        require!(hire.is_active, NpcForgeError::HireNotActive);

        // Calculate fee
        let fee = hire.amount * marketplace.fee_percent as u64 / 10000;
        let creator_amount = hire.amount - fee;

        // Transfer to creator
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let seeds = &[b"escrow", hire.key().as_ref(), &[ctx.bumps.escrow_authority]];
        let signer = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, creator_amount)?;

        // Transfer fee to marketplace authority
        if fee > 0 {
            let fee_accounts = Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.fee_token_account.to_account_info(),
                authority: ctx.accounts.escrow_authority.to_account_info(),
            };
            let fee_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                fee_accounts,
                signer,
            );
            token::transfer(fee_ctx, fee)?;
        }

        hire.is_active = false;

        let npc = &mut ctx.accounts.npc;
        npc.total_hires += 1;

        emit!(PaymentReleased {
            hire_id: hire.key(),
            creator: hire.creator,
            amount: creator_amount,
            fee,
        });

        Ok(())
    }

    /// Submit a review for an NPC
    pub fn submit_review(ctx: Context<SubmitReview>, rating: u8, comment: String) -> Result<()> {
        require!(rating >= 1 && rating <= 5, NpcForgeError::InvalidRating);
        require!(comment.len() <= 500, NpcForgeError::CommentTooLong);

        let hire = &ctx.accounts.hire;
        require!(!hire.is_active, NpcForgeError::HireStillActive);

        let review = &mut ctx.accounts.review;
        review.reviewer = ctx.accounts.reviewer.key();
        review.npc = hire.npc;
        review.hire = hire.key();
        review.rating = rating;
        review.comment = comment;
        review.created_at = Clock::get()?.unix_timestamp;

        // Update NPC rating
        let npc = &mut ctx.accounts.npc;
        npc.rating_sum += rating as u32;
        npc.rating_count += 1;

        emit!(ReviewSubmitted {
            review_id: review.key(),
            npc_id: npc.key(),
            reviewer: review.reviewer,
            rating,
        });

        Ok(())
    }

    /// Update NPC price or status (creator only)
    pub fn update_npc(
        ctx: Context<UpdateNpc>,
        price_per_interaction: Option<u64>,
        monthly_price: Option<u64>,
        is_active: Option<bool>,
    ) -> Result<()> {
        let npc = &mut ctx.accounts.npc;

        if let Some(price) = price_per_interaction {
            npc.price_per_interaction = price;
        }
        if let Some(price) = monthly_price {
            npc.monthly_price = price;
        }
        if let Some(active) = is_active {
            npc.is_active = active;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeMarketplace<'info> {
    #[account(init, payer = authority, space = 8 + Marketplace::SIZE)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String, description: String, npc_type: NpcType, price_per_interaction: u64, monthly_price: u64, api_endpoint: String, capabilities: Vec<String>)]
pub struct RegisterNpc<'info> {
    #[account(mut)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(
        init,
        payer = creator,
        space = 8 + Npc::SIZE,
        seeds = [b"npc", marketplace.key().as_ref(), &marketplace.npc_count.to_le_bytes()],
        bump
    )]
    pub npc: Account<'info, Npc>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(hire_type: HireType, duration_months: Option<u8>)]
pub struct HireNpc<'info> {
    #[account(mut)]
    pub npc: Account<'info, Npc>,
    #[account(
        init,
        payer = developer,
        space = 8 + Hire::SIZE,
        seeds = [b"hire", npc.key().as_ref(), developer.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub hire: Account<'info, Hire>,
    #[account(mut)]
    pub developer: Signer<'info>,
    #[account(
        init,
        payer = developer,
        token::mint = usdc_mint,
        token::authority = escrow_authority,
        seeds = [b"escrow_token", hire.key().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA used as escrow authority
    #[account(
        seeds = [b"escrow", hire.key().as_ref()],
        bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub developer_token_account: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, token::Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ReleasePayment<'info> {
    #[account(mut)]
    pub hire: Account<'info, Hire>,
    #[account(mut)]
    pub npc: Account<'info, Npc>,
    pub marketplace: Account<'info, Marketplace>,
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub fee_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA used as escrow authority
    #[account(
        seeds = [b"escrow", hire.key().as_ref()],
        bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(rating: u8, comment: String)]
pub struct SubmitReview<'info> {
    #[account(mut)]
    pub npc: Account<'info, Npc>,
    pub hire: Account<'info, Hire>,
    #[account(
        init,
        payer = reviewer,
        space = 8 + Review::SIZE,
        seeds = [b"review", hire.key().as_ref()],
        bump
    )]
    pub review: Account<'info, Review>,
    #[account(mut)]
    pub reviewer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateNpc<'info> {
    #[account(mut, has_one = creator)]
    pub npc: Account<'info, Npc>,
    pub creator: Signer<'info>,
}

#[account]
pub struct Marketplace {
    pub authority: Pubkey,
    pub npc_count: u64,
    pub fee_percent: u16, // basis points (250 = 2.5%)
}

impl Marketplace {
    pub const SIZE: usize = 32 + 8 + 2;
}

#[account]
pub struct Npc {
    pub creator: Pubkey,
    pub name: String,
    pub description: String,
    pub npc_type: NpcType,
    pub price_per_interaction: u64,
    pub monthly_price: u64,
    pub api_endpoint: String,
    pub capabilities: Vec<String>,
    pub is_active: bool,
    pub total_hires: u64,
    pub rating_sum: u32,
    pub rating_count: u32,
    pub created_at: i64,
}

impl Npc {
    pub const SIZE: usize = 32 + (4 + 50) + (4 + 500) + 1 + 8 + 8 + (4 + 200) + (4 + 10 * (4 + 50)) + 1 + 8 + 4 + 4 + 8;
}

#[account]
pub struct Hire {
    pub developer: Pubkey,
    pub npc: Pubkey,
    pub creator: Pubkey,
    pub hire_type: HireType,
    pub amount: u64,
    pub escrow_token_account: Pubkey,
    pub is_active: bool,
    pub created_at: i64,
    pub expires_at: Option<i64>,
}

impl Hire {
    pub const SIZE: usize = 32 + 32 + 32 + 1 + 8 + 32 + 1 + 8 + (1 + 8);
}

#[account]
pub struct Review {
    pub reviewer: Pubkey,
    pub npc: Pubkey,
    pub hire: Pubkey,
    pub rating: u8,
    pub comment: String,
    pub created_at: i64,
}

impl Review {
    pub const SIZE: usize = 32 + 32 + 32 + 1 + (4 + 500) + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum NpcType {
    QuestGiver,
    Shopkeeper,
    Enemy,
    Companion,
    StoryTeller,
    Custom,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum HireType {
    PerInteraction,
    Monthly,
}

#[event]
pub struct NpcRegistered {
    pub npc_id: Pubkey,
    pub creator: Pubkey,
    pub name: String,
}

#[event]
pub struct NpcHired {
    pub hire_id: Pubkey,
    pub npc_id: Pubkey,
    pub developer: Pubkey,
    pub amount: u64,
}

#[event]
pub struct PaymentReleased {
    pub hire_id: Pubkey,
    pub creator: Pubkey,
    pub amount: u64,
    pub fee: u64,
}

#[event]
pub struct ReviewSubmitted {
    pub review_id: Pubkey,
    pub npc_id: Pubkey,
    pub reviewer: Pubkey,
    pub rating: u8,
}

#[error_code]
pub enum NpcForgeError {
    #[msg("Name too long (max 50 characters)")]
    NameTooLong,
    #[msg("Description too long (max 500 characters)")]
    DescriptionTooLong,
    #[msg("API endpoint too long (max 200 characters)")]
    EndpointTooLong,
    #[msg("Invalid price - must be greater than 0")]
    InvalidPrice,
    #[msg("NPC is not active")]
    NpcNotActive,
    #[msg("Hire is not active")]
    HireNotActive,
    #[msg("Hire is still active")]
    HireStillActive,
    #[msg("Invalid rating - must be 1-5")]
    InvalidRating,
    #[msg("Comment too long (max 500 characters)")]
    CommentTooLong,
    #[msg("Invalid duration - must be 1-12 months")]
    InvalidDuration,
}
