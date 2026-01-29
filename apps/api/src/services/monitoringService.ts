/**
 * Monitoring and Alerts Service
 * 
 * Real-time monitoring of contract health, performance metrics, and alerting.
 * Integrates with the event indexer to detect anomalies.
 */

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
}

interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  data?: Record<string, any>;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
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
  contractStatuses: Record<string, boolean>;
}

// ============================================
// Monitoring Service
// ============================================

export class MonitoringService {
  private static instance: MonitoringService | null = null;
  
  private alerts: Alert[] = [];
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
    this.checkInterval = setInterval(() => this.runHealthCheck(), checkIntervalMs);
    
    console.log(`📊 Monitoring Service started, checking every ${checkIntervalMs / 1000}s`);
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
    const indexerState = eventIndexer.getState();
    const contracts = getContractAddresses();
    
    // In production, these would be actual queries
    return {
      timestamp: new Date(),
      transactionsPerMinute: Math.random() * 10, // Mock
      failedTransactions: 0,
      pendingInvestments: 0,
      totalValueLocked: 0,
      activeOracles: 1,
      openDisputes: 0,
      activeProposals: 0,
      contractStatuses: {
        assetToken: true,
        treasury: true,
        yieldDistributor: true,
        governance: true,
      },
    };
  }
  
  // ============================================
  // Alert Management
  // ============================================
  
  private async createAlert(params: {
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    data?: Record<string, any>;
  }): Promise<Alert> {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...params,
      createdAt: new Date(),
      acknowledged: false,
    };
    
    this.alerts.unshift(alert);
    
    // Keep last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts.pop();
    }
    
    console.log(`🚨 Alert [${alert.severity}]: ${alert.title}`);
    
    // Send webhooks for critical alerts
    if (alert.severity === AlertSeverity.CRITICAL) {
      await this.sendWebhooks(alert);
    }
    
    return alert;
  }
  
  private async triggerAlert(rule: AlertRule, metrics: SystemMetrics): Promise<void> {
    // Check if similar alert was created recently (debounce)
    const recentSimilar = this.alerts.find(
      a => a.type === rule.type && 
           Date.now() - a.createdAt.getTime() < 5 * 60 * 1000 // 5 min
    );
    
    if (recentSimilar) return;
    
    await this.createAlert({
      type: rule.type,
      severity: rule.severity,
      title: rule.name,
      message: rule.messageTemplate,
      data: { metrics, ruleId: rule.id },
    });
  }
  
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = userId;
    }
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
    this.webhookUrls = this.webhookUrls.filter(u => u !== url);
  }
  
  private async sendWebhooks(alert: Alert): Promise<void> {
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
              timestamp: alert.createdAt.toISOString(),
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
        condition: (m) => Object.values(m.contractStatuses).some(s => !s),
      },
    ];
  }
  
  // ============================================
  // Queries
  // ============================================
  
  getAlerts(options?: {
    severity?: AlertSeverity;
    type?: AlertType;
    acknowledged?: boolean;
    limit?: number;
  }): Alert[] {
    let filtered = [...this.alerts];
    
    if (options?.severity) {
      filtered = filtered.filter(a => a.severity === options.severity);
    }
    if (options?.type) {
      filtered = filtered.filter(a => a.type === options.type);
    }
    if (options?.acknowledged !== undefined) {
      filtered = filtered.filter(a => a.acknowledged === options.acknowledged);
    }
    
    return filtered.slice(0, options?.limit || 50);
  }
  
  getMetrics(limit: number = 60): SystemMetrics[] {
    return this.metrics.slice(0, limit);
  }
  
  getRules(): AlertRule[] {
    return [...this.rules];
  }
  
  updateRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      Object.assign(rule, updates);
    }
  }
  
  getStats(): {
    totalAlerts: number;
    unacknowledged: number;
    critical: number;
    lastCheck?: Date;
  } {
    return {
      totalAlerts: this.alerts.length,
      unacknowledged: this.alerts.filter(a => !a.acknowledged).length,
      critical: this.alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
      lastCheck: this.metrics[0]?.timestamp,
    };
  }
}

export const monitoringService = MonitoringService.getInstance();
export default MonitoringService;
