/**
 * Transaction Monitoring Service
 * 
 * Monitors pending on-chain transactions and updates their status.
 * Handles transaction finality, retries, and failure states.
 */

import { prisma } from "@aethera/database";
import { StellarClient, stellarClient, getContractAddresses, contractService } from "@aethera/stellar";
import { Horizon, Keypair } from "@stellar/stellar-sdk";

interface TransactionResult {
  confirmed: boolean;
  ledger?: number;
  error?: string;
}

export class TransactionMonitorService {
  private stellar: StellarClient;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.stellar = stellarClient;
  }

  /**
   * Start the transaction monitoring loop
   */
  start(intervalMs: number = 10000): void {
    if (this.isRunning) {
      console.log("Transaction monitor already running");
      return;
    }

    console.log(`Starting transaction monitor (interval: ${intervalMs}ms)`);
    this.isRunning = true;
    
    // Run immediately, then on interval
    this.processAllPendingTransactions();
    this.pollingInterval = setInterval(() => {
      this.processAllPendingTransactions();
    }, intervalMs);
  }

  /**
   * Stop the transaction monitoring loop
   */
  stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isRunning = false;
    console.log("Transaction monitor stopped");
  }

  /**
   * Process all pending on-chain transactions
   */
  async processAllPendingTransactions(): Promise<void> {
    try {
      // Find all investments with pending on-chain status
      const pendingInvestments = await prisma.investment.findMany({
        where: {
          status: "PENDING_ONCHAIN",
          txHash: { not: null },
        },
        include: {
          investor: { select: { id: true, stellarPubKey: true } },
          project: { select: { id: true, tokenContractId: true, tokenSymbol: true } },
        },
      });

      if (pendingInvestments.length > 0) {
        console.log(`Processing ${pendingInvestments.length} pending transactions`);
      }

      for (const investment of pendingInvestments) {
        await this.checkInvestmentTransaction(investment);
      }

      // Also check pending mints
      const pendingMints = await prisma.investment.findMany({
        where: {
          status: "CONFIRMED",
          mintStatus: "SUBMITTED",
          mintTxHash: { not: null },
        },
      });

      for (const investment of pendingMints) {
        await this.checkMintTransaction(investment);
      }
    } catch (error) {
      console.error("Error processing pending transactions:", error);
    }
  }

  /**
   * Check an investment transaction status
   */
  private async checkInvestmentTransaction(investment: any): Promise<void> {
    if (!investment.txHash) return;

    try {
      const result = await this.getTransactionStatus(investment.txHash);

      if (result.confirmed) {
        // Transaction confirmed - update investment
        await prisma.investment.update({
          where: { id: investment.id },
          data: {
            status: "CONFIRMED",
            txLedger: result.ledger,
            txConfirmedAt: new Date(),
          },
        });

        console.log(`Investment ${investment.id} confirmed at ledger ${result.ledger}`);

        // Log the transaction
        await this.logTransaction({
          type: "INVESTMENT_CONFIRMED",
          investmentId: investment.id,
          projectId: investment.projectId,
          userId: investment.investorId,
          txHash: investment.txHash,
          ledger: result.ledger,
        });

        // Trigger token minting
        await this.triggerTokenMint(investment);
      } else if (result.error) {
        // Transaction failed
        await this.handleTransactionFailure(investment, result.error);
      }
      // If not confirmed and no error, transaction is still pending
    } catch (error: any) {
      console.error(`Error checking transaction ${investment.txHash}:`, error);
      
      // If transaction not found after timeout, mark as failed
      if (error.message?.includes("not found") && this.isTransactionExpired(investment)) {
        await this.handleTransactionFailure(investment, "Transaction expired - not found on chain");
      }
    }
  }

  /**
   * Check token mint transaction status
   */
  private async checkMintTransaction(investment: any): Promise<void> {
    if (!investment.mintTxHash) return;

    try {
      const result = await this.getTransactionStatus(investment.mintTxHash);

      if (result.confirmed) {
        await prisma.investment.update({
          where: { id: investment.id },
          data: {
            mintStatus: "CONFIRMED",
            mintConfirmedAt: new Date(),
          },
        });

        console.log(`Token mint confirmed for investment ${investment.id}`);

        // Log the transaction
        await this.logTransaction({
          type: "TOKEN_MINT_CONFIRMED",
          investmentId: investment.id,
          txHash: investment.mintTxHash,
          ledger: result.ledger,
        });
      } else if (result.error) {
        await prisma.investment.update({
          where: { id: investment.id },
          data: {
            mintStatus: "FAILED",
            txError: result.error,
          },
        });
      }
    } catch (error: any) {
      console.error(`Error checking mint transaction ${investment.mintTxHash}:`, error);
    }
  }

  /**
   * Get transaction status from Stellar network
   */
  private async getTransactionStatus(txHash: string): Promise<TransactionResult> {
    try {
      const server = this.stellar.getHorizonServer();
      const transaction = await server.transactions().transaction(txHash).call();

      return {
        confirmed: transaction.successful,
        ledger: transaction.ledger_attr as number,
        error: transaction.successful ? undefined : "Transaction failed on-chain",
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Transaction not yet on chain
        return { confirmed: false };
      }
      throw error;
    }
  }

  /**
   * Handle transaction failure
   */
  private async handleTransactionFailure(investment: any, error: string): Promise<void> {
    const maxRetries = 3;
    const currentRetries = investment.txRetryCount || 0;

    if (currentRetries < maxRetries) {
      // Retry the transaction
      console.log(`Retrying investment ${investment.id} (attempt ${currentRetries + 1}/${maxRetries})`);
      
      await prisma.investment.update({
        where: { id: investment.id },
        data: {
          txRetryCount: currentRetries + 1,
          status: "PENDING", // Reset to PENDING for reprocessing
          txHash: null,
          txError: error,
        },
      });

      // TODO: Trigger reprocessing through investment queue
    } else {
      // Max retries reached - mark as failed
      await prisma.investment.update({
        where: { id: investment.id },
        data: {
          status: "FAILED",
          txError: error,
        },
      });

      console.error(`Investment ${investment.id} failed after ${maxRetries} retries: ${error}`);

      // Log the failure
      await this.logTransaction({
        type: "INVESTMENT_FAILED",
        investmentId: investment.id,
        projectId: investment.projectId,
        userId: investment.investorId,
        txHash: investment.txHash,
        error,
      });
    }
  }

  /**
   * Trigger token minting after investment is confirmed
   */
  private async triggerTokenMint(investment: any): Promise<void> {
    try {
      if (!investment.project?.tokenContractId) {
        console.log(`No token contract for project ${investment.projectId}, skipping mint`);
        return;
      }

      const relayerSecret = process.env.STAT_RELAYER_SECRET;
      if (!relayerSecret) {
        console.error("Relayer secret not configured for token minting");
        return;
      }

      const adminKeypair = Keypair.fromSecret(relayerSecret);
      const amountScaled = BigInt(Math.round(investment.tokenAmount * 1_000_000)); // 6 decimals for asset tokens

      console.log(`Initiating token mint for investment ${investment.id}...`);

      const result = await contractService.mintTokens(
        investment.project.tokenContractId,
        adminKeypair,
        investment.investor.stellarPubKey,
        amountScaled
      );

      if (result.success && result.txHash) {
        await prisma.investment.update({
          where: { id: investment.id },
          data: {
            mintStatus: "SUBMITTED",
            mintTxHash: result.txHash,
          },
        });
        console.log(`Token mint submitted for ${investment.id}. Tx: ${result.txHash}`);
      } else {
        throw new Error(result.error || "Minting failed");
      }
    } catch (error) {
      console.error(`Error triggering token mint for ${investment.id}:`, error);
      await prisma.investment.update({
        where: { id: investment.id },
        data: {
          mintStatus: "FAILED",
          txError: error instanceof Error ? error.message : "Minting failed",
        },
      });
    }
  }

  /**
   * Check if a transaction has expired (not confirmed within timeout)
   */
  private isTransactionExpired(investment: any): boolean {
    if (!investment.txSubmittedAt) return false;

    const timeoutMs = 5 * 60 * 1000; // 5 minutes
    const submittedAt = new Date(investment.txSubmittedAt).getTime();
    return Date.now() - submittedAt > timeoutMs;
  }

  /**
   * Log a transaction event
   */
  private async logTransaction(data: {
    type: string;
    investmentId?: string;
    projectId?: string;
    userId?: string;
    txHash?: string;
    ledger?: number;
    error?: string;
  }): Promise<void> {
    try {
      await prisma.transactionLog.create({
        data: {
          type: data.type,
          userId: data.userId,
          projectId: data.projectId,
          txHash: data.txHash || `log_${Date.now()}`,
          status: data.error ? "FAILED" : "SUCCESS",
          error: data.error,
          metadata: {
            investmentId: data.investmentId,
            ledger: data.ledger,
          },
        },
      });
    } catch (error) {
      console.error("Error logging transaction:", error);
    }
  }
}

// Singleton instance
let monitorInstance: TransactionMonitorService | null = null;

export function getTransactionMonitor(): TransactionMonitorService {
  if (!monitorInstance) {
    monitorInstance = new TransactionMonitorService();
  }
  return monitorInstance;
}

export default TransactionMonitorService;
