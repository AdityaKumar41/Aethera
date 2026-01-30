/**
 * Sumsub KYC Service
 * 
 * Handles all interactions with the Sumsub API for identity verification.
 */

import CryptoJS from "crypto-js";
import {
  SumsubConfig,
  getSumsubConfig,
  KYC_LEVELS,
  REVIEW_ANSWERS,
  type KycLevel,
} from "./config";
import type {
  SumsubApplicant,
  AccessToken,
  CreateApplicantRequest,
  ApplicantStatusResponse,
  WebhookPayload,
  WebhookEventType,
} from "./types";

export class SumsubService {
  private config: SumsubConfig;

  constructor(config?: SumsubConfig) {
    this.config = config || getSumsubConfig();
  }

  /**
   * Generate HMAC signature for API requests
   */
  private generateSignature(
    ts: number,
    method: string,
    path: string,
    body?: string
  ): string {
    const data = ts + method.toUpperCase() + path + (body || "");
    return CryptoJS.HmacSHA256(data, this.config.secretKey).toString(
      CryptoJS.enc.Hex
    );
  }

  /**
   * Make authenticated request to Sumsub API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: object
  ): Promise<T> {
    const ts = Math.floor(Date.now() / 1000);
    const bodyStr = body ? JSON.stringify(body) : "";
    const signature = this.generateSignature(ts, method, path, bodyStr);

    const headers: Record<string, string> = {
      "X-App-Token": this.config.appToken,
      "X-App-Access-Sig": signature,
      "X-App-Access-Ts": ts.toString(),
      "Content-Type": "application/json",
    };

    console.log(`[Sumsub API] ${method} ${this.config.baseUrl}${path} (Token: ${this.config.appToken.slice(0, 4)}...)`);
    console.log(`[Sumsub API] TS: ${ts}, Sig: ${signature.slice(0, 8)}...`);
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers,
      body: body ? bodyStr : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sumsub API error: ${response.status} - ${error}`);
    }

    return (await response.json()) as T;
  }

  /**
   * Create a new applicant for KYC verification
   */
  async createApplicant(
    externalUserId: string,
    levelName: KycLevel = KYC_LEVELS.BASIC,
    userData?: {
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
    }
  ): Promise<SumsubApplicant> {
    const body: CreateApplicantRequest = {
      externalUserId,
      email: userData?.email,
      phone: userData?.phone,
      info: userData?.firstName || userData?.lastName ? {
        firstName: userData.firstName,
        lastName: userData.lastName,
      } : undefined,
    };

    try {
      return await this.request<SumsubApplicant>(
        "POST",
        `/resources/applicants?levelName=${levelName}`,
        body
      );
    } catch (error: any) {
      // Handle conflict if applicant already exists
      if (error.message.includes("409")) {
        console.log(`Applicant ${externalUserId} already exists, fetching existing...`);
        
        // Try to extract applicant ID from error message if possible
        const match = error.message.match(/already exists: ([a-z0-9]+)/i);
        if (match && match[1]) {
          return await this.getApplicant(match[1]);
        }

        const existing = await this.getApplicantByExternalId(externalUserId);
        if (existing) return existing;
      }
      throw error;
    }
  }

