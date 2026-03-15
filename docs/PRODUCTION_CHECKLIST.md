# Production Checklist

This checklist is the minimum to ship Aethera to production safely.

## 1. Contract Deployment
- Deploy `asset-token`, `treasury`, `yield-distributor`, `governance`, `oracle`.
- Initialize each contract with admin address and required parameters.
- Record contract IDs in secrets:
  - `ASSET_TOKEN_CONTRACT_ID`
  - `TREASURY_CONTRACT_ID`
  - `YIELD_DISTRIBUTOR_CONTRACT_ID`
  - `GOVERNANCE_CONTRACT_ID`
  - `ORACLE_CONTRACT_ID`

## 2. Database & Migrations
- Run Prisma migration in production:
  - `pnpm db:migrate`
- Verify new columns exist:
  - `YieldDistribution.onChainDistributionId`

## 3. Secrets & Env Vars
- API (`apps/api/.env`):
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `CLERK_SECRET_KEY`
  - `STAT_RELAYER_SECRET`
  - `ADMIN_RELAYER_SECRET_ENCRYPTED`
  - `STELLAR_SECRET_ENCRYPTION_KEY`
  - `WALLET_ENCRYPTION_SECRET`
  - `STELLAR_NETWORK`
  - `USDC_CONTRACT_ID`
  - `GOVERNANCE_TOKEN_CONTRACT_ID`
  - `ADMIN_ADDRESS`
  - `DEPLOYER_SOURCE`
- Web (`apps/webs/.env`):
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

## 4. On-Chain Anchoring
- Verify oracle anchoring works:
  - Production data submits and returns a valid tx hash.
- Verify yield distribution anchors on-chain:
  - DB distribution stores `onChainDistributionId`.

## 5. Milestone Funding
- Verify milestone order and release amounts.
- Confirm `release_milestone` returns a valid tx hash.

## 6. CI/CD
- GitHub Actions enabled and green:
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`

## 7. Monitoring
- Enable API health checks and error logging.
- Track:
  - Failed on-chain txs
  - Oracle anchoring failures
  - Yield claim failures
