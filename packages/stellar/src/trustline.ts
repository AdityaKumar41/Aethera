// ============================================
// USDC Trustline Management
// ============================================

import {
  Keypair,
  Asset,
  Operation,
  TransactionBuilder,
  Networks,
  Horizon,
  BASE_FEE,
} from "@stellar/stellar-sdk";

/**
 * Stellar Testnet USDC Asset
 * Issuer: GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
 * Asset Code: USDC
 */
export const USDC_ASSET_TESTNET = new Asset(
  "USDC",
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
);

/**
 * Stellar Mainnet USDC Asset (Circle)
 * Issuer: GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
 * Asset Code: USDC
 */
export const USDC_ASSET_MAINNET = new Asset(
  "USDC",
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
);

/**
 * Get the appropriate USDC asset based on environment
 */
export function getUSDCAsset(): Asset {
  const network = process.env.STELLAR_NETWORK || "testnet";
  return network === "mainnet" ? USDC_ASSET_MAINNET : USDC_ASSET_TESTNET;
}

/**
 * Trustline Management Service
 */
export class TrustlineService {
  private server: Horizon.Server;
  private network: Networks;

  constructor() {
    const isTestnet = process.env.STELLAR_NETWORK !== "mainnet";
    this.server = new Horizon.Server(
      isTestnet
        ? "https://horizon-testnet.stellar.org"
        : "https://horizon.stellar.org",
    );
    this.network = isTestnet ? Networks.TESTNET : Networks.PUBLIC;
  }

