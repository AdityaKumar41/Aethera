import { IoTAdapter, ProductionReading, DeviceInfo } from "./base.js";

/**
 * SMA Sunny Portal Adapter
 * 
 * Interacts with the SMA Sunny Portal / EnnexOS API.
 * Requires: API_USERNAME, API_PASSWORD, SYSTEM_ID.
 */
export class SMAAdapter implements IoTAdapter {
  private systemId: string;
  private username: string;
  private password: string;
  private baseUrl: string = "https://api.sma.de";
  private isConnected: boolean = false;
  private token: string | null = null;

  constructor(systemId: string, username: string, password: string) {
    this.systemId = systemId;
    this.username = username;
    this.password = password;
  }

  async connect(): Promise<void> {
    if (!this.systemId || !this.username || !this.password) {
      throw new Error("SMA credentials missing (SYSTEM_ID, USERNAME, PASSWORD)");
    }
    
    // Simulate auth token fetch (placeholder for real SMA oauth)
    this.token = "sim-sma-token-" + Date.now();
    this.isConnected = true;
    console.log(`🔌 SMA Adapter: Connected to System ${this.systemId}`);
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.token = null;
    console.log("🔌 SMA Adapter: Disconnected");
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      id: `SMA-${this.systemId}`,
      model: "SMA Sunny Tripower",
      manufacturer: "SMA Solar Technology AG",
      firmware: "ennexOS-v2"
    };
  }

  async readProduction(): Promise<ProductionReading> {
    if (!this.isConnected) {
      throw new Error("Adapter not connected");
    }

    // In a real implementation, this would call SMA API
    // e.g., /ennexos/v1/monitoring/systems/{systemId}/current-values
    console.log(`📡 [SMA] Reading telemetry for ${this.systemId}...`);

    // Returning simulated values for now as real SMA API requires developer agreement
    return {
      energyWh: 1250000 + (Math.random() * 5000), // Site lifetime energy in Wh
      powerW: 1500 + (Math.random() * 200),        // Current power in Watts
      timestamp: new Date(),
      status: "Normal"
    };
  }
}
