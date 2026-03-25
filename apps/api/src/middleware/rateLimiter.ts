import { rateLimit } from "express-rate-limit";

/**
 * Rate Limiting Middleware
 * 
 * Provides various rate limiting strategies for different types of endpoints.
 * Helps prevent brute-force attacks and API abuse.
 */

// Default configuration for most endpoints
const defaultWindowMs = 15 * 60 * 1000; // 15 minutes

/**
 * Strict limiter for sensitive authentication and account actions
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  message: {
    error: "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Limiter for investment creation 
 */
export const investmentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 investments per hour
  message: {
    error: "Investment rate limit exceeded. Please wait before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Limiter for oracle data ingestion (per IP)
 */
export const ingestionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 telemetry submissions per minute
  message: {
    error: "Telemetry ingestion rate limit exceeded.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Limiter for yield claiming
 */
export const claimLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 claims per hour
  message: {
    error: "Too many claim attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Standard API limiter for general routes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
