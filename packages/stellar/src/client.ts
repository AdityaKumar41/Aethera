// ============================================
// Stellar Client - Horizon & Soroban RPC
// ============================================

import * as StellarSdk from '@stellar/stellar-sdk';
import { getNetworkConfig, type NetworkType } from './config';

export class StellarClient {
  private network: NetworkType;
  private horizonServer: StellarSdk.Horizon.Server;
  private rpcServer: StellarSdk.SorobanRpc.Server;
  private networkPassphrase: string;

  constructor(network: NetworkType = 'testnet') {
    this.network = network;
    const config = getNetworkConfig(network);
    this.networkPassphrase = config.networkPassphrase;
    this.horizonServer = new StellarSdk.Horizon.Server(config.horizonUrl);
    this.rpcServer = new StellarSdk.SorobanRpc.Server(config.rpcUrl);
  }

  // ============================================
  // Account Operations
  // ============================================

  /**
   * Generate a new random keypair
   */
  generateKeypair(): StellarSdk.Keypair {
    return StellarSdk.Keypair.random();
  }

  /**
   * Create keypair from secret key
   */
  keypairFromSecret(secret: string): StellarSdk.Keypair {
    return StellarSdk.Keypair.fromSecret(secret);
  }

  /**
   * Get account details from Horizon
   */
  async getAccount(publicKey: string): Promise<StellarSdk.Horizon.AccountResponse> {
    return await this.horizonServer.loadAccount(publicKey);
  }

  /**
   * Check if account exists
   */
  async accountExists(publicKey: string): Promise<boolean> {
    try {
      await this.horizonServer.loadAccount(publicKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fund account on testnet using friendbot
   */
  async fundTestnetAccount(publicKey: string): Promise<boolean> {
    if (this.network !== 'testnet') {
      throw new Error('Friendbot only available on testnet');
    }

    try {
      const response = await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
      );
      return response.ok;
    } catch (error) {
      console.error('Friendbot funding failed:', error);
      return false;
    }
  }

  // ============================================
  // Balance Operations
  // ============================================

  /**
   * Get native XLM balance
   */
  async getXLMBalance(publicKey: string): Promise<string> {
    const account = await this.getAccount(publicKey);
    const nativeBalance = account.balances.find(
      (b): b is StellarSdk.Horizon.HorizonApi.BalanceLineNative => b.asset_type === 'native'
    );
    return nativeBalance?.balance ?? '0';
  }

  /**
   * Get all balances for an account
   */
  async getBalances(publicKey: string): Promise<StellarSdk.Horizon.HorizonApi.BalanceLine[]> {
    const account = await this.getAccount(publicKey);
    return account.balances;
  }

  /**
   * Get balance of a specific asset
   */
  async getAssetBalance(
    publicKey: string,
    assetCode: string,
    assetIssuer: string
  ): Promise<string> {
    const account = await this.getAccount(publicKey);
    const assetBalance = account.balances.find(
      (b): b is StellarSdk.Horizon.HorizonApi.BalanceLineAsset =>
        b.asset_type !== 'native' &&
        b.asset_type !== 'liquidity_pool_shares' &&
        b.asset_code === assetCode &&
        b.asset_issuer === assetIssuer
    );
    return assetBalance?.balance ?? '0';
  }

  // ============================================
  // Transaction Operations
  // ============================================

  /**
   * Build and sign a payment transaction
   */
  async buildPaymentTransaction(
    sourceKeypair: StellarSdk.Keypair,
    destinationPublicKey: string,
    asset: StellarSdk.Asset,
    amount: string,
    memo?: string
  ): Promise<StellarSdk.Transaction> {
    const sourceAccount = await this.getAccount(sourceKeypair.publicKey());

    let builder = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: destinationPublicKey,
          asset: asset,
          amount: amount,
        })
      )
      .setTimeout(180);

    if (memo) {
      builder = builder.addMemo(StellarSdk.Memo.text(memo));
    }

    const transaction = builder.build();
    transaction.sign(sourceKeypair);

    return transaction;
  }

  /**
   * Submit a signed transaction to the network
   */
  async submitTransaction(
    transaction: StellarSdk.Transaction
  ): Promise<StellarSdk.Horizon.HorizonApi.SubmitTransactionResponse> {
    return await this.horizonServer.submitTransaction(transaction);
  }

  /**
   * Send a payment and return the transaction hash
   */
  async sendPayment(
    sourceKeypair: StellarSdk.Keypair,
    destinationPublicKey: string,
    asset: StellarSdk.Asset,
    amount: string,
    memo?: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const transaction = await this.buildPaymentTransaction(
        sourceKeypair,
        destinationPublicKey,
        asset,
        amount,
        memo
      );
      const result = await this.submitTransaction(transaction);
      return { success: true, txHash: result.hash };
    } catch (error) {
      console.error('Payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================
  // Asset Operations
  // ============================================

  /**
   * Create a trustline for an asset
   */
  async createTrustline(
    accountKeypair: StellarSdk.Keypair,
    asset: StellarSdk.Asset,
    limit?: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const account = await this.getAccount(accountKeypair.publicKey());

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.changeTrust({
            asset: asset,
            limit: limit,
          })
        )
        .setTimeout(180)
        .build();

      transaction.sign(accountKeypair);
      const result = await this.submitTransaction(transaction);
      return { success: true, txHash: result.hash };
    } catch (error) {
      console.error('Trustline creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================
  // Getters
  // ============================================

  getHorizonServer(): StellarSdk.Horizon.Server {
    return this.horizonServer;
  }

  getRpcServer(): StellarSdk.SorobanRpc.Server {
    return this.rpcServer;
  }

  getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }

  getNetwork(): NetworkType {
    return this.network;
  }
}

// Export singleton for default usage
export const stellarClient = new StellarClient(
  (process.env.STELLAR_NETWORK as NetworkType) || 'testnet'
);