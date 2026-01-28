// ============================================
// Stellar Configuration
// ============================================

import * as StellarSdk from "@stellar/stellar-sdk";

export type NetworkType = "testnet" | "mainnet";

interface NetworkConfig {
  networkPassphrase: string;
  horizonUrl: string;
  rpcUrl: string;
  friendbotUrl?: string;
  assetTokenContractId?: string;
  treasuryContractId?: string;
}

const NETWORKS: Record<NetworkType, NetworkConfig> = {
  testnet: {
    networkPassphrase: StellarSdk.Networks.TESTNET,
    horizonUrl: "https://horizon-testnet.stellar.org",
    rpcUrl: "https://soroban-testnet.stellar.org",
    friendbotUrl: "https://friendbot.stellar.org",
    assetTokenContractId:
      process.env.ASSET_TOKEN_CONTRACT_ID ||
      "CBRCDA3COGVNJJEM22MC7V5KZCF3OTNJ2CYHT4OFDJO5SRHFNVDSQJ3N",
    treasuryContractId:
      process.env.TREASURY_CONTRACT_ID ||
      "CDTQZM37IUOU7KDQZVDVWFLO2FSF2OPL2KTRABH7Y5UUGXKA5XCSRX3Q",
  },
  mainnet: {
    networkPassphrase: StellarSdk.Networks.PUBLIC,
    horizonUrl: "https://horizon.stellar.org",
    rpcUrl: "https://soroban.stellar.org",
    assetTokenContractId: process.env.ASSET_TOKEN_CONTRACT_ID || "",
    treasuryContractId: process.env.TREASURY_CONTRACT_ID || "",
  },
};

export function getNetworkConfig(
  network: NetworkType = "testnet",
): NetworkConfig {
  return NETWORKS[network];
}

export { NETWORKS };
