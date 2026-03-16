/**
 * Token Transfer Service
 *
 * Handles secondary market functionality where investors can sell their tokens
 * to other investors without losing yield rights.
 */

import { prisma } from "@aethera/database";
import { contractService, walletService } from "@aethera/stellar";
import { Keypair, nativeToScVal } from "@stellar/stellar-sdk";

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
      (sum: number, inv: any) => sum + inv.tokenAmount,
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

    // Note: toUserId is set to sellerId as a placeholder because the schema
    // requires a non-nullable FK. It gets replaced with the real buyer ID
    // when someone calls acceptTransfer().
    const transfer = await prisma.tokenTransfer.create({
      data: {
        projectId,
        fromUserId: sellerId,
        toUserId: sellerId,
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

    if (!transfer.project.tokenContractId) {
      throw new Error("Project token contract not deployed");
    }

    if (!transfer.seller.stellarSecretEncrypted) {
      throw new Error("Seller wallet secret not available");
    }

    if (!transfer.seller.stellarPubKey) {
      throw new Error("Seller wallet not configured");
    }

    // 2. Get buyer's public key
    const buyer = await prisma.user.findUnique({
      where: { id: buyerId },
      select: { stellarPubKey: true },
    });

    if (!buyer?.stellarPubKey) {
      throw new Error("Buyer wallet not configured");
    }

    // 3. Mark as ACCEPTED (in-progress)
    await prisma.tokenTransfer.update({
      where: { id: transferId },
      data: {
        toUserId: buyerId,
        status: "ACCEPTED",
      },
    });

    // 4. Execute on-chain token transfer
    try {
      // Decrypt seller's secret key and create keypair
      const sellerSecret = walletService.decryptSecret(
        transfer.seller.stellarSecretEncrypted,
      );
      const sellerKeypair = Keypair.fromSecret(sellerSecret);

      // Build transfer args: from (Address), to (Address), amount (i128)
      const tokenAmountOnChain =
        BigInt(transfer.tokenAmount) * BigInt(1_000_000);
      const args = [
        nativeToScVal(transfer.seller.stellarPubKey, { type: "address" }),
        nativeToScVal(buyer.stellarPubKey, { type: "address" }),
        nativeToScVal(tokenAmountOnChain, { type: "i128" }),
      ];

      const result = await contractService.invokeContract(
        transfer.project.tokenContractId,
        "transfer",
        args,
        sellerKeypair,
      );

      if (!result.success) {
        throw new Error(result.error || "On-chain transfer failed");
      }

      // 5. Mark as COMPLETED with txHash
      await prisma.tokenTransfer.update({
        where: { id: transferId },
        data: {
          status: "COMPLETED",
          txHash: result.txHash || null,
          completedAt: new Date(),
        },
      });

      // 6. Create investment record for buyer
      await prisma.investment.create({
        data: {
          investorId: buyerId,
          projectId: transfer.projectId,
          amount: transfer.totalPrice,
          tokenAmount: transfer.tokenAmount,
          pricePerToken: transfer.pricePerToken,
          status: "CONFIRMED",
          txHash: result.txHash || null,
        },
      });

      console.log(
        `Token transfer completed: ${transfer.tokenAmount} tokens transferred on-chain (tx: ${result.txHash})`,
      );

      return transfer;
    } catch (error: any) {
      // Revert to PENDING so the listing is still available
      await prisma.tokenTransfer.update({
        where: { id: transferId },
        data: {
          toUserId: transfer.fromUserId,
          status: "REJECTED",
        },
      });
      throw new Error(`On-chain transfer failed: ${error.message}`);
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
          select: {
            name: true,
            tokenSymbol: true,
            expectedYield: true,
            pricePerToken: true,
          },
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
