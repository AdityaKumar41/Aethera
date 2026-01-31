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
  contractService,
  getRelayerService,
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
import crypto from "crypto";

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
        const updatedInvestment = await prisma.investment.update({
          where: { id: investment.id },
          data: {
            status: "PENDING_ONCHAIN",
            txHash,
            txSubmittedAt: new Date(),
          },
        });

        // 6. Check if project is now funded and trigger capital release
        const updatedProject = await prisma.project.findUnique({
          where: { id: projectId },
          select: { fundingRaised: true, fundingTarget: true, status: true, installer: { select: { stellarPubKey: true } } }
        });

        if (updatedProject && updatedProject.status === "FUNDED") {
          console.log(`🚀 Project ${projectId} is FUNDED! Triggering capital release...`);
          
          try {
            const contracts = getContractAddresses();
            const relayerSecret = process.env.STAT_RELAYER_SECRET;
            
            if (contracts.treasury && relayerSecret && updatedProject.installer?.stellarPubKey) {
              const relayerKeypair = Keypair.fromSecret(relayerSecret);
              
              const releaseResult = await contractService.releaseEscrow(
                contracts.treasury,
                relayerKeypair,
                projectId,
                updatedProject.installer.stellarPubKey
              );

              if (releaseResult.success) {
                console.log(`✅ Capital released for project ${projectId}. Tx: ${releaseResult.txHash}`);
                
                // Transition project to ACTIVE
                await prisma.project.update({
                  where: { id: projectId },
                  data: { 
                    status: "ACTIVE",
                    // Also initialize total production and carbon credits if null
                    totalEnergyProduced: 0,
                    carbonCredits: 0
                  }
                });
              }
            }
          } catch (releaseError) {
            console.error("Capital release failed:", releaseError);
            // We don't fail the investment if release fails, it can be retried by admin
          }
        }

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

    // Prepare and sign the inner transaction
    const preparedTx = await server.prepareTransaction(tx);
    preparedTx.sign(investorKeypair);

    // Get Relayer for gas sponsorship (Fee Bump)
    const relayer = getRelayerService();
    await relayer.initialize();
    
    let finalTx: any = preparedTx;
    let submissionMethod = (t: any) => server.sendTransaction(t);

    if (await relayer.isReady()) {
        console.log(`[Relayer] Sponsoring transaction for investor: ${investor.stellarPubKey}`);
        try {
            // Fee bump the transaction - Relayer pays the gas
            finalTx = await relayer.sponsorTransaction(preparedTx);
            // Fee bump transactions can also be sent via Soroban RPC if it wraps a Soroban tx
            // or via Horizon if it's a standard one. sendTransaction is safer for Soroban.
        } catch (sponsorError) {
            console.warn("[Relayer] Sponsorship failed, falling back to user-paid fee:", sponsorError);
        }
    } else {
        console.warn("[Relayer] Relayer not ready or insufficient funds. User must pay fees.");
    }

    // Submit the (possibly sponsored) transaction
    const result = await submissionMethod(finalTx);
    
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
  public async getInvestorKeypair(investor: any): Promise<Keypair> {
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
   * Encrypt a secret (AES-256-GCM)
   */
  public encryptSecret(text: string, password: string): string {
    const iv = crypto.randomBytes(12);
    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag().toString("hex");
    
    // Format: salt:iv:authTag:encrypted
    return `${salt.toString("hex")}:${iv.toString("hex")}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt a secret (AES-256-GCM)
   */
  private decryptSecret(encryptedData: string, password: string): string {
    try {
      const [saltHex, ivHex, authTagHex, encryptedHex] = encryptedData.split(":");
      
      const salt = Buffer.from(saltHex, "hex");
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      const encrypted = Buffer.from(encryptedHex, "hex");
      
      const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted as any, undefined, "utf8");
      decrypted += decipher.final("utf8");
      
      return decrypted;
    } catch (error) {
      console.error("Decryption failed:", error);
      // Fallback for old XOR encrypted keys during transition if needed
      // but here we prefer to fail and have user re-link wallet
      throw new Error("Failed to decrypt secure key. Please re-link your wallet.");
    }
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

  /**
   * Process a token buyback (Model B/C of Fund Flow)
   * Investors can sell tokens back to the platform using collected revenue.
   */
  async processBuyback(params: {
    investorId: string;
    projectId: string;
    tokenAmount: number;
  }) {
    // 1. Get investor and project
    const investor = await prisma.user.findUnique({
      where: { id: params.investorId },
      select: { stellarPubKey: true, kycStatus: true, stellarSecretEncrypted: true },
    });

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      select: { pricePerToken: true, tokenContractId: true, status: true },
    });

    if (!investor || !project) throw new Error("Investor or Project not found");
    if (investor.kycStatus !== "VERIFIED") throw new Error("KYC verification required for buyback");
    if (!project.tokenContractId) throw new Error("Project token contract not initialized");

    // 2. Verify on-chain balance
    const balanceInfo = await contractService.getTokenBalance(
      project.tokenContractId,
      investor.stellarPubKey!
    );

    if (!balanceInfo || balanceInfo.balance < BigInt(params.tokenAmount)) {
      throw new Error(`Insufficient token balance for buyback. Available: ${balanceInfo?.balance || 0}`);
    }

    // 3. Perform on-chain buyback
    const relayerSecret = process.env.STAT_RELAYER_SECRET;
    if (!relayerSecret) throw new Error("Relayer secret not configured");
    const relayerKeypair = Keypair.fromSecret(relayerSecret);

    const pricePerTokenScaled = BigInt(Math.round(Number(project.pricePerToken) * 10_000_000));
    const tokenAmountBigInt = BigInt(params.tokenAmount);

    const result = await contractService.buybackTokens(
      this.contracts.treasury,
      relayerKeypair,
      params.projectId,
      investor.stellarPubKey!,
      tokenAmountBigInt,
      pricePerTokenScaled
    );

    if (result.success) {
      // 4. Update project stats (decrease tokens held by investors, effectively)
      // Note: In some models we burn, in others platform holds. 
      // For now we just log it as a successful financial event.
      console.log(`♻️ Buyback successful for project ${params.projectId}. Investor: ${investor.stellarPubKey}. Amount: ${params.tokenAmount}`);
      
      return { success: true, txHash: result.txHash };
    } else {
      throw new Error(result.error || "On-chain buyback failed");
    }
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

export const investmentService = getInvestmentService();
export default InvestmentService;
