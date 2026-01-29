// ============================================
// Aethera API - Main Entry Point
// ============================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { API_CONFIG } from "@aethera/config";

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

// Import middleware
import { clerkMiddleware } from "@clerk/express";
import { errorHandler } from "./middleware/error.js";

const app = express();
app.use(clerkMiddleware());
const PORT = process.env.PORT || 3001;

// ============================================
// Middleware
// ============================================

// Security headers
app.use(helmet());

// CORS - Split comma-separated origins into array
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map(o => o.trim());
app.use(
  cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

// Rate limiting
app.use(
  rateLimit({
    windowMs: API_CONFIG.rateLimit.windowMs,
    max: API_CONFIG.rateLimit.max,
    message: { error: "Too many requests, please try again later." },
  }),
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// ============================================
// API Routes
// ============================================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/investments", investmentRoutes);
app.use("/api/yields", yieldRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/stellar", stellarRoutes);
app.use("/api/oracle", oracleRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/governance", governanceRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/webhooks", webhookRoutes);

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
});

export default app;
