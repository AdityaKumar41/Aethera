/*
  Warnings:

  - A unique constraint covering the columns `[onChainCommitTx]` on the table `ProductionData` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('DOCUMENT', 'PHOTO', 'IOT', 'ORACLE');

-- CreateEnum
CREATE TYPE "FundingModel" AS ENUM ('FULL_UPFRONT', 'MILESTONE_BASED');

-- AlterTable
ALTER TABLE "ProductionData" ADD COLUMN     "carbonCredits" DECIMAL(18,4),
ADD COLUMN     "iotDeviceId" TEXT,
ADD COLUMN     "onChainCommitAt" TIMESTAMP(3),
ADD COLUMN     "onChainCommitTx" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "carbonCredits" DECIMAL(18,4),
ADD COLUMN     "fundingModel" "FundingModel" NOT NULL DEFAULT 'FULL_UPFRONT',
ADD COLUMN     "totalEscrowedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalReleasedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'UNSET';

-- CreateTable
CREATE TABLE "IoTDevice" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSeenAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IoTDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "releasePercentage" DOUBLE PRECISION NOT NULL,
    "releaseAmount" DECIMAL(18,2) NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "verificationMethod" "VerificationMethod" NOT NULL,
    "proofDocuments" JSONB,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "verificationTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IoTDevice_publicKey_key" ON "IoTDevice"("publicKey");

-- CreateIndex
CREATE INDEX "IoTDevice_projectId_idx" ON "IoTDevice"("projectId");

-- CreateIndex
CREATE INDEX "IoTDevice_publicKey_idx" ON "IoTDevice"("publicKey");

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMilestone_status_idx" ON "ProjectMilestone"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionData_onChainCommitTx_key" ON "ProductionData"("onChainCommitTx");

-- CreateIndex
CREATE INDEX "ProductionData_iotDeviceId_idx" ON "ProductionData"("iotDeviceId");

-- AddForeignKey
ALTER TABLE "ProductionData" ADD CONSTRAINT "ProductionData_iotDeviceId_fkey" FOREIGN KEY ("iotDeviceId") REFERENCES "IoTDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IoTDevice" ADD CONSTRAINT "IoTDevice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
