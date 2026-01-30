import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("[Database] Warning: DATABASE_URL is not defined in process.env");
} else {
  // Log a masked version for safety
  const masked = connectionString.replace(/:([^@]+)@/, ":****@");
  console.log(`[Database] Connecting with: ${masked}`);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
export * from "./state-machine";
export * from "./audit";
export * from "./oracle";
export * from "./yield-distribution";
export default prisma;
