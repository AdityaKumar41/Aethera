/**
 * Sumsub API Types
 */

export interface SumsubApplicant {
  id: string;
  createdAt: string;
  clientId?: string;
  inspectionId?: string;
  externalUserId: string;
  info?: ApplicantInfo;
  email?: string;
  phone?: string;
  requiredIdDocs?: RequiredIdDocs;
  review?: ReviewResult;
  type?: string;
}

export interface ApplicantInfo {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  firstNameEn?: string;
  lastNameEn?: string;
  dob?: string;
  gender?: string;
  country?: string;
  nationality?: string;
  placeOfBirth?: string;
  addresses?: Address[];
}

export interface Address {
  country?: string;
  postCode?: string;
  town?: string;
  street?: string;
  subStreet?: string;
  state?: string;
  buildingName?: string;
  flatNumber?: string;
  buildingNumber?: string;
  startDate?: string;
  endDate?: string;
}

export interface RequiredIdDocs {
  docSets?: DocSet[];
}

export interface DocSet {
  idDocSetType: string;
  types?: string[];
  subTypes?: string[];
}

export interface ReviewResult {
  reviewId?: string;
  attemptId?: string;
  attemptCnt?: number;
  levelName?: string;
  createDate?: string;
  reviewDate?: string;
  reviewResult?: {
    reviewAnswer?: string;
    rejectLabels?: string[];
    reviewRejectType?: string;
    clientComment?: string;
    moderationComment?: string;
    buttonIds?: string[];
  };
  reviewStatus?: string;
  notificationFailureCnt?: number;
  priority?: number;
}

export interface AccessToken {
  token: string;
  userId: string;
}

export interface WebhookPayload {
  applicantId: string;
  inspectionId: string;
  correlationId: string;
  levelName: string;
  externalUserId: string;
  type: WebhookEventType;
  sandboxMode: boolean;
  reviewStatus?: string;
  reviewResult?: {
    reviewAnswer: string;
    rejectLabels?: string[];
    reviewRejectType?: string;
    clientComment?: string;
    moderationComment?: string;
  };
  createdAt: string;
  clientId?: string;
}

export type WebhookEventType =
  | "applicantCreated"
  | "applicantPending"
  | "applicantReviewed"
  | "applicantOnHold"
  | "applicantPersonalInfoChanged"
  | "applicantDeleted"
  | "applicantReset"
  | "applicantActionPending"
  | "applicantActionReviewed"
  | "applicantActionOnHold"
  | "applicantWorkflowCompleted"
  | "applicantWorkflowFailed"
  | "applicantAwaitingUser"
  | "applicantAwaitingService"
  | "applicantActivated"
  | "applicantDeactivated"
  | "applicantPersonalDataDeleted"
  | "applicantTagsChanged"
  | "applicantLevelChanged"
  | "applicantStepsReset";

export interface CreateApplicantRequest {
  externalUserId: string;
  email?: string;
  phone?: string;
  info?: ApplicantInfo;
  fixedInfo?: ApplicantInfo;
}

export interface ApplicantStatusResponse {
  applicantId: string;
  status: "pending" | "approved" | "rejected" | "retry" | "not_started";
  levelName?: string;
  reviewAnswer?: string;
  rejectLabels?: string[];
  moderationComment?: string;
  createdAt: string;
  reviewedAt?: string;
}
