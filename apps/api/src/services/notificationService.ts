/**
 * Notification Service
 *
 * Transactional email notifications using Nodemailer.
 * Gracefully degrades to console logging if SMTP is not configured.
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ============================================
// Configuration
// ============================================

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || "Aethera <noreply@aethera.io>",
};

const PLATFORM_NAME = "Aethera";
const PLATFORM_URL = process.env.FRONTEND_URL || "https://aethera.io";

// ============================================
// Email Templates
// ============================================

function baseTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
    .header p { color: #94a3b8; margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px 24px; }
    .body h2 { color: #0f172a; margin: 0 0 16px; font-size: 20px; }
    .body p { color: #475569; line-height: 1.6; margin: 0 0 16px; }
    .highlight-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .highlight-box.warning { background: #fefce8; border-color: #fde047; }
    .highlight-box.info { background: #eff6ff; border-color: #93c5fd; }
    .stat { display: inline-block; margin-right: 24px; margin-bottom: 8px; }
    .stat-value { font-size: 24px; font-weight: 700; color: #0f172a; }
    .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
    .btn { display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .footer { padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>☀️ ${PLATFORM_NAME}</h1>
      <p>DePIN Renewable Energy Platform</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${PLATFORM_NAME}. All rights reserved.</p>
      <p style="margin-top: 8px;"><a href="${PLATFORM_URL}" style="color: #2563eb;">Visit Dashboard</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ============================================
// Notification Service
// ============================================

export class NotificationService {
  private static instance: NotificationService | null = null;
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  private constructor() {
    this.initialize();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private initialize(): void {
    if (SMTP_CONFIG.host && SMTP_CONFIG.user && SMTP_CONFIG.pass) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_CONFIG.host,
        port: SMTP_CONFIG.port,
        secure: SMTP_CONFIG.secure,
        auth: {
          user: SMTP_CONFIG.user,
          pass: SMTP_CONFIG.pass,
        },
      });
      this.isConfigured = true;
      console.log("📧 Notification Service: SMTP configured");
    } else {
      console.log(
        "📧 Notification Service: SMTP not configured, emails will be logged to console",
      );
    }
  }

  // ============================================
  // Core Send Method
  // ============================================

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.log(`📧 [EMAIL LOG] To: ${to} | Subject: ${subject}`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: SMTP_CONFIG.from,
        to,
        subject: `${PLATFORM_NAME} — ${subject}`,
        html,
      });
      return true;
    } catch (error) {
      console.error(`📧 Failed to send email to ${to}:`, error);
      return false;
    }
  }

  // ============================================
  // Investment Notifications
  // ============================================

  async notifyInvestmentConfirmed(params: {
    email: string;
    investorName: string;
    projectName: string;
    amount: number;
    tokenAmount: number;
    txHash?: string;
  }): Promise<boolean> {
    const html = baseTemplate(
      "Investment Confirmed",
      `
      <h2>Investment Confirmed! 🎉</h2>
      <p>Hi ${params.investorName},</p>
      <p>Your investment in <strong>${params.projectName}</strong> has been confirmed on the Stellar blockchain.</p>
      <div class="highlight-box">
        <div class="stat">
          <div class="stat-value">${params.amount.toLocaleString()} USDC</div>
          <div class="stat-label">Amount Invested</div>
        </div>
        <div class="stat">
          <div class="stat-value">${params.tokenAmount.toLocaleString()}</div>
          <div class="stat-label">Tokens Received</div>
        </div>
      </div>
      ${params.txHash ? `<p style="font-size:12px; color:#64748b;">Transaction: <code>${params.txHash}</code></p>` : ""}
      <a href="${PLATFORM_URL}/dashboard/my-investments" class="btn">View My Investments</a>
    `,
    );

    return this.sendEmail(params.email, "Investment Confirmed", html);
  }

  async notifyInvestmentFailed(params: {
    email: string;
    investorName: string;
    projectName: string;
    amount: number;
    error: string;
  }): Promise<boolean> {
    const html = baseTemplate(
      "Investment Failed",
      `
      <h2>Investment Issue ⚠️</h2>
      <p>Hi ${params.investorName},</p>
      <p>There was an issue with your investment in <strong>${params.projectName}</strong> for ${params.amount.toLocaleString()} USDC.</p>
      <div class="highlight-box warning">
        <p style="margin:0;"><strong>Reason:</strong> ${params.error}</p>
      </div>
      <p>Please try again or contact support if this persists.</p>
      <a href="${PLATFORM_URL}/dashboard/marketplace" class="btn">Return to Marketplace</a>
    `,
    );

    return this.sendEmail(params.email, "Investment Issue", html);
  }

  // ============================================
  // Yield Notifications
  // ============================================

  async notifyYieldAvailable(params: {
    email: string;
    investorName: string;
    projectName: string;
    amount: number;
    period: string;
  }): Promise<boolean> {
    const html = baseTemplate(
      "Yield Available",
      `
      <h2>New Yield Available! 💰</h2>
      <p>Hi ${params.investorName},</p>
      <p>A new yield distribution is available for your investment in <strong>${params.projectName}</strong>.</p>
      <div class="highlight-box">
        <div class="stat">
          <div class="stat-value">${params.amount.toFixed(2)} USDC</div>
          <div class="stat-label">Claimable Amount</div>
        </div>
        <div class="stat">
          <div class="stat-value">${params.period}</div>
          <div class="stat-label">Period</div>
        </div>
      </div>
      <a href="${PLATFORM_URL}/dashboard/yield" class="btn">Claim Your Yield</a>
    `,
    );

    return this.sendEmail(params.email, "New Yield Available", html);
  }

  async notifyYieldClaimed(params: {
    email: string;
    investorName: string;
    amount: number;
    txHash?: string;
  }): Promise<boolean> {
    const html = baseTemplate(
      "Yield Claimed",
      `
      <h2>Yield Successfully Claimed! ✅</h2>
      <p>Hi ${params.investorName},</p>
      <p>You have successfully claimed <strong>${params.amount.toFixed(2)} USDC</strong> in yield.</p>
      ${params.txHash ? `<p style="font-size:12px; color:#64748b;">Transaction: <code>${params.txHash}</code></p>` : ""}
      <a href="${PLATFORM_URL}/dashboard/yield" class="btn">View Yield History</a>
    `,
    );

    return this.sendEmail(params.email, "Yield Claimed", html);
  }

  // ============================================
  // KYC Notifications
  // ============================================

  async notifyKYCStatusChange(params: {
    email: string;
    userName: string;
    status: "VERIFIED" | "REJECTED" | "IN_REVIEW";
    reason?: string;
  }): Promise<boolean> {
    const statusMessages = {
      VERIFIED: {
        title: "KYC Verification Approved ✅",
        message:
          "Your identity has been verified. You can now invest in solar projects.",
        boxClass: "",
      },
      REJECTED: {
        title: "KYC Verification Issue ❌",
        message:
          "There was an issue with your verification. Please review and resubmit.",
        boxClass: "warning",
      },
      IN_REVIEW: {
        title: "KYC Under Review 🔍",
        message:
          "Your documents are being reviewed. This usually takes 1-2 business days.",
        boxClass: "info",
      },
    };

    const config = statusMessages[params.status];
    const html = baseTemplate(
      config.title,
      `
      <h2>${config.title}</h2>
      <p>Hi ${params.userName},</p>
      <div class="highlight-box ${config.boxClass}">
        <p style="margin:0;">${config.message}</p>
      </div>
      ${params.reason ? `<p><strong>Details:</strong> ${params.reason}</p>` : ""}
      <a href="${PLATFORM_URL}/dashboard/settings" class="btn">Go to Dashboard</a>
    `,
    );

    return this.sendEmail(params.email, config.title, html);
  }

  // ============================================
  // Milestone Notifications
  // ============================================

  async notifyMilestoneStatusChange(params: {
    email: string;
    userName: string;
    projectName: string;
    milestoneName: string;
    status: "SUBMITTED" | "VERIFIED" | "REJECTED" | "RELEASED";
    reason?: string;
  }): Promise<boolean> {
    const statusConfig: Record<
      string,
      { title: string; emoji: string; message: string }
    > = {
      SUBMITTED: {
        title: "Milestone Submitted",
        emoji: "📤",
        message: `Proof for milestone "${params.milestoneName}" has been submitted and is awaiting review.`,
      },
      VERIFIED: {
        title: "Milestone Verified",
        emoji: "✅",
        message: `Milestone "${params.milestoneName}" has been verified and approved.`,
      },
      REJECTED: {
        title: "Milestone Rejected",
        emoji: "❌",
        message: `Milestone "${params.milestoneName}" was rejected.${params.reason ? ` Reason: ${params.reason}` : ""}`,
      },
      RELEASED: {
        title: "Milestone Funds Released",
        emoji: "💰",
        message: `Funds for milestone "${params.milestoneName}" have been released.`,
      },
    };

    const config = statusConfig[params.status] || statusConfig.SUBMITTED;
    const html = baseTemplate(
      config.title,
      `
      <h2>${config.emoji} ${config.title}</h2>
      <p>Hi ${params.userName},</p>
      <p>Update for project <strong>${params.projectName}</strong>:</p>
      <div class="highlight-box${params.status === "REJECTED" ? " warning" : ""}">
        <p style="margin:0;">${config.message}</p>
      </div>
      <a href="${PLATFORM_URL}/dashboard/my-projects" class="btn">View Project</a>
    `,
    );

    return this.sendEmail(params.email, config.title, html);
  }

  // ============================================
  // Project Notifications
  // ============================================

  async notifyProjectApproved(params: {
    email: string;
    installerName: string;
    projectName: string;
  }): Promise<boolean> {
    const html = baseTemplate(
      "Project Approved",
      `
      <h2>Project Approved! 🎉</h2>
      <p>Hi ${params.installerName},</p>
      <p>Your project <strong>${params.projectName}</strong> has been approved and is now listed on the marketplace for investor funding.</p>
      <a href="${PLATFORM_URL}/dashboard/my-projects" class="btn">View Project</a>
    `,
    );

    return this.sendEmail(params.email, "Project Approved", html);
  }

  async notifyProjectFunded(params: {
    email: string;
    installerName: string;
    projectName: string;
    totalRaised: number;
  }): Promise<boolean> {
    const html = baseTemplate(
      "Project Fully Funded",
      `
      <h2>Project Fully Funded! 🚀</h2>
      <p>Hi ${params.installerName},</p>
      <p>Your project <strong>${params.projectName}</strong> has reached its funding target of <strong>${params.totalRaised.toLocaleString()} USDC</strong>!</p>
      <div class="highlight-box">
        <p style="margin:0;">Capital will be released according to the milestone schedule.</p>
      </div>
      <a href="${PLATFORM_URL}/dashboard/my-projects" class="btn">View Project</a>
    `,
    );

    return this.sendEmail(params.email, "Project Fully Funded", html);
  }

  // ============================================
  // Device / IoT Notifications
  // ============================================

  async notifyDeviceOffline(params: {
    email: string;
    installerName: string;
    projectName: string;
    deviceId: string;
    lastSeenAt: Date;
  }): Promise<boolean> {
    const html = baseTemplate(
      "Device Offline Alert",
      `
      <h2>⚠️ Device Offline Alert</h2>
      <p>Hi ${params.installerName},</p>
      <p>An IoT device linked to your project <strong>${params.projectName}</strong> has gone offline.</p>
      <div class="highlight-box warning">
        <p style="margin:0;"><strong>Device ID:</strong> ${params.deviceId}</p>
        <p style="margin:8px 0 0;"><strong>Last Seen:</strong> ${params.lastSeenAt.toISOString()}</p>
      </div>
      <p>Yield distribution may be paused if no production data is received. Please check your device.</p>
      <a href="${PLATFORM_URL}/dashboard/production" class="btn">View Production Data</a>
    `,
    );

    return this.sendEmail(params.email, "Device Offline Alert", html);
  }
}

export const notificationService = NotificationService.getInstance();
export default notificationService;
