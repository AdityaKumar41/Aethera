/**
 * Monitoring and Alerts Service
 *
 * Real-time monitoring of contract health, performance metrics, and alerting.
 * Alerts are persisted to the database for durability across restarts.
 * Metrics remain in-memory (ephemeral by nature).
 */

import { prisma } from "@aethera/database";
import { getContractAddresses, StellarClient } from "@aethera/stellar";
import { eventIndexer } from "./eventIndexer.js";

// ============================================
// Types
// ============================================

export enum AlertSeverity {
  INFO = "INFO",
  WARNING = "WARNING",
  CRITICAL = "CRITICAL",
}

export enum AlertType {
  HIGH_TRANSACTION_VOLUME = "HIGH_TRANSACTION_VOLUME",
  LARGE_TRANSFER = "LARGE_TRANSFER",
  CONTRACT_PAUSED = "CONTRACT_PAUSED",
  FAILED_TRANSACTION = "FAILED_TRANSACTION",
  ORACLE_DISPUTE = "ORACLE_DISPUTE",
  LOW_BALANCE = "LOW_BALANCE",
  GOVERNANCE_PROPOSAL = "GOVERNANCE_PROPOSAL",
  SYSTEM_ERROR = "SYSTEM_ERROR",
  DEVICE_OFFLINE = "DEVICE_OFFLINE",
  REVENUE_PENDING = "REVENUE_PENDING",
}

interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  enabled: boolean;
  threshold?: number;
  condition: (metrics: SystemMetrics) => boolean;
  severity: AlertSeverity;
  messageTemplate: string;
}

interface SystemMetrics {
  timestamp: Date;
  transactionsPerMinute: number;
  failedTransactions: number;
  pendingInvestments: number;
  totalValueLocked: number;
  activeOracles: number;
  openDisputes: number;
  activeProposals: number;
  offlineDevices: number;
  pendingRevenueReports: number;
  contractStatuses: Record<string, boolean>;
}

// ============================================
// Monitoring Service
// ============================================

export class MonitoringService {
  private static instance: MonitoringService | null = null;

  private rules: AlertRule[] = [];
  private metrics: SystemMetrics[] = [];
  private webhookUrls: string[] = [];
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeDefaultRules();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  // ============================================
  // Lifecycle
  // ============================================

  async start(checkIntervalMs: number = 60000): Promise<void> {
    console.log("🔔 Starting Monitoring Service...");

    // Run initial check
    await this.runHealthCheck();

    // Start periodic checks
    this.checkInterval = setInterval(
      () => this.runHealthCheck(),
      checkIntervalMs,
    );

    console.log(
      `📊 Monitoring Service started, checking every ${checkIntervalMs / 1000}s`,
    );
  }

  async stop(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log("Monitoring Service stopped");
  }

  // ============================================
  // Health Checks
  // ============================================

  private async runHealthCheck(): Promise<void> {
    try {
      const metrics = await this.collectMetrics();
      this.metrics.unshift(metrics);

      // Keep last 24 hours of metrics (at 1 min intervals = 1440 entries)
      if (this.metrics.length > 1440) {
        this.metrics.pop();
      }

      // Evaluate rules
      for (const rule of this.rules) {
        if (rule.enabled && rule.condition(metrics)) {
          await this.triggerAlert(rule, metrics);
        }
      }
    } catch (error: any) {
      console.error("Health check failed:", error.message);
      await this.createAlert({
        type: AlertType.SYSTEM_ERROR,
        severity: AlertSeverity.WARNING,
        title: "Health Check Failed",
        message: error.message,
      });
    }
  }

  private async collectMetrics(): Promise<SystemMetrics> {
    const contracts = getContractAddresses();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const deviceOfflineThreshold = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour

    // Run all DB queries in parallel
    const [
      pendingInvestments,
      failedTransactions,
      transactionsPerMinute,
      tvlResult,
      activeOracles,
      openDisputes,
      offlineDevices,
      pendingRevenueReports,
    ] = await Promise.all([
      prisma.investment.count({
        where: { status: "PENDING_ONCHAIN" },
      }),
      prisma.transactionLog.count({
        where: { status: "FAILED", createdAt: { gte: oneHourAgo } },
      }),
      prisma.transactionLog.count({
        where: { createdAt: { gte: oneMinuteAgo } },
      }),
      prisma.project.aggregate({
        where: { status: { in: ["FUNDING", "FUNDED", "ACTIVE"] } },
        _sum: { fundingRaised: true },
      }),
      prisma.oracleProvider.count({
        where: { status: "ACTIVE" },
      }),
      prisma.oracleDispute.count({
        where: { status: { in: ["OPEN", "UNDER_REVIEW"] } },
      }),
      prisma.ioTDevice.count({
        where: {
          status: "ACTIVE",
          lastSeenAt: { lt: deviceOfflineThreshold },
        },
      }),
      prisma.revenueReport.count({
        where: { status: "PENDING" },
      }),
    ]);

    const totalValueLocked = tvlResult._sum.fundingRaised
      ? Number(tvlResult._sum.fundingRaised)
      : 0;

    return {
      timestamp: now,
      transactionsPerMinute,
      failedTransactions,
      pendingInvestments,
      totalValueLocked,
      activeOracles,
      openDisputes,
      activeProposals: 0,
      offlineDevices,
      pendingRevenueReports,
      contractStatuses: {
        assetToken: !!contracts.assetToken,
        treasury: !!contracts.treasury,
        yieldDistributor: !!contracts.yieldDistributor,
        governance: !!contracts.governance,
      },
    };
  }

  // ============================================
  // Alert Management (DB-backed)
  // ============================================

