-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "InvestmentStatus" ADD VALUE 'PENDING_ONCHAIN';

-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "mintConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "mintStatus" "TransactionStatus",
ADD COLUMN     "mintTxHash" TEXT,
ADD COLUMN     "txConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "txError" TEXT,
ADD COLUMN     "txLedger" INTEGER,
ADD COLUMN     "txRetryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "txSubmittedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Investment_txHash_idx" ON "Investment"("txHash");
