/**
 * Contract Registry
 * 
 * Stores deployed contract addresses for different environments.
 * This is the source of truth for contract IDs used by the backend.
 */

export interface ContractAddresses {
  assetToken: string;
  treasury: string;
  yieldDistributor?: string;
  governance?: string;
  oracle?: string;
}

export interface NetworkConfig {
  networkPassphrase: string;
  horizonUrl: string;
  sorobanRpcUrl: string;
  contracts: ContractAddresses;
}

/**
 * Testnet Contract Addresses
 * Deployed on: January 29, 2026
 */
const TESTNET_CONTRACTS: ContractAddresses = {
  assetToken: "CAGTDTHJKKLDRKJ2X2VCJU7G3FXLBLAHP65OO427W2RIKGHNU2MUC5KY",
  treasury: "CAWNBL27F7F7CRBK4XYN7JE6UUK7YMVUDOAI25E4UEVGLQRCBE3CIKVU",
  yieldDistributor: "CAVPHTDZJKOPAMEI474ABMX75VIC5GXG4N53V6D5VX6AZHMHYNA6FPVQ",
  governance: "CAMQSYAH6YL7NMMSGWTZ4VDS6WLDDPEIT6TGUQY5DPCPIAKN57AUEJN5",
  oracle: "",
};

/**
 * Mainnet Contract Addresses
 * NOT YET DEPLOYED
 */
const MAINNET_CONTRACTS: ContractAddresses = {
  assetToken: "", // Not deployed yet
  treasury: "",   // Not deployed yet
};

export const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    contracts: TESTNET_CONTRACTS,
  },
  mainnet: {
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    horizonUrl: "https://horizon.stellar.org",
    sorobanRpcUrl: "https://soroban.stellar.org",
    contracts: MAINNET_CONTRACTS,
  },
  local: {
    networkPassphrase: "Standalone Network ; February 2017",
    horizonUrl: "http://localhost:8000",
    sorobanRpcUrl: "http://localhost:8000/soroban/rpc",
    contracts: {
      assetToken: "",
      treasury: "",
    },
  },
};

/**
 * Get the network configuration for the current environment
 */
export function getNetworkConfig(): NetworkConfig {
  const network = process.env.STELLAR_NETWORK || "testnet";
  const config = NETWORK_CONFIGS[network];
  
  if (!config) {
    throw new Error(`Unknown network: ${network}`);
  }
  
  return config;
}

/**
 * Get contract addresses for the current environment
 */
export function getContractAddresses(): ContractAddresses {
  const contracts = getNetworkConfig().contracts;
  return {
    assetToken: process.env.ASSET_TOKEN_CONTRACT_ID || contracts.assetToken,
    treasury: process.env.TREASURY_CONTRACT_ID || contracts.treasury,
    yieldDistributor:
      process.env.YIELD_DISTRIBUTOR_CONTRACT_ID || contracts.yieldDistributor,
    governance: process.env.GOVERNANCE_CONTRACT_ID || contracts.governance,
    oracle: process.env.ORACLE_CONTRACT_ID || contracts.oracle,
  };
}

/**
 * Validate that required contracts are deployed
 */
export function validateContractsDeployed(): void {
  const contracts = getContractAddresses();
  
  if (!contracts.assetToken) {
    throw new Error("Asset Token contract not deployed");
  }
  
  if (!contracts.treasury) {
    throw new Error("Treasury contract not deployed");
  }
}

export default {
  getNetworkConfig,
  getContractAddresses,
  validateContractsDeployed,
  NETWORK_CONFIGS,
};
