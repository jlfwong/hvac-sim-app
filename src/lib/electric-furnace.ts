import { HeatingAppliance, HVACApplianceResponse } from "./types";
import { kWToBtusPerHour } from "./units";

const BTU_PER_CCF_NATURAL_GAS = 103700;

export class ElectricFurnace implements HeatingAppliance {
  readonly name: string = "Electric Furnace";

  constructor(
    private options: {
      capacityKw: number;
    }
  ) {}

  getHeatingPerformanceInfo(options: {
    insideAirTempF: number;
    outsideAirTempF: number;
  }): HVACApplianceResponse {
    const capacityBtusPerHour = kWToBtusPerHour(this.options.capacityKw);

    return {
      btusPerHour: capacityBtusPerHour,
      fuelUsage: {
        // This assumes variable control
        electricityKw: this.options.capacityKw,
      },
    };
  }
}
