/**
 * Impact Service
 * 
 * Logic for calculating environmental impact metrics like CO2 offsets (Carbon Credits).
 */

import { Prisma } from "@aethera/database";

// Standard Grid Intensity Factors (kg CO2 / kWh)
// These vary by location, but we'll use a conservative default
const DEFAULT_GRID_INTENSITY = new Prisma.Decimal(0.435); // Global average approx

export class ImpactService {
  private static instance: ImpactService | null = null;

  private constructor() {}

  static getInstance(): ImpactService {
    if (!ImpactService.instance) {
      ImpactService.instance = new ImpactService();
    }
    return ImpactService.instance;
  }

  /**
   * Calculate CO2 offsets for a given energy production
   * @param energyKwh Total energy produced in kWh
   * @param gridIntensity Factor for CO2 avoided per kWh (kg)
   * @returns CO2 offset in kg
   */
  calculateCarbonCredits(energyKwh: number, gridIntensity: number | Prisma.Decimal = DEFAULT_GRID_INTENSITY): number {
    const intensity = typeof gridIntensity === 'number' ? gridIntensity : gridIntensity.toNumber();
    return energyKwh * intensity;
  }

  /**
   * Get impact metrics for display
   * @param energyKwh Total energy produced in kWh
   */
  getImpactMetrics(energyKwh: number) {
    const co2SavedKg = this.calculateCarbonCredits(energyKwh);
    
    return {
      carbonOffset: co2SavedKg / 1000, // Tons CO2
      treesPlanted: co2SavedKg / 21.7, // ~21.7kg CO2 per tree per year
      waterSaved: energyKwh * 0.5, // ~0.5L water saved per kWh (approx)
      cleanEnergy: energyKwh, // total kWh
      carMilesEquivalent: Math.floor(co2SavedKg / 0.4), // ~0.4kg CO2 per mile for average car
    };
  }
}

export const impactService = ImpactService.getInstance();
export default ImpactService;
