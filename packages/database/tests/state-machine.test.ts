import { describe, it, expect } from "vitest";
import {
  ProjectStateMachine,
  StateTransitionError,
} from "../src/state-machine";
import { ProjectStatus } from "@prisma/client";

describe("ProjectStateMachine", () => {
  describe("canTransition", () => {
    it("should allow DRAFT to PENDING_APPROVAL transition", () => {
      expect(
        ProjectStateMachine.canTransition(
          "DRAFT" as ProjectStatus,
          "PENDING_APPROVAL" as ProjectStatus,
        ),
      ).toBe(true);
    });

    it("should allow PENDING_APPROVAL to APPROVED transition", () => {
      expect(
        ProjectStateMachine.canTransition(
          "PENDING_APPROVAL" as ProjectStatus,
          "APPROVED" as ProjectStatus,
        ),
      ).toBe(true);
    });

    it("should allow APPROVED to FUNDING transition", () => {
      expect(
        ProjectStateMachine.canTransition(
          "APPROVED" as ProjectStatus,
          "FUNDING" as ProjectStatus,
        ),
      ).toBe(true);
    });

    it("should allow FUNDING to FUNDED transition", () => {
      expect(
        ProjectStateMachine.canTransition(
          "FUNDING" as ProjectStatus,
          "FUNDED" as ProjectStatus,
        ),
      ).toBe(true);
    });

    it("should allow FUNDED to ACTIVE transition", () => {
      expect(
        ProjectStateMachine.canTransition(
          "FUNDED" as ProjectStatus,
          "ACTIVE" as ProjectStatus,
        ),
      ).toBe(true);
    });

    it("should allow ACTIVE to COMPLETED transition", () => {
      expect(
        ProjectStateMachine.canTransition(
          "ACTIVE" as ProjectStatus,
          "COMPLETED" as ProjectStatus,
        ),
      ).toBe(true);
    });

    it("should reject invalid transition from DRAFT to FUNDED", () => {
      expect(
        ProjectStateMachine.canTransition(
          "DRAFT" as ProjectStatus,
          "FUNDED" as ProjectStatus,
        ),
      ).toBe(false);
    });

    it("should reject transition from COMPLETED to any state", () => {
      expect(
        ProjectStateMachine.canTransition(
          "COMPLETED" as ProjectStatus,
          "ACTIVE" as ProjectStatus,
        ),
      ).toBe(false);
    });

    it("should reject transition from REJECTED", () => {
      expect(
        ProjectStateMachine.canTransition(
          "REJECTED" as ProjectStatus,
          "APPROVED" as ProjectStatus,
        ),
      ).toBe(false);
    });
  });

  describe("getAllowedTransitions", () => {
    it("should return correct next states for DRAFT", () => {
      const nextStates = ProjectStateMachine.getAllowedTransitions(
        "DRAFT" as ProjectStatus,
      );
      expect(nextStates).toEqual(["PENDING_APPROVAL"]);
    });

    it("should return correct next states for PENDING_APPROVAL", () => {
      const nextStates = ProjectStateMachine.getAllowedTransitions(
        "PENDING_APPROVAL" as ProjectStatus,
      );
      expect(nextStates).toContain("APPROVED");
      expect(nextStates).toContain("REJECTED");
    });

    it("should return empty array for terminal states", () => {
      expect(
        ProjectStateMachine.getAllowedTransitions("COMPLETED" as ProjectStatus),
      ).toEqual([]);
      expect(
        ProjectStateMachine.getAllowedTransitions("REJECTED" as ProjectStatus),
      ).toEqual([]);
    });
  });

  describe("validateTransition", () => {
    it("should not throw for valid transition", () => {
      expect(() => {
        ProjectStateMachine.validateTransition(
          "DRAFT" as ProjectStatus,
          "PENDING_APPROVAL" as ProjectStatus,
        );
      }).not.toThrow();
    });

    it("should throw StateTransitionError for invalid transition", () => {
      expect(() => {
        ProjectStateMachine.validateTransition(
          "DRAFT" as ProjectStatus,
          "ACTIVE" as ProjectStatus,
        );
      }).toThrow(StateTransitionError);
    });
  });

  describe("getRequirements", () => {
    it("should return requirements for PENDING_APPROVAL", () => {
      const reqs = ProjectStateMachine.getRequirements(
        "PENDING_APPROVAL" as ProjectStatus,
      );
      expect(reqs.length).toBeGreaterThan(0);
      expect(reqs).toContain("Project must have name");
    });

    it("should return requirements for FUNDED", () => {
      const reqs = ProjectStateMachine.getRequirements(
        "FUNDED" as ProjectStatus,
      );
      expect(reqs).toContain("Funding target must be reached");
    });
  });
});
