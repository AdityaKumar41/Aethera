// ============================================
// Audit Trail System
// ============================================

import { prisma } from "./index";

export interface StateChangeEvent {
  entityType: "PROJECT" | "INVESTMENT" | "USER" | "KYC";
  entityId: string;
  fromState: string;
  toState: string;
  triggeredBy: string; // User ID who triggered the change
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Audit Logger for State Transitions
 */
export class AuditLogger {
  /**
   * Log a state transition
   */
  static async logStateChange(event: StateChangeEvent): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: "STATE_TRANSITION",
          entityType: event.entityType,
          entityId: event.entityId,
          userId: event.triggeredBy,
          previousState: event.fromState,
          newState: event.toState,
          metadata: event.metadata ?? undefined,
          createdAt: event.timestamp,
        },
      });
    } catch (error) {
      console.error("[AUDIT ERROR]", error);
      // Never fail the operation due to audit logging
    }
  }

  /**
   * Log project state change
   */
  static async logProjectTransition(
    projectId: string,
    fromStatus: string,
    toStatus: string,
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logStateChange({
      entityType: "PROJECT",
      entityId: projectId,
      fromState: fromStatus,
      toState: toStatus,
      triggeredBy: userId,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Log investment state change
   */
  static async logInvestmentTransition(
    investmentId: string,
    fromStatus: string,
    toStatus: string,
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logStateChange({
      entityType: "INVESTMENT",
      entityId: investmentId,
      fromState: fromStatus,
      toState: toStatus,
      triggeredBy: userId,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Log KYC state change
   */
  static async logKYCTransition(
    userId: string,
    fromStatus: string,
    toStatus: string,
    adminId: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logStateChange({
      entityType: "KYC",
      entityId: userId,
      fromState: fromStatus,
      toState: toStatus,
      triggeredBy: adminId,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Get audit trail for an entity
   */
  static async getAuditTrail(
    entityType: string,
    entityId: string,
  ): Promise<any[]> {
    return await prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
    });
  }
}
