#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String,
};

// ============================================
// Data Structures
// ============================================

#[contracttype]
#[derive(Clone)]
pub struct AssetMetadata {
    pub project_id: String,        // Off-chain project ID
    pub name: String,              // "Solar Project XYZ"
    pub symbol: String,            // "SOLXYZ"
    pub capacity_kw: u32,          // Solar capacity in kW
    pub expected_yield_bps: u32,   // Expected annual yield in basis points (850 = 8.5%)
    pub admin: Address,            // Platform admin address
    pub max_supply: i128,          // Maximum tokens that can be minted
}

#[contracttype]
#[derive(Clone)]
pub struct TokenInfo {
    pub total_supply: i128,
    pub decimals: u32,
    pub metadata: AssetMetadata,
}

#[contracttype]
pub enum DataKey {
    TokenInfo,
    Balance(Address),
    Allowance((Address, Address)),
    HolderCount,           // Track number of holders
    HolderAt(u32),         // Holder address by index
    HolderIndex(Address),  // Index of holder address
    Paused,                // Emergency pause flag
}

// ============================================
// Asset Token Contract
// ============================================

#[contract]
pub struct AssetTokenContract;

#[contractimpl]
impl AssetTokenContract {
    /// Initialize the asset token for a new project
    pub fn initialize(
        env: Env,
        admin: Address,
        project_id: String,
        name: String,
        symbol: String,
        capacity_kw: u32,
        expected_yield_bps: u32,
        total_supply: i128,
    ) {
        // Ensure not already initialized
        if env.storage().instance().has(&DataKey::TokenInfo) {
            panic!("Already initialized");
        }

        // Validate inputs
        if total_supply <= 0 {
            panic!("Invalid total supply");
        }

        if expected_yield_bps > 3000 {
            // Max 30% yield
            panic!("Yield too high");
        }

        let metadata = AssetMetadata {
            project_id,
            name,
            symbol,
            capacity_kw,
            expected_yield_bps,
            admin: admin.clone(),
            max_supply: total_supply,
        };

        let token_info = TokenInfo {
            total_supply: 0, // Start at 0, mint as investments come in
            decimals: 7,     // Stellar standard
            metadata,
        };

        env.storage().instance().set(&DataKey::TokenInfo, &token_info);
    }

    /// Mint tokens to an investor (called when investment is confirmed)
    pub fn mint(env: Env, to: Address, amount: i128) {
        let mut token_info: TokenInfo = env.storage().instance().get(&DataKey::TokenInfo).unwrap();
        token_info.metadata.admin.require_auth();

        if env.storage().instance().has(&DataKey::Paused) {
            panic!("Contract is paused");
        }

        if amount <= 0 {
            panic!("Invalid amount");
        }

        // Enforcement: check max supply
        if token_info.total_supply + amount > token_info.metadata.max_supply {
            panic!("Exceeds maximum supply");
        }

        // Update total supply
        token_info.total_supply += amount;
        env.storage().instance().set(&DataKey::TokenInfo, &token_info);

        // Update balance
        let balance_key = DataKey::Balance(to.clone());
        let current_balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);
        
        if current_balance == 0 {
            // New holder, track them
            let count: u32 = env.storage().instance().get(&DataKey::HolderCount).unwrap_or(0);
            env.storage().instance().set(&DataKey::HolderAt(count), &to);
            env.storage().instance().set(&DataKey::HolderIndex(to.clone()), &count);
            env.storage().instance().set(&DataKey::HolderCount, &(count + 1));
        }
        
        env.storage().persistent().set(&balance_key, &(current_balance + amount));
    }

    /// Transfer tokens between accounts
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        if env.storage().instance().has(&DataKey::Paused) {
            panic!("Contract is paused");
        }

        if amount <= 0 {
            panic!("Invalid amount");
        }

        let from_key = DataKey::Balance(from.clone());
        let to_key = DataKey::Balance(to.clone());

        let from_balance: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);
        if from_balance < amount {
            panic!("Insufficient balance");
        }

        env.storage().persistent().set(&from_key, &(from_balance - amount));
        
        let to_balance: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);
        if to_balance == 0 {
            // New holder
            let count: u32 = env.storage().instance().get(&DataKey::HolderCount).unwrap_or(0);
            env.storage().instance().set(&DataKey::HolderAt(count), &to);
            env.storage().instance().set(&DataKey::HolderIndex(to.clone()), &count);
            env.storage().instance().set(&DataKey::HolderCount, &(count + 1));
        }
        env.storage().persistent().set(&to_key, &(to_balance + amount));
    }

    /// Burn tokens (e.g., when asset is retired or project completes)
    pub fn burn(env: Env, from: Address, amount: i128) {
        let mut token_info: TokenInfo = env.storage().instance().get(&DataKey::TokenInfo).unwrap();
        token_info.metadata.admin.require_auth();

        if amount <= 0 {
            panic!("Invalid amount");
        }

        let balance_key = DataKey::Balance(from.clone());
        let balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);
        if balance < amount {
            panic!("Insufficient balance");
        }

        token_info.total_supply -= amount;
        env.storage().instance().set(&DataKey::TokenInfo, &token_info);
        env.storage().persistent().set(&balance_key, &(balance - amount));
    }

    // ============================================
    // Views
    // ============================================

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Balance(id)).unwrap_or(0)
    }

    pub fn total_supply(env: Env) -> i128 {
        let token_info: TokenInfo = env.storage().instance().get(&DataKey::TokenInfo).unwrap();
        token_info.total_supply
    }

    pub fn name(env: Env) -> String {
        let token_info: TokenInfo = env.storage().instance().get(&DataKey::TokenInfo).unwrap();
        token_info.metadata.name
    }

    pub fn symbol(env: Env) -> String {
        let token_info: TokenInfo = env.storage().instance().get(&DataKey::TokenInfo).unwrap();
        token_info.metadata.symbol
    }

    pub fn decimals(env: Env) -> u32 {
        let token_info: TokenInfo = env.storage().instance().get(&DataKey::TokenInfo).unwrap();
        token_info.decimals
    }

    pub fn get_metadata(env: Env) -> AssetMetadata {
        let token_info: TokenInfo = env.storage().instance().get(&DataKey::TokenInfo).unwrap();
        token_info.metadata
    }

    pub fn holder_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::HolderCount).unwrap_or(0)
    }

    pub fn holder_at(env: Env, index: u32) -> Address {
        env.storage().instance().get(&DataKey::HolderAt(index)).unwrap()
    }

    pub fn get_holder_balances(env: Env, start: u32, limit: u32) -> soroban_sdk::Vec<(Address, i128)> {
        let count: u32 = env.storage().instance().get(&DataKey::HolderCount).unwrap_or(0);
        let end = core::cmp::min(start + limit, count);
        let mut results = soroban_sdk::Vec::new(&env);
        
        for i in start..end {
            if let Some(address) = env.storage().instance().get::<_, Address>(&DataKey::HolderAt(i)) {
                let balance: i128 = env.storage().persistent().get(&DataKey::Balance(address.clone())).unwrap_or(0);
                results.push_back((address, balance));
            }
        }
        results
    }

    pub fn pause(env: Env) {
        let token_info: TokenInfo = env.storage().instance().get(&DataKey::TokenInfo).unwrap();
        token_info.metadata.admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &true);
    }

    pub fn unpause(env: Env) {
        let token_info: TokenInfo = env.storage().instance().get(&DataKey::TokenInfo).unwrap();
        token_info.metadata.admin.require_auth();
        env.storage().instance().remove(&DataKey::Paused);
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().has(&DataKey::Paused)
    }
}
