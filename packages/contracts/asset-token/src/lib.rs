#![no_std]

//! # Aethera Asset Token Contract
//! 
//! This contract represents fractional ownership of real-world solar assets.
//! Each project gets its own token contract instance.
//! 
//! Features:
//! - Mint tokens to investors upon investment
//! - Track total supply and balances
//! - Transfer tokens (for secondary market)
//! - Burn tokens (for project completion/exit)
//! - Query holder information for yield distribution

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, String, Symbol,
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
}

// ============================================
// Asset Token Contract
// ============================================

#[contract]
pub struct AssetTokenContract;

#[contractimpl]
impl AssetTokenContract {
    /// Initialize the asset token for a new project
    /// 
    /// # Arguments
    /// * `admin` - Platform admin address (can mint tokens)
    /// * `project_id` - Unique project identifier
    /// * `name` - Token name
    /// * `symbol` - Token symbol (must be unique)
    /// * `capacity_kw` - Solar capacity in kW
    /// * `expected_yield_bps` - Expected annual yield in basis points
    /// * `total_supply` - Total tokens to create (represents 100% of project)
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
        };

        let token_info = TokenInfo {
            total_supply: 0, // Start at 0, mint as investments come in
            decimals: 7,     // Stellar standard
            metadata,
        };

        env.storage().instance().set(&DataKey::TokenInfo, &token_info);
    }

    /// Mint tokens to an investor (called when investment is confirmed)
    /// Only admin can mint
    pub fn mint(env: Env, to: Address, amount: i128) {
        let mut token_info: TokenInfo = env
            .storage()
            .instance()
            .get(&DataKey::TokenInfo)
            .expect("Not initialized");

        // Verify caller is admin
        token_info.metadata.admin.require_auth();

        if amount <= 0 {
            panic!("Invalid mint amount");
        }

        // Update balance
        let balance_key = DataKey::Balance(to.clone());
        let current_balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);
        let new_balance = current_balance + amount;

        env.storage().persistent().set(&balance_key, &new_balance);

        // Update total supply
        token_info.total_supply += amount;
        env.storage().instance().set(&DataKey::TokenInfo, &token_info);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "mint"), to.clone()),
            amount,
        );
    }

    /// Get balance of an address
    pub fn balance(env: Env, id: Address) -> i128 {
        let balance_key = DataKey::Balance(id);
        env.storage().persistent().get(&balance_key).unwrap_or(0)
    }

    /// Transfer tokens (for secondary market)
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        if amount <= 0 {
            panic!("Invalid transfer amount");
        }

        // Deduct from sender
        let from_key = DataKey::Balance(from.clone());
        let from_balance: i128 = env
            .storage()
            .persistent()
            .get(&from_key)
            .expect("Insufficient balance");

        if from_balance < amount {
            panic!("Insufficient balance");
        }

        env.storage().persistent().set(&from_key, &(from_balance - amount));

        // Add to recipient
        let to_key = DataKey::Balance(to.clone());
        let to_balance: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);
        env.storage().persistent().set(&to_key, &(to_balance + amount));

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "transfer"), from, to),
            amount,
        );
    }

    /// Burn tokens (for project exit scenarios)
    /// Only admin can burn
    pub fn burn(env: Env, from: Address, amount: i128) {
        let mut token_info: TokenInfo = env
            .storage()
            .instance()
            .get(&DataKey::TokenInfo)
            .expect("Not initialized");

        token_info.metadata.admin.require_auth();

        if amount <= 0 {
            panic!("Invalid burn amount");
        }

        let balance_key = DataKey::Balance(from.clone());
        let current_balance: i128 = env
            .storage()
            .persistent()
            .get(&balance_key)
            .expect("Insufficient balance");

        if current_balance < amount {
            panic!("Insufficient balance");
        }

        env.storage().persistent().set(&balance_key, &(current_balance - amount));
        token_info.total_supply -= amount;
        env.storage().instance().set(&DataKey::TokenInfo, &token_info);

        env.events().publish(
            (Symbol::new(&env, "burn"), from),
            amount,
        );
    }

    // ============================================
    // View Functions
    // ============================================

    /// Get token metadata
    pub fn get_metadata(env: Env) -> AssetMetadata {
        let token_info: TokenInfo = env
            .storage()
            .instance()
            .get(&DataKey::TokenInfo)
            .expect("Not initialized");
        token_info.metadata
    }

    /// Get total supply
    pub fn total_supply(env: Env) -> i128 {
        let token_info: TokenInfo = env
            .storage()
            .instance()
            .get(&DataKey::TokenInfo)
            .expect("Not initialized");
        token_info.total_supply
    }

    /// Get decimals
    pub fn decimals(env: Env) -> u32 {
        let token_info: TokenInfo = env
            .storage()
            .instance()
            .get(&DataKey::TokenInfo)
            .expect("Not initialized");
        token_info.decimals
    }

    /// Get token name
    pub fn name(env: Env) -> String {
        let token_info: TokenInfo = env
            .storage()
            .instance()
            .get(&DataKey::TokenInfo)
            .expect("Not initialized");
        token_info.metadata.name
    }

    /// Get token symbol
    pub fn symbol(env: Env) -> String {
        let token_info: TokenInfo = env
            .storage()
            .instance()
            .get(&DataKey::TokenInfo)
            .expect("Not initialized");
        token_info.metadata.symbol
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
    fn test_initialize_and_mint() {
        let env = Env::default();
        let contract_id = env.register_contract(None, AssetTokenContract);
        let client = AssetTokenContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let investor = Address::generate(&env);

        env.mock_all_auths();

        // Initialize token
        client.initialize(
            &admin,
            &String::from_str(&env, "proj_123"),
            &String::from_str(&env, "Solar Project Alpha"),
            &String::from_str(&env, "SOLA"),
            &100, // 100kW
            &850, // 8.5% yield
            &10000, // 10,000 tokens total
        );

        // Check initial state
        assert_eq!(client.total_supply(), 0);
        assert_eq!(client.balance(&investor), 0);

        // Mint tokens to investor
        client.mint(&investor, &100);

        // Verify
        assert_eq!(client.total_supply(), 100);
        assert_eq!(client.balance(&investor), 100);
    }

    #[test]
    fn test_transfer() {
        let env = Env::default();
        let contract_id = env.register_contract(None, AssetTokenContract);
        let client = AssetTokenContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        env.mock_all_auths();

        client.initialize(
            &admin,
            &String::from_str(&env, "proj_123"),
            &String::from_str(&env, "Test"),
            &String::from_str(&env, "TEST"),
            &100,
            &850,
            &10000,
        );

        // Mint to Alice
        client.mint(&alice, &500);

        // Alice transfers to Bob
        client.transfer(&alice, &bob, &200);

        assert_eq!(client.balance(&alice), 300);
        assert_eq!(client.balance(&bob), 200);
    }

    #[test]
    #[should_panic(expected = "Insufficient balance")]
    fn test_transfer_insufficient_balance() {
        let env = Env::default();
        let contract_id = env.register_contract(None, AssetTokenContract);
        let client = AssetTokenContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        env.mock_all_auths();

        client.initialize(
            &admin,
            &String::from_str(&env, "proj_123"),
            &String::from_str(&env, "Test"),
            &String::from_str(&env, "TEST"),
            &100,
            &850,
            &10000,
        );

        client.mint(&alice, &100);
        client.transfer(&alice, &bob, &200); // Should panic
    }
}
