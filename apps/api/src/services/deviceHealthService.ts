import { prisma, DeviceStatus } from "@aethera/database";
import { notificationService } from "./notificationService.js";
import { monitoringService, AlertType, AlertSeverity } from "./monitoringService.js";

/**
 * Device Health Service
 * 
 * Periodically checks for IoT devices that have gone offline.
 */
export class DeviceHealthService {
  private static instance: DeviceHealthService | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private OFFLINE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

  private constructor() {}

  static getInstance(): DeviceHealthService {
    if (!DeviceHealthService.instance) {
      DeviceHealthService.instance = new DeviceHealthService();
    }
    return DeviceHealthService.instance;
  }

  /**
   * Start the health monitoring background loop
   */
  async start(intervalMs: number = 300000): Promise<void> { // Default 5 minutes
    console.log("📡 Starting Device Health Service...");
    
    // Run initial check
    await this.checkDevices();

    this.checkInterval = setInterval(() => this.checkDevices(), intervalMs);
  }

  /**
   * Stop the monitoring loop
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check for devices that have gone offline
   */
  private async checkDevices(): Promise<void> {
    const thresholdDate = new Date(Date.now() - this.OFFLINE_THRESHOLD_MS);

    try {
      // Find active devices that haven't been seen recently
      const offlineDevices = await prisma.ioTDevice.findMany({
        where: {
          status: DeviceStatus.ACTIVE,
          OR: [
            { lastSeenAt: { lt: thresholdDate } },
            { lastSeenAt: null, activatedAt: { lt: thresholdDate } }
          ]
        },
        include: {
          project: {
            include: {
              installer: true
            }
          }
        }
      });

      if (offlineDevices.length === 0) return;

      console.log(`⚠️ Found ${offlineDevices.length} offline devices.`);

      for (const device of offlineDevices) {
        // 1. Create monitoring alert
        await monitoringService.createAlert({
          type: AlertType.DEVICE_OFFLINE,
          severity: AlertSeverity.WARNING,
          title: "Device Offline",
          message: `Device ${device.publicKey} for project ${device.project.name} is offline.`,
          data: { projectId: device.projectId, deviceId: device.id }
        });

        // 2. Notify installer
        if (device.project.installer.email) {
          await notificationService.notifyDeviceOffline({
            email: device.project.installer.email,
            installerName: device.project.installer.name || "Installer",
            projectName: device.project.name,
            deviceId: device.publicKey,
            lastSeenAt: device.lastSeenAt || device.activatedAt || new Date(0)
          });
        }
        
        // 3. Mark as INACTIVE if needed (optional, could be confusing if it auto-recovers)
        // For now, we just rely on alerts and notifications.
      }
    } catch (error) {
      console.error("❌ Device health check failed:", error);
    }
  }
}

export const deviceHealthService = DeviceHealthService.getInstance();
export default deviceHealthService;
