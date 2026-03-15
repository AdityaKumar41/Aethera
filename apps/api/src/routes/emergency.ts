/**
 * Emergency Pause Dashboard API Routes
 *
 * Admin-only endpoints for emergency contract management.
 * Uses real on-chain pause()/unpause()/is_paused() calls against
 * all deployed Soroban contracts, with TransactionLog persistence.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "@aethera/database";
import { contractService, getContractAddresses } from "@aethera/stellar";
import {
  Keypair,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { createApiError } from "../middleware/error.js";

const router = Router();

// ============================================
// Types
// ============================================

interface ContractStatus {
  name: string;
  address: string;
  paused: boolean;
  lastPausedAt?: Date;
  lastPausedBy?: string;
  pauseReason?: string;
}

interface PauseEvent {
  id: string;
  contractName: string;
  contractAddress: string;
  action: "PAUSE" | "UNPAUSE";
  initiatedBy: string;
  reason: string;
  timestamp: Date;
  txHash?: string;
}

// ============================================
// Helpers
// ============================================

/** Canonical mapping from contract registry keys to display names. */
const CONTRACT_DISPLAY_NAMES: Record<string, string> = {
  assetToken: "Asset Token",
  treasury: "Treasury",
  yieldDistributor: "Yield Distributor",
  governance: "Governance",
};

/**
 * Retrieve the admin keypair from STAT_RELAYER_SECRET.
 */
function getAdminKeypair(): Keypair {
  const adminSecret = process.env.STAT_RELAYER_SECRET;
  if (!adminSecret) {
    throw createApiError("Admin relayer secret not configured", 500);
  }
  return Keypair.fromSecret(adminSecret);
}

/**
 * Build a map of { key -> { name, address } } for every deployed contract.
 */
function getDeployedContracts(): Map<
  string,
  { name: string; address: string }
> {
  const contracts = getContractAddresses();
  const map = new Map<string, { name: string; address: string }>();

  for (const [key, displayName] of Object.entries(CONTRACT_DISPLAY_NAMES)) {
    const address = (contracts as unknown as Record<string, string | undefined>)[key];
    if (address) {
      map.set(key, { name: displayName, address });
    }
  }

  return map;
}

/**
 * Query the on-chain is_paused() view function for a single contract.
 * Falls back to the most recent TransactionLog entry if the call fails.
 */
async function getContractPausedStatus(
  contractAddress: string,
  contractKey: string,
  adminPubKey: string,
): Promise<{ paused: boolean; source: "chain" | "db" }> {
  // 1. Try on-chain is_paused()
  try {
    const result = await contractService.simulateContractCall(
      contractAddress,
      "is_paused",
      [],
      adminPubKey,
    );
    if (result.success && result.result != null) {
      const paused = scValToNative(result.result as xdr.ScVal) as boolean;
      return { paused, source: "chain" };
    }
  } catch {
    // Fall through to DB fallback
  }

  // 2. Fallback: check last TransactionLog for this contract
  const lastLog = await prisma.transactionLog.findFirst({
    where: {
      type: { in: ["CONTRACT_PAUSE", "CONTRACT_UNPAUSE"] },
      metadata: { path: ["contractKey"], equals: contractKey },
    },
    orderBy: { createdAt: "desc" },
  });

  if (lastLog) {
    return { paused: lastLog.type === "CONTRACT_PAUSE", source: "db" };
  }

  // Default: assume not paused
  return { paused: false, source: "db" };
}

// ============================================
// Dashboard Overview
// ============================================

