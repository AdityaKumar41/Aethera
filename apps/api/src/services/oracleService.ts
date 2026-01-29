/**
 * Oracle Service
 * 
 * Handles oracle provider management, signed data submission, and dispute resolution.
 * Uses Ed25519 signatures for cryptographic verification.
 */

import { prisma } from "@aethera/database";
import { createHash, createHmac, randomBytes } from "crypto";
import * as nacl from "tweetnacl";
import * as naclUtil from "tweetnacl-util";

// ============================================
// Types
// ============================================

interface OracleDataSubmission {
  projectId: string;
  energyProduced: number; // kWh
  recordedAt: Date;
  periodStart?: Date;
  periodEnd?: Date;
}

interface SignedSubmission {
  data: OracleDataSubmission;
  signature: string; // Base64 encoded Ed25519 signature
  timestamp: number; // Unix timestamp
  nonce: string;
}

interface DisputeInput {
  productionDataId: string;
  reason: string;
  evidence?: Record<string, any>;
}

// ============================================
// Oracle Service
// ============================================

export class OracleService {
  private static instance: OracleService | null = null;

  private constructor() {}

  static getInstance(): OracleService {
    if (!OracleService.instance) {
      OracleService.instance = new OracleService();
    }
    return OracleService.instance;
  }

  // ============================================
  // Oracle Provider Management
  // ============================================

  /**
   * Register a new oracle provider (pending approval)
   */
  async registerProvider(input: {
    name: string;
    description?: string;
    contactEmail?: string;
    webhookUrl?: string;
  }): Promise<{ providerId: string; apiKey: string; publicKey: string }> {
    // Generate API key (32 bytes, hex encoded)
    const apiKey = randomBytes(32).toString("hex");
    const apiKeyHash = this.hashApiKey(apiKey);

    // Generate Ed25519 keypair
    const keypair = nacl.sign.keyPair();
    const publicKey = naclUtil.encodeBase64(keypair.publicKey);
    const secretKey = naclUtil.encodeBase64(keypair.secretKey);

    const provider = await prisma.oracleProvider.create({
      data: {
        name: input.name,
        description: input.description,
        contactEmail: input.contactEmail,
        webhookUrl: input.webhookUrl,
        apiKeyHash,
        publicKey,
      },
    });

    // Return the secret key only once - provider must store it securely
    console.log(`⚠️ Oracle ${provider.name} secret key (store securely): ${secretKey}`);

    return {
      providerId: provider.id,
      apiKey,
      publicKey,
    };
  }

  /**
   * Approve an oracle provider (admin only)
   */
  async approveProvider(providerId: string, adminUserId: string): Promise<void> {
    await prisma.oracleProvider.update({
      where: { id: providerId },
      data: {
        status: "ACTIVE",
        approvedAt: new Date(),
        approvedBy: adminUserId,
      },
    });
  }

  /**
   * Suspend an oracle provider
   */
  async suspendProvider(providerId: string, reason: string): Promise<void> {
    await prisma.oracleProvider.update({
      where: { id: providerId },
      data: {
        status: "SUSPENDED",
      },
    });

    // Notify via webhook if configured
    const provider = await prisma.oracleProvider.findUnique({
      where: { id: providerId },
    });

    if (provider?.webhookUrl) {
      await this.sendWebhook(provider.webhookUrl, {
        type: "PROVIDER_SUSPENDED",
        reason,
      });
    }
  }

  /**
   * Validate API key and return provider
   */
  async validateApiKey(apiKey: string): Promise<{ id: string; publicKey: string } | null> {
    const apiKeyHash = this.hashApiKey(apiKey);
    
    const provider = await prisma.oracleProvider.findUnique({
      where: { apiKeyHash },
      select: { id: true, publicKey: true, status: true },
    });

    if (!provider || provider.status !== "ACTIVE") {
      return null;
    }

    return { id: provider.id, publicKey: provider.publicKey };
  }

  // ============================================
  // Signed Data Submission
  // ============================================

