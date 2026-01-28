// ============================================
// State Machine Service - Project Lifecycle
// ============================================

import { ProjectStatus } from "@prisma/client";

/**
 * Valid state transitions for project lifecycle
 * Based on flowchart and sequence diagram requirements
 */
const STATE_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ["PENDING_APPROVAL"], // Installer submits
  PENDING_APPROVAL: ["APPROVED", "REJECTED"], // Admin decision
  APPROVED: ["FUNDING"], // Auto-transition after contract deployment
  REJECTED: [], // Terminal state (could allow resubmission in future)
  FUNDING: ["FUNDED"], // Auto when target reached
  FUNDED: ["ACTIVE"], // Admin releases capital
  ACTIVE: ["COMPLETED"], // Project lifecycle ends
  COMPLETED: [], // Terminal state
};

/**
 * Requirements that must be met before transitioning to a state
 */
const STATE_REQUIREMENTS: Record<ProjectStatus, string[]> = {
  DRAFT: [],
  PENDING_APPROVAL: [
    "Project must have name",
    "Project must have description (min 50 chars)",
    "Project must have funding target",
    "Project must have expected yield",
  ],
  APPROVED: ["Admin approval required"],
  REJECTED: ["Rejection reason required"],
  FUNDING: ["Smart contract must be deployed", "Token contract ID required"],
  FUNDED: ["Funding target must be reached", "At least one investor"],
  ACTIVE: [
    "Capital release transaction required",
    "Project must be fully funded",
  ],
  COMPLETED: ["Project must have been active", "All obligations fulfilled"],
};

/**
 * State machine error types
 */
export class StateTransitionError extends Error {
  constructor(
    message: string,
    public from: ProjectStatus,
    public to: ProjectStatus,
    public requirements?: string[],
  ) {
    super(message);
    this.name = "StateTransitionError";
  }
}

/**
 * Project State Machine Service
 */
export class ProjectStateMachine {
  /**
   * Check if a state transition is valid
   */
  static canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
    const allowedTransitions = STATE_TRANSITIONS[from];
    return allowedTransitions.includes(to);
  }

  /**
   * Get requirements for transitioning to a state
   */
  static getRequirements(status: ProjectStatus): string[] {
    return STATE_REQUIREMENTS[status] || [];
  }

  /**
   * Get allowed next states from current state
   */
  static getAllowedTransitions(from: ProjectStatus): ProjectStatus[] {
    return STATE_TRANSITIONS[from] || [];
  }

  /**
   * Validate if transition is allowed, throw if not
   */
  static validateTransition(from: ProjectStatus, to: ProjectStatus): void {
    if (!this.canTransition(from, to)) {
      const allowed = this.getAllowedTransitions(from);
      throw new StateTransitionError(
        `Invalid state transition from ${from} to ${to}. Allowed transitions: ${allowed.join(", ") || "none"}`,
        from,
        to,
      );
    }
  }

  /**
   * Validate project data meets requirements for target state
   */
  static validateRequirements(
    project: {
      name?: string;
      description?: string;
      fundingTarget?: any;
      expectedYield?: any;
      fundingRaised?: any;
      tokenContractId?: string | null;
      status: ProjectStatus;
    },
    targetStatus: ProjectStatus,
    metadata?: {
      adminId?: string;
      rejectionReason?: string;
      txHash?: string;
    },
  ): void {
    const requirements = this.getRequirements(targetStatus);
    const errors: string[] = [];

    // Check basic requirements based on target status
    switch (targetStatus) {
      case "PENDING_APPROVAL":
        if (!project.name || project.name.length < 3) {
          errors.push("Project name must be at least 3 characters");
        }
        if (!project.description || project.description.length < 50) {
          errors.push("Project description must be at least 50 characters");
        }
        if (!project.fundingTarget || Number(project.fundingTarget) < 100) {
          errors.push("Funding target must be at least $100");
        }
        if (!project.expectedYield || Number(project.expectedYield) < 1) {
          errors.push("Expected yield must be specified");
        }
        break;

      case "APPROVED":
        if (!metadata?.adminId) {
          errors.push("Admin approval required");
        }
        break;

      case "REJECTED":
        if (!metadata?.rejectionReason) {
          errors.push("Rejection reason is required");
        }
        break;

      case "FUNDING":
        if (!project.tokenContractId) {
          errors.push("Smart contract must be deployed before listing");
        }
        break;

      case "FUNDED":
        if (
          !project.fundingRaised ||
          Number(project.fundingRaised) < Number(project.fundingTarget)
        ) {
          errors.push("Funding target has not been reached");
        }
        break;

      case "ACTIVE":
        if (!metadata?.txHash) {
          errors.push("Capital release transaction required");
        }
        if (
          !project.fundingRaised ||
          Number(project.fundingRaised) < Number(project.fundingTarget)
        ) {
          errors.push("Project must be fully funded before activation");
        }
        break;
    }

    if (errors.length > 0) {
      throw new StateTransitionError(
        `Requirements not met for transitioning to ${targetStatus}:\n${errors.join("\n")}`,
        project.status,
        targetStatus,
        errors,
      );
    }
  }

  /**
   * Full validation: Check both transition validity and requirements
   */
  static validate(
    currentStatus: ProjectStatus,
    targetStatus: ProjectStatus,
    project: any,
    metadata?: any,
  ): void {
    // First check if transition is allowed
    this.validateTransition(currentStatus, targetStatus);

    // Then check if requirements are met
    this.validateRequirements(project, targetStatus, metadata);
  }

  /**
   * Get state machine visualization for debugging
   */
  static getStateDiagram(): string {
    let diagram = "Project State Machine:\n\n";
    for (const [from, tos] of Object.entries(STATE_TRANSITIONS)) {
      if (tos.length === 0) {
        diagram += `${from} (terminal)\n`;
      } else {
        diagram += `${from} → ${tos.join(", ")}\n`;
      }
    }
    return diagram;
  }
}

/**
 * Investment State Machine (simpler)
 */
export class InvestmentStateMachine {
  static readonly VALID_TRANSITIONS: Record<string, string[]> = {
    PENDING: ["CONFIRMED", "FAILED"],
    CONFIRMED: [], // Terminal state
    FAILED: ["PENDING"], // Allow retry
  };

  static canTransition(from: string, to: string): boolean {
    return this.VALID_TRANSITIONS[from]?.includes(to) || false;
  }

  static validateTransition(from: string, to: string): void {
    if (!this.canTransition(from, to)) {
      throw new StateTransitionError(
        `Invalid investment state transition from ${from} to ${to}`,
        from as any,
        to as any,
      );
    }
  }
}
