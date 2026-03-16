// ============================================
// Soroban Contract Service
// ============================================

import {
  Contract,
  rpc,
  TransactionBuilder,
  Operation,
  Keypair,
  Account,
  BASE_FEE,
  xdr,
} from "@stellar/stellar-sdk";
import { StellarClient } from "./client.js";
import { getNetworkConfig } from "./config.js";

export class SorobanContractService {
  private client: StellarClient;
  private rpcServer: rpc.Server;
  private assetTokenContract: Contract | null = null;
  private treasuryContract: Contract | null = null;

  constructor(client: StellarClient) {
    this.client = client;
    const config = getNetworkConfig(client.getNetwork());
    this.rpcServer = new rpc.Server(config.rpcUrl);

    // Initialize contracts
    if (config.assetTokenContractId) {
      this.assetTokenContract = new Contract(config.assetTokenContractId);
    }
    if (config.treasuryContractId) {
      this.treasuryContract = new Contract(config.treasuryContractId);
    }
  }

  /**
   * Mint project tokens
   */
  async mintTokens(params: {
    sourceKeypair: Keypair;
    recipient: string;
    amount: number;
    projectId: string;
  }): Promise<string> {
    if (!this.assetTokenContract) {
      throw new Error("Asset token contract not initialized");
    }

    const account = await this.loadAccount(params.sourceKeypair.publicKey());

    // Build contract call
    const contract = this.assetTokenContract;
    const operation = contract.call(
      "mint",
      xdr.ScVal.scvAddress(
        xdr.ScAddress.scAddressTypeAccount(
          Keypair.fromPublicKey(params.recipient).xdrPublicKey(),
        ),
      ),
      xdr.ScVal.scvI128(
        new xdr.Int128Parts({
          lo: xdr.Uint64.fromString(String(params.amount)),
          hi: xdr.Int64.fromString("0"),
        }),
      ),
    );

    // Build and submit transaction
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.client.getNetworkPassphrase(),
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    // Simulate first
    const simulated = await this.rpcServer.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    // Prepare and sign
    const prepared = rpc.assembleTransaction(tx, simulated).build();
    prepared.sign(params.sourceKeypair);

    // Submit
    const result = await this.rpcServer.sendTransaction(prepared);
    if (result.status === "ERROR") {
      throw new Error(`Transaction failed: ${result.errorResult}`);
    }

    return result.hash;
  }

  /**
   * Transfer tokens
   */
  async transferTokens(params: {
    sourceKeypair: Keypair;
    recipient: string;
    amount: number;
  }): Promise<string> {
    if (!this.assetTokenContract) {
      throw new Error("Asset token contract not initialized");
    }

    const account = await this.loadAccount(params.sourceKeypair.publicKey());

    const contract = this.assetTokenContract;
    const operation = contract.call(
      "transfer",
      xdr.ScVal.scvAddress(
        xdr.ScAddress.scAddressTypeAccount(params.sourceKeypair.xdrPublicKey()),
      ),
      xdr.ScVal.scvAddress(
        xdr.ScAddress.scAddressTypeAccount(
          Keypair.fromPublicKey(params.recipient).xdrPublicKey(),
        ),
      ),
      xdr.ScVal.scvI128(
        new xdr.Int128Parts({
          lo: xdr.Uint64.fromString(String(params.amount)),
          hi: xdr.Int64.fromString("0"),
        }),
      ),
    );

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.client.getNetworkPassphrase(),
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simulated = await this.rpcServer.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    const prepared = rpc.assembleTransaction(tx, simulated).build();
    prepared.sign(params.sourceKeypair);

    const result = await this.rpcServer.sendTransaction(prepared);
    if (result.status === "ERROR") {
      throw new Error(`Transaction failed: ${result.errorResult}`);
    }

    return result.hash;
  }

