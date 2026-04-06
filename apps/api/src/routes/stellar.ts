// ============================================
// Stellar Routes - Blockchain Operations
// ============================================

import { Router } from "express";
import { prisma } from "@aethera/database";
import {
  walletService,
  stellarClient,
  contractService,
  contractDeploymentService,
  trustlineService,
  getOrCreateRelayerAccount,
  getContractAddresses,
  NETWORK_CONFIGS,
  getUSDCAsset,
  nativeToScVal,
  scValToNative,
} from "@aethera/stellar";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { createApiError } from "../middleware/error.js";
import { ensureUserWallet } from "../services/userWalletService.js";

const router = Router();

async function projectEscrowExists(
  treasuryContractId: string,
  projectId: string,
  sourcePublicKey: string,
): Promise<boolean> {
  const result = await contractService.simulateContractCall(
    treasuryContractId,
    "get_project",
    [nativeToScVal(projectId, { type: "string" })],
    sourcePublicKey,
  );

  if (!result.success || !result.result) {
    return false;
  }

  try {
    const native = scValToNative(result.result as any);
    return Boolean(native);
  } catch {
    return true;
  }
}

function getTreasuryCandidates(): string[] {
  const configuredTreasury = getContractAddresses().treasury;
  const canonicalTreasury =
    NETWORK_CONFIGS[stellarClient.getNetwork()]?.contracts.treasury;

  return Array.from(
    new Set([configuredTreasury, canonicalTreasury].filter(Boolean)),
  );
}

async function findProjectEscrowTreasury(
  projectId: string,
  sourcePublicKey: string,
): Promise<string | null> {
  const treasuryCandidates = getTreasuryCandidates();

  for (const treasuryContractId of treasuryCandidates) {
    const exists = await projectEscrowExists(
      treasuryContractId,
      projectId,
      sourcePublicKey,
    );

    if (exists) {
      return treasuryContractId;
    }
  }

  return null;
}

function describeUnknownError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown error";
}

function unwrapSimulationScVal(result: unknown) {
  if (!result) return null;
  if ((result as any).switch && typeof (result as any).switch === "function") {
    return result;
  }
  return (result as { retval?: unknown }).retval ?? null;
}

async function getAssetTokenAdmin(
  tokenContractId: string,
  sourcePublicKey: string,
): Promise<string | null> {
  const result = await contractService.simulateContractCall(
    tokenContractId,
    "get_metadata",
    [],
    sourcePublicKey,
  );

  if (!result.success || !result.result) {
    return null;
  }

  const scVal = unwrapSimulationScVal(result.result);
  if (!scVal) {
    return null;
  }

  try {
    const native = scValToNative(scVal as any) as Record<string, unknown>;
    return typeof native?.admin === "string" ? native.admin : null;
  } catch {
    return null;
  }
}

async function getProjectEscrowAssetToken(
  treasuryContractId: string,
  projectId: string,
  sourcePublicKey: string,
): Promise<string | null> {
  const result = await contractService.simulateContractCall(
    treasuryContractId,
    "get_project",
    [nativeToScVal(projectId, { type: "string" })],
    sourcePublicKey,
  );

  if (!result.success || !result.result) {
    return null;
  }

  const scVal = unwrapSimulationScVal(result.result);
  if (!scVal) {
    return null;
  }

  try {
    const native = scValToNative(scVal as any) as Record<string, unknown>;
    return typeof native?.asset_token === "string" ? native.asset_token : null;
  } catch {
    return null;
  }
}

// ============================================
// Network Info (Public)
// ============================================