router.get(
  "/status",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const deployed = getDeployedContracts();
      const adminKeypair = getAdminKeypair();
      const adminPubKey = adminKeypair.publicKey();

      const contractStatuses: ContractStatus[] = [];

      for (const [key, { name, address }] of deployed.entries()) {
        const { paused } = await getContractPausedStatus(
          address,
          key,
          adminPubKey,
        );

        // Optionally enrich with last pause event from DB
        let lastPausedAt: Date | undefined;
        let lastPausedBy: string | undefined;
        let pauseReason: string | undefined;

        if (paused) {
          const lastEvent = await prisma.transactionLog.findFirst({
            where: {
              type: "CONTRACT_PAUSE",
              metadata: { path: ["contractKey"], equals: key },
            },
            orderBy: { createdAt: "desc" },
          });
          if (lastEvent) {
            lastPausedAt = lastEvent.createdAt;
            lastPausedBy = lastEvent.userId ?? undefined;
            const meta = lastEvent.metadata as Record<string, unknown> | null;
            pauseReason = (meta?.reason as string) ?? undefined;
          }
        }

        contractStatuses.push({
          name,
          address,
          paused,
          lastPausedAt,
          lastPausedBy,
          pauseReason,
        });
      }

      const anyPaused = contractStatuses.some((c) => c.paused);

      res.json({
        success: true,
        data: {
          systemStatus: anyPaused ? "PARTIAL_PAUSE" : "OPERATIONAL",
          contracts: contractStatuses,
          pausedCount: contractStatuses.filter((c) => c.paused).length,
          totalContracts: contractStatuses.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Pause Single Contract
// ============================================

const pauseSchema = z.object({
  reason: z.string().min(10).max(500),
});

router.post(
  "/pause/:contractKey",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { contractKey } = req.params;
      const { reason } = pauseSchema.parse(req.body);
      const adminId = req.auth?.userId!;

      const deployed = getDeployedContracts();
      const contractInfo = deployed.get(contractKey);
      if (!contractInfo) {
        throw createApiError(`Unknown contract: ${contractKey}`, 404);
      }

      const adminKeypair = getAdminKeypair();
      const adminPubKey = adminKeypair.publicKey();

      // Check current status
      const { paused: alreadyPaused } = await getContractPausedStatus(
        contractInfo.address,
        contractKey,
        adminPubKey,
      );
      if (alreadyPaused) {
        throw createApiError(`${contractInfo.name} is already paused`, 400);
      }

      // Submit on-chain pause(admin)
      const result = await contractService.invokeContract(
        contractInfo.address,
        "pause",
        [nativeToScVal(adminPubKey, { type: "address" })],
        adminKeypair,
      );

      if (!result.success) {
        throw createApiError(
          `On-chain pause failed for ${contractInfo.name}: ${result.error}`,
          500,
        );
      }

      // Log to TransactionLog
      const logEntry = await prisma.transactionLog.create({
        data: {
          type: "CONTRACT_PAUSE",
          userId: adminId,
          txHash:
            result.txHash || `contract_pause_${contractKey}_${Date.now()}`,
          status: "CONFIRMED",
          sourceAccount: adminPubKey,
          destAccount: contractInfo.address,
          metadata: {
            contractKey,
            contractName: contractInfo.name,
            contractAddress: contractInfo.address,
            action: "PAUSE",
            reason,
          },
        },
      });

      const event: PauseEvent = {
        id: logEntry.id,
        contractName: contractInfo.name,
        contractAddress: contractInfo.address,
        action: "PAUSE",
        initiatedBy: adminId,
        reason,
        timestamp: logEntry.createdAt,
        txHash: result.txHash ?? undefined,
      };

      res.json({
        success: true,
        message: `${contractInfo.name} paused successfully`,
        data: {
          contract: {
            name: contractInfo.name,
            address: contractInfo.address,
            paused: true,
            lastPausedAt: logEntry.createdAt,
            lastPausedBy: adminId,
            pauseReason: reason,
          } as ContractStatus,
          event,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Unpause Single Contract
// ============================================

router.post(
  "/unpause/:contractKey",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { contractKey } = req.params;
      const { reason } = pauseSchema.parse(req.body);
      const adminId = req.auth?.userId!;

      const deployed = getDeployedContracts();
      const contractInfo = deployed.get(contractKey);
      if (!contractInfo) {
        throw createApiError(`Unknown contract: ${contractKey}`, 404);
      }

      const adminKeypair = getAdminKeypair();
      const adminPubKey = adminKeypair.publicKey();

      // Check current status
      const { paused: currentlyPaused } = await getContractPausedStatus(
        contractInfo.address,
        contractKey,
        adminPubKey,
      );
      if (!currentlyPaused) {
        throw createApiError(`${contractInfo.name} is not paused`, 400);
      }

      // Submit on-chain unpause(admin)
      const result = await contractService.invokeContract(
        contractInfo.address,
        "unpause",
        [nativeToScVal(adminPubKey, { type: "address" })],
        adminKeypair,
      );

      if (!result.success) {
        throw createApiError(
          `On-chain unpause failed for ${contractInfo.name}: ${result.error}`,
          500,
        );
      }

      // Log to TransactionLog
      const logEntry = await prisma.transactionLog.create({
        data: {
          type: "CONTRACT_UNPAUSE",
          userId: adminId,
          txHash:
            result.txHash || `contract_unpause_${contractKey}_${Date.now()}`,
          status: "CONFIRMED",
          sourceAccount: adminPubKey,
          destAccount: contractInfo.address,
          metadata: {
            contractKey,
            contractName: contractInfo.name,
            contractAddress: contractInfo.address,
            action: "UNPAUSE",
            reason,
          },
        },
      });

      const event: PauseEvent = {
        id: logEntry.id,
        contractName: contractInfo.name,
        contractAddress: contractInfo.address,
        action: "UNPAUSE",
        initiatedBy: adminId,
        reason,
        timestamp: logEntry.createdAt,
        txHash: result.txHash ?? undefined,
      };

      res.json({
        success: true,
        message: `${contractInfo.name} unpaused successfully`,
        data: {
          contract: {
            name: contractInfo.name,
            address: contractInfo.address,
            paused: false,
          } as ContractStatus,
          event,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Emergency Pause All
// ============================================

router.post(
  "/emergency-pause-all",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { reason } = pauseSchema.parse(req.body);
      const adminId = req.auth?.userId!;

      const deployed = getDeployedContracts();
      const adminKeypair = getAdminKeypair();
      const adminPubKey = adminKeypair.publicKey();

      const results: {
        contract: string;
        success: boolean;
        txHash?: string;
        error?: string;
      }[] = [];

      for (const [key, { name, address }] of deployed.entries()) {
        // Check if already paused
        const { paused: alreadyPaused } = await getContractPausedStatus(
          address,
          key,
          adminPubKey,
        );

        if (alreadyPaused) {
          results.push({
            contract: name,
            success: false,
            error: "Already paused",
          });
          continue;
        }

        // Submit on-chain pause(admin)
        const result = await contractService.invokeContract(
          address,
          "pause",
          [nativeToScVal(adminPubKey, { type: "address" })],
          adminKeypair,
        );

        if (result.success) {
          // Log to DB
          await prisma.transactionLog.create({
            data: {
              type: "CONTRACT_PAUSE",
              userId: adminId,
              txHash: result.txHash || `contract_pause_${key}_${Date.now()}`,
              status: "CONFIRMED",
              sourceAccount: adminPubKey,
              destAccount: address,
              metadata: {
                contractKey: key,
                contractName: name,
                contractAddress: address,
                action: "PAUSE",
                reason: `EMERGENCY: ${reason}`,
              },
            },
          });

          results.push({
            contract: name,
            success: true,
            txHash: result.txHash,
          });
        } else {
          results.push({
            contract: name,
            success: false,
            error: result.error || "On-chain pause failed",
          });
        }
      }

      res.json({
        success: true,
        message: "Emergency pause initiated",
        data: {
          results,
          pausedCount: results.filter((r) => r.success).length,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Unpause All
// ============================================

router.post(
  "/unpause-all",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { reason } = pauseSchema.parse(req.body);
      const adminId = req.auth?.userId!;

      const deployed = getDeployedContracts();
      const adminKeypair = getAdminKeypair();
      const adminPubKey = adminKeypair.publicKey();

      const results: {
        contract: string;
        success: boolean;
        txHash?: string;
        error?: string;
      }[] = [];

      for (const [key, { name, address }] of deployed.entries()) {
        // Check if currently paused
        const { paused: currentlyPaused } = await getContractPausedStatus(
          address,
          key,
          adminPubKey,
        );

        if (!currentlyPaused) {
          results.push({ contract: name, success: false, error: "Not paused" });
          continue;
        }

        // Submit on-chain unpause(admin)
        const result = await contractService.invokeContract(
          address,
          "unpause",
          [nativeToScVal(adminPubKey, { type: "address" })],
          adminKeypair,
        );

        if (result.success) {
          await prisma.transactionLog.create({
            data: {
              type: "CONTRACT_UNPAUSE",
              userId: adminId,
              txHash: result.txHash || `contract_unpause_${key}_${Date.now()}`,
              status: "CONFIRMED",
              sourceAccount: adminPubKey,
              destAccount: address,
              metadata: {
                contractKey: key,
                contractName: name,
                contractAddress: address,
                action: "UNPAUSE",
                reason,
              },
            },
          });

          results.push({
            contract: name,
            success: true,
            txHash: result.txHash,
          });
        } else {
          results.push({
            contract: name,
            success: false,
            error: result.error || "On-chain unpause failed",
          });
        }
      }

      res.json({
        success: true,
        message: "All contracts unpaused",
        data: {
          results,
          unpausedCount: results.filter((r) => r.success).length,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Pause History (DB-backed)
// ============================================

router.get(
  "/history",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const limit = Math.min(
        parseInt(req.query.limit as string, 10) || 50,
        200,
      );

      const logs = await prisma.transactionLog.findMany({
        where: {
          type: { in: ["CONTRACT_PAUSE", "CONTRACT_UNPAUSE"] },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      const history: PauseEvent[] = logs.map((log) => {
        const meta = (log.metadata as Record<string, unknown>) || {};
        return {
          id: log.id,
          contractName: (meta.contractName as string) ?? "",
          contractAddress:
            (meta.contractAddress as string) ?? log.destAccount ?? "",
          action:
            (meta.action as "PAUSE" | "UNPAUSE") ??
            (log.type === "CONTRACT_PAUSE" ? "PAUSE" : "UNPAUSE"),
          initiatedBy: log.userId ?? "",
          reason: (meta.reason as string) ?? "",
          timestamp: log.createdAt,
          txHash: log.txHash,
        };
      });

      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Contract Details
// ============================================

router.get(
  "/contract/:contractKey",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { contractKey } = req.params;

      const deployed = getDeployedContracts();
      const contractInfo = deployed.get(contractKey);
      if (!contractInfo) {
        throw createApiError(`Unknown contract: ${contractKey}`, 404);
      }

      const adminKeypair = getAdminKeypair();
      const { paused } = await getContractPausedStatus(
        contractInfo.address,
        contractKey,
        adminKeypair.publicKey(),
      );

      // Build status enriched with last pause event
      const status: ContractStatus = {
        name: contractInfo.name,
        address: contractInfo.address,
        paused,
      };

      if (paused) {
        const lastPauseLog = await prisma.transactionLog.findFirst({
          where: {
            type: "CONTRACT_PAUSE",
            metadata: { path: ["contractKey"], equals: contractKey },
          },
          orderBy: { createdAt: "desc" },
        });
        if (lastPauseLog) {
          status.lastPausedAt = lastPauseLog.createdAt;
          status.lastPausedBy = lastPauseLog.userId ?? undefined;
          const meta = lastPauseLog.metadata as Record<string, unknown> | null;
          status.pauseReason = (meta?.reason as string) ?? undefined;
        }
      }

      // Fetch recent history for this contract
      const historyLogs = await prisma.transactionLog.findMany({
        where: {
          type: { in: ["CONTRACT_PAUSE", "CONTRACT_UNPAUSE"] },
          metadata: { path: ["contractKey"], equals: contractKey },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      const history: PauseEvent[] = historyLogs.map((log) => {
        const meta = (log.metadata as Record<string, unknown>) || {};
        return {
          id: log.id,
          contractName: contractInfo.name,
          contractAddress: contractInfo.address,
          action:
            (meta.action as "PAUSE" | "UNPAUSE") ??
            (log.type === "CONTRACT_PAUSE" ? "PAUSE" : "UNPAUSE"),
          initiatedBy: log.userId ?? "",
          reason: (meta.reason as string) ?? "",
          timestamp: log.createdAt,
          txHash: log.txHash,
        };
      });

      res.json({
        success: true,
        data: {
          ...status,
          history,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
