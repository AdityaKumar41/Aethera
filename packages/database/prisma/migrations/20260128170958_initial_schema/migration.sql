-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('INVESTOR', 'INSTALLER', 'ADMIN');

-- CreateEnum
CREATE TYPE "KYCStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'FUNDING', 'FUNDED', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'INVESTOR',
    "kycStatus" "KYCStatus" NOT NULL DEFAULT 'PENDING',
    "kycSubmittedAt" TIMESTAMP(3),
    "kycVerifiedAt" TIMESTAMP(3),
    "kycDocuments" JSONB,
    "stellarPubKey" TEXT,
    "stellarSecretEncrypted" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "address" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "installerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "capacity" DOUBLE PRECISION NOT NULL,
    "panelType" TEXT,
    "inverterType" TEXT,
    "estimatedAnnualProduction" DOUBLE PRECISION,
    "expectedYield" DOUBLE PRECISION NOT NULL,
    "fundingTarget" DECIMAL(18,2) NOT NULL,
    "fundingRaised" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pricePerToken" DECIMAL(18,6) NOT NULL,
    "tokenSymbol" TEXT,
    "tokenContractId" TEXT,
    "totalTokens" INTEGER,
    "tokensRemaining" INTEGER,
    "startDate" TIMESTAMP(3),
    "estimatedCompletionDate" TIMESTAMP(3),
    "actualCompletionDate" TIMESTAMP(3),
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectionReason" TEXT,
    "documents" JSONB,
    "images" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "totalEnergyProduced" DECIMAL(18,4),
    "currentYieldRate" DOUBLE PRECISION,
    "lastProductionUpdate" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionData" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "energyProduced" DECIMAL(18,4) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "verifiedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "tokenAmount" INTEGER NOT NULL,
    "pricePerToken" DECIMAL(18,6) NOT NULL,
    "status" "InvestmentStatus" NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YieldDistribution" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "totalRevenue" DECIMAL(18,2) NOT NULL,
    "platformFee" DECIMAL(18,2) NOT NULL,
    "totalYield" DECIMAL(18,2) NOT NULL,
    "yieldPerToken" DECIMAL(18,10) NOT NULL,
    "distributed" BOOLEAN NOT NULL DEFAULT false,
    "distributedAt" TIMESTAMP(3),
    "txHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YieldDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YieldClaim" (
    "id" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "tokenAmount" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YieldClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "amount" DECIMAL(18,2),
    "txHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sourceAccount" TEXT,
    "destAccount" TEXT,
    "metadata" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stellarPubKey_key" ON "User"("stellarPubKey");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_kycStatus_idx" ON "User"("kycStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Project_tokenSymbol_key" ON "Project"("tokenSymbol");

-- CreateIndex
CREATE UNIQUE INDEX "Project_tokenContractId_key" ON "Project"("tokenContractId");

-- CreateIndex
CREATE INDEX "Project_installerId_idx" ON "Project"("installerId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_tokenSymbol_idx" ON "Project"("tokenSymbol");

-- CreateIndex
CREATE INDEX "ProductionData_projectId_idx" ON "ProductionData"("projectId");

-- CreateIndex
CREATE INDEX "ProductionData_recordedAt_idx" ON "ProductionData"("recordedAt");

-- CreateIndex
CREATE INDEX "Investment_investorId_idx" ON "Investment"("investorId");

-- CreateIndex
CREATE INDEX "Investment_projectId_idx" ON "Investment"("projectId");

-- CreateIndex
CREATE INDEX "Investment_status_idx" ON "Investment"("status");

-- CreateIndex
CREATE INDEX "YieldDistribution_projectId_idx" ON "YieldDistribution"("projectId");

-- CreateIndex
CREATE INDEX "YieldDistribution_period_idx" ON "YieldDistribution"("period");

-- CreateIndex
CREATE INDEX "YieldClaim_investorId_idx" ON "YieldClaim"("investorId");

-- CreateIndex
CREATE UNIQUE INDEX "YieldClaim_distributionId_investorId_key" ON "YieldClaim"("distributionId", "investorId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionLog_txHash_key" ON "TransactionLog"("txHash");

-- CreateIndex
CREATE INDEX "TransactionLog_type_idx" ON "TransactionLog"("type");

-- CreateIndex
CREATE INDEX "TransactionLog_userId_idx" ON "TransactionLog"("userId");

-- CreateIndex
CREATE INDEX "TransactionLog_projectId_idx" ON "TransactionLog"("projectId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionData" ADD CONSTRAINT "ProductionData_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YieldDistribution" ADD CONSTRAINT "YieldDistribution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YieldClaim" ADD CONSTRAINT "YieldClaim_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "YieldDistribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YieldClaim" ADD CONSTRAINT "YieldClaim_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