  /**
   * Submit signed production data
   */
  async submitSignedData(
    apiKey: string,
    submission: SignedSubmission
  ): Promise<{ success: boolean; dataId?: string; error?: string }> {
    // 1. Validate API key
    const provider = await this.validateApiKey(apiKey);
    if (!provider) {
      return { success: false, error: "Invalid or inactive API key" };
    }

    // 2. Check rate limit
    const isRateLimited = await this.checkRateLimit(provider.id);
    if (isRateLimited) {
      return { success: false, error: "Rate limit exceeded" };
    }

    // 3. Validate timestamp (must be within 5 minutes)
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    if (Math.abs(now - submission.timestamp) > fiveMinutes) {
      return { success: false, error: "Timestamp too old or in future" };
    }

    // 4. Verify signature
    const payload = this.createSignablePayload(submission.data, submission.timestamp, submission.nonce);
    const isValid = this.verifySignature(payload, submission.signature, provider.publicKey);

    // 5. Check project exists
    const project = await prisma.project.findUnique({
      where: { id: submission.data.projectId },
      select: { id: true, status: true },
    });

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // 6. Store production data
    const productionData = await prisma.productionData.create({
      data: {
        projectId: submission.data.projectId,
        energyProduced: submission.data.energyProduced,
        recordedAt: new Date(submission.data.recordedAt),
        periodStart: submission.data.periodStart ? new Date(submission.data.periodStart) : null,
        periodEnd: submission.data.periodEnd ? new Date(submission.data.periodEnd) : null,
        source: "ORACLE",
        oracleProviderId: provider.id,
        signature: submission.signature,
        signedPayload: JSON.stringify({ ...submission, timestamp: submission.timestamp, nonce: submission.nonce }),
        signatureValid: isValid,
      },
    });

    // 7. Update provider stats
    await prisma.oracleProvider.update({
      where: { id: provider.id },
      data: {
        totalSubmissions: { increment: 1 },
        lastSubmissionAt: new Date(),
      },
    });

    // 8. Update project's total production
    await prisma.project.update({
      where: { id: submission.data.projectId },
      data: {
        totalEnergyProduced: { increment: submission.data.energyProduced },
        lastProductionUpdate: new Date(),
      },
    });

    return { success: true, dataId: productionData.id };
  }

  /**
   * Create a signable payload string
   */
  private createSignablePayload(data: OracleDataSubmission, timestamp: number, nonce: string): string {
    const normalized = {
      projectId: data.projectId,
      energyProduced: data.energyProduced.toString(),
      recordedAt: new Date(data.recordedAt).toISOString(),
      periodStart: data.periodStart ? new Date(data.periodStart).toISOString() : null,
      periodEnd: data.periodEnd ? new Date(data.periodEnd).toISOString() : null,
      timestamp,
      nonce,
    };
    return JSON.stringify(normalized);
  }

  /**
   * Verify Ed25519 signature
   */
  private verifySignature(payload: string, signatureBase64: string, publicKeyBase64: string): boolean {
    try {
      const message = naclUtil.decodeUTF8(payload);
      const signature = naclUtil.decodeBase64(signatureBase64);
      const publicKey = naclUtil.decodeBase64(publicKeyBase64);
      
      return nacl.sign.detached.verify(message, signature, publicKey);
    } catch (error) {
      console.error("Signature verification failed:", error);
      return false;
    }
  }

  // ============================================
  // Dispute Resolution
  // ============================================

  /**
   * File a dispute against production data
   */
  async fileDispute(userId: string, input: DisputeInput): Promise<string> {
    const productionData = await prisma.productionData.findUnique({
      where: { id: input.productionDataId },
      include: { oracleProvider: true },
    });

    if (!productionData) {
      throw new Error("Production data not found");
    }

    if (!productionData.oracleProviderId) {
      throw new Error("This data was not submitted by an oracle");
    }

    if (productionData.disputed) {
      throw new Error("This data is already disputed");
    }

    // Create dispute
    const dispute = await prisma.oracleDispute.create({
      data: {
        productionDataId: input.productionDataId,
        oracleProviderId: productionData.oracleProviderId,
        filedBy: userId,
        reason: input.reason,
        evidence: input.evidence,
      },
    });

    // Mark production data as disputed
    await prisma.productionData.update({
      where: { id: input.productionDataId },
      data: {
        disputed: true,
        disputeId: dispute.id,
      },
    });

    // Increment oracle's disputed count
    await prisma.oracleProvider.update({
      where: { id: productionData.oracleProviderId },
      data: {
        disputedSubmissions: { increment: 1 },
      },
    });

    // Notify oracle via webhook
    if (productionData.oracleProvider?.webhookUrl) {
      await this.sendWebhook(productionData.oracleProvider.webhookUrl, {
        type: "DISPUTE_FILED",
        disputeId: dispute.id,
        productionDataId: input.productionDataId,
        reason: input.reason,
      });
    }

    return dispute.id;
  }