  async createAlert(params: {
    type: AlertType | string;
    severity: AlertSeverity | string;
    title: string;
    message: string;
    data?: Record<string, any>;
  }): Promise<any> {
    try {
      const alert = await prisma.alert.create({
        data: {
          type: params.type,
          severity: params.severity as any,
          title: params.title,
          message: params.message,
          data: params.data || undefined,
        },
      });

      console.log(`🚨 Alert [${alert.severity}]: ${alert.title}`);

      // Send webhooks for critical alerts
      if (params.severity === AlertSeverity.CRITICAL) {
        await this.sendWebhooks(alert);
      }

      return alert;
    } catch (error) {
      // Fallback to console if DB write fails
      console.error(`🚨 [ALERT FALLBACK] [${params.severity}]: ${params.title} - ${params.message}`);
      return null;
    }
  }

  private async triggerAlert(
    rule: AlertRule,
    metrics: SystemMetrics,
  ): Promise<void> {
    // Check if similar alert was created recently (debounce — 5 min)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentSimilar = await prisma.alert.findFirst({
      where: {
        type: rule.type,
        createdAt: { gte: fiveMinutesAgo },
      },
    });

    if (recentSimilar) return;

    await this.createAlert({
      type: rule.type,
      severity: rule.severity,
      title: rule.name,
      message: rule.messageTemplate,
      data: { ruleId: rule.id },
    });
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    await prisma.alert.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      },
    });
  }

  // ============================================
  // Webhooks
  // ============================================

  addWebhookUrl(url: string): void {
    if (!this.webhookUrls.includes(url)) {
      this.webhookUrls.push(url);
    }
  }

  removeWebhookUrl(url: string): void {
    this.webhookUrls = this.webhookUrls.filter((u) => u !== url);
  }

  private async sendWebhooks(alert: any): Promise<void> {
    for (const url of this.webhookUrls) {
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "AETHERA_ALERT",
            alert: {
              id: alert.id,
              type: alert.type,
              severity: alert.severity,
              title: alert.title,
              message: alert.message,
              timestamp: alert.createdAt,
            },
          }),
        });
      } catch (error) {
        console.error(`Webhook failed for ${url}`);
      }
    }
  }

  // ============================================
  // Default Rules
  // ============================================

  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: "high-tx-volume",
        name: "High Transaction Volume",
        type: AlertType.HIGH_TRANSACTION_VOLUME,
        enabled: true,
        threshold: 100,
        severity: AlertSeverity.WARNING,
        messageTemplate: "Transaction volume exceeded threshold",
        condition: (m) => m.transactionsPerMinute > 100,
      },
      {
        id: "failed-transactions",
        name: "Failed Transactions Detected",
        type: AlertType.FAILED_TRANSACTION,
        enabled: true,
        threshold: 5,
        severity: AlertSeverity.WARNING,
        messageTemplate: "Multiple failed transactions detected",
        condition: (m) => m.failedTransactions > 5,
      },
      {
        id: "open-disputes",
        name: "Open Oracle Disputes",
        type: AlertType.ORACLE_DISPUTE,
        enabled: true,
        threshold: 3,
        severity: AlertSeverity.WARNING,
        messageTemplate: "Multiple oracle disputes require attention",
        condition: (m) => m.openDisputes > 3,
      },
      {
        id: "contract-paused",
        name: "Contract Paused",
        type: AlertType.CONTRACT_PAUSED,
        enabled: true,
        severity: AlertSeverity.CRITICAL,
        messageTemplate: "One or more contracts are paused",
        condition: (m) => Object.values(m.contractStatuses).some((s) => !s),
      },
      {
        id: "devices-offline",
        name: "Devices Offline",
        type: AlertType.DEVICE_OFFLINE,
        enabled: true,
        threshold: 1,
        severity: AlertSeverity.WARNING,
        messageTemplate: "One or more IoT devices have gone offline",
        condition: (m) => m.offlineDevices > 0,
      },
      {
        id: "pending-revenue",
        name: "Pending Revenue Reports",
        type: AlertType.REVENUE_PENDING,
        enabled: true,
        threshold: 5,
        severity: AlertSeverity.INFO,
        messageTemplate: "Revenue reports awaiting admin review",
        condition: (m) => m.pendingRevenueReports > 5,
      },
    ];
  }

  // ============================================
  // Queries (DB-backed)
  // ============================================

  async getAlerts(options?: {
    severity?: string;
    type?: string;
    acknowledged?: boolean;
    limit?: number;
  }): Promise<any[]> {
    const where: any = {};

    if (options?.severity) where.severity = options.severity;
    if (options?.type) where.type = options.type;
    if (options?.acknowledged !== undefined)
      where.acknowledged = options.acknowledged;

    return prisma.alert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
    });
  }

  getMetrics(limit: number = 60): SystemMetrics[] {
    return this.metrics.slice(0, limit);
  }

  getRules(): AlertRule[] {
    return [...this.rules];
  }

  updateRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) {
      Object.assign(rule, updates);
    }
  }

  async getStats(): Promise<{
    totalAlerts: number;
    unacknowledged: number;
    critical: number;
    lastCheck?: Date;
  }> {
    const [totalAlerts, unacknowledged, critical] = await Promise.all([
      prisma.alert.count(),
      prisma.alert.count({ where: { acknowledged: false } }),
      prisma.alert.count({ where: { severity: "CRITICAL" } }),
    ]);

    return {
      totalAlerts,
      unacknowledged,
      critical,
      lastCheck: this.metrics[0]?.timestamp,
    };
  }
}

export const monitoringService = MonitoringService.getInstance();
export default MonitoringService;
