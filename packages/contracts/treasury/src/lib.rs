#![no_std]

//! # Aethera Treasury Contract
//! 
//! Escrow contract that holds USDC investments and manages capital release.
//! 
//! Flow:
//! 1. Investors deposit USDC (via investment)
//! 2. Funds held in escrow until project funded
//! 3. Admin releases capital to installer
//! 4. Revenue flows back for yield distribution

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, IntoVal, String,
};

#[contracttype]
#[derive(Clone)]
pub struct ProjectEscrow {
    pub project_id: String,
    pub asset_token: Address,       // Address of the asset token contract
    pub installer: Address,         // Installer receiving funds
    pub funding_target: i128,       // Target amount in USDC (7 decimals)
    pub current_funding: i128,      // Current amount funded
    pub status: ProjectStatus,
    pub platform_fee_bps: u32,      // Platform fee in basis points (250 = 2.5%)
    pub price_per_token: i128,      // USDC per token (7 decimals)
}

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum ProjectStatus {
    Funding,        // Accepting investments
    Funded,         // Target reached
    Active,         // Capital released, project producing
    Completed,      // Project ended
}

#[contracttype]
pub enum DataKey {
    Admin,
    UsdcToken,
    Project(String),
    PlatformBalance,
    Paused,                    // Emergency pause flag
    Signers,                   // List of authorized signers
    SignerCount,               // Number of signers
    RequiredSignatures,        // Number of signatures required for release
    PendingRelease(String),    // Pending capital releases awaiting signatures
    ReleaseSignatures(String), // Signatures collected for a release
}

#[contract]
pub struct TreasuryContract;

