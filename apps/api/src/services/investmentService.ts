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
  walletService,
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
      const remaining =
        Number(project.fundingTarget) - Number(project.fundingRaised);
      if (amount > remaining) {
        return {
          success: false,
          error: `Maximum investment: ${remaining} USDC`,
        };
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
          amount,
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
          select: {
            fundingRaised: true,
            fundingTarget: true,
            status: true,
            installer: { select: { stellarPubKey: true } },
          },
        });

        // Capital release is now handled manually by Admin activation to match Stage 6 requirement
        /*
        if (updatedProject && updatedProject.status === "FUNDED") {
          ...
        }
        */

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
    amount: number,
  ): Promise<string> {
    // 1. Get investor keypair (decrypt secret)
    const investorKeypair = await this.getInvestorKeypair(investor);

    // 2. Get Soroban server
    const server = this.stellar.getRpcServer();
    const investorAccount = await server.getAccount(investor.stellarPubKey);

    // 3. Build inner transaction with INVESTOR as the source
    const treasuryContract = new Contract(this.contracts.treasury);
    const amountScaled = BigInt(Math.round(amount * 10_000_000));

    const tx = new TransactionBuilder(investorAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.stellar.getNetworkPassphrase(),
    })
      .addOperation(
        treasuryContract.call(
          "process_investment",
          nativeToScVal(project.id, { type: "string" }),
          nativeToScVal(investor.stellarPubKey, { type: "address" }),
          nativeToScVal(amountScaled, { type: "i128" }),
        )
      )
      .setTimeout(300)
      .build();

    // 4. Prepare and sign inner transaction with Investor
    console.log(`[Investment] Preparing transaction for investor ${investor.stellarPubKey}`);
    const preparedTx = await server.prepareTransaction(tx);
    preparedTx.sign(investorKeypair);

    // 5. Sponsorship (Fee Bump)
    const relayer = getRelayerService();
    await relayer.initialize();
    
    let finalTx: any = preparedTx;
    if (await relayer.isReady()) {
      console.log(`[Investment] Sponsoring gas with relayer for ${investor.stellarPubKey}`);
      finalTx = await relayer.sponsorTransaction(preparedTx);
    }

    // 6. Submit
    const result = await server.sendTransaction(finalTx);

    if (result.status === "PENDING" || result.status === ("SUCCESS" as any)) {
      return result.hash;
    } else {
      console.error("[Investment] Transaction failed:", result.errorResult);
      throw new Error(
        `Transaction failed: ${JSON.stringify(result.errorResult)}`,
      );
    }
  }

  /**
   * Get investor keypair from encrypted secret
   */
  public async getInvestorKeypair(investor: any): Promise<Keypair> {
    if (!investor.stellarSecretEncrypted) {
      throw new Error("No encrypted secret key found");
    }

    try {
      // Decrypt using the shared wallet service (handles the correct scheme)
      const secretKey = walletService.decryptSecret(
        investor.stellarSecretEncrypted,
      );
      return Keypair.fromSecret(secretKey);
    } catch (error) {
      console.error("Decryption failed:", error);
      throw new Error(
        "Failed to decrypt secure key. Please re-link your wallet.",
      );
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
    if (
      (investment.status as string) === "PENDING_ONCHAIN" &&
      investment.txHash
    ) {
      try {
        const server = this.stellar.getHorizonServer();
        const tx = await server
          .transactions()
          .transaction(investment.txHash)
          .call();

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
  async cancelInvestment(
    investmentId: string,
    userId: string,
  ): Promise<boolean> {
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
      select: {
        stellarPubKey: true,
        kycStatus: true,
        stellarSecretEncrypted: true,
      },
    });

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      select: { pricePerToken: true, tokenContractId: true, status: true },
    });

    if (!investor || !project) throw new Error("Investor or Project not found");
    if (investor.kycStatus !== "VERIFIED")
      throw new Error("KYC verification required for buyback");
    if (!project.tokenContractId)
      throw new Error("Project token contract not initialized");

    // 2. Verify on-chain balance
    const balanceInfo = await contractService.getTokenBalance(
      project.tokenContractId,
      investor.stellarPubKey!,
    );

    if (!balanceInfo || balanceInfo.balance < BigInt(params.tokenAmount)) {
      throw new Error(
        `Insufficient token balance for buyback. Available: ${balanceInfo?.balance || 0}`,
      );
    }

    // 3. Perform on-chain buyback
    const encryptedSecret = process.env.ADMIN_RELAYER_SECRET_ENCRYPTED;
    if (!encryptedSecret) throw new Error("Relayer secret not configured");
    const relayerSecret = walletService.decryptSecret(encryptedSecret);
    const relayerKeypair = Keypair.fromSecret(relayerSecret);

    const pricePerTokenScaled = BigInt(
      Math.round(Number(project.pricePerToken) * 10_000_000),
    );
    const tokenAmountBigInt = BigInt(params.tokenAmount);

    const result = await contractService.buybackTokens(
      this.contracts.treasury,
      relayerKeypair,
      params.projectId,
      investor.stellarPubKey!,
      tokenAmountBigInt,
      pricePerTokenScaled,
    );

    if (result.success) {
      // 4. Update project stats (decrease tokens held by investors, effectively)
      // Note: In some models we burn, in others platform holds.
      // For now we just log it as a successful financial event.
      console.log(
        `♻️ Buyback successful for project ${params.projectId}. Investor: ${investor.stellarPubKey}. Amount: ${params.tokenAmount}`,
      );

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