  /**
   * Get applicant by external user ID
   */
  async getApplicantByExternalId(
    externalUserId: string
  ): Promise<SumsubApplicant | null> {
    try {
      // Sumsub returns the applicant object directly for this endpoint
      return await this.request<SumsubApplicant>(
        "GET",
        `/resources/applicants/-/externalUserId/${encodeURIComponent(externalUserId)}`
      );
    } catch (error: any) {
      // If 404, return null. 
      if (error.message.includes("404")) {
        return null;
      }
      // Log other errors but rethrow if it's a critical connectivity issue or 401/403
      console.error(`Error fetching applicant by external ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get applicant by Sumsub applicant ID
   */
  async getApplicant(applicantId: string): Promise<SumsubApplicant> {
    return this.request<SumsubApplicant>(
      "GET",
      `/resources/applicants/${applicantId}/one`
    );
  }

  /**
   * Generate access token for WebSDK
   * This token is used to initialize the Sumsub WebSDK on the frontend
   */
  async generateAccessToken(
    externalUserId: string,
    levelName: KycLevel = KYC_LEVELS.BASIC,
    userData?: {
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
    },
    ttlInSecs: number = 600
  ): Promise<AccessToken> {
    // First, ensure applicant exists
    let applicant = await this.getApplicantByExternalId(externalUserId);

    if (!applicant) {
      applicant = await this.createApplicant(externalUserId, levelName, userData);
    }

    // Generate access token
    const response = await this.request<{ token: string; userId: string }>(
      "POST",
      `/resources/accessTokens?userId=${encodeURIComponent(externalUserId)}&levelName=${levelName}&ttlInSecs=${ttlInSecs}`
    );

    return response;
  }

  /**
   * Get applicant verification status
   */
  async getApplicantStatus(
    externalUserId: string
  ): Promise<ApplicantStatusResponse> {
    const applicant = await this.getApplicantByExternalId(externalUserId);

    if (!applicant) {
      return {
        applicantId: "",
        status: "not_started",
        createdAt: new Date().toISOString(),
      };
    }

    const reviewStatus = applicant.review?.reviewStatus;
    const reviewAnswer = applicant.review?.reviewResult?.reviewAnswer;
    const levelName = applicant.review?.levelName;

    console.log(`[SumsubService] Status for ${externalUserId}:`, { reviewStatus, reviewAnswer, levelName });

    let status: ApplicantStatusResponse["status"] = "pending";

    if (!reviewStatus || reviewStatus === "init") {
      status = "pending";
    } else if (reviewAnswer === REVIEW_ANSWERS.GREEN) {
      status = "approved";
    } else if (reviewAnswer === REVIEW_ANSWERS.RED) {
      status = "rejected";
    } else if (reviewAnswer === REVIEW_ANSWERS.YELLOW) {
      status = "retry";
    }

    return {
      applicantId: applicant.id,
      status,
      levelName,
      reviewAnswer,
      rejectLabels: applicant.review?.reviewResult?.rejectLabels,
      moderationComment: applicant.review?.reviewResult?.moderationComment,
      createdAt: applicant.createdAt,
      reviewedAt: applicant.review?.reviewDate,
    };
  }

  /**
   * Reset applicant for re-verification
   */
  async resetApplicant(applicantId: string): Promise<void> {
    await this.request("POST", `/resources/applicants/${applicantId}/reset`);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string
  ): boolean {
    if (!this.config.webhookSecret) {
      console.warn("Webhook secret not configured, skipping verification");
      return true;
    }

    const expectedSignature = CryptoJS.HmacSHA256(
      payload,
      this.config.webhookSecret
    ).toString(CryptoJS.enc.Hex);

    return signature === expectedSignature;
  }

  /**
   * Parse webhook payload
   */
  parseWebhook(payload: string): WebhookPayload {
    return JSON.parse(payload) as WebhookPayload;
  }

  /**
   * Map webhook event to internal KYC status
   */
  mapWebhookToKycStatus(
    webhook: WebhookPayload
  ): "PENDING" | "IN_REVIEW" | "VERIFIED" | "REJECTED" {
    const { type, reviewResult } = webhook;

    // Handle verification results (most critical)
    if (
      (type === "applicantReviewed" || 
       type === "applicantWorkflowCompleted" || 
       type === "applicantWorkflowFailed" || 
       type === "applicantActionReviewed") && 
      reviewResult
    ) {
      switch (reviewResult.reviewAnswer) {
        case REVIEW_ANSWERS.GREEN:
          return "VERIFIED";
        case REVIEW_ANSWERS.RED:
          return "REJECTED";
        default:
          return "IN_REVIEW";
      }
    }

    // Handle "In Progress" states
    const inReviewTypes: WebhookEventType[] = [
      "applicantPending",
      "applicantOnHold",
      "applicantAwaitingService",
      "applicantActionPending",
      "applicantActionOnHold",
      "applicantPersonalInfoChanged",
      "applicantLevelChanged",
      "applicantTagsChanged"
    ];

    if (inReviewTypes.includes(type)) {
      return "IN_REVIEW";
    }

    // Handle "Reset" or "Pending User" states
    const pendingTypes: WebhookEventType[] = [
      "applicantCreated",
      "applicantAwaitingUser",
      "applicantReset",
      "applicantDeleted",
      "applicantDeactivated",
      "applicantActivated",
      "applicantStepsReset",
      "applicantPersonalDataDeleted"
    ];

    if (pendingTypes.includes(type)) {
      return "PENDING";
    }

    return "PENDING";
  }
}

// Singleton instance
let sumsubServiceInstance: SumsubService | null = null;

export function getSumsubService(): SumsubService {
  if (!sumsubServiceInstance) {
    sumsubServiceInstance = new SumsubService();
  }
  return sumsubServiceInstance;
}

export default SumsubService;
