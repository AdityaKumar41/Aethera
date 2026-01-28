# Testing Guide

This document outlines the testing strategy for the Aethera platform.

## Test Setup

Tests are configured using Vitest across all packages:

- `@aethera/database` - Service and state machine tests
- `@aethera/stellar` - Blockchain integration tests
- `@aethera/api` - API endpoint tests

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in a specific package
pnpm --filter=@aethera/database test
pnpm --filter=@aethera/stellar test
pnpm --filter=@aethera/api test

# Run tests with UI
pnpm --filter=@aethera/database test:ui

# Run tests with coverage
pnpm --filter=@aethera/database test:coverage
```

## Test Coverage

### Database Package Tests

#### State Machine Tests (`packages/database/tests/state-machine.test.ts`)

- ✅ Project state transitions validation
- ✅ Investment state transitions validation
- ✅ Invalid transition detection
- ✅ Terminal state handling
- ✅ getNextStates logic

**Coverage:**

- ProjectStateMachine: validate, canTransition, getNextStates
- InvestmentStateMachine: validate, canTransition, getNextStates

#### Oracle Service Tests (`packages/database/tests/oracle.test.ts`)

- ✅ Production data recording
- ✅ Negative energy validation
- ✅ Future date validation
- ✅ Yield calculation
- ✅ Project performance metrics
- ✅ Bulk import functionality

**Coverage:**

- recordProductionData
- calculateYield
- getProjectPerformance
- bulkImportProductionData

#### Yield Distribution Tests (`packages/database/tests/yield-distribution.test.ts`)

- ✅ Distribution creation with claims
- ✅ Non-ACTIVE project rejection
- ✅ No investors error handling
- ✅ Individual claim processing
- ✅ Pending yield calculation
- ✅ Batch claim processing
- ✅ Partial failure handling

**Coverage:**

- createDistribution
- processClaim
- calculatePendingYield
- batchClaim

### Stellar Package Tests

#### Trustline Service Tests (`packages/stellar/tests/trustline.test.ts`)

- ✅ Existing trustline detection
- ✅ New trustline creation
- ✅ Secret key validation
- ✅ Batch processing
- ✅ Partial failure handling
- ✅ Required trustlines generation

**Coverage:**

- ensureTrustline
- batchEnsureTrustlines
- getRequiredTrustlines

#### Soroban Contract Tests (`packages/stellar/tests/soroban.test.ts`)

- ✅ Contract ID retrieval
- ✅ Transaction polling
- ✅ Timeout handling

**Coverage:**

- getContractIds
- waitForTransaction

### API Package Tests

#### Yields API Tests (`apps/api/tests/yields.test.ts`)

- ✅ Yield summary endpoint
- ✅ Pending claims endpoint
- ✅ Distribution creation (admin)
- ✅ Field validation

**Coverage:**

- GET /api/yields/summary
- GET /api/yields/pending
- POST /api/yields/distribute

## Testing Best Practices

### Unit Tests

- Mock external dependencies (Prisma, Stellar SDK)
- Test edge cases and error conditions
- Validate input validation
- Test business logic in isolation

### Integration Tests

- Test service interactions
- Verify database operations
- Test transaction flows
- Validate state transitions

### E2E Testing (Future)

The following E2E test scenarios should be implemented:

1. **Investment Flow**
   - User creates account
   - Trustline establishment
   - USDC deposit
   - Project investment
   - Token minting on blockchain
   - Investment confirmation

2. **Yield Distribution Flow**
   - Admin enters production data
   - System calculates yields
   - Distribution creation
   - Blockchain transaction
   - Investor claim
   - Token transfer verification

3. **Contract Deployment**
   - Contract compilation
   - Testnet deployment
   - Contract initialization
   - Function invocations

## CI/CD Integration

Tests should run on:

- Pre-commit hooks (fast unit tests)
- Pull request builds (all tests)
- Main branch merges (all tests + coverage)

## Coverage Goals

Target coverage metrics:

- Unit tests: 80%+ coverage
- Critical paths: 95%+ coverage
- Edge cases: 100% coverage for state machines and validations

## Mock Data

Common test data is available in each test file:

- Mock projects with various states
- Mock investments with different amounts
- Mock production data
- Mock users and roles

## Database Testing

For database tests:

- Use Prisma mocks to avoid real DB connections
- Test transaction rollbacks
- Verify cascade deletes
- Test unique constraints

## Blockchain Testing

For Stellar/Soroban tests:

- Mock Stellar SDK methods
- Test transaction building
- Verify XDR encoding
- Test network error handling
- Use testnet for integration tests

## Debugging Tests

```bash
# Run single test file
pnpm vitest packages/database/tests/oracle.test.ts

# Run tests in watch mode
pnpm vitest --watch

# Debug with UI
pnpm vitest --ui

# Get detailed error output
pnpm vitest --reporter=verbose
```

## Next Steps

1. ✅ Set up test infrastructure
2. ✅ Add unit tests for core services
3. ⏳ Increase coverage to 80%+
4. ⏳ Add E2E tests with testnet
5. ⏳ Set up CI/CD pipeline
6. ⏳ Add performance tests
7. ⏳ Add load tests for yield distribution