  /**
   * Check if an account has a USDC trustline
   */
  async hasTrustline(publicKey: string): Promise<boolean> {
    try {
      const account = await this.server.loadAccount(publicKey);
      const usdcAsset = getUSDCAsset();

      // Check if account has USDC balance entry
      const hasTrust = account.balances.some(
        (balance: Horizon.HorizonApi.BalanceLine) => {
          if (balance.asset_type === "native") return false;
          const stellarBalance = balance as Horizon.HorizonApi.BalanceLineAsset;
          return (
            stellarBalance.asset_code === usdcAsset.code &&
            stellarBalance.asset_issuer === usdcAsset.issuer
          );
        },
      );

      return hasTrust;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // Account doesn't exist yet
        return false;
      }
      throw error;
    }
  }

  /**
   * Get USDC balance for an account
   */
  async getUSDCBalance(publicKey: string): Promise<string> {
    try {
      const account = await this.server.loadAccount(publicKey);
      const usdcAsset = getUSDCAsset();

      const usdcBalance = account.balances.find(
        (balance: Horizon.HorizonApi.BalanceLine) => {
          if (balance.asset_type === "native") return false;
          const stellarBalance = balance as Horizon.HorizonApi.BalanceLineAsset;
          return (
            stellarBalance.asset_code === usdcAsset.code &&
            stellarBalance.asset_issuer === usdcAsset.issuer
          );
        },
      ) as Horizon.HorizonApi.BalanceLineAsset | undefined;

      return usdcBalance?.balance || "0";
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return "0";
      }
      throw error;
    }
  }

  /**
   * Create a USDC trustline for an account
   * @returns Transaction hash
   */
  async createTrustline(userKeypair: Keypair): Promise<string> {
    try {
      const account = await this.server.loadAccount(userKeypair.publicKey());
      const usdcAsset = getUSDCAsset();

      // Check if trustline already exists
      const exists = await this.hasTrustline(userKeypair.publicKey());
      if (exists) {
        throw new Error("USDC trustline already exists for this account");
      }

      // Build change trust operation
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.network,
      })
        .addOperation(
          Operation.changeTrust({
            asset: usdcAsset,
            limit: "922337203685.4775807", // Max limit
          }),
        )
        .setTimeout(180)
        .build();

      // Sign with user's keypair
      transaction.sign(userKeypair);

      // Submit transaction
      const result = await this.server.submitTransaction(transaction);

      console.log("✅ USDC trustline created successfully");
      console.log("   Account:", userKeypair.publicKey());
      console.log("   TX Hash:", result.hash);

      return result.hash;
    } catch (error: any) {
      console.error("❌ Trustline creation failed:", error);
      throw new Error(`Failed to create USDC trustline: ${error.message}`);
    }
  }

  /**
   * Create trustline using admin's signature (for custodial wallets)
   * This is the main method used in production
   */
  async createTrustlineForUser(
    userPublicKey: string,
    adminKeypair: Keypair,
  ): Promise<string> {
    try {
      const account = await this.server.loadAccount(userPublicKey);
      const usdcAsset = getUSDCAsset();

      // Check if trustline already exists
      const exists = await this.hasTrustline(userPublicKey);
      if (exists) {
        console.log("⚠️ USDC trustline already exists, skipping...");
        return "already_exists";
      }

      // Build change trust operation
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.network,
      })
        .addOperation(
          Operation.changeTrust({
            asset: usdcAsset,
            limit: "922337203685.4775807", // Max limit
            source: userPublicKey,
          }),
        )
        .setTimeout(180)
        .build();

      // Sign with admin keypair (since we're custodial)
      transaction.sign(adminKeypair);

      // Submit transaction
      const result = await this.server.submitTransaction(transaction);

      console.log("✅ USDC trustline created for user");
      console.log("   User Account:", userPublicKey);
      console.log("   TX Hash:", result.hash);

      return result.hash;
    } catch (error: any) {
      console.error("❌ Trustline creation failed:", error);
      throw new Error(`Failed to create USDC trustline: ${error.message}`);
    }
  }

  /**
   * Remove USDC trustline (balance must be 0)
   */
  async removeTrustline(userKeypair: Keypair): Promise<string> {
    try {
      const account = await this.server.loadAccount(userKeypair.publicKey());
      const usdcAsset = getUSDCAsset();

      // Check balance is zero
      const balance = await this.getUSDCBalance(userKeypair.publicKey());
      if (parseFloat(balance) > 0) {
        throw new Error(
          "Cannot remove trustline with non-zero balance. Current balance: " +
            balance,
        );
      }

      // Build remove trust operation (limit = "0")
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.network,
      })
        .addOperation(
          Operation.changeTrust({
            asset: usdcAsset,
            limit: "0", // Remove trustline
          }),
        )
        .setTimeout(180)
        .build();

      transaction.sign(userKeypair);

      const result = await this.server.submitTransaction(transaction);

      console.log("✅ USDC trustline removed");
      console.log("   TX Hash:", result.hash);

      return result.hash;
    } catch (error: any) {
      console.error("❌ Trustline removal failed:", error);
      throw new Error(`Failed to remove USDC trustline: ${error.message}`);
    }
  }

  /**
   * Batch check trustlines for multiple accounts
   */
  async checkMultipleTrustlines(
    publicKeys: string[],
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    await Promise.all(
      publicKeys.map(async (pubKey) => {
        try {
          const hasTrust = await this.hasTrustline(pubKey);
          results.set(pubKey, hasTrust);
        } catch (error) {
          console.error(`Error checking trustline for ${pubKey}:`, error);
          results.set(pubKey, false);
        }
      }),
    );

    return results;
  }

  /**
   * Get account info including all trustlines
   */
  async getAccountInfo(publicKey: string): Promise<{
    exists: boolean;
    xlmBalance: string;
    usdcBalance: string;
    hasTrustline: boolean;
    trustlines: Array<{ code: string; issuer: string; balance: string }>;
  }> {
    try {
      const account = await this.server.loadAccount(publicKey);

      const xlmBalance =
        account.balances.find(
          (b: Horizon.HorizonApi.BalanceLine) => b.asset_type === "native",
        )?.balance || "0";

      const trustlines = account.balances
        .filter(
          (b: Horizon.HorizonApi.BalanceLine) => b.asset_type !== "native",
        )
        .map((b: Horizon.HorizonApi.BalanceLine) => {
          const bal = b as Horizon.HorizonApi.BalanceLineAsset;
          return {
            code: bal.asset_code,
            issuer: bal.asset_issuer,
            balance: bal.balance,
          };
        });

      const usdcAsset = getUSDCAsset();
      const usdcTrustline = trustlines.find(
        (t: { code: string; issuer: string; balance: string }) =>
          t.code === usdcAsset.code && t.issuer === usdcAsset.issuer,
      );

      return {
        exists: true,
        xlmBalance,
        usdcBalance: usdcTrustline?.balance || "0",
        hasTrustline: !!usdcTrustline,
        trustlines,
      };
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return {
          exists: false,
          xlmBalance: "0",
          usdcBalance: "0",
          hasTrustline: false,
          trustlines: [],
        };
      }
      throw error;
    }
  }
}

// Export singleton instance
export const trustlineService = new TrustlineService();
