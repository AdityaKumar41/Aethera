// ============================================
// Stellar Configuration
// ============================================

import * as StellarSdk from '@stellar/stellar-sdk';

export type NetworkType = 'testnet' | 'mainnet';

interface NetworkConfig {
  networkPassphrase: string;
  horizonUrl: string;
  rpcUrl: string;
  friendbotUrl?: string;
}

const NETWORKS: Record<NetworkType, NetworkConfig> = {
  testnet: {
    networkPassphrase: StellarSdk.Networks.TESTNET,
    horizonUrl: 'https://horizon-testnet.stellar.org',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    friendbotUrl: 'https://friendbot.stellar.org',
  },
  mainnet: {
    networkPassphrase: StellarSdk.Networks.PUBLIC,
    horizonUrl: 'https://horizon.stellar.org',
    rpcUrl: 'https://soroban.stellar.org',
  },
};

export function getNetworkConfig(network: NetworkType = 'testnet'): NetworkConfig {
  return NETWORKS[network];
}

export { NETWORKS };
