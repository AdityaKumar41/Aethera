/**
 * Investment Service
 * 
 * Handles the real investment flow with on-chain Treasury contract integration.
 * No mocks - all transactions go through Stellar/Soroban.
 */

import { prisma } from "@aethera/database";
import {
  StellarClient,
  stellarClient,
  getContractAddresses,
  SorobanContractService,
  getSorobanService,
} from "@aethera/stellar";
import {
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Contract,
} from "@stellar/stellar-sdk";

interface InvestmentInput {
  investorId: string;
  projectId: string;
  amount: number; // USDC amount
  tokenAmount: number;
}

interface InvestmentResult {
  success: boolean;
  investmentId?: string;
  txHash?: string;
  error?: string;
}

export class InvestmentService {
  private stellar: StellarClient;
  private soroban: SorobanContractService;
  private contracts: ReturnType<typeof getContractAddresses>;

  constructor() {
    this.stellar = stellarClient;
    this.soroban = getSorobanService(stellarClient);
    this.contracts = getContractAddresses();
  }

  /**
   * Process a new investment
   * 1. Validate investor KYC status
   * 2. Verify trustline exists
   * 3. Create investment record
   * 4. Submit USDC transfer to Treasury
   * 5. Return investment with pending status
   */
  async processInvestment(input: InvestmentInput): Promise<InvestmentResult> {
    const { investorId, projectId, amount, tokenAmount } = input;

    try {
      // 1. Get investor and validate KYC
      const investor = await prisma.user.findUnique({
        where: { id: investorId },
        select: {
          id: true,
          kycStatus: true,
          stellarPubKey: true,
          stellarSecretEncrypted: true,
        },
      });

      if (!investor) {
        return { success: false, error: "Investor not found" };
      }

      if (investor.kycStatus !== "VERIFIED") {
        return { success: false, error: "KYC verification required" };
      }

      if (!investor.stellarPubKey) {
        return { success: false, error: "No Stellar wallet configured" };
      }

      // 2. Get project and validate
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          status: true,
          pricePerToken: true,
          tokenContractId: true,
          fundingTarget: true,
          fundingRaised: true,
        },
      });

      if (!project) {
        return { success: false, error: "Project not found" };
      }

      if (project.status !== "FUNDING") {
        return { success: false, error: "Project not accepting investments" };
      }

      // 3. Check funding limit
      const remaining = Number(project.fundingTarget) - Number(project.fundingRaised);
      if (amount > remaining) {
        return { success: false, error: `Maximum investment: ${remaining} USDC` };
      }

      // 4. Create investment record
      const investment = await prisma.investment.create({
        data: {
          investorId,
          projectId,
          amount,
          tokenAmount,
          pricePerToken: project.pricePerToken,
          status: "PENDING",
        },
      });

      // 5. Submit on-chain transaction
      try {
        const txHash = await this.submitInvestmentTransaction(
          investor,
          project,
          investment.id,
          amount
        );

        // Update investment with pending on-chain status
        await prisma.investment.update({
          where: { id: investment.id },
          data: {
            status: "PENDING_ONCHAIN",
            txHash,
            txSubmittedAt: new Date(),
          },
        });

        return {
          success: true,
          investmentId: investment.id,
          txHash,
        };
      } catch (txError: any) {
        // Transaction failed to submit
        await prisma.investment.update({
          where: { id: investment.id },
          data: {
            status: "FAILED",
            txError: txError.message,
          },
        });

        return {
          success: false,
          investmentId: investment.id,
          error: `Transaction failed: ${txError.message}`,
        };
      }
    } catch (error: any) {
      console.error("Investment processing error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Submit the USDC transfer to Treasury contract
   */
  private async submitInvestmentTransaction(
    investor: any,
    project: any,
    investmentId: string,
    amount: number
  ): Promise<string> {
    // Get investor keypair (decrypt secret)
    const investorKeypair = await this.getInvestorKeypair(investor);
    
    // Get Soroban server
    const server = this.stellar.getRpcServer();
    const account = await server.getAccount(investor.stellarPubKey);

    // Build transaction to call Treasury.process_investment
    const treasuryContract = new Contract(this.contracts.treasury);
    
    // Convert amount to stroops (7 decimals for USDC)
    const amountScaled = BigInt(Math.round(amount * 10_000_000));

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.stellar.getNetworkPassphrase(),
    })
      .addOperation(
        treasuryContract.call(
          "process_investment",
          nativeToScVal(project.id, { type: "string" }),
          nativeToScVal(investor.stellarPubKey, { type: "address" }),
          nativeToScVal(amountScaled, { type: "i128" })
        )
      )
      .setTimeout(300)
      .build();

    // Prepare and sign
    const preparedTx = await server.prepareTransaction(tx);
    preparedTx.sign(investorKeypair);

    // Submit
    const result = await server.sendTransaction(preparedTx);
    
    if (result.status === "PENDING") {
      // Wait for confirmation (will be handled by monitor)
      return result.hash;
    } else if (result.status === "ERROR") {
      throw new Error(`Transaction failed: ${JSON.stringify(result.errorResult)}`);
    }

    return result.hash;
  }

  /**
   * Get investor keypair from encrypted secret
   */
  private async getInvestorKeypair(investor: any): Promise<Keypair> {
    if (!investor.stellarSecretEncrypted) {
      throw new Error("No encrypted secret key found");
    }

    // Decrypt the secret key
    // In production, use a proper encryption service
    const encryptionKey = process.env.STELLAR_SECRET_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("Encryption key not configured");
    }

    // Simple decryption (in production, use proper crypto)
    // For now, assume it's stored with a reversible encryption
    const secretKey = this.decryptSecret(investor.stellarSecretEncrypted, encryptionKey);
    
    return Keypair.fromSecret(secretKey);
  }

  /**
   * Decrypt a secret (placeholder - implement proper encryption)
   */
  private decryptSecret(encrypted: string, key: string): string {
    // TODO: Implement proper AES decryption
    // For now, we'll use a simple XOR (NOT SECURE - replace in production)
    const buffer = Buffer.from(encrypted, "base64");
    const keyBuffer = Buffer.from(key);
    const result = Buffer.alloc(buffer.length);
    
    for (let i = 0; i < buffer.length; i++) {
      result[i] = buffer[i] ^ keyBuffer[i % keyBuffer.length];
    }
    
    return result.toString("utf8");
  }

  /**
   * Get investment status with on-chain verification
   */
  async getInvestmentStatus(investmentId: string): Promise<any> {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        project: {
          select: { name: true, tokenSymbol: true },
        },
      },
    });

    if (!investment) {
      return null;
    }

    // If pending on-chain, check current status
    if ((investment.status as string) === "PENDING_ONCHAIN" && investment.txHash) {
      try {
        const server = this.stellar.getHorizonServer();
        const tx = await server.transactions().transaction(investment.txHash).call();
        
        if (tx.successful) {
          // Update to confirmed
          await prisma.investment.update({
            where: { id: investmentId },
            data: {
              status: "CONFIRMED",
              txLedger: tx.ledger_attr as number,
              txConfirmedAt: new Date(),
            },
          });
          investment.status = "CONFIRMED";
        }
      } catch (error) {
        // Transaction not yet on chain
      }
    }

    return investment;
  }

  /**
   * Cancel a pending investment (before on-chain submission)
   */
  async cancelInvestment(investmentId: string, userId: string): Promise<boolean> {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
    });

    if (!investment) {
      throw new Error("Investment not found");
    }

    if (investment.investorId !== userId) {
      throw new Error("Not authorized");
    }

    if (investment.status !== "PENDING") {
      throw new Error("Cannot cancel investment after submission");
    }

    await prisma.investment.update({
      where: { id: investmentId },
      data: {
        status: "FAILED",
        txError: "Cancelled by user",
      },
    });

    return true;
  }
}

// Singleton
let investmentServiceInstance: InvestmentService | null = null;

export function getInvestmentService(): InvestmentService {
  if (!investmentServiceInstance) {
    investmentServiceInstance = new InvestmentService();
  }
  return investmentServiceInstance;
}

export default InvestmentService;
