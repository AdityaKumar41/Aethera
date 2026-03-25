/**
 * IoT Adapter Interface
 * 
 * Defines the standard interface for all inverter/meter adapters.
 */

export interface ProductionReading {
  energyWh: number;        // Total energy produced in Watt-hours
  powerW?: number;         // Current power in Watts
  timestamp: Date;         // Time of reading
  voltage?: number;        // Grid voltage (optional)
  temperature?: number;    // Inverter temperature (optional)
  status: string;          // Device status (e.g., "Normal", "Fault", "Offline")
}

export interface DeviceInfo {
  id: string;              // Device identifier
  model: string;           // Model name
  manufacturer: string;    // Manufacturer name
  firmware: string;        // Firmware version
}

export interface IoTAdapter {
  /**
   * Initialize connection to the hardware/API
   */
  connect(): Promise<void>;

  /**
   * Read the latest production data
   */
  readProduction(): Promise<ProductionReading>;

  /**
   * Get device metadata
   */
  getDeviceInfo(): Promise<DeviceInfo>;

  /**
   * Gracefully disconnect
   */
  disconnect(): Promise<void>;
}
