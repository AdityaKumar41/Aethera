/**
 * Relayer Service
 * 
 * Manages the admin relayer wallet for sponsoring user transactions.
 * The relayer pays gas fees so users don't need XLM for transactions.
 */

import { Keypair, Transaction, TransactionBuilder, FeeBumpTransaction, Networks } from "@stellar/stellar-sdk";
import type { Horizon } from "@stellar/stellar-sdk";
import { StellarClient, stellarClient } from "./client";
import { getNetworkConfig } from "./config";
import crypto from "crypto";

export interface RelayerWalletInfo {
  publicKey: string;
  xlmBalance: string;
  usdcBalance: string;
  isActive: boolean;
  lastUsed?: Date;
}

export interface RelayerTransaction {
  hash: string;
  type: "sponsor" | "fund";
  amount: string;
  timestamp: Date;
  status: "success" | "failed" | "pending";
}

export class RelayerService {
  private client: StellarClient;
  private relayerKeypair: Keypair | null = null;
  private encryptionKey: string;

  constructor(client: StellarClient = stellarClient) {
    this.client = client;
    this.encryptionKey = this.generateEncryptionKey();
  }

  private generateEncryptionKey(): string {
    return crypto
      .createHash("sha256")
      .update(process.env.WALLET_ENCRYPTION_SECRET || "default-aethera-dev-key")
      .digest("base64")
      .slice(0, 32);
  }

  /**
   * Initialize the relayer with encrypted keypair
   */
  async initialize(): Promise<void> {
    // Refresh encryption key in case env vars were loaded late
    this.encryptionKey = this.generateEncryptionKey();
    
    const publicKey = process.env.ADMIN_RELAYER_PUBLIC_KEY;
    const encryptedSecret = process.env.ADMIN_RELAYER_SECRET_ENCRYPTED;

    if (!publicKey || !encryptedSecret) {
      console.warn("[Relayer] Relayer wallet not configured");
      return;
    }

    try {
      const secret = this.decryptSecret(encryptedSecret);
      this.relayerKeypair = Keypair.fromSecret(secret);
      console.log(`[Relayer] Initialized with wallet: ${publicKey}`);
    } catch (error) {
      console.error("[Relayer] Failed to initialize:", error);
    }
  }

  /**
   * Check if relayer is configured and has sufficient funds
   */
  async isReady(): Promise<boolean> {
    if (!this.relayerKeypair) {
      return false;
    }

    try {
      const balance = await this.getXlmBalance();
      // Need at least 10 XLM for operations
      return parseFloat(balance) >= 10;
    } catch {
      return false;
    }
  }

  /**
   * Get relayer wallet information
   */
  async getWalletInfo(): Promise<RelayerWalletInfo | null> {
    const publicKey = process.env.ADMIN_RELAYER_PUBLIC_KEY;
    
    if (!publicKey) {
      return null;
    }

    try {
      const server = this.client.getHorizonServer();
      const account = await server.loadAccount(publicKey);
      
      // Find XLM and USDC balances
      let xlmBalance = "0";
      let usdcBalance = "0";

      for (const balance of account.balances) {
        if (balance.asset_type === "native") {
          xlmBalance = balance.balance;
        } else if ("asset_code" in balance && balance.asset_code === "USDC") {
          usdcBalance = balance.balance;
        }
      }

      return {
        publicKey,
        xlmBalance,
        usdcBalance,
        isActive: this.relayerKeypair !== null,
      };
    } catch (error: any) {
      console.error("[Relayer] Failed to get wallet info:", error.message);
      return {
        publicKey,
        xlmBalance: "0",
        usdcBalance: "0",
        isActive: false,
      };
    }
  }

  /**
   * Get XLM balance of relayer
   */
  async getXlmBalance(): Promise<string> {
    const info = await this.getWalletInfo();
    return info?.xlmBalance || "0";
  }

  /**
   * Sign and sponsor a user transaction (fee bump)
   * The relayer pays the gas fee instead of the user
   */
  async sponsorTransaction(userTransaction: Transaction): Promise<FeeBumpTransaction> {
    if (!this.relayerKeypair) {
      throw new Error("Relayer not initialized");
    }

    const config = getNetworkConfig();
    const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
      this.relayerKeypair,
      "1000000", // 0.1 XLM max fee
      userTransaction,
      config.networkPassphrase
    );

    feeBumpTx.sign(this.relayerKeypair);
    return feeBumpTx;
  }

  /**
   * Submit a sponsored transaction
   */
  async submitSponsoredTransaction(tx: FeeBumpTransaction): Promise<string> {
    const server = this.client.getHorizonServer();
    const result = await server.submitTransaction(tx);
    return result.hash;
  }

  /**
   * Get recent transactions for the relayer wallet
   */
  async getRecentTransactions(limit: number = 10): Promise<RelayerTransaction[]> {
    const publicKey = process.env.ADMIN_RELAYER_PUBLIC_KEY;
    
    if (!publicKey) {
      return [];
    }

    try {
      const server = this.client.getHorizonServer();
      const transactions = await server
        .transactions()
        .forAccount(publicKey)
        .limit(limit)
        .order("desc")
        .call();

      return transactions.records.map((tx: any) => ({
        hash: tx.hash,
        type: "sponsor" as const,
        amount: tx.fee_charged,
        timestamp: new Date(tx.created_at),
        status: tx.successful ? "success" as const : "failed" as const,
      }));
    } catch (error) {
      console.error("[Relayer] Failed to get transactions:", error);
      return [];
    }
  }

  /**
   * Fund the relayer from testnet friendbot (testnet only)
   */
  async fundFromFriendbot(): Promise<boolean> {
    const publicKey = process.env.ADMIN_RELAYER_PUBLIC_KEY;
    
    if (!publicKey) {
      throw new Error("Relayer public key not configured");
    }

    const network = process.env.STELLAR_NETWORK || "testnet";
    if (network !== "testnet") {
      throw new Error("Friendbot only available on testnet");
    }

    try {
      const response = await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
      );
      
      if (!response.ok) {
        throw new Error(`Friendbot request failed: ${response.statusText}`);
      }

      console.log(`[Relayer] Funded from friendbot: ${publicKey}`);
      return true;
    } catch (error: any) {
      console.error("[Relayer] Friendbot funding failed:", error.message);
      return false;
    }
  }

  /**
   * Get the relayer keypair (for signing)
   */
  getKeypair(): Keypair | null {
    return this.relayerKeypair;
  }

  /**
   * Get the relayer public key
   */
  getPublicKey(): string | null {
    return process.env.ADMIN_RELAYER_PUBLIC_KEY || null;
  }

  /**
   * Decrypt a secret key
   */
  private decryptSecret(encrypted: string): string {
    const [ivHex, encryptedHex] = encrypted.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(this.encryptionKey),
      iv
    );

    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  }

  /**
   * Encrypt a secret key (utility for setup)
   */
  encryptSecret(secret: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(this.encryptionKey),
      iv
    );

    let encrypted = cipher.update(secret);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  }
}

// Singleton instance
let relayerServiceInstance: RelayerService | null = null;

export function getRelayerService(): RelayerService {
  if (!relayerServiceInstance) {
    relayerServiceInstance = new RelayerService();
  }
  return relayerServiceInstance;
}

export const relayerService = new RelayerService();
