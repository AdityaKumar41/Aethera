// ============================================
// @aethera/stellar - Main Export
// ============================================

// Configuration
export { getNetworkConfig, NETWORKS, type NetworkType } from "./config";

// Client
export { StellarClient, stellarClient } from "./client";

// Wallet Service
export { WalletService, walletService } from "./wallet";

// Contract Service
export { ContractService, contractService } from "./contracts";

// Contract Deployment Service
export {
  ContractDeploymentService,
  contractDeploymentService,
} from "./deployment";

// Trustline Service
export {
  TrustlineService,
  trustlineService,
  getUSDCAsset,
  USDC_ASSET_TESTNET,
  USDC_ASSET_MAINNET,
} from "./trustline";

// Soroban Contract Service
export { SorobanContractService, getSorobanService } from "./soroban";

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
} from "@stellar/stellar-sdk";

export type { Horizon, SorobanRpc } from "@stellar/stellar-sdk";
