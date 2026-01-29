/**
 * Governance API Routes
 * 
 * Endpoints for proposal creation, voting, and governance management.
 * Interacts with the on-chain Governance contract.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "@aethera/database";
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

interface Proposal {
  id: number;
  title: string;
  description: string;
  proposalType: string;
  status: string;
  yesVotes: string;
  noVotes: string;
  abstainVotes: string;
  startTime: number;
  endTime: number;
  quorumRequired: string;
  proposer: string;
}

// ============================================
// Get Governance Info
// ============================================

router.get("/info", async (req, res, next) => {
  try {
    const contracts = getContractAddresses();
    
    res.json({
      success: true,
      data: {
        contractAddress: contracts.governance,
        // These would come from contract calls in production
        votingPeriod: 7 * 24 * 60 * 60, // 7 days in seconds
        executionDelay: 2 * 24 * 60 * 60, // 2 days
        quorumPercentage: 5, // 5%
        minProposalTokens: 1000,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// List Active Proposals
// ============================================

router.get("/proposals", async (req, res, next) => {
  try {
    const { status, proposer,  limit = "10", offset = "0" } = req.query;
    
    // In production, this would query the contract or an indexer
    // For now, return mock data structure
    const proposals: Proposal[] = [
      // Would be populated from on-chain data
    ];
    
    res.json({
      success: true,
      data: proposals,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: proposals.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Get Proposal by ID
// ============================================

router.get("/proposals/:id", async (req, res, next) => {
  try {
    const proposalId = parseInt(req.params.id);
    
    // In production, fetch from contract
    res.json({
      success: true,
      data: null, // Would be populated from on-chain data
      message: "Proposal data would be fetched from contract",
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Create Proposal (Authenticated)
// ============================================

const createProposalSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(50).max(5000),
  proposalType: z.enum([
    "ParameterChange",
    "OracleApproval",
    "EmergencyPause",
    "TreasuryRelease",
    "ProtocolUpgrade",
    "General",
  ]),
  executionData: z.record(z.any()).optional(),
});

router.post(
  "/proposals",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = createProposalSchema.parse(req.body);
      const userId = req.auth?.userId!;
      
      // Get user's wallet address
      const user = await prisma.user.findFirst({
        where: { id: userId },
        select: { stellarPubKey: true },
      });
      
      if (!user?.stellarPubKey) {
        throw createApiError("No Stellar wallet connected", 400);
      }
      
      // In production:
      // 1. Check token balance meets minimum
      // 2. Submit transaction to contract
      // 3. Return proposal ID
      
      res.status(201).json({
        success: true,
        message: "Proposal creation would submit to Governance contract",
        data: {
          proposer: user.stellarPubKey,
          title: data.title,
          proposalType: data.proposalType,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Vote on Proposal (Authenticated)
// ============================================

const voteSchema = z.object({
  choice: z.enum(["Yes", "No", "Abstain"]),
});

router.post(
  "/proposals/:id/vote",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const proposalId = parseInt(req.params.id);
      const { choice } = voteSchema.parse(req.body);
      const userId = req.auth?.userId!;
      
      // Get user's wallet
      const user = await prisma.user.findFirst({
        where: { id: userId },
        select: { stellarPubKey: true },
      });
      
      if (!user?.stellarPubKey) {
        throw createApiError("No Stellar wallet connected", 400);
      }
      
      // In production:
      // 1. Check proposal is active
      // 2. Check user hasn't voted
      // 3. Get voting power
      // 4. Submit vote transaction
      
      res.json({
        success: true,
        message: "Vote would be submitted to Governance contract",
        data: {
          proposalId,
          voter: user.stellarPubKey,
          choice,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Finalize Proposal (Admin or anyone after period ends)
// ============================================

router.post("/proposals/:id/finalize", async (req, res, next) => {
  try {
    const proposalId = parseInt(req.params.id);
    
    // In production:
    // 1. Check voting period ended
    // 2. Submit finalize transaction
    
    res.json({
      success: true,
      message: "Finalization would be submitted to Governance contract",
      data: { proposalId },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Execute Proposal (After execution delay)
// ============================================

router.post("/proposals/:id/execute", async (req, res, next) => {
  try {
    const proposalId = parseInt(req.params.id);
    
    // In production:
    // 1. Check proposal passed
    // 2. Check execution delay passed
    // 3. Submit execute transaction
    // 4. Handle execution logic based on proposal type
    
    res.json({
      success: true,
      message: "Execution would be submitted to Governance contract",
      data: { proposalId },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Cancel Proposal (Proposer or Admin only)
// ============================================

router.post(
  "/proposals/:id/cancel",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const proposalId = parseInt(req.params.id);
      const userId = req.auth?.userId!;
      
      // In production:
      // 1. Check caller is proposer or admin
      // 2. Check proposal is still active
      // 3. Submit cancel transaction
      
      res.json({
        success: true,
        message: "Cancellation would be submitted to Governance contract",
        data: { proposalId },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Get User's Votes
// ============================================

router.get(
  "/my-votes",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.auth?.userId!;
      
      const user = await prisma.user.findFirst({
        where: { id: userId },
        select: { stellarPubKey: true },
      });
      
      if (!user?.stellarPubKey) {
        return res.json({ success: true, data: [] });
      }
      
      // In production: Query contract for user's votes
      res.json({
        success: true,
        data: [], // Would be populated from contract events
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Get Voting Power
// ============================================

router.get(
  "/voting-power",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.auth?.userId!;
      
      const user = await prisma.user.findFirst({
        where: { id: userId },
        select: { stellarPubKey: true },
      });
      
      if (!user?.stellarPubKey) {
        return res.json({
          success: true,
          data: { votingPower: "0", hasTokens: false },
        });
      }
      
      // In production: Query token balance from contract
      res.json({
        success: true,
        data: {
          address: user.stellarPubKey,
          votingPower: "0", // Would come from token contract
          hasTokens: false,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Admin: Pause/Unpause Governance
// ============================================

router.post(
  "/pause",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // In production: Submit pause transaction to contract
      res.json({
        success: true,
        message: "Pause would be submitted to Governance contract",
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/unpause",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // In production: Submit unpause transaction to contract
      res.json({
        success: true,
        message: "Unpause would be submitted to Governance contract",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