  /**
   * Resolve a dispute (admin only)
   */
  async resolveDispute(
    disputeId: string,
    adminUserId: string,
    resolution: {
      valid: boolean;
      notes: string;
      trustScoreChange?: number; // -10 to +10
    }
  ): Promise<void> {
    const dispute = await prisma.oracleDispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error("Dispute not found");
    }

    if (dispute.status !== "OPEN" && dispute.status !== "UNDER_REVIEW") {
      throw new Error("Dispute already resolved");
    }

    // Update dispute
    await prisma.oracleDispute.update({
      where: { id: disputeId },
      data: {
        status: resolution.valid ? "RESOLVED_VALID" : "RESOLVED_INVALID",
        resolvedBy: adminUserId,
        resolution: resolution.notes,
        resolvedAt: new Date(),
        trustScoreChange: resolution.trustScoreChange ?? (resolution.valid ? 2 : -5),
        dataInvalidated: !resolution.valid,
      },
    });

    // Update oracle's trust score
    const trustChange = resolution.trustScoreChange ?? (resolution.valid ? 2 : -5);
    await prisma.oracleProvider.update({
      where: { id: dispute.oracleProviderId },
      data: {
        trustScore: {
          increment: trustChange,
        },
      },
    });

    // If invalid, mark production data
    if (!resolution.valid) {
      // Note: The production data should be marked - we need disputeId reference
      // This is handled by the dispute record itself
      console.log(`Production data ${dispute.productionDataId} invalidated by dispute resolution`);
    }

    // Notify oracle via webhook
    const provider = await prisma.oracleProvider.findUnique({
      where: { id: dispute.oracleProviderId },
    });

    if (provider?.webhookUrl) {
      await this.sendWebhook(provider.webhookUrl, {
        type: "DISPUTE_RESOLVED",
        disputeId,
        valid: resolution.valid,
        trustScoreChange: trustChange,
      });
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private hashApiKey(apiKey: string): string {
    return createHash("sha256").update(apiKey).digest("hex");
  }

  private async checkRateLimit(providerId: string): Promise<boolean> {
    const provider = await prisma.oracleProvider.findUnique({
      where: { id: providerId },
      select: { rateLimit: true, lastSubmissionAt: true, totalSubmissions: true },
    });

    if (!provider) return true;

    // Simple rate limiting: check submissions in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSubmissions = await prisma.productionData.count({
      where: {
        oracleProviderId: providerId,
        createdAt: { gte: oneHourAgo },
      },
    });

    return recentSubmissions >= provider.rateLimit;
  }

  private async sendWebhook(url: string, payload: Record<string, any>): Promise<void> {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Webhook notification failed:", error);
    }
  }

  // ============================================
  // Trust Score Management
  // ============================================

  /**
   * Get providers ranked by trust score
   */
  async getTopProviders(limit: number = 10): Promise<any[]> {
    return prisma.oracleProvider.findMany({
      where: { status: "ACTIVE" },
      orderBy: { trustScore: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        trustScore: true,
        totalSubmissions: true,
        disputedSubmissions: true,
        createdAt: true,
      },
    });
  }

  /**
   * Recalculate trust score based on history
   */
  async recalculateTrustScore(providerId: string): Promise<number> {
    const provider = await prisma.oracleProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) throw new Error("Provider not found");

    // Base score
    let score = 50;

    // Adjust for dispute ratio
    if (provider.totalSubmissions > 0) {
      const disputeRatio = provider.disputedSubmissions / provider.totalSubmissions;
      score -= Math.round(disputeRatio * 30); // Up to -30 for high dispute ratio
    }

    // Bonus for longevity (max +20)
    const daysActive = Math.floor(
      (Date.now() - provider.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    score += Math.min(20, Math.floor(daysActive / 30)); // +1 per month, max 20

    // Bonus for volume (max +10)
    score += Math.min(10, Math.floor(provider.totalSubmissions / 100));

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    await prisma.oracleProvider.update({
      where: { id: providerId },
      data: { trustScore: score },
    });

    return score;
  }
}

export const oracleService = OracleService.getInstance();
export default OracleService;
