import { Keypair } from "@stellar/stellar-sdk";
import crypto from "crypto";
import { stellarClient } from "./client";

// Note: trustlineService import would create circular dependency
// Trustline creation happens separately after wallet creation

export interface CustodialWallet {
  publicKey: string;
  encryptedSecret: string;
}

export class WalletService {
  private encryptionKey: string;

  constructor(
    encryptionKey: string = process.env.ENCRYPTION_KEY ||
      "default-aethera-dev-key",
  ) {
    this.encryptionKey = crypto
      .createHash("sha256")
      .update(encryptionKey)
      .digest("base64")
      .slice(0, 32);
  }

  /**
   * Generates a new Stellar Keypair and returns encrypted secret
   */
  async createWallet(): Promise<CustodialWallet> {
    const keypair = Keypair.random();
    const secret = keypair.secret();

    return {
      publicKey: keypair.publicKey(),
      encryptedSecret: this.encrypt(secret),
    };
  }

  /**
   * Decrypts a secret key for use in signing
   */
  decryptSecret(encryptedSecret: string): string {
    const [ivHex, encryptedHex] = encryptedSecret.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(this.encryptionKey),
      iv,
    );

    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  }

  /**
   * Fetches real balances from Horizon
   */
  async getBalances(publicKey: string): Promise<any[]> {
    try {
      const account = await stellarClient.horizon.loadAccount(publicKey);
      return account.balances.map((b: any) => ({
        asset_type: b.asset_type,
        asset_code: b.asset_code,
        asset_issuer: b.asset_issuer,
        balance: b.balance,
      }));
    } catch (error: any) {
      if (error.response?.status === 404) {
        return []; // Account not funded/created yet
      }
      throw error;
    }
  }

  /**
   * Checks if account exists on ledger
   */
  async isAccountFunded(publicKey: string): Promise<boolean> {
    try {
      await stellarClient.horizon.loadAccount(publicKey);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Fetches recent transactions for an account
   */
  async getTransactions(publicKey: string, limit = 10): Promise<any[]> {
    try {
      const txs = await stellarClient.horizon
        .transactions()
        .forAccount(publicKey)
        .order("desc")
        .limit(limit)
        .call();
      
      return txs.records.map((r: any) => ({
        id: r.id,
        hash: r.hash,
        created_at: r.created_at,
        source_account: r.source_account,
        fee_charged: r.fee_charged,
        memo: r.memo,
        successful: r.successful,
      }));
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Funds an account using Friendbot (Testnet only)
   */
  async fundWithFriendbot(publicKey: string): Promise<boolean> {
    try {
      await stellarClient.horizon.friendbot(publicKey).call();
      return true;
    } catch (error) {
      console.error("[Stellar] Friendbot funding failed:", error);
      return false;
    }
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(this.encryptionKey),
      iv,
    );

    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  }
}

export const walletService = new WalletService();