#[contractimpl]
impl TreasuryContract {
    /// Initialize the treasury contract
    pub fn initialize(env: Env, admin: Address, usdc_token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&DataKey::PlatformBalance, &0i128);
    }

    /// Create escrow for a new project
    pub fn create_project_escrow(
        env: Env,
        project_id: String,
        asset_token: Address,
        installer: Address,
        funding_target: i128,
        platform_fee_bps: u32,
        price_per_token: i128,
    ) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if platform_fee_bps > 1000 {
            // Max 10% fee
            panic!("Fee too high");
        }

        let escrow = ProjectEscrow {
            project_id: project_id.clone(),
            asset_token,
            installer,
            funding_target,
            current_funding: 0,
            status: ProjectStatus::Funding,
            platform_fee_bps,
            price_per_token,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Project(project_id), &escrow);
    }

    /// Process an investment (called by platform)
    /// Returns true if project is now fully funded
    pub fn process_investment(
        env: Env,
        project_id: String,
        investor: Address,
        amount: i128,
    ) -> bool {
        // Investor must authorize this call since it triggers a transfer from them
        investor.require_auth();

        // Check if paused
        if env.storage().instance().get::<_, bool>(&DataKey::Paused).unwrap_or(false) {
            panic!("Contract is paused");
        }

        let _admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        // admin.require_auth(); // Removed to allow easier gas sponsorship without multi-sig on envelope

        let mut escrow: ProjectEscrow = env
            .storage()
            .persistent()
            .get(&DataKey::Project(project_id.clone()))
            .expect("Project not found");

        if escrow.status != ProjectStatus::Funding {
            panic!("Project not accepting investments");
        }

        // Check if investment exceeds target
        let remaining = escrow.funding_target - escrow.current_funding;
        if amount > remaining {
            panic!("Investment exceeds funding target");
        }

        // Transfer USDC from investor to this contract
        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token_client = token::Client::new(&env, &usdc);
        token_client.transfer(&investor, &env.current_contract_address(), &amount);

        // Mint project tokens to investor
        // token_amount = (amount * 10^7) / price_per_token
        let token_amount = (amount * 10_000_000i128) / escrow.price_per_token;
        
        env.invoke_contract::<()>(
            &escrow.asset_token,
            &soroban_sdk::Symbol::new(&env, "mint"),
            (investor.clone(), token_amount).into_val(&env),
        );

        // Update escrow
        escrow.current_funding += amount;

        // Check if fully funded
        let fully_funded = escrow.current_funding >= escrow.funding_target;
        if fully_funded {
            escrow.status = ProjectStatus::Funded;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Project(project_id), &escrow);

        fully_funded
    }

    /// Release capital to installer (after project funded)
    pub fn release_capital(env: Env, project_id: String) {
        // Check if paused
        if env.storage().instance().get::<_, bool>(&DataKey::Paused).unwrap_or(false) {
            panic!("Contract is paused");
        }

        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut escrow: ProjectEscrow = env
            .storage()
            .persistent()
            .get(&DataKey::Project(project_id.clone()))
            .expect("Project not found");

        if escrow.status != ProjectStatus::Funded {
            panic!("Project not ready for capital release");
        }

        // Calculate platform fee
        let platform_fee = (escrow.current_funding * escrow.platform_fee_bps as i128) / 10000;
        let installer_amount = escrow.current_funding - platform_fee;

        // Transfer to installer
        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token_client = token::Client::new(&env, &usdc);
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.installer,
            &installer_amount,
        );

        // Update platform balance
        let mut platform_balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::PlatformBalance)
            .unwrap_or(0);
        platform_balance += platform_fee;
        env.storage()
            .instance()
            .set(&DataKey::PlatformBalance, &platform_balance);

        // Update escrow status
        escrow.status = ProjectStatus::Active;
        env.storage()
            .persistent()
            .set(&DataKey::Project(project_id), &escrow);
    }

    /// Facilitate token buyback from investor using treasury funds
    pub fn buyback_tokens(
        env: Env,
        project_id: String,
        investor: Address,
        amount: i128,
        price_per_token: i128,
    ) {
        // Only admin can trigger buyback (platform-led)
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut _escrow: ProjectEscrow = env
            .storage()
            .persistent()
            .get(&DataKey::Project(project_id.clone()))
            .expect("Project not found");

        // Calculate USDC amount needed for buyback
        // (amount * price_per_token) / 10^7 (since price has 7 decimals)
        let usdc_amount = (amount * price_per_token) / 10_000_000i128;

        // Transfer USDC from treasury to investor
        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token_client = token::Client::new(&env, &usdc);
        token_client.transfer(
            &env.current_contract_address(),
            &investor,
            &usdc_amount,
        );

        // Burn tokens from investor
        // This requires AssetToken admin authorization, which is the same as Treasury admin
        env.invoke_contract::<()>(
            &_escrow.asset_token,
            &soroban_sdk::Symbol::new(&env, "burn"),
            (investor, amount).into_val(&env),
        );
    }

    /// Receive yield payment from project operator
    pub fn receive_yield(env: Env, project_id: String, amount: i128) {
        let escrow: ProjectEscrow = env
            .storage()
            .persistent()
            .get(&DataKey::Project(project_id.clone()))
            .expect("Project not found");

        if escrow.status != ProjectStatus::Active {
            panic!("Project not active");
        }

        // Installer must send payment
        escrow.installer.require_auth();

        // Transfer USDC to treasury
        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token_client = token::Client::new(&env, &usdc);
        token_client.transfer(
            &escrow.installer,
            &env.current_contract_address(),
            &amount,
        );

        // Yield will be distributed in separate call
        // This just holds the funds for now
    }

    /// Withdraw platform fees (admin only)
    pub fn withdraw_fees(env: Env, recipient: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut platform_balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::PlatformBalance)
            .unwrap_or(0);

        if amount > platform_balance {
            panic!("Insufficient platform balance");
        }

        platform_balance -= amount;
        env.storage()
            .instance()
            .set(&DataKey::PlatformBalance, &platform_balance);

        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token_client = token::Client::new(&env, &usdc);
        token_client.transfer(&env.current_contract_address(), &recipient, &amount);
    }

    // ============================================
    // View Functions
    // ============================================

    pub fn get_project(env: Env, project_id: String) -> ProjectEscrow {
        env.storage()
            .persistent()
            .get(&DataKey::Project(project_id))
            .expect("Project not found")
    }

    pub fn get_platform_balance(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::PlatformBalance)
            .unwrap_or(0)
    }

    /// Check if contract is paused
    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().get::<_, bool>(&DataKey::Paused).unwrap_or(false)
    }

    // ============================================
    // Admin / Emergency Functions
    // ============================================

    /// Pause the contract (emergency stop)
    /// Only admin can pause
    pub fn pause(env: Env) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        
        env.storage().instance().set(&DataKey::Paused, &true);
        
        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "paused"),),
            true,
        );
    }

    /// Unpause the contract
    /// Only admin can unpause
    pub fn unpause(env: Env) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        
        env.storage().instance().set(&DataKey::Paused, &false);
        
        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "paused"),),
            false,
        );
    }

    /// Setup multisig for capital releases
    /// Only admin can set this up
    pub fn setup_multisig(env: Env, signers: soroban_sdk::Vec<Address>, required: u32) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let signer_count = signers.len();
        if required == 0 || required > signer_count {
            panic!("Invalid required signatures");
        }

        env.storage().instance().set(&DataKey::Signers, &signers);
        env.storage().instance().set(&DataKey::SignerCount, &signer_count);
        env.storage().instance().set(&DataKey::RequiredSignatures, &required);

        env.events().publish(
            (soroban_sdk::Symbol::new(&env, "multisig_setup"),),
            (signer_count, required),
        );
    }

    /// Get multisig config
    pub fn get_multisig_config(env: Env) -> (u32, u32) {
        let signer_count: u32 = env.storage().instance().get(&DataKey::SignerCount).unwrap_or(0);
        let required: u32 = env.storage().instance().get(&DataKey::RequiredSignatures).unwrap_or(1);
        (signer_count, required)
    }

    /// Check if an address is an authorized signer
    pub fn is_signer(env: Env, addr: Address) -> bool {
        let signers: soroban_sdk::Vec<Address> = env.storage()
            .instance()
            .get(&DataKey::Signers)
            .unwrap_or(soroban_sdk::Vec::new(&env));
        
        for i in 0..signers.len() {
            if signers.get(i).unwrap() == addr {
                return true;
            }
        }
        false
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, token};

    #[test]
    fn test_escrow_flow() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TreasuryContract);
        let client = TreasuryContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let installer = Address::generate(&env);
        let investor = Address::generate(&env);
        let usdc_token = Address::generate(&env);
        let asset_token = Address::generate(&env);

        env.mock_all_auths();

        // Initialize
        client.initialize(&admin, &usdc_token);

        // Create project escrow
        client.create_project_escrow(
            &String::from_str(&env, "proj_1"),
            &asset_token,
            &installer,
            &10_000_0000000, // 10,000 USDC
            &250,            // 2.5% fee
        );

        // Verify project created
        let escrow = client.get_project(&String::from_str(&env, "proj_1"));
        assert_eq!(escrow.status, ProjectStatus::Funding);
        assert_eq!(escrow.current_funding, 0);
    }
}
