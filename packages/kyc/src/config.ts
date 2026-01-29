/**
 * Sumsub KYC Configuration
 */
export interface SumsubConfig {
  appToken: string;
  secretKey: string;
  baseUrl: string;
  webhookSecret: string;
}

/**
 * Get Sumsub configuration from environment
 */
export function getSumsubConfig(): SumsubConfig {
  const appToken = process.env.SUMSUB_APP_TOKEN;
  const secretKey = process.env.SUMSUB_SECRET_KEY;
  const webhookSecret = process.env.SUMSUB_WEBHOOK_SECRET;

  if (!appToken || !secretKey) {
    throw new Error("Sumsub credentials not configured");
  }

  return {
    appToken,
    secretKey,
    baseUrl: process.env.SUMSUB_BASE_URL || "https://api.sumsub.com",
    webhookSecret: webhookSecret || "",
  };
}

/**
 * KYC Levels supported by Aethera
 */
export const KYC_LEVELS = {
  BASIC: process.env.SUMSUB_LEVEL_BASIC || "aethera",           // Name + ID document
  ENHANCED: process.env.SUMSUB_LEVEL_ENHANCED || "enhanced-kyc-level",     // + Address verification
  ACCREDITED: process.env.SUMSUB_LEVEL_ACCREDITED || "accredited-investor",  // + Accredited investor check
} as const;

export type KycLevel = typeof KYC_LEVELS[keyof typeof KYC_LEVELS];

/**
 * Sumsub review statuses
 */
export const REVIEW_STATUSES = {
  INIT: "init",
  PENDING: "pending",
  PRECHECKED: "prechecked",
  QUEUED: "queued",
  COMPLETED: "completed",
  ON_HOLD: "onHold",
} as const;

export type ReviewStatus = typeof REVIEW_STATUSES[keyof typeof REVIEW_STATUSES];

/**
 * Sumsub review answers
 */
export const REVIEW_ANSWERS = {
  GREEN: "GREEN",   // Approved
  RED: "RED",       // Rejected
  YELLOW: "YELLOW", // Under review / retry
} as const;

export type ReviewAnswer = typeof REVIEW_ANSWERS[keyof typeof REVIEW_ANSWERS];

export default {
  getSumsubConfig,
  KYC_LEVELS,
  REVIEW_STATUSES,
  REVIEW_ANSWERS,
};
