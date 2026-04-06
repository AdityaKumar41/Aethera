// ============================================
// Soroban Contract Interaction Service
// ============================================

import * as StellarSdk from "@stellar/stellar-sdk";
import { StellarClient } from "./client.js";
import { resolveNetworkType, type NetworkType } from "./config.js";
import { getRelayerService } from "./relayer.js";

export interface ContractInvocationResult {
  success: boolean;
  result?: unknown;
  txHash?: string;
  error?: string;
}

export class ContractService {
  private client: StellarClient;
  private rpcServer: StellarSdk.rpc.Server;

  constructor(network: NetworkType = "testnet") {
    this.client = new StellarClient(network);
    this.rpcServer = this.client.getRpcServer();
  }

  // ============================================
  // Contract Invocation
  // ============================================

  /**
   * Invoke a contract method (read-only)
   */
  async simulateContractCall(
    contractId: string,
    method: string,
    args: StellarSdk.xdr.ScVal[] = [],
    sourcePublicKey: string,
  ): Promise<ContractInvocationResult> {
    try {
      const contract = new StellarSdk.Contract(contractId);
      const sourceAccount = await this.client.getAccount(sourcePublicKey);

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.client.getNetworkPassphrase(),
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build();

      const simulation = await this.rpcServer.simulateTransaction(transaction);

      if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
        return {
          success: false,
          error: simulation.error,
        };
      }

      // Extract result from simulation
      if (
        StellarSdk.rpc.Api.isSimulationSuccess(simulation) &&
        simulation.result
      ) {
        return {
          success: true,
          result: simulation.result,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Invoke a contract method (state-changing)
   */
  async invokeContract(
    contractId: string,
    method: string,
    args: StellarSdk.xdr.ScVal[],
    signerKeypair: StellarSdk.Keypair,
  ): Promise<ContractInvocationResult> {
    try {
      const contract = new StellarSdk.Contract(contractId);
      const sourceAccount = await this.client.getAccount(
        signerKeypair.publicKey(),
      );

      // Build the transaction
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.client.getNetworkPassphrase(),
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build();

      // Simulate first to get footprint and auth
      const simulation = await this.rpcServer.simulateTransaction(transaction);

      if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
        return {
          success: false,
          error: simulation.error,
        };
      }

      // Prepare transaction with simulation results
      const preparedTx = StellarSdk.rpc
        .assembleTransaction(transaction, simulation)
        .build();

      // Sign the transaction
      preparedTx.sign(signerKeypair);

      // Gas Sponsorship (Fee Bump)
      let finalTx: any = preparedTx;
      const relayer = getRelayerService();
      await relayer.initialize();

      if (await relayer.isReady()) {
        try {
          finalTx = await relayer.sponsorTransaction(preparedTx);
        } catch (sponsorError) {
          console.warn(
            "[Relayer] Sponsorship failed, falling back to user fee:",
            sponsorError,
          );
        }
      }

      // Submit the transaction
      const sendResponse = await this.rpcServer.sendTransaction(finalTx);

      if (sendResponse.status === "ERROR") {
        return {
          success: false,
          error: "Transaction failed to submit",
        };
      }

      // Wait for confirmation
      const txResult = await this.waitForTransaction(sendResponse.hash);

      return txResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Wait for transaction to complete
   */
  private async waitForTransaction(
    hash: string,
    maxAttempts: number = 30,
  ): Promise<ContractInvocationResult> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const txResponse = await this.rpcServer.getTransaction(hash);

        if (txResponse.status === "SUCCESS") {
          return {
            success: true,
            txHash: hash,
            result: txResponse.returnValue,
          };
        } else if (txResponse.status === "FAILED") {
          return {
            success: false,
            txHash: hash,
            error: "Transaction failed",
          };
        }

        // Wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        // Transaction not found yet, keep waiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return {
      success: false,
      txHash: hash,
      error: "Transaction timeout",
    };
  }

  // ============================================
  // Asset Token Contract Methods
  // ============================================

  /**
   * Mint tokens for an investor (asset token contract)
   */
  async mintTokens(
    contractId: string,
    adminKeypair: StellarSdk.Keypair,
    recipientPublicKey: string,
    amount: bigint,
  ): Promise<ContractInvocationResult> {
    const args = [
      StellarSdk.nativeToScVal(recipientPublicKey, { type: "address" }),
      StellarSdk.nativeToScVal(amount, { type: "i128" }),
    ];

    return await this.invokeContract(contractId, "mint", args, adminKeypair);
  }

  /**
   * Get token balance
   */
  async getTokenBalance(
    contractId: string,
    ownerPublicKey: string,
  ): Promise<{ balance: bigint } | null> {
    const args = [
      StellarSdk.nativeToScVal(ownerPublicKey, { type: "address" }),
    ];

    const result = await this.simulateContractCall(
      contractId,
      "balance",
      args,
      ownerPublicKey,
    );

    if (result.success && result.result) {
      const scVal =
        result.result instanceof StellarSdk.xdr.ScVal
          ? result.result
          : (result.result as { retval?: StellarSdk.xdr.ScVal }).retval;

      if (!scVal) {
        return null;
      }

      return { balance: StellarSdk.scValToNative(scVal) };
    }

    return null;
  }

  /**
   * Get total supply of tokens
   */
  async getTotalSupply(
    contractId: string,
    sourcePublicKey: string,
  ): Promise<bigint | null> {
    const result = await this.simulateContractCall(
      contractId,
      "total_supply",
      [],
      sourcePublicKey,
    );

    if (result.success && result.result) {
      const scVal =
        result.result instanceof StellarSdk.xdr.ScVal
          ? result.result
          : (result.result as { retval?: StellarSdk.xdr.ScVal }).retval;

      if (!scVal) {
        return null;
      }

      return StellarSdk.scValToNative(scVal);
    }

    return null;
  }

  // ============================================
  // Escrow Contract Methods
  // ============================================

  /**
   * Process investment through treasury (atomic USDC transfer and token minting)
   */
  async processInvestment(
    contractId: string,
    investorKeypair: StellarSdk.Keypair,
    projectId: string,
    amount: bigint,
  ): Promise<ContractInvocationResult> {
    const args = [
      StellarSdk.nativeToScVal(projectId, { type: "string" }),
      StellarSdk.nativeToScVal(investorKeypair.publicKey(), {
        type: "address",
      }),
      StellarSdk.nativeToScVal(amount, { type: "i128" }),
    ];

    return await this.invokeContract(
      contractId,
      "process_investment",
      args,
      investorKeypair,
    );
  }

  /**
   * Release capital to installer (admin only)
   */
  async releaseCapital(
    contractId: string,
    adminKeypair: StellarSdk.Keypair,
    projectId: string,
  ): Promise<ContractInvocationResult> {
    const args = [StellarSdk.nativeToScVal(projectId, { type: "string" })];

    return await this.invokeContract(
      contractId,
      "release_capital",
      args,
      adminKeypair,
    );
  }

  /**
   * Release funds for a specific milestone (partial release)
   */
  async releaseMilestoneFunds(
    contractId: string,
    adminKeypair: StellarSdk.Keypair,
    projectId: string,
    milestoneIndex: number,
    amount: bigint,
  ): Promise<ContractInvocationResult> {
    const args = [
      StellarSdk.nativeToScVal(projectId, { type: "string" }),
      StellarSdk.nativeToScVal(milestoneIndex, { type: "u32" }),
      StellarSdk.nativeToScVal(amount, { type: "i128" }),
    ];

    return await this.invokeContract(
      contractId,
      "release_milestone",
      args,
      adminKeypair,
    );
  }

  // ============================================
  // Yield Distribution Contract Methods
  // ============================================

  /**
   * Create a new yield distribution
   */
  async createYieldDistribution(
    contractId: string,
    adminKeypair: StellarSdk.Keypair,
    projectId: string,
    assetTokenAddress: string,
    periodStart: number,
    periodEnd: number,
    totalEnergyKwh: bigint,
    revenuePerKwh: bigint,
  ): Promise<ContractInvocationResult> {
    const args = [
      StellarSdk.nativeToScVal(projectId, { type: "string" }),
      StellarSdk.nativeToScVal(assetTokenAddress, { type: "address" }),
      StellarSdk.nativeToScVal(periodStart, { type: "u64" }),
      StellarSdk.nativeToScVal(periodEnd, { type: "u64" }),
      StellarSdk.nativeToScVal(totalEnergyKwh, { type: "i128" }),
      StellarSdk.nativeToScVal(revenuePerKwh, { type: "i128" }),
    ];

    return await this.invokeContract(
      contractId,
      "create_distribution",
      args,
      adminKeypair,
    );
  }

  /**
   * Claim yield for an investor
   */
  async claimYield(
    contractId: string,
    investorKeypair: StellarSdk.Keypair,
    distributionId: bigint,
  ): Promise<ContractInvocationResult> {
    const args = [
      StellarSdk.nativeToScVal(distributionId, { type: "u64" }),
      StellarSdk.nativeToScVal(investorKeypair.publicKey(), {
        type: "address",
      }),
    ];

    return await this.invokeContract(
      contractId,
      "claim_yield",
      args,
      investorKeypair,
    );
  }

  /**
   * Commit production data to the blockchain (Oracle contract)
   */
  /**
   * Commit production data to the blockchain (Oracle contract)
   */
  async commitProduction(
    contractId: string,
    signerKeypair: StellarSdk.Keypair,
    projectId: string,
    periodStart: number,
    periodEnd: number,
    energyKwh: bigint,
  ): Promise<ContractInvocationResult> {
    const args = [
      StellarSdk.nativeToScVal(projectId, { type: "string" }),
      StellarSdk.nativeToScVal(periodStart, { type: "u64" }),
      StellarSdk.nativeToScVal(periodEnd, { type: "u64" }),
      StellarSdk.nativeToScVal(energyKwh, { type: "i128" }),
    ];

    return await this.invokeContract(
      contractId,
      "commit_production",
      args,
      signerKeypair,
    );
  }

  /**
   * Facilitate token buyback (Market/Escrow contract)
   */
  async buybackTokens(
    contractId: string,
    adminKeypair: StellarSdk.Keypair,
    projectId: string,
    investorPublicKey: string,
    amount: bigint,
    pricePerToken: bigint,
  ): Promise<ContractInvocationResult> {
    const args = [
      StellarSdk.nativeToScVal(projectId, { type: "string" }),
      StellarSdk.nativeToScVal(investorPublicKey, { type: "address" }),
      StellarSdk.nativeToScVal(amount, { type: "i128" }),
      StellarSdk.nativeToScVal(pricePerToken, { type: "i128" }),
    ];

    return await this.invokeContract(
      contractId,
      "buyback_tokens",
      args,
      adminKeypair,
    );
  }
}

// Export singleton
export const contractService = new ContractService(
  resolveNetworkType(process.env.STELLAR_NETWORK),
);