router.get("/network", async (req, res, next) => {
  try {
    const network = stellarClient.getNetwork();
    const passphrase = stellarClient.getNetworkPassphrase();

    res.json({
      success: true,
      data: {
        network,
        passphrase,
        horizonUrl:
          network === "testnet"
            ? "https://horizon-testnet.stellar.org"
            : "https://horizon.stellar.org",
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// User Wallet Info
// ============================================

router.get(
  "/wallet",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        throw createApiError("Authentication required", 401);
      }

      const wallet = await ensureUserWallet(userId, { fundOnTestnet: true });
      const balances = await walletService.getBalances(wallet.publicKey);

      res.json({
        success: true,
        data: {
          publicKey: wallet.publicKey,
          funded: wallet.funded,
          balances,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Fund Testnet Account
// ============================================

router.post(
  "/wallet/fund-testnet",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (stellarClient.getNetwork() !== "testnet") {
        throw createApiError("Friendbot only available on testnet", 400);
      }

      const userId = req.auth?.userId;
      if (!userId) {
        throw createApiError("Authentication required", 401);
      }

      const wallet = await ensureUserWallet(userId, { fundOnTestnet: true });
      if (!wallet.funded) {
        throw createApiError("Failed to fund account via Friendbot", 500);
      }

      res.json({
        success: true,
        message: "Account funded with testnet XLM",
        data: {
          publicKey: wallet.publicKey,
          funded: wallet.funded,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Check USDC Trustline
// ============================================

router.get(
  "/trustline/check",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        throw createApiError("Authentication required", 401);
      }

      const wallet = await ensureUserWallet(userId);

      const accountInfo = await trustlineService.getAccountInfo(
        wallet.publicKey,
      );

      res.json({
        success: true,
        data: {
          publicKey: wallet.publicKey,
          exists: accountInfo.exists,
          hasTrustline: accountInfo.hasTrustline,
          xlmBalance: accountInfo.xlmBalance,
          usdcBalance: accountInfo.usdcBalance,
          allTrustlines: accountInfo.trustlines,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Create USDC Trustline
// ============================================

router.post(
  "/trustline/create",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        throw createApiError("Authentication required", 401);
      }

      const wallet = await ensureUserWallet(userId, {
        fundOnTestnet: true,
        ensureUsdcTrustline: true,
      });

      if (!wallet.funded) {
        throw createApiError(
          "Wallet must be funded on Stellar testnet before creating a USDC trustline",
          400,
        );
      }

      if (wallet.hasUsdcTrustline && !wallet.trustlineCreated) {
        res.json({
          success: true,
          message: "USDC trustline already exists",
          data: { txHash: "already_exists", publicKey: wallet.publicKey },
        });
        return;
      }

      res.json({
        success: true,
        message: "USDC trustline created successfully",
        data: {
          txHash: wallet.trustlineCreated ? "created_during_bootstrap" : "created",
          publicKey: wallet.publicKey,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Token Balance for Project
// ============================================

router.get(
  "/tokens/:projectId/balance",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.projectId },
        select: { tokenContractId: true, tokenSymbol: true },
      });

      if (!project?.tokenContractId) {
        res.json({
          success: true,
          data: { balance: 0, tokenSymbol: project?.tokenSymbol },
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.auth?.userId },
        select: { stellarPubKey: true },
      });

      if (!user?.stellarPubKey) {
        throw createApiError("No wallet found", 400);
      }

      const result = await contractService.getTokenBalance(
        project.tokenContractId,
        user.stellarPubKey,
      );

      res.json({
        success: true,
        data: {
          balance: result?.balance.toString() || "0",
          tokenSymbol: project.tokenSymbol,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Transaction History
// ============================================

router.get(
  "/transactions",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const transactions = await prisma.transactionLog.findMany({
        where: { userId: req.auth?.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      res.json({ success: true, data: transactions });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Admin: Deploy Token Contract
// ============================================

router.post(
  "/admin/deploy-token/:projectId",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const project = await prisma.project.findUnique({
        where: { id: req.params.projectId },
        include: {
          installer: {
            select: { stellarPubKey: true },
          },
        },
      });

      if (!project) {
        throw createApiError("Project not found", 404);
      }

      // Allow re-entry: APPROVED + tokenContractId means escrow creation was attempted but
      // didn't finish. FUNDING may also be repairable if token authority was misconfigured.
      const isResuming = project.status === "APPROVED" && !!project.tokenContractId;

      if (isResuming) {
        console.log(`[DeployToken] Resuming finalization for project ${project.id} — token already deployed at ${project.tokenContractId}`);
      } else {
        console.log(`[DeployToken] Starting full deployment for project ${project.id}`);
      }

      let adminKeypair;
      try {
        adminKeypair = await getOrCreateRelayerAccount();
        console.log(`[DeployToken] Admin relayer: ${adminKeypair.publicKey()}`);
      } catch (error: any) {
        throw createApiError(
          error?.message || "Admin relayer wallet is not configured correctly",
          500,
          "RELAYER_NOT_CONFIGURED",
        );
      }

      const contractAddresses = getContractAddresses();
      const treasuryCandidates = getTreasuryCandidates();

      if (treasuryCandidates.length === 0) {
        throw createApiError(
          "Treasury contract is not configured. Please set TREASURY_CONTRACT_ID in .env",
          500,
          "TREASURY_NOT_CONFIGURED",
        );
      }

      if (
        contractAddresses.treasury &&
        treasuryCandidates.length > 1 &&
        contractAddresses.treasury !== treasuryCandidates[0]
      ) {
        console.warn(
          `[DeployToken] Treasury config mismatch detected. Configured ${contractAddresses.treasury}, falling back to ${treasuryCandidates[0]}.`,
        );
      }

      const totalSupply = project.totalTokens
        ? BigInt(project.totalTokens) * BigInt(1_000_000)
        : BigInt(
            Math.floor(
              Number(project.fundingTarget) / Number(project.pricePerToken),
            ),
          ) * BigInt(1_000_000);

      let tokenContractId = project.tokenContractId;
      let deploymentTxHash: string | null = null;
      const preferredTreasuryContractId = treasuryCandidates[0]!;
      const existingTokenAdmin = tokenContractId
        ? await getAssetTokenAdmin(tokenContractId, adminKeypair.publicKey())
        : null;
      const existingEscrowAssetToken = tokenContractId
        ? await getProjectEscrowAssetToken(
            preferredTreasuryContractId,
            project.id,
            adminKeypair.publicKey(),
          )
        : null;
      const tokenAuthorityBroken = Boolean(
        tokenContractId &&
          existingTokenAdmin &&
          existingTokenAdmin !== preferredTreasuryContractId,
      );
      const escrowPointsToDifferentToken = Boolean(
        tokenContractId &&
          existingEscrowAssetToken &&
          existingEscrowAssetToken !== tokenContractId,
      );
      const needsFundingRepair =
        tokenAuthorityBroken || escrowPointsToDifferentToken;

      const canProceed =
        project.status === "APPROVED" ||
        (project.status === "FUNDING" && needsFundingRepair);

      if (!canProceed) {
        throw createApiError(
          `Project must be in APPROVED status to deploy token or in repairable FUNDING state (current: ${project.status})`,
          400,
        );
      }

      if (project.status === "FUNDING" && tokenContractId && !needsFundingRepair) {
        console.log(`[DeployToken] Project ${project.id} already in FUNDING state.`);
        res.json({
          success: true,
          message: "Token and funding setup already completed",
          data: {
            contractId: project.tokenContractId,
            deploymentTxHash: null,
            tokenSymbol: project.tokenSymbol,
          },
        });
        return;
      }

      if (
        project.status === "FUNDING" &&
        needsFundingRepair &&
        Number(project.fundingRaised || 0) > 0
      ) {
        throw createApiError(
          "Token authority is misconfigured, but this project already has recorded funding. Automatic repair is blocked to avoid corrupting live allocations.",
          400,
          "TOKEN_REPAIR_BLOCKED",
        );
      }

      // Step 1: Deploy token contract (skip if resuming — already deployed)
      if (!tokenContractId || needsFundingRepair) {
        console.log(`[DeployToken] Step 1: Deploying asset token contract...`);
        try {
          const deployed = await contractDeploymentService.deployAssetToken(
            adminKeypair,
            {
              projectId: project.id,
              name: project.name,
              symbol:
                project.tokenSymbol ||
                `SOL${project.id.slice(0, 4).toUpperCase()}`,
              capacityKw: Math.floor(project.capacity),
              expectedYieldBps: Math.floor(project.expectedYield * 100),
              totalSupply,
            },
            preferredTreasuryContractId,
          );

          tokenContractId = deployed.contractId;
          deploymentTxHash = deployed.deploymentTxHash;

          console.log(`[DeployToken] Token deployed: ${tokenContractId} (tx: ${deploymentTxHash})`);

          // Persist immediately so retries do not redeploy
          await prisma.project.update({
            where: { id: req.params.projectId },
            data: { tokenContractId },
          });
        } catch (error: any) {
          console.error(`[DeployToken] Token deployment error:`, error);
          throw createApiError(
            `Token deployment failed: ${error?.message || "Unknown deployment error"}`,
            500,
            "TOKEN_DEPLOYMENT_FAILED",
          );
        }
      } else {
        console.log(`[DeployToken] Step 1: Skipped — token already deployed at ${tokenContractId}`);
      }

      if (!tokenContractId) {
        throw createApiError(
          "Token contract ID was not created during deployment",
          500,
          "TOKEN_CONTRACT_MISSING",
        );
      }

      // Step 2: Create project escrow in the Treasury contract
      const installerAddress =
        project.installer?.stellarPubKey || adminKeypair.publicKey();

      console.log(`[DeployToken] Step 2: Checking if escrow already exists...`);
      const escrowTreasury = await findProjectEscrowTreasury(
        project.id,
        adminKeypair.publicKey(),
      );
      const escrowReady = Boolean(escrowTreasury);
      const shouldRecreateEscrow = needsFundingRepair || !escrowReady;

      if (shouldRecreateEscrow) {
        console.log(`[DeployToken] Creating project escrow in treasury...`);
        console.log(`[DeployToken]  - Project ID: ${project.id}`);
        console.log(`[DeployToken]  - Token Contract: ${tokenContractId}`);
        console.log(`[DeployToken]  - Installer: ${installerAddress}`);
        console.log(`[DeployToken]  - Funding Target: ${project.fundingTarget} USDC (${BigInt(Math.floor(Number(project.fundingTarget) * 1_000_000))} stroops)`);
        console.log(`[DeployToken]  - Price/Token: ${project.pricePerToken} USDC`);
        console.log(`[DeployToken]  - Funding Model: ${project.fundingModel}`);

        let lastEscrowError: unknown = null;

        for (const treasuryContractId of [preferredTreasuryContractId]) {
          try {
            console.log(
              `[DeployToken] Attempting escrow creation via treasury ${treasuryContractId}...`,
            );

            await contractDeploymentService.createProjectEscrow(
              treasuryContractId,
              adminKeypair,
              project.id,
              tokenContractId,
              installerAddress,
              BigInt(Math.floor(Number(project.fundingTarget) * 1_000_000)),
              200,
              BigInt(Math.floor(Number(project.pricePerToken) * 1_000_000)),
            );

            console.log(
              `[DeployToken] Escrow created successfully via treasury ${treasuryContractId}.`,
            );
            lastEscrowError = null;
            break;
          } catch (error: unknown) {
            lastEscrowError = error;
            console.error(
              `[DeployToken] Escrow creation error via treasury ${treasuryContractId}:`,
              describeUnknownError(error),
            );

            const escrowRecovered = await projectEscrowExists(
              treasuryContractId,
              project.id,
              adminKeypair.publicKey(),
            );

            if (escrowRecovered) {
              console.log(
                `[DeployToken] Escrow found on retry for treasury ${treasuryContractId} — it was created despite the error.`,
              );
              lastEscrowError = null;
              break;
            }
          }
        }

        const escrowRecoveredAcrossCandidates = await findProjectEscrowTreasury(
          project.id,
          adminKeypair.publicKey(),
        );

        if (!escrowRecoveredAcrossCandidates && lastEscrowError) {
          throw createApiError(
            `Token contract is deployed (${tokenContractId}), but escrow setup failed. ` +
              `Click 'Finalize Funding Setup' again to retry the escrow step. Error: ${describeUnknownError(lastEscrowError)}`,
            500,
            "TOKEN_ESCROW_FAILED",
          );
        }
      } else {
        console.log(
          `[DeployToken] Step 2: Skipped — escrow already exists on-chain via treasury ${escrowTreasury}.`,
        );
      }

      // Step 3: Transition project to FUNDING status
      console.log(`[DeployToken] Step 3: Transitioning project to FUNDING status...`);
      await prisma.project.update({
        where: { id: req.params.projectId },
        data: {
          tokenContractId,
          status: "FUNDING",
        },
      });

      console.log(`[DeployToken] Project ${project.id} is now in FUNDING state. ✅`);

      res.json({
        success: true,
        message: isResuming
          ? "Funding setup finalized — project is now live for investors"
          : needsFundingRepair
            ? "Token authority repaired and funding setup refreshed"
          : "Token contract deployed and funding setup ready",
        data: {
          contractId: tokenContractId,
          deploymentTxHash,
          tokenSymbol: project.tokenSymbol,
          fundingModel: project.fundingModel,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Fund Test USDC (Testnet Only)
// ============================================

router.post(
  "/fund-test-usdc",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        throw createApiError("Unauthorized", 401);
      }

      const wallet = await ensureUserWallet(userId, {
        fundOnTestnet: true,
        ensureUsdcTrustline: true,
      });

      if (!wallet.funded) {
        throw createApiError(
          "Wallet is not active on Stellar testnet yet. Please fund it with XLM first.",
          400,
        );
      }

      if (!wallet.encryptedSecret) {
        throw createApiError(
          "Wallet secret is missing. Cannot prepare test USDC trustline.",
          400,
        );
      }

      const amount = String(req.body.amount || "10000");

      console.log(
        `💰 Funding ${wallet.publicKey} with ${amount} official testnet USDC via DEX swap...`,
      );

      // 1. Get Relayer keypair
      const relayerKeypair = await getOrCreateRelayerAccount();

      const { TransactionBuilder, Operation, BASE_FEE, Asset } =
        await import("@stellar/stellar-sdk");
      const officialUsdcAsset = getUSDCAsset();
      const relayerAccount =
        await stellarClient.horizon.loadAccount(relayerKeypair.publicKey());
      const sendMax = Math.max(Math.ceil(Number(amount) * 3), Number(amount) + 1000);

      const paymentTx = new TransactionBuilder(relayerAccount, {
        fee: BASE_FEE,
        networkPassphrase: stellarClient.getNetworkPassphrase(),
      })
        .addOperation(
          Operation.pathPaymentStrictReceive({
            sendAsset: Asset.native(),
            sendMax: String(sendMax),
            destination: wallet.publicKey,
            destAsset: officialUsdcAsset,
            destAmount: amount,
            path: [],
          }),
        )
        .setTimeout(60)
        .build();

      paymentTx.sign(relayerKeypair);
      const result = await stellarClient.horizon.submitTransaction(paymentTx);

      res.json({
        success: true,
        message: `Funded with ${amount} official test USDC`,
        txHash: result.hash,
        issuer: officialUsdcAsset.getIssuer(),
        data: {
          publicKey: wallet.publicKey,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
