#![no_std]

//! # Aethera Yield Distributor Contract
//! 
//! Handles automated yield distribution to token holders based on verified
//! production data from the oracle.
//! 
//! Flow:
//! 1. Oracle submits verified production data
//! 2. Admin creates distribution for a period
//! 3. Contract snapshots holder balances
//! 4. Calculates pro-rata yield per holder
//! 5. Holders claim their yield

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, IntoVal, String, Symbol,
};

// ============================================
// Data Structures
// ============================================

#[contracttype]
#[derive(Clone)]
pub struct DistributionConfig {
    pub admin: Address,
    pub treasury: Address,          // Treasury contract address
    pub usdc_token: Address,        // USDC token address
    pub platform_fee_bps: u32,      // Platform fee in basis points
}

#[contracttype]
#[derive(Clone)]
pub struct Distribution {
    pub id: u64,
    pub project_id: String,
    pub asset_token: Address,       // Asset token contract for this project
    pub period_start: u64,          // Unix timestamp
    pub period_end: u64,            // Unix timestamp
    pub total_energy_kwh: i128,     // Total energy produced (scaled by 1e4)
    pub revenue_per_kwh: i128,      // Revenue per kWh (scaled by 1e7 for USDC)
    pub total_revenue: i128,        // Total revenue generated
    pub platform_fee: i128,         // Platform fee amount
    pub total_yield: i128,          // Amount to distribute
    pub total_supply_snapshot: i128, // Token supply at snapshot time
    pub status: DistributionStatus,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum DistributionStatus { 
    Created,        // Distribution created, accepting claims
    Completed,      // All claims processed
    Cancelled,      // Distribution cancelled
}

#[contracttype]
#[derive(Clone)]
pub struct Claim {
    pub distribution_id: u64,
    pub holder: Address,
    pub token_balance: i128,        // Tokens held at snapshot
    pub yield_amount: i128,         // Yield to receive
    pub claimed: bool,
    pub claimed_at: u64,
}

#[contracttype]
pub enum DataKey {
    Config,
    Paused,
    DistributionCount,
    Distribution(u64),
    Claim((u64, Address)),          // (distribution_id, holder)
    HolderClaimed((u64, Address)),  // Quick lookup for claim status
}

// ============================================
// Yield Distributor Contract
// ============================================

#[contract]
pub struct YieldDistributorContract;

#[contractimpl]
impl YieldDistributorContract {
    /// Initialize the yield distributor contract
    pub fn initialize(
        env: Env,
        admin: Address,
        treasury: Address,
        usdc_token: Address,
        platform_fee_bps: u32,
    ) {
        if env.storage().instance().has(&DataKey::Config) {
            panic!("Already initialized");
        }

        if platform_fee_bps > 1000 {
            panic!("Platform fee too high (max 10%)");
        }

        let config = DistributionConfig {
            admin,
            treasury,
            usdc_token,
            platform_fee_bps,
        };

        env.storage().instance().set(&DataKey::Config, &config);
        env.storage().instance().set(&DataKey::DistributionCount, &0u64);
        env.storage().instance().set(&DataKey::Paused, &false);
    }

    /// Create a new yield distribution for a project
    /// 
    /// This should be called after oracle data is verified for a period.
    /// The contract will query the asset token to get holder balances.
    pub fn create_distribution(
        env: Env,
        project_id: String,
        asset_token: Address,
        period_start: u64,
        period_end: u64,
        total_energy_kwh: i128,
        revenue_per_kwh: i128,
    ) -> u64 {
        Self::require_not_paused(&env);

        let config: DistributionConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Not initialized");

        config.admin.require_auth();

        if total_energy_kwh <= 0 || revenue_per_kwh <= 0 {
            panic!("Invalid production data");
        }

        if period_end <= period_start {
            panic!("Invalid period");
        }

        // Calculate revenue and fees
        let total_revenue = (total_energy_kwh * revenue_per_kwh) / 10000; // Adjust for scaling
        let platform_fee = (total_revenue * config.platform_fee_bps as i128) / 10000;
        let total_yield = total_revenue - platform_fee;

        // Get total supply from asset token for pro-rata calculation
        // Note: In production, this would call the asset token contract
        // For now, we store it as a parameter
        let total_supply_snapshot = Self::get_asset_token_supply(&env, &asset_token);

        // Increment distribution ID
        let mut count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::DistributionCount)
            .unwrap_or(0);
        count += 1;

