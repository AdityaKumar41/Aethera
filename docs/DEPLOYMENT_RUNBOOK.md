# Deployment Runbook

This is the shortest reliable path to deploy Aethera on testnet or mainnet.

## 1. Build Contracts

```bash
pnpm contracts:build
```

## 2. Deploy Core Contracts (Treasury, Yield, Governance, Oracle)

Dry-run (prints commands):

```bash
pnpm contracts:deploy-core
```

Execute:

```bash
pnpm contracts:deploy-core -- --execute
```

Record the deployed contract IDs into your env:

```
TREASURY_CONTRACT_ID=
YIELD_DISTRIBUTOR_CONTRACT_ID=
GOVERNANCE_CONTRACT_ID=
ORACLE_CONTRACT_ID=
```

## 3. Initialize Core Contracts

Dry-run:

```bash
pnpm contracts:init-core
```

Execute:

```bash
pnpm contracts:init-core -- --execute
```

## 4. Apply DB Migration

```bash
pnpm db:migrate
```

## 5. Validate Runtime Env

```bash
pnpm env:check
```

## 6. Start Services

```bash
pnpm dev
```

## 7. Readiness Check

```bash
curl http://localhost:3001/ready
```
