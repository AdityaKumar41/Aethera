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

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
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
  console.log(`🚀 Aethera API running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `⭐ Stellar Network: ${process.env.STELLAR_NETWORK || "testnet"}`,
  );
});

export default app;
