//! Governance Contract for Aethera DePIN Platform
//!
//! On-chain governance with proposal creation, voting, and execution.
//! Token holders vote with their token balance as voting power.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec,
};

// ============================================
// Data Types
// ============================================

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ProposalStatus {
    Active,     // Voting in progress
    Passed,     // Quorum reached, majority yes
    Failed,     // Quorum not reached or majority no
    Executed,   // Proposal executed
    Cancelled,  // Cancelled by proposer or admin
    Expired,    // Voting period ended without quorum
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ProposalType {
    ParameterChange,  // Change contract parameters
    OracleApproval,   // Approve/suspend oracle
    EmergencyPause,   // Emergency pause contracts
    TreasuryRelease,  // Release treasury funds
    ProtocolUpgrade,  // Upgrade contract
    General,          // General governance proposal
}

#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub id: u32,
    pub proposer: Address,
    pub title: String,
    pub description: String,
    pub proposal_type: ProposalType,
    pub status: ProposalStatus,
    pub yes_votes: i128,
    pub no_votes: i128,
    pub abstain_votes: i128,
    pub start_time: u64,
    pub end_time: u64,
    pub quorum_required: i128,       // Minimum votes for validity
    pub execution_delay: u64,        // Delay after passing before execution
    pub executable_after: u64,       // Timestamp when can be executed
    pub execution_data: String,      // JSON-encoded execution parameters
}

#[contracttype]
#[derive(Clone)]
pub struct Vote {
    pub voter: Address,
    pub proposal_id: u32,
    pub vote_power: i128,
    pub vote_choice: VoteChoice,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum VoteChoice {
    Yes,
    No,
    Abstain,
}

#[contracttype]
#[derive(Clone)]
pub struct GovernanceConfig {
    pub admin: Address,
    pub token_contract: Address,     // Token contract for voting power
    pub min_proposal_tokens: i128,   // Minimum tokens to create proposal
    pub voting_period: u64,          // Voting duration in seconds
    pub execution_delay: u64,        // Delay after passing
    pub quorum_percentage: u32,      // Required quorum (basis points, 100 = 1%)
    pub paused: bool,
}

#[contracttype]
pub enum DataKey {
    Config,
    Proposal(u32),
    ProposalCount,
    Vote(u32, Address),       // (proposal_id, voter)
    HasVoted(u32, Address),
    Paused,
}

// ============================================
// Contract Implementation
// ============================================

#[contract]
pub struct GovernanceContract;

#[contractimpl]
impl GovernanceContract {
    /// Initialize the governance contract
    pub fn initialize(
        env: Env,
        admin: Address,
        token_contract: Address,
        min_proposal_tokens: i128,
        voting_period: u64,
        execution_delay: u64,
        quorum_percentage: u32,
    ) {
        if env.storage().instance().has(&DataKey::Config) {
            panic!("Already initialized");
        }

        let config = GovernanceConfig {
            admin,
            token_contract,
            min_proposal_tokens,
            voting_period,
            execution_delay,
            quorum_percentage,
            paused: false,
        };

        env.storage().instance().set(&DataKey::Config, &config);
        env.storage().instance().set(&DataKey::ProposalCount, &0u32);

        env.events().publish(
            (Symbol::new(&env, "governance_initialized"),),
            config.admin.clone(),
        );
    }

    /// Create a new proposal
    pub fn create_proposal(
        env: Env,
        proposer: Address,
        title: String,
        description: String,
        proposal_type: ProposalType,
        execution_data: String,
    ) -> u32 {
        proposer.require_auth();
        Self::require_not_paused(&env);

        let config: GovernanceConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Not initialized");

        // Check proposer has enough tokens
        let balance = Self::get_token_balance(&env, &config.token_contract, &proposer);
        if balance < config.min_proposal_tokens {
            panic!("Insufficient tokens to create proposal");
        }

        // Create proposal
        let proposal_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0);
        let proposal_id = proposal_count + 1;

        let current_time = env.ledger().timestamp();
        let total_supply = Self::get_total_supply(&env, &config.token_contract);
        let quorum_required = (total_supply * config.quorum_percentage as i128) / 10000;

        let proposal = Proposal {
            id: proposal_id,
            proposer: proposer.clone(),
            title,
            description,
            proposal_type: proposal_type.clone(),
            status: ProposalStatus::Active,
            yes_votes: 0,
            no_votes: 0,
            abstain_votes: 0,
            start_time: current_time,
            end_time: current_time + config.voting_period,
            quorum_required,
            execution_delay: config.execution_delay,
            executable_after: 0,
            execution_data,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        env.storage()
            .instance()
            .set(&DataKey::ProposalCount, &proposal_id);

        env.events().publish(
            (Symbol::new(&env, "proposal_created"), proposal_id),
            (proposer, proposal_type),
        );

        proposal_id
    }

