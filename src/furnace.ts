import { HVACAppliance, HVACApplianceResponse } from "./types";

const BTU_PER_CCF_NATURAL_GAS = 103700;

export class GasFurnace implements HVACAppliance {
  constructor(
    private options: {
      // afue is short for Annual Fuel Utilization Efficiency,
      // typically around 96-98% for modern furnaces, and 80%
      // for older ones.
      afuePercent: number;

      capacityBtusPerHour: number;
    }
  ) {}

  getThermalResponse(options: {
    btusPerHourNeeded: number;
    insideAirTempF: number;
    outsideAirTempF: number;
  }): HVACApplianceResponse {
    const btusPerHourProduced = Math.min(
      options.btusPerHourNeeded,
      this.options.capacityBtusPerHour
    );

    const btuConsumptionRate =
      btusPerHourProduced / (this.options.afuePercent / 100.0);
    const ccfConsumptionRate = btuConsumptionRate / BTU_PER_CCF_NATURAL_GAS;

    return {
      btusPerHour: btusPerHourProduced,
      fuelUsage: {
        naturalGasCcfPerHour: ccfConsumptionRate,
      },
    };
  }
}
