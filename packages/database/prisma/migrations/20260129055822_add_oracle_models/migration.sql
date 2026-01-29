-- CreateEnum
CREATE TYPE "OracleStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_VALID', 'RESOLVED_INVALID', 'ESCALATED');

-- AlterTable
ALTER TABLE "ProductionData" ADD COLUMN     "disputeId" TEXT,
ADD COLUMN     "disputed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "oracleProviderId" TEXT,
ADD COLUMN     "periodEnd" TIMESTAMP(3),
ADD COLUMN     "periodStart" TIMESTAMP(3),
ADD COLUMN     "signature" TEXT,
ADD COLUMN     "signatureValid" BOOLEAN,
ADD COLUMN     "signedPayload" TEXT;

-- CreateTable
CREATE TABLE "OracleProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "apiKeyHash" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "status" "OracleStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "totalSubmissions" INTEGER NOT NULL DEFAULT 0,
    "disputedSubmissions" INTEGER NOT NULL DEFAULT 0,
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "lastSubmissionAt" TIMESTAMP(3),
    "contactEmail" TEXT,
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OracleProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OracleDispute" (
    "id" TEXT NOT NULL,
    "productionDataId" TEXT NOT NULL,
    "oracleProviderId" TEXT NOT NULL,
    "filedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "trustScoreChange" INTEGER,
    "dataInvalidated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OracleDispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OracleProvider_apiKeyHash_key" ON "OracleProvider"("apiKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "OracleProvider_publicKey_key" ON "OracleProvider"("publicKey");

-- CreateIndex
CREATE INDEX "OracleProvider_status_idx" ON "OracleProvider"("status");

-- CreateIndex
CREATE INDEX "OracleProvider_trustScore_idx" ON "OracleProvider"("trustScore");

-- CreateIndex
CREATE INDEX "OracleDispute_oracleProviderId_idx" ON "OracleDispute"("oracleProviderId");

-- CreateIndex
CREATE INDEX "OracleDispute_status_idx" ON "OracleDispute"("status");

-- CreateIndex
CREATE INDEX "ProductionData_oracleProviderId_idx" ON "ProductionData"("oracleProviderId");

-- CreateIndex
CREATE INDEX "ProductionData_disputed_idx" ON "ProductionData"("disputed");

-- AddForeignKey
ALTER TABLE "ProductionData" ADD CONSTRAINT "ProductionData_oracleProviderId_fkey" FOREIGN KEY ("oracleProviderId") REFERENCES "OracleProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OracleDispute" ADD CONSTRAINT "OracleDispute_oracleProviderId_fkey" FOREIGN KEY ("oracleProviderId") REFERENCES "OracleProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
