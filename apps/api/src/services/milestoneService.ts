import { prisma, ProjectStatus, MilestoneStatus, VerificationMethod } from "@aethera/database";
import { contractService, getContractAddresses } from "@aethera/stellar";
import { Keypair } from "@stellar/stellar-sdk";

export class MilestoneService {
  /**
   * Submit proof for a milestone
   */
  async submitMilestone(params: {
    milestoneId: string;
    installerId: string;
    proofDocuments: any;
  }) {
    const { milestoneId, installerId, proofDocuments } = params;

    const milestone = await prisma.projectMilestone.findUnique({
      where: { id: milestoneId },
      include: { project: true },
    });

    if (!milestone) throw new Error("Milestone not found");
    if (milestone.project.installerId !== installerId) throw new Error("Unauthorized");
    if (milestone.status !== MilestoneStatus.PENDING && milestone.status !== MilestoneStatus.REJECTED) {
      throw new Error(`Cannot submit milestone in ${milestone.status} status`);
    }

    return await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        status: MilestoneStatus.SUBMITTED,
        proofDocuments,
        submittedAt: new Date(),
      },
    });
  }

  /**
   * Verify a milestone (Admin only)
   */
  async verifyMilestone(params: {
    milestoneId: string;
    adminId: string;
  }) {
    const { milestoneId, adminId } = params;

    const milestone = await prisma.projectMilestone.findUnique({
      where: { id: milestoneId },
      include: { project: { include: { installer: true } } },
    });

    if (!milestone) throw new Error("Milestone not found");
    if (milestone.status !== MilestoneStatus.SUBMITTED) {
      throw new Error("Milestone has not been submitted for verification");
    }

    // Update status to VERIFIED
    const updated = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        status: MilestoneStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });

    // Automatically trigger fund release if verification is successful
    return await this.releaseMilestoneFunds({ milestoneId, adminId });
  }

  /**
   * Reject a milestone (Admin only)
   */
  async rejectMilestone(params: {
    milestoneId: string;
    adminId: string;
    reason: string;
  }) {
    const { milestoneId, adminId, reason } = params;

    return await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        status: MilestoneStatus.REJECTED,
        // We could add a rejectionReason field to the model if needed
        // For now we just update status
      },
    });
  }

  /**
   * Release funds for a verified milestone
   */
  async releaseMilestoneFunds(params: {
    milestoneId: string;
    adminId: string;
  }) {
    const { milestoneId, adminId } = params;

    const milestone = await prisma.projectMilestone.findFirst({
      where: { id: milestoneId },
      include: { project: { include: { installer: true } } },
    });

    if (!milestone) throw new Error("Milestone not found");
    if (milestone.status !== MilestoneStatus.VERIFIED) {
      throw new Error("Milestone must be VERIFIED before funds can be released");
    }

    const { project } = milestone;

    console.log(`💰 Releasing funds for milestone: ${milestone.name} (${milestone.releaseAmount})`);

    // In a real scenario, we would call the Soroban contract here
    // For now, we simulate the on-chain part and update the DB
    
    let txHash = "SIMULATED_TX_HASH_" + Math.random().toString(36).substring(7);

    // If we have a relayer secret, we could try a real transaction
    const relayerSecret = process.env.STAT_RELAYER_SECRET;
    const contracts = getContractAddresses();
    
    if (relayerSecret && contracts.treasury && project.installer?.stellarPubKey) {
      try {
        const relayerKeypair = Keypair.fromSecret(relayerSecret);
        // Note: Using releaseEscrow for now as a fallback if release_milestone isn't available
        // In production, we'd call the specific milestone release method
        const result = await contractService.releaseEscrow(
          contracts.treasury,
          relayerKeypair,
          project.id,
          project.installer.stellarPubKey
        );
        
        if (result.success) {
          txHash = result.txHash || txHash;
        }
      } catch (error) {
        console.error("On-chain milestone release failed:", error);
        // We continue with simulated hash for demo purposes if it fails
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Update milestone status
      const updatedMilestone = await tx.projectMilestone.update({
        where: { id: milestoneId },
        data: {
          status: MilestoneStatus.RELEASED,
          releasedAt: new Date(),
          verificationTxHash: txHash,
        },
      });

      // 2. Update project totals
      await tx.project.update({
        where: { id: project.id },
        data: {
          totalReleasedAmount: {
            increment: milestone.releaseAmount,
          },
        },
      });

      // 3. If this was the last milestone, mark project as ACTIVE (if it wasn't already)
      const remainingMilestones = await tx.projectMilestone.count({
        where: {
          projectId: project.id,
          status: { not: MilestoneStatus.RELEASED },
        },
      });

      if (remainingMilestones === 0 && project.status !== ProjectStatus.ACTIVE) {
        await tx.project.update({
          where: { id: project.id },
          data: { status: ProjectStatus.ACTIVE },
        });
      }

      return updatedMilestone;
    });
  }

  /**
   * Get milestone status for a project
   */
  async getProjectMilestones(projectId: string) {
    return await prisma.projectMilestone.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });
  }
}

export const milestoneService = new MilestoneService();
export default milestoneService;
