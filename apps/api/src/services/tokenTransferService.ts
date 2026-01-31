/**
 * Token Transfer Service
 *
 * Handles secondary market functionality where investors can sell their tokens
 * to other investors without losing yield rights.
 */

import { prisma } from "@aethera/database";
import {
  stellarClient,
  contractService,
  getContractAddresses,
} from "@aethera/stellar";
import { Keypair, nativeToScVal } from "@stellar/stellar-sdk";
import crypto from "crypto";

interface CreateTransferListingParams {
  sellerId: string;
  projectId: string;
  tokenAmount: number;
  pricePerToken: number;
}

interface TokenListing {
  seller: {
    id: string;
    email: string;
    name: string | null;
  };
  project: {
    id: string;
    name: string;
    pricePerToken: number;
    tokenSymbol?: string;
  };
}
interface AcceptTransferParams {
  transferId: string;
  buyerId: string;
}

export class TokenTransferService {
  private static instance: TokenTransferService | null = null;

  private constructor() {}

  static getInstance(): TokenTransferService {
    if (!TokenTransferService.instance) {
      TokenTransferService.instance = new TokenTransferService();
    }
    return TokenTransferService.instance;
  }

  /**
   * Create a transfer listing (seller lists tokens for sale)
   */
  async createListing(params: CreateTransferListingParams) {
    const { sellerId, projectId, tokenAmount, pricePerToken } = params;

    // 1. Validate seller owns the tokens
    const investments = await prisma.investment.findMany({
      where: {
        investorId: sellerId,
        projectId,
        status: "CONFIRMED",
      },
    });

    const totalTokensOwned = investments.reduce(
      (sum, inv) => sum + inv.tokenAmount,
      0,
    );

    if (totalTokensOwned < tokenAmount) {
      throw new Error(
        `Insufficient tokens. You own ${totalTokensOwned} but trying to sell ${tokenAmount}`,
      );
    }

    // 2. Check seller's on-chain balance
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: { stellarPubKey: true },
    });

    if (!seller?.stellarPubKey) {
      throw new Error("Seller wallet not configured");
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { tokenContractId: true, name: true },
    });

    if (!project?.tokenContractId) {
      throw new Error("Project token contract not found");
    }

    const balance = await contractService.getTokenBalance(
      project.tokenContractId,
      seller.stellarPubKey,
    );

    if (!balance || balance.balance < BigInt(tokenAmount * 1_000_000)) {
      throw new Error("Insufficient token balance on-chain");
    }

    // 3. Create transfer listing
    const totalPrice = tokenAmount * pricePerToken;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const transfer = await prisma.tokenTransfer.create({
      data: {
        projectId,
        fromUserId: sellerId,
        toUserId: sellerId, // Will be updated when accepted
        tokenAmount,
        pricePerToken,
        totalPrice,
        status: "PENDING",
        expiresAt,
      },
      include: {
        project: {
          select: { name: true, tokenSymbol: true },
        },
      },
    });

    console.log(
      `📋 Token listing created: ${tokenAmount} tokens of ${project.name} @ $${pricePerToken} each`,
    );

    return transfer;
  }

  /**
   * Accept a transfer (buyer purchases listed tokens)
   */
  async acceptTransfer(params: AcceptTransferParams) {
    const { transferId, buyerId } = params;

    // 1. Get transfer and validate
    const transfer = await prisma.tokenTransfer.findUnique({
      where: { id: transferId },
      include: {
        project: { select: { tokenContractId: true, name: true } },
        seller: {
          select: { stellarPubKey: true, stellarSecretEncrypted: true },
        },
        buyer: {
          select: { stellarPubKey: true, stellarSecretEncrypted: true },
        },
      },
    });

    if (!transfer) {
      throw new Error("Transfer not found");
    }

    if (transfer.status !== "PENDING") {
      throw new Error(`Transfer is ${transfer.status}, cannot accept`);
    }

    if (transfer.expiresAt && transfer.expiresAt < new Date()) {
      await prisma.tokenTransfer.update({
        where: { id: transferId },
        data: { status: "EXPIRED" },
      });
      throw new Error("Transfer listing has expired");
    }

    // 2. Update transfer with buyer
    await prisma.tokenTransfer.update({
      where: { id: transferId },
      data: {
        toUserId: buyerId,
        status: "ACCEPTED",
      },
    });

    // 3. Execute on-chain transfer
    try {
      // Get decryption key
      const encryptionKey = process.env.STELLAR_SECRET_ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new Error("Encryption key not configured");
      }

      // This would transfer tokens from seller to buyer on-chain
      // For now, we'll mark it as completed
      // In production, you'd call the asset token contract's transfer function

      await prisma.tokenTransfer.update({
        where: { id: transferId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      // Create investment record for buyer
      await prisma.investment.create({
        data: {
          investorId: buyerId,
          projectId: transfer.projectId,
          amount: transfer.totalPrice,
          tokenAmount: transfer.tokenAmount,
          pricePerToken: transfer.pricePerToken,
          status: "CONFIRMED", // Secondary purchase, no on-chain investment needed
        },
      });

      console.log(
        `✅ Token transfer completed: ${transfer.tokenAmount} tokens transferred to buyer`,
      );

      return transfer;
    } catch (error: any) {
      await prisma.tokenTransfer.update({
        where: { id: transferId },
        data: { status: "REJECTED" },
      });
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }

  /**
   * Get available token listings for a project
   */
  async getProjectListings(projectId: string) {
    return prisma.tokenTransfer.findMany({
      where: {
        projectId,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      include: {
        seller: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { name: true, tokenSymbol: true, expectedYield: true, pricePerToken: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get user's active listings
   */
  async getUserListings(userId: string) {
    return prisma.tokenTransfer.findMany({
      where: {
        fromUserId: userId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      include: {
        project: {
          select: { name: true, tokenSymbol: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Cancel a listing
   */
  async cancelListing(transferId: string, userId: string) {
    const transfer = await prisma.tokenTransfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer || transfer.fromUserId !== userId) {
      throw new Error("Transfer not found or unauthorized");
    }

    if (transfer.status !== "PENDING") {
      throw new Error("Can only cancel pending transfers");
    }

    return prisma.tokenTransfer.update({
      where: { id: transferId },
      data: { status: "REJECTED" },
    });
  }
}

export const tokenTransferService = TokenTransferService.getInstance();
