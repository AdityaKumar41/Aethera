-- Add on-chain distribution id for Soroban yield distributor
ALTER TABLE "YieldDistribution"
ADD COLUMN     "onChainDistributionId" BIGINT;
