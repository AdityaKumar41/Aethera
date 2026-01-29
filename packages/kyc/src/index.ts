/**
 * @aethera/kyc - KYC Package
 * 
 * Provides Sumsub integration for identity verification.
 */

// Configuration
export { getSumsubConfig, KYC_LEVELS, REVIEW_STATUSES, REVIEW_ANSWERS } from "./config";
export type { SumsubConfig, KycLevel, ReviewStatus, ReviewAnswer } from "./config";

// Sumsub Service
export { SumsubService, getSumsubService } from "./sumsub";

// Types
export type {
  SumsubApplicant,
  ApplicantInfo,
  Address,
  ReviewResult,
  AccessToken,
  WebhookPayload,
  WebhookEventType,
  CreateApplicantRequest,
  ApplicantStatusResponse,
} from "./types";
