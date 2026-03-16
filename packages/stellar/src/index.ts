// ============================================
// @aethera/stellar - Main Export
// ============================================

// Configuration
export { getNetworkConfig, NETWORKS, type NetworkType } from "./config.js";

// Client
export { StellarClient, stellarClient } from "./client.js";

// Wallet Service
export { WalletService, walletService, fundWithFriendbot } from "./wallet.js";

// Contract Service
export {
  ContractService,
  contractService,
  type ContractInvocationResult,
} from "./contracts.js";

// Contract Deployment Service
export {
  ContractDeploymentService,
  contractDeploymentService,
} from "./deployment.js";

// Trustline Service
export {
  TrustlineService,
  trustlineService,
  getUSDCAsset,
  USDC_ASSET_TESTNET,
  USDC_ASSET_MAINNET,
} from "./trustline.js";

// Soroban Contract Service
export { SorobanContractService, getSorobanService } from "./soroban.js";

// Relayer Service (Admin gas sponsorship)
export {
  RelayerService,
  getRelayerService,
  relayerService,
  getOrCreateRelayerAccount,
} from "./relayer.js";

// Contract Registry
export {
  getNetworkConfig as getRegistryConfig,
  getContractAddresses,
  validateContractsDeployed,
  NETWORK_CONFIGS,
  type ContractAddresses,
  type NetworkConfig as RegistryNetworkConfig,
} from "./registry.js";

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

export type { Horizon, rpc } from "@stellar/stellar-sdk";