        let distribution = Distribution {
            id: count,
            project_id: project_id.clone(),
            asset_token: asset_token.clone(),
            period_start,
            period_end,
            total_energy_kwh,
            revenue_per_kwh,
            total_revenue,
            platform_fee,
            total_yield,
            total_supply_snapshot,
            status: DistributionStatus::Created,
            created_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Distribution(count), &distribution);
        env.storage().instance().set(&DataKey::DistributionCount, &count);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "distribution_created"), project_id),
            (count, total_yield),
        );

        count
    }

    /// Claim yield for a specific distribution
    /// 
    /// The holder's yield is calculated based on their token balance
    /// at the time of distribution creation.
    pub fn claim_yield(env: Env, distribution_id: u64, holder: Address) -> i128 {
        Self::require_not_paused(&env);
        holder.require_auth();

        let config: DistributionConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Not initialized");

        let distribution: Distribution = env
            .storage()
            .persistent()
            .get(&DataKey::Distribution(distribution_id))
            .expect("Distribution not found");

        if distribution.status != DistributionStatus::Created {
            panic!("Distribution not active");
        }

        // Check if already claimed
        let claim_key = DataKey::HolderClaimed((distribution_id, holder.clone()));
        if env.storage().persistent().get::<_, bool>(&claim_key).unwrap_or(false) {
            panic!("Already claimed");
        }

        // Get holder's token balance at snapshot
        let holder_balance = Self::get_holder_balance(&env, &distribution.asset_token, &holder);

        if holder_balance <= 0 {
            panic!("No tokens held");
        }

        // Calculate pro-rata yield
        let yield_amount = (distribution.total_yield * holder_balance) / distribution.total_supply_snapshot;

        if yield_amount <= 0 {
            panic!("Yield amount too small");
        }

        // Transfer USDC to holder
        let usdc_client = token::Client::new(&env, &config.usdc_token);
        usdc_client.transfer(&env.current_contract_address(), &holder, &yield_amount);

        // Record the claim
        let claim = Claim {
            distribution_id,
            holder: holder.clone(),
            token_balance: holder_balance,
            yield_amount,
            claimed: true,
            claimed_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Claim((distribution_id, holder.clone())), &claim);
        env.storage().persistent().set(&claim_key, &true);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "yield_claimed"), holder.clone()),
            (distribution_id, yield_amount),
        );

        yield_amount
    }

    /// Get unclaimed yield for a holder across all distributions
    pub fn get_unclaimed_yield(env: Env, holder: Address) -> i128 {
        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::DistributionCount)
            .unwrap_or(0);

        let mut total_unclaimed: i128 = 0;

        for id in 1..=count {
            let claim_key = DataKey::HolderClaimed((id, holder.clone()));
            let already_claimed = env.storage().persistent().get::<_, bool>(&claim_key).unwrap_or(false);

            if !already_claimed {
                if let Some(distribution) = env
                    .storage()
                    .persistent()
                    .get::<_, Distribution>(&DataKey::Distribution(id))
                {
                    if distribution.status == DistributionStatus::Created {
                        let holder_balance = Self::get_holder_balance(&env, &distribution.asset_token, &holder);
                        if holder_balance > 0 {
                            let yield_amount = (distribution.total_yield * holder_balance) / distribution.total_supply_snapshot;
                            total_unclaimed += yield_amount;
                        }
                    }
                }
            }
        }

        total_unclaimed
    }

    // ============================================
    // View Functions
    // ============================================

    pub fn get_distribution(env: Env, distribution_id: u64) -> Distribution {
        env.storage()
            .persistent()
            .get(&DataKey::Distribution(distribution_id))
            .expect("Distribution not found")
    }

    pub fn get_claim(env: Env, distribution_id: u64, holder: Address) -> Option<Claim> {
        env.storage()
            .persistent()
            .get(&DataKey::Claim((distribution_id, holder)))
    }

    pub fn get_distribution_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::DistributionCount)
            .unwrap_or(0)
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get::<_, bool>(&DataKey::Paused)
            .unwrap_or(false)
    }

    // ============================================
    // Admin Functions
    // ============================================

    pub fn pause(env: Env) {
        let config: DistributionConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Not initialized");

        config.admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &true);

        env.events().publish((Symbol::new(&env, "paused"),), true);
    }

    pub fn unpause(env: Env) {
        let config: DistributionConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Not initialized");

        config.admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &false);

        env.events().publish((Symbol::new(&env, "paused"),), false);
    }

    /// Cancel a distribution (emergency only)
    pub fn cancel_distribution(env: Env, distribution_id: u64) {
        let config: DistributionConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Not initialized");

        config.admin.require_auth();

        let mut distribution: Distribution = env
            .storage()
            .persistent()
            .get(&DataKey::Distribution(distribution_id))
            .expect("Distribution not found");

        if distribution.status != DistributionStatus::Created {
            panic!("Cannot cancel this distribution");
        }

        distribution.status = DistributionStatus::Cancelled;
        env.storage()
            .persistent()
            .set(&DataKey::Distribution(distribution_id), &distribution);

        env.events().publish(
            (Symbol::new(&env, "distribution_cancelled"),),
            distribution_id,
        );
    }

    /// Update platform fee (admin only)
    pub fn update_platform_fee(env: Env, new_fee_bps: u32) {
        let mut config: DistributionConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Not initialized");

        config.admin.require_auth();

        if new_fee_bps > 1000 {
            panic!("Platform fee too high (max 10%)");
        }

        config.platform_fee_bps = new_fee_bps;
        env.storage().instance().set(&DataKey::Config, &config);

        env.events().publish(
            (Symbol::new(&env, "fee_updated"),),
            new_fee_bps,
        );
    }

    // ============================================
    // Internal Functions
    // ============================================

    fn require_not_paused(env: &Env) {
        if env.storage().instance().get::<_, bool>(&DataKey::Paused).unwrap_or(false) {
            panic!("Contract is paused");
        }
    }

    /// Get total supply from asset token contract
    fn get_asset_token_supply(env: &Env, asset_token: &Address) -> i128 {
        // Call the asset token contract to get total supply
        env.invoke_contract::<i128>(
            asset_token,
            &Symbol::new(env, "total_supply"),
            soroban_sdk::Vec::new(env),
        )
    }

    /// Get holder balance from asset token contract
    fn get_holder_balance(env: &Env, asset_token: &Address, holder: &Address) -> i128 {
        // Call the asset token contract to get holder balance
        env.invoke_contract::<i128>(
            asset_token,
            &Symbol::new(env, "balance"),
            (holder.clone(),).into_val(env),
        )
    }
}

// ============================================
// Tests
// ============================================

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract_id = env.register_contract(None, YieldDistributorContract);
        let client = YieldDistributorContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let treasury = Address::generate(&env);
        let usdc = Address::generate(&env);

        env.mock_all_auths();

        client.initialize(&admin, &treasury, &usdc, &250); // 2.5% fee

        // Verify initialization
        assert_eq!(client.get_distribution_count(), 0);
        assert!(!client.is_paused());
    }

    #[test]
    fn test_pause_unpause() {
        let env = Env::default();
        let contract_id = env.register_contract(None, YieldDistributorContract);
        let client = YieldDistributorContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let treasury = Address::generate(&env);
        let usdc = Address::generate(&env);

        env.mock_all_auths();

        client.initialize(&admin, &treasury, &usdc, &250);

        assert!(!client.is_paused());
        
        client.pause();
        assert!(client.is_paused());

        client.unpause();
        assert!(!client.is_paused());
    }
}