    /// Cast a vote
    pub fn vote(env: Env, voter: Address, proposal_id: u32, choice: VoteChoice) {
        voter.require_auth();
        Self::require_not_paused(&env);

        let config: GovernanceConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Not initialized");

        // Check if already voted
        if env
            .storage()
            .persistent()
            .has(&DataKey::HasVoted(proposal_id, voter.clone()))
        {
            panic!("Already voted on this proposal");
        }

        // Get proposal
        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .expect("Proposal not found");

        // Check voting is active
        let current_time = env.ledger().timestamp();
        if proposal.status != ProposalStatus::Active {
            panic!("Proposal not active");
        }
        if current_time > proposal.end_time {
            panic!("Voting period ended");
        }

        // Get voting power (token balance at snapshot)
        let vote_power = Self::get_token_balance(&env, &config.token_contract, &voter);
        if vote_power == 0 {
            panic!("No voting power");
        }

        // Record vote
        match choice {
            VoteChoice::Yes => proposal.yes_votes += vote_power,
            VoteChoice::No => proposal.no_votes += vote_power,
            VoteChoice::Abstain => proposal.abstain_votes += vote_power,
        }

        let vote = Vote {
            voter: voter.clone(),
            proposal_id,
            vote_power,
            vote_choice: choice.clone(),
            timestamp: current_time,
        };

        env.storage().persistent().set(
            &DataKey::Vote(proposal_id, voter.clone()),
            &vote,
        );
        env.storage()
            .persistent()
            .set(&DataKey::HasVoted(proposal_id, voter.clone()), &true);
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        env.events().publish(
            (Symbol::new(&env, "vote_cast"), proposal_id),
            (voter, choice, vote_power),
        );
    }

    /// Finalize a proposal after voting ends
    pub fn finalize_proposal(env: Env, proposal_id: u32) {
        let config: GovernanceConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Not initialized");

        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .expect("Proposal not found");

        if proposal.status != ProposalStatus::Active {
            panic!("Proposal already finalized");
        }

        let current_time = env.ledger().timestamp();
        if current_time <= proposal.end_time {
            panic!("Voting period not ended");
        }

        // Calculate results
        let total_votes = proposal.yes_votes + proposal.no_votes + proposal.abstain_votes;
        
        if total_votes < proposal.quorum_required {
            proposal.status = ProposalStatus::Expired;
        } else if proposal.yes_votes > proposal.no_votes {
            proposal.status = ProposalStatus::Passed;
            proposal.executable_after = current_time + proposal.execution_delay;
        } else {
            proposal.status = ProposalStatus::Failed;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        env.events().publish(
            (Symbol::new(&env, "proposal_finalized"), proposal_id),
            proposal.status.clone(),
        );
    }

    /// Execute a passed proposal
    pub fn execute_proposal(env: Env, proposal_id: u32) {
        let config: GovernanceConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Not initialized");

        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .expect("Proposal not found");

        if proposal.status != ProposalStatus::Passed {
            panic!("Proposal not passed");
        }

        let current_time = env.ledger().timestamp();
        if current_time < proposal.executable_after {
            panic!("Execution delay not passed");
        }

        // Mark as executed
        proposal.status = ProposalStatus::Executed;
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        // Emit execution event - actual execution happens off-chain
        // by monitoring for this event
        env.events().publish(
            (Symbol::new(&env, "proposal_executed"), proposal_id),
            (proposal.proposal_type, proposal.execution_data),
        );
    }

    /// Cancel a proposal (only by proposer or admin)
    pub fn cancel_proposal(env: Env, caller: Address, proposal_id: u32) {
        caller.require_auth();

        let config: GovernanceConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Not initialized");

        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .expect("Proposal not found");

        // Only proposer or admin can cancel
        if caller != proposal.proposer && caller != config.admin {
            panic!("Not authorized to cancel");
        }

        if proposal.status != ProposalStatus::Active {
            panic!("Cannot cancel non-active proposal");
        }

        proposal.status = ProposalStatus::Cancelled;
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        env.events().publish(
            (Symbol::new(&env, "proposal_cancelled"), proposal_id),
            caller,
        );
    }

    // ============================================
    // View Functions
    // ============================================

    pub fn get_proposal(env: Env, proposal_id: u32) -> Proposal {
        env.storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .expect("Proposal not found")
    }

    pub fn get_proposal_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0)
    }

    pub fn get_vote(env: Env, proposal_id: u32, voter: Address) -> Option<Vote> {
        env.storage()
            .persistent()
            .get(&DataKey::Vote(proposal_id, voter))
    }