  /**
   * Distribute yields
   */
  async distributeYields(params: {
    sourceKeypair: Keypair;
    projectId: string;
    totalAmount: number;
    recipients: Array<{ address: string; amount: number }>;
  }): Promise<string> {
    if (!this.treasuryContract) {
      throw new Error("Treasury contract not initialized");
    }

    const account = await this.loadAccount(params.sourceKeypair.publicKey());

    // Build recipients array for contract
    const recipientsVec = xdr.ScVal.scvVec(
      params.recipients.map((r) =>
        xdr.ScVal.scvMap([
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvSymbol("address"),
            val: xdr.ScVal.scvAddress(
              xdr.ScAddress.scAddressTypeAccount(
                Keypair.fromPublicKey(r.address).xdrPublicKey(),
              ),
            ),
          }),
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvSymbol("amount"),
            val: xdr.ScVal.scvU64(xdr.Uint64.fromString(String(r.amount))),
          }),
        ]),
      ),
    );

    const contract = this.treasuryContract;
    const operation = contract.call(
      "distribute_yields",
      xdr.ScVal.scvString(params.projectId),
      xdr.ScVal.scvU64(xdr.Uint64.fromString(String(params.totalAmount))),
      recipientsVec,
    );

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.client.getNetworkPassphrase(),
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simulated = await this.rpcServer.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    const prepared = rpc.assembleTransaction(tx, simulated).build();
    prepared.sign(params.sourceKeypair);

    const result = await this.rpcServer.sendTransaction(prepared);
    if (result.status === "ERROR") {
      throw new Error(`Transaction failed: ${result.errorResult}`);
    }

    return result.hash;
  }

  /**
   * Get token balance
   */
  async getTokenBalance(address: string): Promise<number> {
    if (!this.assetTokenContract) {
      throw new Error("Asset token contract not initialized");
    }

    const contract = this.assetTokenContract;
    const ledgerKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: contract.address().toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      }),
    );

    try {
      const entry = await this.rpcServer.getLedgerEntries(ledgerKey);
      // Parse balance from ledger entry
      // This is simplified - actual implementation depends on contract structure
      return 0; // Placeholder
    } catch (error) {
      console.error("Failed to get balance:", error);
      return 0;
    }
  }

  /**
   * Create investment in treasury
   */
  async createInvestment(params: {
    sourceKeypair: Keypair;
    projectId: string;
    amount: number;
  }): Promise<string> {
    if (!this.treasuryContract) {
      throw new Error("Treasury contract not initialized");
    }

    const account = await this.loadAccount(params.sourceKeypair.publicKey());

    const contract = this.treasuryContract;
    const operation = contract.call(
      "invest",
      xdr.ScVal.scvString(params.projectId),
      xdr.ScVal.scvAddress(
        xdr.ScAddress.scAddressTypeAccount(params.sourceKeypair.xdrPublicKey()),
      ),
      xdr.ScVal.scvU64(xdr.Uint64.fromString(String(params.amount))),
    );

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.client.getNetworkPassphrase(),
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simulated = await this.rpcServer.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    const prepared = rpc.assembleTransaction(tx, simulated).build();
    prepared.sign(params.sourceKeypair);

    const result = await this.rpcServer.sendTransaction(prepared);
    if (result.status === "ERROR") {
      throw new Error(`Transaction failed: ${result.errorResult}`);
    }

    return result.hash;
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: string, timeoutSeconds = 30): Promise<void> {
    const startTime = Date.now();
    const timeout = timeoutSeconds * 1000;

    while (Date.now() - startTime < timeout) {
      try {
        const tx = await this.rpcServer.getTransaction(txHash);
        if (tx.status === "SUCCESS") {
          return;
        }
        if (tx.status === "FAILED") {
          throw new Error(`Transaction failed: ${txHash}`);
        }
      } catch (error) {
        // Transaction not found yet, continue polling
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`Transaction timeout: ${txHash}`);
  }

  /**
   * Load account from network
   */
  private async loadAccount(publicKey: string): Promise<Account> {
    const server = this.client.getHorizonServer();
    const accountResponse = await server.loadAccount(publicKey);
    return new Account(accountResponse.accountId(), accountResponse.sequence);
  }

  /**
   * Get contract IDs
   */
  getContractIds() {
    const config = getNetworkConfig(this.client.getNetwork());
    return {
      assetToken: config.assetTokenContractId,
      treasury: config.treasuryContractId,
    };
  }
}

// Singleton instance
let sorobanService: SorobanContractService | null = null;

export function getSorobanService(
  client: StellarClient,
): SorobanContractService {
  if (!sorobanService) {
    sorobanService = new SorobanContractService(client);
  }
  return sorobanService;
}
