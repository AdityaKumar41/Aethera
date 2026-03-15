// ============================================
// User Types
// ============================================

export enum UserRole {
  UNSET = "UNSET",
  INVESTOR = "INVESTOR",
  INSTALLER = "INSTALLER",
  ADMIN = "ADMIN",
}

export enum KYCStatus {
  PENDING = "PENDING",
  IN_REVIEW = "IN_REVIEW",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  kycStatus: KYCStatus;
  stellarPubKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

// ============================================
// Project Types
// ============================================

export enum ProjectStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  FUNDING = "FUNDING",
  FUNDED = "FUNDED",
  ACTIVE = "ACTIVE",
  ACTIVE_PENDING_DATA = "ACTIVE_PENDING_DATA",
  COMPLETED = "COMPLETED",
}

export type FundingModel = "FULL_UPFRONT" | "MILESTONE_BASED";

export interface Project {
  id: string;
  installerId: string;
  name: string;
  description: string;
  location: string;
  capacity: number; // kW
  expectedYield: number; // Annual percentage
  fundingTarget: number;
  fundingRaised: number;
  status: ProjectStatus;
  tokenContractId?: string;
  tokenSymbol?: string;
  totalTokens?: number;
  pricePerToken: number;
  startDate?: Date;
  estimatedCompletionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  name: string;
  description: string;
  location: string;
  capacity: number;
  expectedYield: number;
  fundingTarget: number;
  pricePerToken: number;
  estimatedCompletionDate?: Date;
}

export interface ProjectWithInstaller extends Project {
  installer: User;
}

// ============================================
// Investment Types
// ============================================

export enum InvestmentStatus {
  PENDING = "PENDING",
  PENDING_ONCHAIN = "PENDING_ONCHAIN",
  CONFIRMED = "CONFIRMED",
  FAILED = "FAILED",
}

export interface Investment {
  id: string;
  investorId: string;
  projectId: string;
  amount: number;
  tokenAmount: number;
  status: InvestmentStatus;
  txHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvestmentInput {
  projectId: string;
  amount: number;
}

export interface InvestmentWithDetails extends Investment {
  project: Project;
  investor: User;
}

// ============================================
// Milestone Types
// ============================================

export type MilestoneStatus =
  | "PENDING"
  | "SUBMITTED"
  | "VERIFIED"
  | "REJECTED"
  | "RELEASED";
export type VerificationMethod = "DOCUMENT" | "PHOTO" | "IOT" | "ORACLE";

export interface ProjectMilestone {
  id: string;
  projectId: string;
  name: string;
  description: string;
  order: number;
  releasePercentage: number;
  releaseAmount: number;
  status: MilestoneStatus;
  verificationMethod: VerificationMethod;
  verificationTxHash?: string;
  proofDocuments?: any;
  submittedAt?: string;
  verifiedAt?: string;
  releasedAt?: string;
  createdAt: string;
}

// ============================================
// IoT Device Types
// ============================================

export interface IoTDevice {
  id: string;
  projectId: string;
  deviceId: string;
  publicKey: string;
  model?: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "REVOKED";
  lastSeen?: string;
  createdAt: string;
}

// ============================================
// Oracle Types
// ============================================

export interface OracleProvider {
  id: string;
  name: string;
  publicKey: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REVOKED";
  trustScore: number;
  totalSubmissions: number;
  verifiedSubmissions: number;
  createdAt: string;
}

export interface OracleDispute {
  id: string;
  productionDataId: string;
  projectId: string;
  disputedBy: string;
  reason: string;
  status:
    | "OPEN"
    | "UNDER_REVIEW"
    | "RESOLVED_VALID"
    | "RESOLVED_INVALID"
    | "ESCALATED";
  resolution?: string;
  createdAt: string;
}

// ============================================
// Production Data Types
// ============================================

export interface ProductionData {
  id: string;
  projectId: string;
  energyProduced: number;
  recordedAt: string;
  source: string;
  verifiedBy?: string;
  oracleProviderId?: string;
  iotDeviceId?: string;
  txHash?: string;
  notes?: string;
  createdAt: string;
}

// ============================================
// Token Transfer (Secondary Market) Types
// ============================================

export interface TokenTransfer {
  id: string;
  projectId: string;
  fromUserId: string;
  toUserId: string;
  tokenAmount: number;
  pricePerToken: number;
  totalPrice: number;
  status: "PENDING" | "ACCEPTED" | "COMPLETED" | "REJECTED" | "EXPIRED";
  txHash?: string;
  expiresAt?: string;
  completedAt?: string;
  createdAt: string;
}

// ============================================
// Transaction Log Types
// ============================================

export interface TransactionLog {
  id: string;
  type: string;
  userId?: string;
  projectId?: string;
  txHash: string;
  status: string;
  error?: string;
  metadata?: any;
  createdAt: string;
}

// ============================================
// Yield Distribution Types
// ============================================

export interface YieldDistribution {
  id: string;
  projectId: string;
  totalYield: number;
  period: Date;
  distributed: boolean;
  txHash?: string;
  onChainDistributionId?: string;
  createdAt: Date;
}

export interface YieldClaim {
  id: string;
  distributionId: string;
  investorId: string;
  amount: number;
  claimed: boolean;
  txHash?: string;
  createdAt: Date;
}

// ============================================
// Portfolio Types
// ============================================

export interface PortfolioItem {
  projectId: string;
  projectName: string;
  tokenAmount: number;
  investedAmount: number;
  currentValue: number;
  totalYieldEarned: number;
  pendingYield: number;
}

export interface Portfolio {
  totalInvested: number;
  totalCurrentValue: number;
  totalYieldEarned: number;
  pendingYield: number;
  items: PortfolioItem[];
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// Stellar Types
// ============================================

export interface StellarAccount {
  publicKey: string;
  balances: StellarBalance[];
}

export interface StellarBalance {
  assetType: string;
  assetCode?: string;
  assetIssuer?: string;
  balance: string;
}

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

// ============================================
// Marketplace Types
// ============================================

export interface MarketplaceProject extends Project {
  installer: {
    id: string;
    name: string;
  };
  investorCount: number;
  fundingPercentage: number;
  remainingTokens: number;
}
