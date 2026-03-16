// ============================================
// Aethera API - Main Entry Point
// ============================================

import "./env.js";
import { validateEnv } from "./env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { API_CONFIG } from "@aethera/config";
import { prisma } from "@aethera/database";
import { getContractAddresses } from "@aethera/stellar";

// Import routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import projectRoutes from "./routes/projects.js";
import investmentRoutes from "./routes/investments.js";
import yieldRoutes from "./routes/yields.js";
import adminRoutes from "./routes/admin.js";
import stellarRoutes from "./routes/stellar.js";
import oracleRoutes from "./routes/oracle.js";
import kycRoutes from "./routes/kyc.js";
import governanceRoutes from "./routes/governance.js";
import emergencyRoutes from "./routes/emergency.js";
import monitoringRoutes from "./routes/monitoring.js";
import webhookRoutes from "./routes/webhooks.js";
import relayerRoutes from "./routes/relayer.js";
import revenueRoutes from "./routes/revenue.js";
import tokenTransferRoutes from "./routes/token-transfers.js";
import milestoneRoutes from "./routes/milestones.js";
// import auditRoutes from "./routes/audit.js"; // Removed as file doesn't exist

// Import services
import { getTransactionMonitor } from "./services/transactionMonitor.js";
import { eventIndexer } from "./services/eventIndexer.js";
import { monitoringService } from "./services/monitoringService.js";

// Import middleware
import { clerkMiddleware } from "@clerk/express";
import { errorHandler } from "./middleware/error.js";

const app = express();
validateEnv();
const PORT = process.env.PORT || 3001;

// ============================================
// Middleware
// ============================================

// CORS
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }
      // Allow explicitly listed origins
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      // Allow all Vercel preview/production deployments
      if (origin.endsWith(".vercel.app")) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

app.use(clerkMiddleware());

// Security headers
app.use(helmet());

// Body parsing - capture raw body for webhook signature verification
// Must be placed before any routes that rely on req.body or req.rawBody
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      // Store raw body for webhook signature verification
      req.rawBody = buf.toString();
    },
  }),
);

// Webhook routes - placed before rate limiter to ensure reliable processing
// from high-volume external providers like Clerk/Sumsub
app.use("/api/webhooks", webhookRoutes);

// Rate limiting - applied to all routes after webhooks
app.use(
  rateLimit({
    windowMs: API_CONFIG.rateLimit.windowMs,
    max: API_CONFIG.rateLimit.max,
    message: { error: "Too many requests, please try again later." },
  }),
);

// General request tracing for debugging
app.use((req, res, next) => {
  if (req.path.includes("webhook")) {
    console.log(`[TRACE] Incoming Webhook Request: ${req.method} ${req.path}`);
  }
  next();
});

// ============================================
// Health Check
// ============================================

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  });
});

app.get("/ready", async (req, res) => {
  const checks: Record<string, any> = {};
  let dbOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (error: any) {
    checks.dbError = error?.message || "DB check failed";
  }

  const contracts = getContractAddresses();
  const missingContracts = Object.entries(contracts)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  checks.database = dbOk;
  checks.contracts = {
    configured: missingContracts.length === 0,
    missing: missingContracts,
  };

  const ready = dbOk && missingContracts.length === 0;
  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not_ready",
    timestamp: new Date().toISOString(),
    checks,
  });
});

// ============================================
// API Routes
// ============================================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/milestones", milestoneRoutes);
app.use("/api/stellar", stellarRoutes); // Kept this route as it was not explicitly removed by the diff
// Relayer routes come before generic admin routes to avoid path conflicts
app.use("/api/admin/relayer", relayerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/investments", investmentRoutes);
app.use("/api/yields", yieldRoutes);
app.use("/api/oracle", oracleRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/relayer", relayerRoutes);
app.use("/api/revenue", revenueRoutes);
app.use("/api/token-transfers", tokenTransferRoutes);
// app.use("/api/audit", auditRoutes); // Removed

app.use("/api/governance", governanceRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/monitoring", monitoringRoutes);
// app.use("/api/webhooks", webhookRoutes); // Moved before rate limiter

// ============================================
// Error Handling
// ============================================

app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Solar API running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `⭐ Stellar Network: ${process.env.STELLAR_NETWORK || "testnet"}`,
  );

  // Start background services
  try {
    console.log("🛠️ Initializing background services...");
    getTransactionMonitor().start();
    eventIndexer.start();
    monitoringService.start();
    console.log("✅ All background services active");
  } catch (error) {
    console.error("❌ Failed to start background services:", error);
  }
});

export default app;
