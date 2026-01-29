/**
 * Emergency Pause Dashboard API Routes
 * 
 * Admin-only endpoints for emergency contract management.
 * Provides pause/unpause controls for all deployed contracts.
 */

import { Router } from "express";
import { z } from "zod";
import { getContractAddresses } from "@aethera/stellar";
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

// In-memory store for demo (would be database in production)
const pauseHistory: PauseEvent[] = [];
const contractStatuses: Map<string, ContractStatus> = new Map();

// Initialize contract statuses
function initializeContractStatuses() {
  const contracts = getContractAddresses();
  
  if (contracts.assetToken) {
    contractStatuses.set("assetToken", {
      name: "Asset Token",
      address: contracts.assetToken,
      paused: false,
    });
  }
  
  if (contracts.treasury) {
    contractStatuses.set("treasury", {
      name: "Treasury",
      address: contracts.treasury,
      paused: false,
    });
  }
  
  if (contracts.yieldDistributor) {
    contractStatuses.set("yieldDistributor", {
      name: "Yield Distributor",
      address: contracts.yieldDistributor,
      paused: false,
    });
  }
  
  if (contracts.governance) {
    contractStatuses.set("governance", {
      name: "Governance",
      address: contracts.governance,
      paused: false,
    });
  }
}

initializeContractStatuses();

// ============================================
// Dashboard Overview
// ============================================

router.get(
  "/status",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const contracts = Array.from(contractStatuses.values());
      const anyPaused = contracts.some(c => c.paused);
      
      res.json({
        success: true,
        data: {
          systemStatus: anyPaused ? "PARTIAL_PAUSE" : "OPERATIONAL",
          contracts,
          pausedCount: contracts.filter(c => c.paused).length,
          totalContracts: contracts.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
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
      
      const status = contractStatuses.get(contractKey);
      if (!status) {
        throw createApiError(`Unknown contract: ${contractKey}`, 404);
      }
      
      if (status.paused) {
        throw createApiError(`${status.name} is already paused`, 400);
      }
      
      // In production: Submit pause transaction to contract
      // For now, update local state
      status.paused = true;
      status.lastPausedAt = new Date();
      status.lastPausedBy = adminId;
      status.pauseReason = reason;
      
      // Log event
      const event: PauseEvent = {
        id: `pause-${Date.now()}`,
        contractName: status.name,
        contractAddress: status.address,
        action: "PAUSE",
        initiatedBy: adminId,
        reason,
        timestamp: new Date(),
      };
      pauseHistory.unshift(event);
      
      res.json({
        success: true,
        message: `${status.name} paused successfully`,
        data: {
          contract: status,
          event,
        },
      });
    } catch (error) {
      next(error);
    }
  }
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
      
      const status = contractStatuses.get(contractKey);
      if (!status) {
        throw createApiError(`Unknown contract: ${contractKey}`, 404);
      }
      
      if (!status.paused) {
        throw createApiError(`${status.name} is not paused`, 400);
      }
      
      // In production: Submit unpause transaction to contract
      status.paused = false;
      status.pauseReason = undefined;
      
      const event: PauseEvent = {
        id: `unpause-${Date.now()}`,
        contractName: status.name,
        contractAddress: status.address,
        action: "UNPAUSE",
        initiatedBy: adminId,
        reason,
        timestamp: new Date(),
      };
      pauseHistory.unshift(event);
      
      res.json({
        success: true,
        message: `${status.name} unpaused successfully`,
        data: {
          contract: status,
          event,
        },
      });
    } catch (error) {
      next(error);
    }
  }
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
      
      const results: { contract: string; success: boolean; error?: string }[] = [];
      
      for (const [key, status] of contractStatuses.entries()) {
        if (!status.paused) {
          // In production: Submit pause transaction
          status.paused = true;
          status.lastPausedAt = new Date();
          status.lastPausedBy = adminId;
          status.pauseReason = reason;
          
          pauseHistory.unshift({
            id: `pause-${Date.now()}-${key}`,
            contractName: status.name,
            contractAddress: status.address,
            action: "PAUSE",
            initiatedBy: adminId,
            reason: `EMERGENCY: ${reason}`,
            timestamp: new Date(),
          });
          
          results.push({ contract: status.name, success: true });
        } else {
          results.push({ contract: status.name, success: false, error: "Already paused" });
        }
      }
      
      res.json({
        success: true,
        message: "Emergency pause initiated",
        data: {
          results,
          pausedCount: results.filter(r => r.success).length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
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
      
      const results: { contract: string; success: boolean; error?: string }[] = [];
      
      for (const [key, status] of contractStatuses.entries()) {
        if (status.paused) {
          status.paused = false;
          status.pauseReason = undefined;
          
          pauseHistory.unshift({
            id: `unpause-${Date.now()}-${key}`,
            contractName: status.name,
            contractAddress: status.address,
            action: "UNPAUSE",
            initiatedBy: adminId,
            reason,
            timestamp: new Date(),
          });
          
          results.push({ contract: status.name, success: true });
        } else {
          results.push({ contract: status.name, success: false, error: "Not paused" });
        }
      }
      
      res.json({
        success: true,
        message: "All contracts unpaused",
        data: {
          results,
          unpausedCount: results.filter(r => r.success).length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Get Pause History
// ============================================

router.get(
  "/history",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      
      res.json({
        success: true,
        data: pauseHistory.slice(0, limit),
      });
    } catch (error) {
      next(error);
    }
  }
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
      
      const status = contractStatuses.get(contractKey);
      if (!status) {
        throw createApiError(`Unknown contract: ${contractKey}`, 404);
      }
      
      const history = pauseHistory.filter(
        e => e.contractAddress === status.address
      );
      
      res.json({
        success: true,
        data: {
          ...status,
          history: history.slice(0, 10),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
