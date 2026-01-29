// ============================================
// @aethera/config - Shared Configuration
// ============================================

// Platform constants
export const PLATFORM_NAME = 'Aethera';
export const PLATFORM_DESCRIPTION = 'DePIN Renewable Energy Financing Platform';

// Fee configuration (percentages)
export const PLATFORM_FEE_PERCENTAGE = 2.5; // 2.5% platform fee on yield
export const TOKEN_ISSUANCE_FEE = 1.0; // 1% fee on token issuance

// Investment constraints
export const MIN_INVESTMENT_AMOUNT = 100; // $100 minimum
export const MAX_INVESTMENT_AMOUNT = 1000000; // $1M maximum

// Project constraints
export const MIN_FUNDING_TARGET = 10000; // $10K minimum
export const MAX_FUNDING_TARGET = 10000000; // $10M maximum
export const MIN_PROJECT_YIELD = 5; // 5% minimum expected yield
export const MAX_PROJECT_YIELD = 25; // 25% maximum expected yield

// Token configuration
export const TOKEN_DECIMALS = 7; // Stellar standard
export const DEFAULT_PRICE_PER_TOKEN = 10; // $10 per token

// Stablecoin configuration
export const USDC_CONFIG = {
  testnet: {
    code: 'USDC',
    issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  },
  mainnet: {
    code: 'USDC',
    issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  },
};

// API configuration
export const API_CONFIG = {
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per window
  },
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
  },
};

// JWT configuration
export const JWT_CONFIG = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  issuer: 'aethera',
};

// KYC status thresholds
export const KYC_REQUIREMENTS = {
  basic: {
    maxInvestment: 10000, // $10K without full KYC
    requiredDocs: ['id'],
  },
  full: {
    maxInvestment: null, // Unlimited with full KYC
    requiredDocs: ['id', 'proof_of_address', 'source_of_funds'],
  },
};

// Email templates (future use)
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  KYC_APPROVED: 'kyc-approved',
  KYC_REJECTED: 'kyc-rejected',
  INVESTMENT_CONFIRMED: 'investment-confirmed',
  YIELD_DISTRIBUTED: 'yield-distributed',
  PROJECT_APPROVED: 'project-approved',
  PROJECT_REJECTED: 'project-rejected',
  PROJECT_FUNDED: 'project-funded',
};

// Validation patterns
export const VALIDATION = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  stellarPublicKey: /^G[A-Z2-7]{55}$/,
};

// Export all as default object too
export default {
  PLATFORM_NAME,
  PLATFORM_DESCRIPTION,
  PLATFORM_FEE_PERCENTAGE,
  TOKEN_ISSUANCE_FEE,
  MIN_INVESTMENT_AMOUNT,
  MAX_INVESTMENT_AMOUNT,
  MIN_FUNDING_TARGET,
  MAX_FUNDING_TARGET,
  MIN_PROJECT_YIELD,
  MAX_PROJECT_YIELD,
  TOKEN_DECIMALS,
  DEFAULT_PRICE_PER_TOKEN,
  USDC_CONFIG,
  API_CONFIG,
  JWT_CONFIG,
  KYC_REQUIREMENTS,
  EMAIL_TEMPLATES,
  VALIDATION,
};
