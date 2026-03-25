import { IoTAdapter, ProductionReading, DeviceInfo } from "./base.js";

/**
 * SolarEdge Adapter
 * 
 * Interacts with the SolarEdge Monitoring API via HTTP.
 * Requires: SITE_ID and API_KEY.
 */
export class SolarEdgeAdapter implements IoTAdapter {
  private siteId: string;
  private apiKey: string;
  private baseUrl: string = "https://monitoringapi.solaredge.com";
  private isConnected: boolean = false;

  constructor(siteId: string, apiKey: string) {
    this.siteId = siteId;
    this.apiKey = apiKey;
  }

  async connect(): Promise<void> {
    if (!this.siteId || !this.apiKey) {
      throw new Error("SolarEdge credentials missing (SITE_ID, API_KEY)");
    }
    
    // Test connection by fetching site overview
    const response = await fetch(`${this.baseUrl}/site/${this.siteId}/overview?api_key=${this.apiKey}`);
    if (!response.ok) {
      throw new Error(`Failed to connect to SolarEdge API: ${response.statusText}`);
    }
    
    this.isConnected = true;
    console.log(`🔌 SolarEdge Adapter: Connected to Site ${this.siteId}`);
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log("🔌 SolarEdge Adapter: Disconnected");
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      id: `SE-${this.siteId}`,
      model: "SolarEdge Inverter",
      manufacturer: "SolarEdge",
      firmware: "latest"
    };
  }

  async readProduction(): Promise<ProductionReading> {
    if (!this.isConnected) {
      throw new Error("Adapter not connected");
    }

    // Fetch site energy for today
    const response = await fetch(`${this.baseUrl}/site/${this.siteId}/overview?api_key=${this.apiKey}`);
    if (!response.ok) {
        throw new Error(`Failed to read production from SolarEdge: ${response.statusText}`);
    }

    const data = await response.json();
    const overview = data.overview;
    
    return {
      energyWh: Number(overview.lifeTimeData.energy), // Site lifetime energy in Wh
      powerW: Number(overview.currentPower.power),    // Current power in Watts
      timestamp: new Date(overview.lastUpdateTime),
      status: "Normal"
    };
  }
}
