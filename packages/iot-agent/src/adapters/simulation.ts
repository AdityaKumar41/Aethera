import { IoTAdapter, ProductionReading, DeviceInfo } from "./base.js";

/**
 * Simulation Adapter
 * 
 * Generates randomized solar production data for testing and development.
 */
export class SimulationAdapter implements IoTAdapter {
  private lastReading: number = 0;
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    this.isConnected = true;
    console.log("🛠️ Simulation Adapter: Connected");
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log("🛠️ Simulation Adapter: Disconnected");
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      id: "SIM-ADA-001",
      model: "Aethera Simulator v1",
      manufacturer: "Aethera Labs",
      firmware: "1.0.0-sim"
    };
  }

  async readProduction(): Promise<ProductionReading> {
    if (!this.isConnected) {
      throw new Error("Adapter not connected");
    }

    // Simulate day/night cycle
    const hour = new Date().getHours();
    const isDay = hour > 6 && hour < 18;
    
    // Simulate power output (Watts)
    let powerW = 0;
    if (isDay) {
        // Peak production at noon
        const modifier = Math.sin((hour - 6) / 12 * Math.PI);
        powerW = (Math.random() * 500 + 1000) * modifier;
    }

    // Increment energy (Wh) based on a 5-minute interval (1/12 of an hour)
    const energyIncrement = (powerW / 12);
    this.lastReading += energyIncrement;

    return {
      energyWh: this.lastReading,
      powerW,
      timestamp: new Date(),
      voltage: 230 + (Math.random() * 5 - 2.5),
      temperature: 35 + (Math.random() * 10),
      status: "Normal"
    };
  }
}
