/**
 * Monitoring API Routes
 * 
 * Endpoints for system monitoring, alerts, and metrics.
 */

import { Router } from "express";
import { z } from "zod";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { createApiError } from "../middleware/error.js";
import { monitoringService, AlertSeverity, AlertType } from "../services/monitoringService.js";
import { eventIndexer } from "../services/eventIndexer.js";

const router = Router();

// ============================================
// Monitoring Dashboard
// ============================================

router.get(
  "/dashboard",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const alertStats = monitoringService.getStats();
      const indexerState = eventIndexer.getState();
      const recentAlerts = monitoringService.getAlerts({ limit: 5 });
      const metrics = monitoringService.getMetrics(1)[0];
      
      res.json({
        success: true,
        data: {
          alerts: alertStats,
          indexer: indexerState,
          recentAlerts,
          currentMetrics: metrics,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Alerts
// ============================================

router.get(
  "/alerts",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { severity, type, acknowledged, limit } = req.query;
      
      const alerts = monitoringService.getAlerts({
        severity: severity as AlertSeverity | undefined,
        type: type as AlertType | undefined,
        acknowledged: acknowledged === "true" ? true : acknowledged === "false" ? false : undefined,
        limit: limit ? parseInt(limit as string) : 50,
      });
      
      res.json({
        success: true,
        data: alerts,
        stats: monitoringService.getStats(),
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/alerts/:id/acknowledge",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.auth?.userId!;
      
      await monitoringService.acknowledgeAlert(id, userId);
      
      res.json({
        success: true,
        message: "Alert acknowledged",
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Metrics
// ============================================

router.get(
  "/metrics",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 60;
      const metrics = monitoringService.getMetrics(limit);
      
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Event Indexer
// ============================================

router.get(
  "/events",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { contractName, eventType, limit } = req.query;
      
      const events = eventIndexer.getEvents({
        contractName: contractName as string | undefined,
        eventType: eventType as string | undefined,
        limit: limit ? parseInt(limit as string) : 50,
      });
      
      res.json({
        success: true,
        data: events,
        stats: eventIndexer.getEventStats(),
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/indexer/status",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json({
        success: true,
        data: eventIndexer.getState(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Alert Rules
// ============================================

router.get(
  "/rules",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const rules = monitoringService.getRules();
      
      res.json({
        success: true,
        data: rules.map(r => ({
          id: r.id,
          name: r.name,
          type: r.type,
          enabled: r.enabled,
          threshold: r.threshold,
          severity: r.severity,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

const updateRuleSchema = z.object({
  enabled: z.boolean().optional(),
  threshold: z.number().optional(),
});

router.patch(
  "/rules/:id",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const updates = updateRuleSchema.parse(req.body);
      
      monitoringService.updateRule(id, updates);
      
      res.json({
        success: true,
        message: "Rule updated",
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Webhooks
// ============================================

const webhookSchema = z.object({
  url: z.string().url(),
});

router.post(
  "/webhooks",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { url } = webhookSchema.parse(req.body);
      
      monitoringService.addWebhookUrl(url);
      
      res.status(201).json({
        success: true,
        message: "Webhook registered",
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/webhooks",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { url } = webhookSchema.parse(req.body);
      
      monitoringService.removeWebhookUrl(url);
      
      res.json({
        success: true,
        message: "Webhook removed",
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Service Control
// ============================================

router.post(
  "/indexer/start",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await eventIndexer.start();
      
      res.json({
        success: true,
        message: "Event indexer started",
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/indexer/stop",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await eventIndexer.stop();
      
      res.json({
        success: true,
        message: "Event indexer stopped",
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/start",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await monitoringService.start();
      
      res.json({
        success: true,
        message: "Monitoring service started",
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/stop",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      await monitoringService.stop();
      
      res.json({
        success: true,
        message: "Monitoring service stopped",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
