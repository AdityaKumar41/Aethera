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
      // For now, console log - will add to database in future
      console.log("[AUDIT]", {
        type: "STATE_TRANSITION",
        entityType: event.entityType,
        entityId: event.entityId,
        transition: `${event.fromState} → ${event.toState}`,
        triggeredBy: event.triggeredBy,
        timestamp: event.timestamp.toISOString(),
        metadata: event.metadata,
      });

      // TODO: Store in audit log table
      // await prisma.auditLog.create({
      //   data: {
      //     eventType: 'STATE_TRANSITION',
      //     entityType: event.entityType,
      //     entityId: event.entityId,
      //     fromState: event.fromState,
      //     toState: event.toState,
      //     triggeredBy: event.triggeredBy,
      //     metadata: event.metadata,
      //     timestamp: event.timestamp,
      //   },
      // });
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
    // TODO: Implement database query once audit log table exists
    // return await prisma.auditLog.findMany({
    //   where: { entityType, entityId },
    //   orderBy: { timestamp: 'desc' },
    // });
    return [];
  }
}
