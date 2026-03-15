/**
 * Governance API Routes
 *
 * Endpoints for proposal creation, voting, and governance management.
 * Interacts with the on-chain Governance contract via Soroban.
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "@aethera/database";
import {
  contractService,
  walletService,
  getContractAddresses,
} from "@aethera/stellar";
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
// Helpers
// ============================================

/** Map user-facing proposal type strings to on-chain u32 values. */
const PROPOSAL_TYPE_U32: Record<string, number> = {
  ParameterChange: 0,
  OracleApproval: 1,
  EmergencyPause: 2,
  TreasuryRelease: 3,
  ProtocolUpgrade: 4,
  General: 5,
};

/** Reverse map: u32 back to readable proposal type string. */
const PROPOSAL_TYPE_LABEL: Record<number, string> = Object.fromEntries(
  Object.entries(PROPOSAL_TYPE_U32).map(([k, v]) => [v, k]),
);

/** Map user-facing vote choice strings to on-chain u32 values. */
const VOTE_CHOICE_U32: Record<string, number> = {
  Yes: 0,
  No: 1,
  Abstain: 2,
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
 * Retrieve a user's signing keypair by decrypting their stored secret.
 */
async function getUserKeypair(
  userId: string,
): Promise<{ keypair: Keypair; publicKey: string }> {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { stellarPubKey: true, stellarSecretEncrypted: true },
  });

  if (!user?.stellarPubKey) {
    throw createApiError("No Stellar wallet connected", 400);
  }
  if (!user.stellarSecretEncrypted) {
    throw createApiError("No encrypted secret key found for wallet", 400);
  }

  const secret = walletService.decryptSecret(user.stellarSecretEncrypted);
  return { keypair: Keypair.fromSecret(secret), publicKey: user.stellarPubKey };
}

/**
 * Resolve the governance contract address or throw 503.
 */
