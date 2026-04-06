import {
  Keypair,
  Operation,
  TransactionBuilder,
  BASE_FEE,
  Asset,
} from "@stellar/stellar-sdk";
import crypto from "crypto";
import { stellarClient } from "./client.js";

// Note: trustlineService import would create circular dependency
// Trustline creation happens separately after wallet creation

export interface CustodialWallet {
  publicKey: string;
  encryptedSecret: string;
}

function titleCaseOperation(type: string): string {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAssetLabel(assetType?: string, assetCode?: string): string {
  return assetType === "native" ? "XLM" : assetCode || "ASSET";
}

function summarizeOperation(publicKey: string, operation: any) {
  switch (operation.type) {
    case "create_account": {
      const account = operation.account || operation.destination;
      const funder = operation.funder || operation.source_account;
      const incoming = account === publicKey;
      return {
        amount: operation.starting_balance || undefined,
        asset: "XLM",
        direction: incoming ? "in" : "out",
        counterparty: incoming ? funder : account,
        summary: incoming ? "Account activated" : "Account created",
      };
    }

    case "payment": {
      const incoming =
        operation.to === publicKey || operation.destination === publicKey;
      return {
        amount: operation.amount || undefined,
        asset: getAssetLabel(operation.asset_type, operation.asset_code),
        direction: incoming ? "in" : "out",
        counterparty: incoming
          ? operation.from || operation.source_account
          : operation.to || operation.destination,
        summary: incoming ? "Payment received" : "Payment sent",
      };
    }

    case "path_payment_strict_receive":
    case "path_payment_strict_send": {
      const incoming = operation.destination === publicKey;
      return {
        amount:
          operation.dest_amount ||
          operation.amount ||
          operation.source_amount ||
          operation.destination_min ||
          undefined,
        asset: incoming
          ? getAssetLabel(
              operation.dest_asset_type || operation.destination_asset_type,
              operation.dest_asset_code || operation.destination_asset_code,
            )
          : getAssetLabel(
              operation.source_asset_type,
              operation.source_asset_code,
            ),
        direction: incoming ? "in" : "out",
        counterparty: incoming
          ? operation.source_account
          : operation.destination,
        summary: incoming ? "Swap received" : "Swap sent",
      };
    }

    case "change_trust": {
      const asset = operation.asset_code || "ASSET";
      return {
        amount: undefined,
        asset,
        direction: "neutral",
        counterparty: operation.source_account,
        summary: `${asset} trustline enabled`,
      };
    }

    case "claim_claimable_balance":
      return {
        amount: undefined,
        asset: undefined,
        direction: "in",
        counterparty: operation.source_account,
        summary: "Claimed balance",
      };

    default:
      return {
        amount: undefined,
        asset: undefined,
        direction: "neutral",
        counterparty: operation.source_account,
        summary: titleCaseOperation(operation.type || "transaction"),
      };
  }
}

export class WalletService {
  private encryptionKey: string;

  constructor(
    encryptionKey: string = process.env.WALLET_ENCRYPTION_SECRET ||
      process.env.ENCRYPTION_KEY ||
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
        asset: b.asset_code || "XLM",
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
      const [txs, operations] = await Promise.all([
        stellarClient.horizon
          .transactions()
          .forAccount(publicKey)
          .order("desc")
          .limit(limit * 3)
          .call(),
        stellarClient.horizon
          .operations()
          .forAccount(publicKey)
          .order("desc")
          .limit(limit * 5)
          .call(),
      ]);

      const txMap = new Map(
        txs.records.map((record: any) => [record.hash, record]),
      );

      const operationHistory = operations.records
        .map((operation: any) => {
          const tx =
            txMap.get(operation.transaction_hash) ||
            txs.records.find((record: any) => record.id === operation.transaction_id);
          const details = summarizeOperation(publicKey, operation);

          return {
            id: operation.id,
            hash: operation.transaction_hash || tx?.hash || operation.id,
            created_at: operation.created_at || tx?.created_at,
            source_account: operation.source_account || tx?.source_account,
            fee_charged: tx?.fee_charged || "0",
            memo: tx?.memo || "",
            successful:
              tx?.successful ?? operation.transaction_successful ?? true,
            operation_type: operation.type,
            summary: details.summary,
            amount: details.amount,
            asset: details.asset,
            direction: details.direction,
            counterparty: details.counterparty,
          };
        })
        .filter((record: any) => record.created_at)
        .slice(0, limit);

      if (operationHistory.length > 0) {
        return operationHistory;
      }

      return txs.records.slice(0, limit).map((r: any) => ({
        id: r.id,
        hash: r.hash,
        created_at: r.created_at,
        source_account: r.source_account,
        fee_charged: r.fee_charged,
        memo: r.memo,
        successful: r.successful,
        operation_type: "transaction",
        summary: "Transaction submitted",
        amount: undefined,
        asset: undefined,
        direction: "neutral",
        counterparty: r.source_account,
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

  /**
   * Fetches pending claimable balances for an account
   */
  async getClaimableBalances(publicKey: string): Promise<any[]> {
    try {
      const response = await stellarClient.horizon
        .claimableBalances()
        .claimant(publicKey)
        .call();

      return response.records.map((cb: any) => ({
        id: cb.id,
        asset: cb.asset,
        amount: cb.amount,
        sponsor: cb.sponsor,
        last_modified_ledger: cb.last_modified_ledger,
      }));
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Claims specific claimable balances
   */
  async claimBalances(
    encryptedSecret: string,
    balanceIds: string[],
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const secret = this.decryptSecret(encryptedSecret);
      const keypair = Keypair.fromSecret(secret);
      const publicKey = keypair.publicKey();

      const account = await stellarClient.horizon.loadAccount(publicKey);
      const txBuilder = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: stellarClient.getNetworkPassphrase(),
      });

      // Fetch all balances to see which trustlines are needed
      const pendingBalances = await stellarClient.horizon
        .claimableBalances()
        .claimant(publicKey)
        .call();

      for (const balanceId of balanceIds) {
        const balance = pendingBalances.records.find(
          (b: any) => b.id === balanceId,
        );
        if (!balance) continue;

        // Ensure trustline exists if not native
        const assetParts = balance.asset.split(":");
        if (assetParts.length === 2) {
          const asset = new Asset(assetParts[0], assetParts[1]);
          const hasTrustline = account.balances.some(
            (b: any) =>
              b.asset_code === asset.getCode() &&
              b.asset_issuer === asset.getIssuer(),
          );

          if (!hasTrustline) {
            txBuilder.addOperation(Operation.changeTrust({ asset }));
          }
        }

        txBuilder.addOperation(Operation.claimClaimableBalance({ balanceId }));
      }

      const transaction = txBuilder.setTimeout(180).build();
      transaction.sign(keypair);

      const result = await stellarClient.horizon.submitTransaction(transaction);
      return { success: true, txHash: result.hash };
    } catch (error: any) {
      console.error("[Stellar] Claiming failed:", error);
      return {
        success: false,
        error: error.message || "Failed to claim balances",
      };
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

/**
 * Helper function to fund account with Friendbot (Testnet only)
 */
export async function fundWithFriendbot(
  publicKey: string,
): Promise<string | null> {
  try {
    const response = await stellarClient.horizon.friendbot(publicKey).call();
    return response.hash || null;
  } catch (error) {
    console.error("[Stellar] Friendbot funding failed:", error);
    return null;
  }
}
