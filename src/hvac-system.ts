import { DateTime } from "luxon";
import { HVACAppliance, HVACApplianceResponse } from "./types";

export interface HVACSystem {
  getThermalResponse(options: {
    localTime: DateTime;
    insideAirTempF: number;
    outsideAirTempF: number;
  }): HVACApplianceResponse;
}

// An HVAC system using a thermostat with...
// - No time dependent settings
// - Treats heating/cooling equipment as single-stage
export class SimpleHVACSystem implements HVACSystem {
  constructor(
    private options: {
      coolingSetPointF: number;
      coolingAppliance: HVACAppliance;

      heatingAppliance: HVACAppliance;
      heatingSetPointF: number;
    }
  ) {}

  getThermalResponse(options: {
    localTime: DateTime;
    insideAirTempF: number;
    outsideAirTempF: number;
  }): HVACApplianceResponse {
    // Don't engage equipment unless temperature has drifted by at least this amount
    const minTempDifferentialF = 0.8;

    if (
      options.insideAirTempF <
      this.options.heatingSetPointF - minTempDifferentialF
    ) {
      // Time to heat
      return this.options.heatingAppliance.getThermalResponse({
        // TODO(jlfwong): Update this once the interface for appliances is updated
        btusPerHourNeeded: 999999,
        insideAirTempF: options.insideAirTempF,
        outsideAirTempF: options.outsideAirTempF,
      });
    } else if (
      options.insideAirTempF >
      this.options.coolingSetPointF + minTempDifferentialF
    ) {
      // TODO(jlfwong): Update this once the interface for appliances is updated
      return this.options.heatingAppliance.getThermalResponse({
        btusPerHourNeeded: -999999,
        insideAirTempF: options.insideAirTempF,
        outsideAirTempF: options.outsideAirTempF,
      });
    } else {
      // Building is comfy -- nothing to do here
      return {
        btusPerHour: 0,
        fuelUsage: {},
      };
    }
  }
}
