import { HVACAppliance, HVACApplianceResponse } from "./types";
import { kWToBtusPerHour } from "./units";

const BTU_PER_CCF_NATURAL_GAS = 103700;

export class ElectricFurnace implements HVACAppliance {
  readonly name: string = "Electric Furnace";

  constructor(
    private options: {
      capacityKw: number;
    }
  ) {}

  getThermalResponse(options: {
    btusPerHourNeeded: number;
    insideAirTempF: number;
    outsideAirTempF: number;
  }): HVACApplianceResponse {
    if (options.btusPerHourNeeded < 0) {
      // Furnaces can't cool :)
      return { btusPerHour: 0, fuelUsage: {} };
    }

    const capacityBtusPerHour = kWToBtusPerHour(this.options.capacityKw);

    // Thermal response is independent of temperature differential
    const btusPerHourProduced = Math.min(
      options.btusPerHourNeeded,
      capacityBtusPerHour
    );

    return {
      btusPerHour: btusPerHourProduced,
      fuelUsage: {
        // This assumes variable control
        electricityKw:
          (btusPerHourProduced / capacityBtusPerHour) * this.options.capacityKw,
      },
    };
  }
}
