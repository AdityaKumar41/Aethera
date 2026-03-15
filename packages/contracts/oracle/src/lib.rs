#![no_std]

//! # Aethera Oracle Contract
//!
//! Anchors verified production data on-chain so yield distribution
//! can reference immutable, signed records.

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol};

// ============================================
// Data Structures
// ============================================

#[contracttype]
#[derive(Clone)]
pub struct OracleConfig {
    pub admin: Address,
}

#[contracttype]
#[derive(Clone)]
pub struct ProductionRecord {
    pub id: u64,
    pub project_id: String,
    pub period_start: u64,
    pub period_end: u64,
    pub energy_kwh: i128, // scaled by caller
    pub recorded_at: u64,
    pub submitter: Address,
}

#[contracttype]
pub enum DataKey {
    Config,
    RecordCount,
    Record(u64),
    RecordByPeriod((String, u64, u64)), // (project_id, period_start, period_end)
}

// ============================================
// Oracle Contract
// ============================================

#[contract]
pub struct OracleContract;

#[contractimpl]
impl OracleContract {
    /// Initialize the oracle contract
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Config) {
            panic!("Already initialized");
        }

        let config = OracleConfig { admin };
        env.storage().instance().set(&DataKey::Config, &config);
        env.storage().instance().set(&DataKey::RecordCount, &0u64);
    }

    /// Commit verified production data on-chain
    pub fn commit_production(
        env: Env,
        project_id: String,
        period_start: u64,
        period_end: u64,
        energy_kwh: i128,
    ) -> u64 {
        let config: OracleConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("Not initialized");

        config.admin.require_auth();

        if energy_kwh <= 0 {
            panic!("Invalid energy");
        }

        if period_end < period_start {
            panic!("Invalid period");
        }

        let period_key = DataKey::RecordByPeriod((project_id.clone(), period_start, period_end));
        if env.storage().persistent().has(&period_key) {
            panic!("Production already committed for this period");
        }

        // Increment record ID
        let mut count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::RecordCount)
            .unwrap_or(0);
        count += 1;

        let record = ProductionRecord {
            id: count,
            project_id: project_id.clone(),
            period_start,
            period_end,
            energy_kwh,
            recorded_at: env.ledger().timestamp(),
            submitter: config.admin.clone(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Record(count), &record);
        env.storage().persistent().set(&period_key, &count);
        env.storage().instance().set(&DataKey::RecordCount, &count);

        env.events().publish(
            (Symbol::new(&env, "production_committed"), project_id),
            (count, energy_kwh, period_start, period_end),
        );

        count
    }

    /// Fetch a production record by ID
    pub fn get_record(env: Env, record_id: u64) -> ProductionRecord {
        env.storage()
            .persistent()
            .get(&DataKey::Record(record_id))
            .expect("Record not found")
    }

    /// Fetch a production record ID by period
    pub fn get_record_id_by_period(
        env: Env,
        project_id: String,
        period_start: u64,
        period_end: u64,
    ) -> Option<u64> {
        let period_key = DataKey::RecordByPeriod((project_id, period_start, period_end));
        env.storage().persistent().get(&period_key)
    }
}