function getGovernanceAddress(): string {
  const contracts = getContractAddresses();
  const addr = contracts.governance;
  if (!addr) {
    throw createApiError("Governance contract not deployed", 503);
  }
  return addr;
}

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
    const governanceAddr = getGovernanceAddress();

    const adminKeypair = getAdminKeypair();
    const configResult = await contractService.simulateContractCall(
      governanceAddr,
      "get_config",
      [],
      adminKeypair.publicKey(),
    );

    if (configResult.success && configResult.result) {
      const config = scValToNative(configResult.result as xdr.ScVal);
      res.json({
        success: true,
        data: {
          contractAddress: governanceAddr,
          votingPeriod: Number(config.voting_period),
          executionDelay: Number(config.execution_delay),
          quorumPercentage: Number(config.quorum_percentage) / 100, // basis points to %
          minProposalTokens: config.min_proposal_tokens.toString(),
        },
      });
    } else {
      // Fallback to sensible defaults when contract is unreachable
      res.json({
        success: true,
        data: {
          contractAddress: governanceAddr,
          votingPeriod: 7 * 24 * 60 * 60,
          executionDelay: 2 * 24 * 60 * 60,
          quorumPercentage: 5,
          minProposalTokens: "1000",
          note: "Defaults shown; could not reach contract",
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

// ============================================
// List Active Proposals (DB-backed cache)
// ============================================

router.get("/proposals", async (req, res, next) => {
  try {
    const { status, proposer, limit = "10", offset = "0" } = req.query;
    const take = Math.min(parseInt(limit as string, 10) || 10, 100);
    const skip = parseInt(offset as string, 10) || 0;

    // Build filter for TransactionLog entries that represent proposals
    const where: Record<string, unknown> = { type: "GOVERNANCE_PROPOSAL" };

    if (status) {
      where.metadata = { path: ["status"], equals: status };
    }
    if (proposer) {
      where.sourceAccount = proposer as string;
    }

    const [logs, total] = await Promise.all([
      prisma.transactionLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.transactionLog.count({ where }),
    ]);

    const proposals: Proposal[] = logs.map((log) => {
      const meta = (log.metadata as Record<string, unknown>) || {};
      return {
        id: Number(meta.proposalId ?? 0),
        title: (meta.title as string) ?? "",
        description: (meta.description as string) ?? "",
        proposalType: (meta.proposalType as string) ?? "General",
        status: (meta.status as string) ?? log.status,
        yesVotes: String(meta.yesVotes ?? "0"),
        noVotes: String(meta.noVotes ?? "0"),
        abstainVotes: String(meta.abstainVotes ?? "0"),
        startTime: Number(meta.startTime ?? 0),
        endTime: Number(meta.endTime ?? 0),
        quorumRequired: String(meta.quorumRequired ?? "0"),
        proposer: (meta.proposer as string) ?? log.sourceAccount ?? "",
      };
    });

    res.json({
      success: true,
      data: {
        data: proposals,
        pagination: { limit: take, offset: skip, total },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Get Proposal by ID (on-chain)
// ============================================

router.get("/proposals/:id", async (req, res, next) => {
  try {
    const proposalId = parseInt(req.params.id, 10);
    const governanceAddr = getGovernanceAddress();

    const adminKeypair = getAdminKeypair();
    const result = await contractService.simulateContractCall(
      governanceAddr,
      "get_proposal",
      [nativeToScVal(BigInt(proposalId), { type: "u64" })],
      adminKeypair.publicKey(),
    );

    if (!result.success) {
      throw createApiError(
        result.error || "Failed to fetch proposal from contract",
        404,
      );
    }

    const raw = scValToNative(result.result as xdr.ScVal);

    const proposal: Proposal = {
      id: Number(raw.id),
      title: raw.title,
      description: raw.description,
      proposalType:
        typeof raw.proposal_type === "number"
          ? (PROPOSAL_TYPE_LABEL[raw.proposal_type] ?? "General")
          : String(raw.proposal_type ?? "General"),
      status: raw.status ?? "Active",
      yesVotes: String(raw.yes_votes ?? "0"),
      noVotes: String(raw.no_votes ?? "0"),
      abstainVotes: String(raw.abstain_votes ?? "0"),
      startTime: Number(raw.start_time ?? 0),
      endTime: Number(raw.end_time ?? 0),
      quorumRequired: String(raw.quorum_required ?? "0"),
      proposer: raw.proposer ?? "",
    };

    res.json({ success: true, data: proposal });
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

      const { keypair, publicKey } = await getUserKeypair(userId);
      const governanceAddr = getGovernanceAddress();

      // Resolve proposal type to its on-chain u32 value
      const proposalTypeU32 = PROPOSAL_TYPE_U32[data.proposalType];
      if (proposalTypeU32 === undefined) {
        throw createApiError(
          `Unknown proposal type: ${data.proposalType}`,
          400,
        );
      }

      // On-chain: create_proposal(proposer, title, description, proposal_type)
      const args: xdr.ScVal[] = [
        nativeToScVal(publicKey, { type: "address" }),
        nativeToScVal(data.title, { type: "string" }),
        nativeToScVal(data.description, { type: "string" }),
        nativeToScVal(proposalTypeU32, { type: "u32" }),
      ];

      const result = await contractService.invokeContract(
        governanceAddr,
        "create_proposal",
        args,
        keypair,
      );

      if (!result.success) {
        throw createApiError(
          `Governance contract call failed: ${result.error}`,
          500,
        );
      }

      // create_proposal returns u64 proposal_id
      const proposalId = result.result
        ? Number(scValToNative(result.result as xdr.ScVal))
        : null;

      // Persist to TransactionLog so the DB-backed listing stays in sync
      await prisma.transactionLog.create({
        data: {
          type: "GOVERNANCE_PROPOSAL",
          userId,
          txHash: result.txHash || `gov_proposal_${Date.now()}`,
          status: "CONFIRMED",
          sourceAccount: publicKey,
          metadata: {
            proposalId,
            title: data.title,
            description: data.description,
            proposalType: data.proposalType,
            executionData: data.executionData || {},
            status: "Active",
            proposer: publicKey,
            yesVotes: "0",
            noVotes: "0",
            abstainVotes: "0",
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Proposal created on-chain",
        data: {
          proposalId,
          proposer: publicKey,
          title: data.title,
          proposalType: data.proposalType,
          txHash: result.txHash,
        },
      });
    } catch (error) {
      next(error);
    }
  },
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
      const proposalId = parseInt(req.params.id, 10);
      const { choice } = voteSchema.parse(req.body);
      const userId = req.auth?.userId!;

      const { keypair, publicKey } = await getUserKeypair(userId);
      const governanceAddr = getGovernanceAddress();

      const choiceU32 = VOTE_CHOICE_U32[choice];
      if (choiceU32 === undefined) {
        throw createApiError(`Unknown vote choice: ${choice}`, 400);
      }

      // On-chain: vote(voter, proposal_id, choice)
      const args: xdr.ScVal[] = [
        nativeToScVal(publicKey, { type: "address" }),
        nativeToScVal(BigInt(proposalId), { type: "u64" }),
        nativeToScVal(choiceU32, { type: "u32" }),
      ];

      const result = await contractService.invokeContract(
        governanceAddr,
        "vote",
        args,
        keypair,
      );

      if (!result.success) {
        throw createApiError(`Vote transaction failed: ${result.error}`, 500);
      }

      // Log vote to TransactionLog
      await prisma.transactionLog.create({
        data: {
          type: "GOVERNANCE_VOTE",
          userId,
          txHash: result.txHash || `gov_vote_${Date.now()}`,
          status: "CONFIRMED",
          sourceAccount: publicKey,
          metadata: {
            proposalId,
            choice,
            voter: publicKey,
          },
        },
      });

      // Update cached vote tallies on the proposal log entry
      const proposalLog = await prisma.transactionLog.findFirst({
        where: {
          type: "GOVERNANCE_PROPOSAL",
          metadata: { path: ["proposalId"], equals: proposalId },
        },
      });
      if (proposalLog) {
        // Re-fetch the on-chain state to keep the cache accurate
        const onChain = await contractService.simulateContractCall(
          governanceAddr,
          "get_proposal",
          [nativeToScVal(BigInt(proposalId), { type: "u64" })],
          publicKey,
        );
        if (onChain.success && onChain.result) {
          const raw = scValToNative(onChain.result as xdr.ScVal);
          const prevMeta =
            (proposalLog.metadata as Record<string, unknown>) || {};
          await prisma.transactionLog.update({
            where: { id: proposalLog.id },
            data: {
              metadata: {
                ...prevMeta,
                yesVotes: String(raw.yes_votes ?? "0"),
                noVotes: String(raw.no_votes ?? "0"),
                abstainVotes: String(raw.abstain_votes ?? "0"),
              },
            },
          });
        }
      }

      res.json({
        success: true,
        message: "Vote submitted on-chain",
        data: {
          proposalId,
          voter: publicKey,
          choice,
          txHash: result.txHash,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Finalize Proposal (Admin or anyone after period ends)
// ============================================

router.post("/proposals/:id/finalize", async (req, res, next) => {
  try {
    const proposalId = parseInt(req.params.id, 10);
    const governanceAddr = getGovernanceAddress();

    // finalize_proposal has no auth requirement; use admin keypair as the tx signer
    const adminKeypair = getAdminKeypair();

    // On-chain: finalize_proposal(proposal_id)
    const args: xdr.ScVal[] = [
      nativeToScVal(BigInt(proposalId), { type: "u64" }),
    ];

    const result = await contractService.invokeContract(
      governanceAddr,
      "finalize_proposal",
      args,
      adminKeypair,
    );

    if (!result.success) {
      throw createApiError(`Finalization failed: ${result.error}`, 500);
    }

    // Re-read proposal status from chain to get the real outcome
    let finalStatus = "Finalized";
    const onChain = await contractService.simulateContractCall(
      governanceAddr,
      "get_proposal",
      [nativeToScVal(BigInt(proposalId), { type: "u64" })],
      adminKeypair.publicKey(),
    );
    if (onChain.success && onChain.result) {
      const raw = scValToNative(onChain.result as xdr.ScVal);
      finalStatus = String(raw.status ?? "Finalized");
    }

    // Update the matching TransactionLog entry metadata if it exists
    const existingLog = await prisma.transactionLog.findFirst({
      where: {
        type: "GOVERNANCE_PROPOSAL",
        metadata: { path: ["proposalId"], equals: proposalId },
      },
    });
    if (existingLog) {
      const prevMeta = (existingLog.metadata as Record<string, unknown>) || {};
      await prisma.transactionLog.update({
        where: { id: existingLog.id },
        data: {
          metadata: { ...prevMeta, status: finalStatus },
        },
      });
    }

    // Log finalization event
    await prisma.transactionLog.create({
      data: {
        type: "GOVERNANCE_FINALIZE",
        txHash: result.txHash || `gov_finalize_${Date.now()}`,
        status: "CONFIRMED",
        sourceAccount: adminKeypair.publicKey(),
        metadata: { proposalId, resultStatus: finalStatus },
      },
    });

    res.json({
      success: true,
      message: "Proposal finalized on-chain",
      data: { proposalId, status: finalStatus, txHash: result.txHash },
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
    const proposalId = parseInt(req.params.id, 10);
    const governanceAddr = getGovernanceAddress();

    // execute_proposal has no auth requirement; use admin keypair as the tx signer
    const adminKeypair = getAdminKeypair();

    // On-chain: execute_proposal(proposal_id)
    const args: xdr.ScVal[] = [
      nativeToScVal(BigInt(proposalId), { type: "u64" }),
    ];

    const result = await contractService.invokeContract(
      governanceAddr,
      "execute_proposal",
      args,
      adminKeypair,
    );

    if (!result.success) {
      throw createApiError(`Execution failed: ${result.error}`, 500);
    }

    // Update the matching TransactionLog entry metadata if it exists
    const existingLog = await prisma.transactionLog.findFirst({
      where: {
        type: "GOVERNANCE_PROPOSAL",
        metadata: { path: ["proposalId"], equals: proposalId },
      },
    });
    if (existingLog) {
      const prevMeta = (existingLog.metadata as Record<string, unknown>) || {};
      await prisma.transactionLog.update({
        where: { id: existingLog.id },
        data: {
          metadata: { ...prevMeta, status: "Executed" },
        },
      });
    }

    // Log execution event
    await prisma.transactionLog.create({
      data: {
        type: "GOVERNANCE_EXECUTE",
        txHash: result.txHash || `gov_execute_${Date.now()}`,
        status: "CONFIRMED",
        sourceAccount: adminKeypair.publicKey(),
        metadata: { proposalId },
      },
    });

    res.json({
      success: true,
      message: "Proposal executed on-chain",
      data: { proposalId, txHash: result.txHash },
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
      const proposalId = parseInt(req.params.id, 10);
      const userId = req.auth?.userId!;

      const { keypair, publicKey } = await getUserKeypair(userId);
      const governanceAddr = getGovernanceAddress();

      // On-chain: cancel_proposal(caller, proposal_id)
      const args: xdr.ScVal[] = [
        nativeToScVal(publicKey, { type: "address" }),
        nativeToScVal(BigInt(proposalId), { type: "u64" }),
      ];

      const result = await contractService.invokeContract(
        governanceAddr,
        "cancel_proposal",
        args,
        keypair,
      );

      if (!result.success) {
        throw createApiError(`Cancellation failed: ${result.error}`, 500);
      }

      // Update the matching TransactionLog entry metadata if it exists
      const existingLog = await prisma.transactionLog.findFirst({
        where: {
          type: "GOVERNANCE_PROPOSAL",
          metadata: { path: ["proposalId"], equals: proposalId },
        },
      });
      if (existingLog) {
        const prevMeta =
          (existingLog.metadata as Record<string, unknown>) || {};
        await prisma.transactionLog.update({
          where: { id: existingLog.id },
          data: {
            metadata: { ...prevMeta, status: "Cancelled" },
          },
        });
      }

      // Log cancellation event
      await prisma.transactionLog.create({
        data: {
          type: "GOVERNANCE_CANCEL",
          userId,
          txHash: result.txHash || `gov_cancel_${Date.now()}`,
          status: "CONFIRMED",
          sourceAccount: publicKey,
          metadata: { proposalId },
        },
      });

      res.json({
        success: true,
        message: "Proposal cancelled on-chain",
        data: { proposalId, txHash: result.txHash },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get User's Votes (DB-backed)
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

      // Query TransactionLog for this user's governance votes
      const voteLogs = await prisma.transactionLog.findMany({
        where: {
          type: "GOVERNANCE_VOTE",
          userId,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const votes = voteLogs.map((log) => {
        const meta = (log.metadata as Record<string, unknown>) || {};
        return {
          proposalId: meta.proposalId,
          choice: meta.choice,
          voter: meta.voter ?? log.sourceAccount,
          txHash: log.txHash,
          timestamp: log.createdAt,
        };
      });

      res.json({ success: true, data: votes });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Get Voting Power (on-chain token balance)
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

      const contracts = getContractAddresses();
      const tokenAddr = contracts.assetToken;

      if (!tokenAddr) {
        return res.json({
          success: true,
          data: {
            address: user.stellarPubKey,
            votingPower: "0",
            hasTokens: false,
            note: "Asset token contract not deployed",
          },
        });
      }

      // Query the asset token contract's balance method for the user's address
      const balanceResult = await contractService.simulateContractCall(
        tokenAddr,
        "balance",
        [nativeToScVal(user.stellarPubKey, { type: "address" })],
        user.stellarPubKey,
      );

      let votingPower = "0";
      let hasTokens = false;

      if (balanceResult.success && balanceResult.result) {
        const balance = scValToNative(balanceResult.result as xdr.ScVal);
        votingPower = String(balance);
        hasTokens = BigInt(balance) > 0n;
      }

      res.json({
        success: true,
        data: {
          address: user.stellarPubKey,
          votingPower,
          hasTokens,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Admin: Pause Governance
// ============================================

router.post(
  "/pause",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const governanceAddr = getGovernanceAddress();
      const adminKeypair = getAdminKeypair();

      // On-chain: pause(admin)
      const args: xdr.ScVal[] = [
        nativeToScVal(adminKeypair.publicKey(), { type: "address" }),
      ];

      const result = await contractService.invokeContract(
        governanceAddr,
        "pause",
        args,
        adminKeypair,
      );

      if (!result.success) {
        throw createApiError(`Pause transaction failed: ${result.error}`, 500);
      }

      // Log pause event
      await prisma.transactionLog.create({
        data: {
          type: "GOVERNANCE_PAUSE",
          userId: req.auth?.userId,
          txHash: result.txHash || `gov_pause_${Date.now()}`,
          status: "CONFIRMED",
          sourceAccount: adminKeypair.publicKey(),
          metadata: { action: "PAUSE", contract: "governance" },
        },
      });

      res.json({
        success: true,
        message: "Governance contract paused on-chain",
        data: { txHash: result.txHash },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================
// Admin: Unpause Governance
// ============================================

router.post(
  "/unpause",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const governanceAddr = getGovernanceAddress();
      const adminKeypair = getAdminKeypair();

      // On-chain: unpause(admin)
      const args: xdr.ScVal[] = [
        nativeToScVal(adminKeypair.publicKey(), { type: "address" }),
      ];

      const result = await contractService.invokeContract(
        governanceAddr,
        "unpause",
        args,
        adminKeypair,
      );

      if (!result.success) {
        throw createApiError(
          `Unpause transaction failed: ${result.error}`,
          500,
        );
      }

      // Log unpause event
      await prisma.transactionLog.create({
        data: {
          type: "GOVERNANCE_UNPAUSE",
          userId: req.auth?.userId,
          txHash: result.txHash || `gov_unpause_${Date.now()}`,
          status: "CONFIRMED",
          sourceAccount: adminKeypair.publicKey(),
          metadata: { action: "UNPAUSE", contract: "governance" },
        },
      });

      res.json({
        success: true,
        message: "Governance contract unpaused on-chain",
        data: { txHash: result.txHash },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
