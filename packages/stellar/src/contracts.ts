// ============================================
// Soroban Contract Interaction Service
// ============================================

import * as StellarSdk from '@stellar/stellar-sdk';
import { StellarClient } from './client';
import { type NetworkType } from './config';

interface ContractInvocationResult {
  success: boolean;
  result?: unknown;
  txHash?: string;
  error?: string;
}

export class ContractService {
  private client: StellarClient;
  private rpcServer: StellarSdk.SorobanRpc.Server;

  constructor(network: NetworkType = 'testnet') {
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
    sourcePublicKey: string
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

      if (StellarSdk.SorobanRpc.Api.isSimulationError(simulation)) {
        return {
          success: false,
          error: simulation.error,
        };
      }

      // Extract result from simulation
      if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulation) && simulation.result) {
        return {
          success: true,
          result: simulation.result,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
    signerKeypair: StellarSdk.Keypair
  ): Promise<ContractInvocationResult> {
    try {
      const contract = new StellarSdk.Contract(contractId);
      const sourceAccount = await this.client.getAccount(signerKeypair.publicKey());

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

      if (StellarSdk.SorobanRpc.Api.isSimulationError(simulation)) {
        return {
          success: false,
          error: simulation.error,
        };
      }

      // Prepare transaction with simulation results
      const preparedTx = StellarSdk.SorobanRpc.assembleTransaction(
        transaction,
        simulation
      ).build();

      // Sign the transaction
      preparedTx.sign(signerKeypair);

      // Submit the transaction
      const sendResponse = await this.rpcServer.sendTransaction(preparedTx);

      if (sendResponse.status === 'ERROR') {
        return {
          success: false,
          error: 'Transaction failed to submit',
        };
      }

      // Wait for confirmation
      const txResult = await this.waitForTransaction(sendResponse.hash);
      
      return txResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Wait for transaction to complete
   */
  private async waitForTransaction(
    hash: string,
    maxAttempts: number = 30
  ): Promise<ContractInvocationResult> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const txResponse = await this.rpcServer.getTransaction(hash);

        if (txResponse.status === 'SUCCESS') {
          return {
            success: true,
            txHash: hash,
            result: txResponse.returnValue,
          };
        } else if (txResponse.status === 'FAILED') {
          return {
            success: false,
            txHash: hash,
            error: 'Transaction failed',
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
      error: 'Transaction timeout',
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
    amount: bigint
  ): Promise<ContractInvocationResult> {
    const args = [
      StellarSdk.nativeToScVal(recipientPublicKey, { type: 'address' }),
      StellarSdk.nativeToScVal(amount, { type: 'i128' }),
    ];

    return await this.invokeContract(contractId, 'mint', args, adminKeypair);
  }

  /**
   * Get token balance
   */
  async getTokenBalance(
    contractId: string,
    ownerPublicKey: string
  ): Promise<{ balance: bigint } | null> {
    const args = [
      StellarSdk.nativeToScVal(ownerPublicKey, { type: 'address' }),
    ];

    const result = await this.simulateContractCall(
      contractId,
      'balance',
      args,
      ownerPublicKey
    );

    if (result.success && result.result) {
      const scVal = result.result as StellarSdk.xdr.ScVal;
      return { balance: StellarSdk.scValToNative(scVal) };
    }

    return null;
  }

  /**
   * Get total supply of tokens
   */
  async getTotalSupply(
    contractId: string,
    sourcePublicKey: string
  ): Promise<bigint | null> {
    const result = await this.simulateContractCall(
      contractId,
      'total_supply',
      [],
      sourcePublicKey
    );

    if (result.success && result.result) {
      return StellarSdk.scValToNative(result.result as StellarSdk.xdr.ScVal);
    }

    return null;
  }

  // ============================================
  // Escrow Contract Methods
  // ============================================

  /**
   * Deposit funds into escrow for a project
   */
  async depositToEscrow(
    contractId: string,
    investorKeypair: StellarSdk.Keypair,
    projectId: string,
    amount: bigint
  ): Promise<ContractInvocationResult> {
    const args = [
      StellarSdk.nativeToScVal(projectId, { type: 'string' }),
      StellarSdk.nativeToScVal(amount, { type: 'i128' }),
    ];

    return await this.invokeContract(contractId, 'deposit', args, investorKeypair);
  }

  /**
   * Release escrow funds to installer
   */
  async releaseEscrow(
    contractId: string,
    adminKeypair: StellarSdk.Keypair,
    projectId: string,
    installerPublicKey: string
  ): Promise<ContractInvocationResult> {
    const args = [
      StellarSdk.nativeToScVal(projectId, { type: 'string' }),
      StellarSdk.nativeToScVal(installerPublicKey, { type: 'address' }),
    ];

    return await this.invokeContract(contractId, 'release', args, adminKeypair);
  }

  // ============================================
  // Yield Distribution Contract Methods
  // ============================================

  /**
   * Distribute yield to all token holders
   */
  async distributeYield(
    contractId: string,
    adminKeypair: StellarSdk.Keypair,
    projectId: string,
    totalAmount: bigint
  ): Promise<ContractInvocationResult> {
    const args = [
      StellarSdk.nativeToScVal(projectId, { type: 'string' }),
      StellarSdk.nativeToScVal(totalAmount, { type: 'i128' }),
    ];

    return await this.invokeContract(contractId, 'distribute', args, adminKeypair);
  }
}

// Export singleton
export const contractService = new ContractService(
  (process.env.STELLAR_NETWORK as NetworkType) || 'testnet'
);
