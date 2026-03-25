// ============================================
// Contract Deployment & Management Service
// ============================================

import * as StellarSdk from "@stellar/stellar-sdk";
import crypto from "crypto";
import { StellarClient } from "./client.js";
import { resolveNetworkType, type NetworkType } from "./config.js";

interface DeployedContract {
  contractId: string;
  wasmHash: string;
  deploymentTxHash: string;
}

interface AssetTokenMetadata {
  projectId: string;
  name: string;
  symbol: string;
  capacityKw: number;
  expectedYieldBps: number;
  totalSupply: bigint;
}

export class ContractDeploymentService {
  private client: StellarClient;
  private rpcServer: StellarSdk.rpc.Server;

  constructor(network: NetworkType = "testnet") {
    this.client = new StellarClient(network);
    this.rpcServer = this.client.getRpcServer();
  }

  /**
   * Deploy asset token contract for a new project
   */
  async deployAssetToken(
    adminKeypair: StellarSdk.Keypair,
    metadata: AssetTokenMetadata,
    adminAddress?: string, // Optional manual admin override
  ): Promise<DeployedContract> {
    try {
      console.log(`Deploying asset token for project: ${metadata.projectId}`);

      const wasmHash =
        "4f2432ecba57cfe1ffa67586d50e2cf91c935e2961f01d6835a1e118a8d366e8";
      const account = await this.rpcServer.getAccount(adminKeypair.publicKey());

      const salt = crypto.randomBytes(32);

      const op = StellarSdk.Operation.createCustomContract({
        address: StellarSdk.Address.fromString(adminKeypair.publicKey()),
        wasmHash: Buffer.from(wasmHash, "hex"),
        salt: salt,
      });

      let tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.client.getNetworkPassphrase(),
      })
        .addOperation(op)
        .setTimeout(180)
        .build();

      const simulation = await this.rpcServer.simulateTransaction(tx);
      if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      tx = await StellarSdk.rpc.assembleTransaction(tx, simulation).build();
      tx.sign(adminKeypair);
      const result = await this.client.submitTransaction(tx);

      // Robust contract ID calculation
      const scAddress = StellarSdk.Address.fromString(
        adminKeypair.publicKey(),
      ).toScAddress();
      const contractIdPreimageFromAddress =
        new StellarSdk.xdr.ContractIdPreimageFromAddress({
          address: scAddress,
          salt: salt,
        });

      const preimage = StellarSdk.xdr.HashIdPreimage.envelopeTypeContractId(
        new StellarSdk.xdr.HashIdPreimageContractId({
          networkId: StellarSdk.hash(
            Buffer.from(this.client.getNetworkPassphrase()),
          ),
          contractIdPreimage:
            StellarSdk.xdr.ContractIdPreimage.contractIdPreimageFromAddress(
              contractIdPreimageFromAddress,
            ),
        }),
      );

      const contractId = StellarSdk.StrKey.encodeContract(
        StellarSdk.hash(preimage.toXDR()),
      );

      console.log(`Contract deployed! ID: ${contractId}`);
      await this.initializeAssetToken(
        contractId,
        adminKeypair,
        metadata,
        adminAddress,
      );