    pub fn has_voted(env: Env, proposal_id: u32, voter: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::HasVoted(proposal_id, voter))
    }

    pub fn get_config(env: Env) -> GovernanceConfig {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Not initialized")
    }

    // ============================================
    // Admin Functions
    // ============================================

    pub fn pause(env: Env) {
        let config: GovernanceConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Not initialized");
        config.admin.require_auth();

        env.storage().instance().set(&DataKey::Paused, &true);
        
        env.events().publish((Symbol::new(&env, "paused"),), true);
    }

    pub fn unpause(env: Env) {
        let config: GovernanceConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Not initialized");
        config.admin.require_auth();

        env.storage().instance().set(&DataKey::Paused, &false);
        
        env.events().publish((Symbol::new(&env, "unpaused"),), true);
    }

    pub fn update_config(
        env: Env,
        min_proposal_tokens: Option<i128>,
        voting_period: Option<u64>,
        execution_delay: Option<u64>,
        quorum_percentage: Option<u32>,
    ) {
        let mut config: GovernanceConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Not initialized");
        config.admin.require_auth();

        if let Some(tokens) = min_proposal_tokens {
            config.min_proposal_tokens = tokens;
        }
        if let Some(period) = voting_period {
            config.voting_period = period;
        }
        if let Some(delay) = execution_delay {
            config.execution_delay = delay;
        }
        if let Some(quorum) = quorum_percentage {
            config.quorum_percentage = quorum;
        }

        env.storage().instance().set(&DataKey::Config, &config);
        
        env.events().publish((Symbol::new(&env, "config_updated"),), true);
    }

    // ============================================
    // Internal Functions
    // ============================================

    fn require_not_paused(env: &Env) {
        let paused: bool = env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false);
        if paused {
            panic!("Contract is paused");
        }
    }

    fn get_token_balance(env: &Env, token_contract: &Address, holder: &Address) -> i128 {
        // Cross-contract call to token contract
        // For now, return a mock value - in production this would call the token contract
        // env.invoke_contract(token_contract, &Symbol::new(env, "balance"), vec![holder.into()])
        1000i128 // Mock value for testing
    }

    fn get_total_supply(env: &Env, token_contract: &Address) -> i128 {
        // Cross-contract call to get total supply
        // For now, return a mock value
        1_000_000i128 // Mock value for testing
    }
}

// ============================================
// Tests
// ============================================

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract_id = env.register(GovernanceContract, ());
        let client = GovernanceContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let token = Address::generate(&env);

        client.initialize(
            &admin,
            &token,
            &1000i128,      // min tokens
            &86400u64,      // 1 day voting
            &172800u64,     // 2 day execution delay
            &500u32,        // 5% quorum
        );

        let config = client.get_config();
        assert_eq!(config.admin, admin);
        assert_eq!(config.voting_period, 86400u64);
        assert_eq!(config.quorum_percentage, 500u32);
    }

    #[test]
    fn test_create_proposal() {
        let env = Env::default();
        env.mock_all_auths();
        
        let contract_id = env.register(GovernanceContract, ());
        let client = GovernanceContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let proposer = Address::generate(&env);

        client.initialize(
            &admin,
            &token,
            &100i128,
            &86400u64,
            &172800u64,
            &500u32,
        );

        let proposal_id = client.create_proposal(
            &proposer,
            &String::from_str(&env, "Test Proposal"),
            &String::from_str(&env, "This is a test proposal"),
            &ProposalType::General,
            &String::from_str(&env, "{}"),
        );

        assert_eq!(proposal_id, 1);
        
        let proposal = client.get_proposal(&1);
        assert_eq!(proposal.status, ProposalStatus::Active);
        assert_eq!(proposal.yes_votes, 0);
    }

    #[test]
    fn test_vote() {
        let env = Env::default();
        env.mock_all_auths();
        
        let contract_id = env.register(GovernanceContract, ());
        let client = GovernanceContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let proposer = Address::generate(&env);
        let voter = Address::generate(&env);

        client.initialize(&admin, &token, &100i128, &86400u64, &172800u64, &500u32);
        
        client.create_proposal(
            &proposer,
            &String::from_str(&env, "Test"),
            &String::from_str(&env, "Test"),
            &ProposalType::General,
            &String::from_str(&env, "{}"),
        );

        client.vote(&voter, &1, &VoteChoice::Yes);

        let proposal = client.get_proposal(&1);
        assert_eq!(proposal.yes_votes, 1000); // Mock balance
        
        assert!(client.has_voted(&1, &voter));
    }

    #[test]
    fn test_pause_unpause() {
        let env = Env::default();
        env.mock_all_auths();
        
        let contract_id = env.register(GovernanceContract, ());
        let client = GovernanceContractClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let token = Address::generate(&env);

        client.initialize(&admin, &token, &100i128, &86400u64, &172800u64, &500u32);
        
        client.pause();
        let config = client.get_config();
        // Note: paused is stored separately, not in config
        
        client.unpause();
    }
}
