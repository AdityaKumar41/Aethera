// ============================================
// @aethera/stellar - Main Export
// ============================================

// Configuration
export { getNetworkConfig, NETWORKS, type NetworkType } from './config';

// Client
export { StellarClient, stellarClient } from './client';

// Wallet Service
export { WalletService, walletService } from './wallet';

// Contract Service
export { ContractService, contractService } from './contracts';

// Re-export useful Stellar SDK items
export {
  Keypair,
  Asset,
  Networks,
  Memo,
  TransactionBuilder,
  Operation,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Contract,
} from '@stellar/stellar-sdk';

export type { Horizon, SorobanRpc } from '@stellar/stellar-sdk';