      return {
        contractId,
        wasmHash,
        deploymentTxHash: result.hash,
      };
    } catch (error) {
      console.error("Contract deployment failed:", error);
      throw error;
    }
  }

  /**
   * Deploy treasury contract (one per platform)
   */
  async deployTreasury(
    adminKeypair: StellarSdk.Keypair,
    usdcAssetAddress: string,
  ): Promise<DeployedContract> {
    // TODO: Implement treasury deployment
    return {
      contractId: "MOCK_TREASURY_CONTRACT",
      wasmHash: "MOCK_WASM_HASH",
      deploymentTxHash: "MOCK_TX_HASH",
    };
  }

  /**
   * Initialize asset token after deployment
   */
  async initializeAssetToken(
    contractId: string,
    adminKeypair: StellarSdk.Keypair,
    metadata: AssetTokenMetadata,
    adminAddress?: string, // Optional manual admin override
  ): Promise<string> {
    console.log(`Initializing contract ${contractId}`);

    const account = await this.rpcServer.getAccount(adminKeypair.publicKey());
    const contract = new StellarSdk.Contract(contractId);

    const actualAdmin = adminAddress || adminKeypair.publicKey();

    let tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.client.getNetworkPassphrase(),
    })
      .addOperation(
        contract.call(
          "initialize",
          StellarSdk.nativeToScVal(actualAdmin, { type: "address" }),
          StellarSdk.nativeToScVal(metadata.projectId, { type: "string" }),
          StellarSdk.nativeToScVal(metadata.name, { type: "string" }),
          StellarSdk.nativeToScVal(metadata.symbol, { type: "string" }),
          StellarSdk.nativeToScVal(metadata.capacityKw, { type: "u32" }),
          StellarSdk.nativeToScVal(metadata.expectedYieldBps, { type: "u32" }),
          StellarSdk.nativeToScVal(metadata.totalSupply, { type: "i128" }),
        ),
      )
      .setTimeout(180)
      .build();

    const simulation = await this.rpcServer.simulateTransaction(tx);

    if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
      throw new Error(`Simulation failed: ${simulation.error}`);
    }

    tx = await StellarSdk.rpc.assembleTransaction(tx, simulation).build();
    tx.sign(adminKeypair);
    const result = await this.client.submitTransaction(tx);
    return result.hash;
  }

  /**
   * Mint tokens to investor (called after investment confirmed)
   */
  async mintTokens(
    contractId: string,
    adminKeypair: StellarSdk.Keypair,
    investorAddress: string,
    amount: bigint,
  ): Promise<string> {
    try {
      // TODO: Call contract mint function
      // For now, log the intent
      console.log(`Minting ${amount} tokens to ${investorAddress}`);
      console.log(`Contract: ${contractId}`);

      // Return mock transaction hash
      return `MOCK_MINT_TX_${Date.now()}`;
    } catch (error) {
      console.error("Token minting failed:", error);
      throw error;
    }
  }

  /**
   * Get token balance from contract
   */
  async getTokenBalance(
    contractId: string,
    holderAddress: string,
  ): Promise<bigint> {
    // TODO: Query contract balance function
    return BigInt(0);
  }

  /**
   * Create project escrow in treasury contract
   */
  async createProjectEscrow(
    treasuryContractId: string,
    adminKeypair: StellarSdk.Keypair,
    projectId: string,
    assetTokenAddress: string,
    installerAddress: string,
    fundingTarget: bigint,
    platformFeeBps: number,
    pricePerToken: bigint,
  ): Promise<string> {
    console.log(
      `Creating escrow for project ${projectId} in Treasury ${treasuryContractId}`,
    );

    const account = await this.rpcServer.getAccount(adminKeypair.publicKey());
    const treasury = new StellarSdk.Contract(treasuryContractId);

    let tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.client.getNetworkPassphrase(),
    })
      .addOperation(
        treasury.call(
          "create_project_escrow",
          StellarSdk.nativeToScVal(projectId, { type: "string" }),
          StellarSdk.nativeToScVal(assetTokenAddress, { type: "address" }),
          StellarSdk.nativeToScVal(installerAddress, { type: "address" }),
          StellarSdk.nativeToScVal(fundingTarget, { type: "i128" }),
          StellarSdk.nativeToScVal(platformFeeBps, { type: "u32" }),
          StellarSdk.nativeToScVal(pricePerToken, { type: "i128" }),
        ),
      )
      .setTimeout(180)
      .build();

    const simulation = await this.rpcServer.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
      throw new Error(`Simulation failed: ${simulation.error}`);
    }

    tx = await StellarSdk.rpc.assembleTransaction(tx, simulation).build();
    tx.sign(adminKeypair);
    const result = await this.client.submitTransaction(tx);
    return result.hash;
  }

  /**
   * Process investment through treasury
   */
  async processInvestment(
    treasuryContractId: string,
    adminKeypair: StellarSdk.Keypair,
    projectId: string,
    investorAddress: string,
    amount: bigint,
  ): Promise<{ txHash: string; fullyFunded: boolean }> {
    // TODO: Call treasury process_investment
    console.log(`Processing investment of ${amount} for ${projectId}`);

    return {
      txHash: `MOCK_INVESTMENT_TX_${Date.now()}`,
      fullyFunded: false, // TODO: Get from contract response
    };
  }

  /**
   * Release capital to installer
   */
  async releaseCapital(
    treasuryContractId: string,
    adminKeypair: StellarSdk.Keypair,
    projectId: string,
  ): Promise<string> {
    // TODO: Call treasury release_capital
    console.log(`Releasing capital for project ${projectId}`);
    return "MOCK_RELEASE_TX";
  }
}

export const contractDeploymentService = new ContractDeploymentService(
  resolveNetworkType(process.env.STELLAR_NETWORK),
);
