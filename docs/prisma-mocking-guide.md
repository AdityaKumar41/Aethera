# Prisma Mocking Guide with vitest-mock-extended

## Overview

We use `vitest-mock-extended` for type-safe, modern Prisma Client mocking in our test suite. This provides full TypeScript support and reduces boilerplate.

## Installation

Already installed in the database package:

```json
{
  "devDependencies": {
    "vitest": "^2.1.0",
    "vitest-mock-extended": "^2.0.2"
  }
}
```

## Basic Pattern

### 1. Import Dependencies

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { YourService } from "../src/your-service";
```

### 2. Create Mock with Factory Function

```typescript
// ⚠️ IMPORTANT: Use factory function to avoid hoisting issues
vi.mock("../src/index", () => ({
  prisma: mockDeep<PrismaClient>(),
}));

const { prisma } = await import("../src/index");
```

### 3. Reset Mocks in beforeEach

```typescript
describe("YourService", () => {
  beforeEach(() => {
    mockReset(prisma as any); // Reset all mocks between tests
  });

  // Your tests here...
});
```

## Common Patterns

### Simple Query Mock

```typescript
it("should find a project", async () => {
  const mockProject = {
    id: "project_123",
    name: "Solar Farm",
    status: "ACTIVE",
  };

  vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as any);

  const result = await ProjectService.getById("project_123");

  expect(result).toEqual(mockProject);
  expect(prisma.project.findUnique).toHaveBeenCalledWith({
    where: { id: "project_123" },
  });
});
```

### Returning null (Not Found)

```typescript
it("should throw when project not found", async () => {
  vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

  await expect(ProjectService.getById("nonexistent")).rejects.toThrow(
    "Project not found",
  );
});
```

### Transaction Mock

```typescript
it("should handle transactions", async () => {
  vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
    const mockTx = {
      project: {
        create: vi.fn().mockResolvedValue({ id: "proj_123" }),
      },
      investment: {
        create: vi.fn().mockResolvedValue({ id: "inv_123" }),
      },
    };
    return callback(mockTx);
  });

  const result = await YourService.createWithTransaction();

  expect(result).toBeDefined();
});
```

### Aggregate Queries

```typescript
it("should aggregate data", async () => {
  vi.mocked(prisma.productionData.aggregate).mockResolvedValue({
    _sum: { energyProduced: 1500.5 },
    _count: { _all: 10 },
    _avg: { energyProduced: 150.05 },
  } as any);

  const stats = await OracleService.getProductionStats("project_123");

  expect(stats.totalEnergy).toBe(1500.5);
});
```

### Multiple Calls with Different Results

```typescript
it("should handle multiple calls", async () => {
  vi.mocked(prisma.yieldClaim.update)
    .mockResolvedValueOnce({ id: "claim_1", claimed: true } as any)
    .mockResolvedValueOnce({ id: "claim_2", claimed: true } as any);

  const results = await YieldService.batchProcess(["claim_1", "claim_2"]);

  expect(results).toHaveLength(2);
});
```

### Rejecting with Errors

```typescript
it("should handle database errors", async () => {
  vi.mocked(prisma.project.create).mockRejectedValue(
    new Error("Database connection failed"),
  );

  await expect(ProjectService.create(projectData)).rejects.toThrow(
    "Database connection failed",
  );
});
```

## Advanced Patterns

### Mocking Relations

```typescript
it("should include relations", async () => {
  const mockProject = {
    id: "project_123",
    name: "Solar Farm",
    investments: [
      { id: "inv_1", amount: 1000, investor: { name: "John" } },
      { id: "inv_2", amount: 2000, investor: { name: "Jane" } },
    ],
  };

  vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as any);

  const result = await ProjectService.getWithInvestors("project_123");

  expect(result.investments).toHaveLength(2);
});
```

### Mocking $queryRaw

```typescript
it("should handle raw queries", async () => {
  const mockResults = [
    { id: 1, name: "Project 1" },
    { id: 2, name: "Project 2" },
  ];

  vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResults as any);

  const results = await ProjectService.complexQuery();

  expect(results).toHaveLength(2);
});
```

### Verifying Call Arguments

```typescript
it("should call with correct parameters", async () => {
  vi.mocked(prisma.project.create).mockResolvedValue({ id: "proj_123" } as any);

  await ProjectService.create({
    name: "New Project",
    totalTokens: 10000,
  });

  expect(prisma.project.create).toHaveBeenCalledWith({
    data: {
      name: "New Project",
      totalTokens: 10000,
    },
  });
});
```

## Common Pitfalls

### ❌ DON'T: Reference variables in vi.mock

```typescript
// This will fail due to hoisting
const prismaMock = mockDeep<PrismaClient>();
vi.mock("../src/index", () => ({
  prisma: prismaMock, // ❌ ReferenceError
}));
```

### ✅ DO: Use factory function

```typescript
// This works correctly
vi.mock("../src/index", () => ({
  prisma: mockDeep<PrismaClient>(), // ✅ Factory function
}));
```

### ❌ DON'T: Forget to reset mocks

```typescript
describe("Tests", () => {
  // Missing beforeEach with mockReset
  it("test 1", () => {
    /* ... */
  });
  it("test 2", () => {
    /* ... */
  }); // Might have state from test 1
});
```

### ✅ DO: Reset in beforeEach

```typescript
describe("Tests", () => {
  beforeEach(() => {
    mockReset(prisma as any); // ✅ Clean slate for each test
  });

  it("test 1", () => {
    /* ... */
  });
  it("test 2", () => {
    /* ... */
  }); // Clean state
});
```

## Mocking Multiple Modules

```typescript
// Mock multiple dependencies
vi.mock("../src/index", () => ({
  prisma: mockDeep<PrismaClient>(),
}));

vi.mock("../src/oracle", () => ({
  OracleService: {
    calculateYield: vi.fn(),
  },
}));

vi.mock("../src/audit", () => ({
  AuditLogger: {
    logStateChange: vi.fn(),
  },
}));

const { prisma } = await import("../src/index");
const { OracleService } = await import("../src/oracle");

describe("Tests", () => {
  beforeEach(() => {
    mockReset(prisma as any);
    vi.clearAllMocks(); // Clear other mocks too
  });
});
```

## Benefits

✅ **Full Type Safety** - TypeScript autocomplete works perfectly  
✅ **Less Boilerplate** - No need to manually define mock methods  
✅ **Better DX** - IDE support for mocked methods  
✅ **Cleaner Tests** - Focus on behavior, not mock setup  
✅ **Automatic Reset** - `mockReset()` handles all cleanup

## Resources

- [vitest-mock-extended docs](https://www.npmjs.com/package/vitest-mock-extended)
- [Vitest API](https://vitest.dev/api/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
