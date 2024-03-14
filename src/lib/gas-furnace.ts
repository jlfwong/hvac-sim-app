import { HeatingAppliance, HVACApplianceResponse } from "./types";
import { BTU_PER_CCF_NATURAL_GAS } from "./units";

export class GasFurnace implements HeatingAppliance {
  private deratedCapacityBtusPerHour: number;
  readonly name: string = "Gas Furnace";

  constructor(
    private options: {
      // afue is short for Annual Fuel Utilization Efficiency,
      // typically around 96-98% for modern furnaces, and 80%
      // for older ones.
      afuePercent: number;

      capacityBtusPerHour: number;

      elevationFeet: number;
    }
  ) {
    // The National Fuel Gas Code requires that gas appliances installed
    // above 2,000 feet elevation have their inputs de-rated by 4% per 1,000
    // feet above sea level.
    //
    // https://www.questargas.com/ForEmployees/qgcOperationsTraining/Furnaces/York_YP9C.pdf
    let capacityElevationMultiplier = 1;
    if (this.options.elevationFeet > 2000) {
      capacityElevationMultiplier =
        1.0 - Math.floor(this.options.elevationFeet / 1000) * 0.04;
    }
    this.deratedCapacityBtusPerHour =
      this.options.capacityBtusPerHour * capacityElevationMultiplier;
  }

  getHeatingPerformanceInfo(options: {
    insideAirTempF: number;
    outsideAirTempF: number;
  }): HVACApplianceResponse {
    // Gas furnaces' efficiency in converting natural gas to heat is independent
    // of the temperature differential.

    const btusPerHourProduced = this.deratedCapacityBtusPerHour;

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
