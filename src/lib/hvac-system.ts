import { DateTime } from "luxon";
import { HVACAppliance, HVACApplianceResponse } from "./types";
import { HVACSystem } from "./types";

// An HVAC system using a thermostat with...
// - No time dependent settings
// - Treats heating/cooling equipment as single-stage
export class SimpleHVACSystem implements HVACSystem {
  constructor(
    readonly name: string,
    private options: {
      coolingSetPointF: number;
      coolingAppliance: HVACAppliance;

      heatingAppliance: HVACAppliance;
      heatingSetPointF: number;
    }
  ) {}

  private mode: "heat" | "cool" | "off" = "off";

  getThermalResponse(options: {
    localTime: DateTime;
    insideAirTempF: number;
    outsideAirTempF: number;
  }): HVACApplianceResponse {
    // Don't engage equipment unless temperature has drifted by at least this amount
    const minTempDifferentialF = 0.8;

    if (this.mode === "heat") {
      // If we're already heating, keep heating until we hit the target temperature
      if (options.insideAirTempF > this.options.heatingSetPointF) {
        this.mode = "off";
      }
    } else if (this.mode === "cool") {
      // If we're already cooling, keep cooling until we hit the target temperature
      if (options.insideAirTempF < this.options.coolingSetPointF) {
        this.mode = "off";
      }
    } else if (this.mode === "off") {
      if (
        options.insideAirTempF <
        this.options.heatingSetPointF - minTempDifferentialF
      ) {
        this.mode = "heat";
      } else if (
        options.insideAirTempF >
        this.options.coolingSetPointF + minTempDifferentialF
      ) {
        this.mode = "cool";
      }
    }

    if (this.mode === "heat") {
      return this.options.heatingAppliance.getThermalResponse({
        // TODO(jlfwong): Update this once the interface for appliances is updated
        btusPerHourNeeded: 999999,
        insideAirTempF: options.insideAirTempF,
        outsideAirTempF: options.outsideAirTempF,
      });
    } else if (this.mode === "cool") {
      // TODO(jlfwong): Update this once the interface for appliances is updated
      return this.options.coolingAppliance.getThermalResponse({
        btusPerHourNeeded: -999999,
        insideAirTempF: options.insideAirTempF,
        outsideAirTempF: options.outsideAirTempF,
      });
    }

    // Building is comfy -- nothing to do here
    return {
      btusPerHour: 0,
      fuelUsage: {},
    };
  }
}

export class DualFuelTwoStageHVACSystem implements HVACSystem {
  private stage1MaxDurationMs: number;
  private mode: "heat" | "cool" | "off" = "off";
  private heatingModeStartTimestamp: number = 0;

  constructor(
    readonly name: string,
    private options: {
      coolingSetPointF: number;
      coolingAppliance: HVACAppliance;

      heatingAppliance: HVACAppliance;
      heatingSetPointF: number;

      auxHeatingAppliance: HVACAppliance;
      auxSwitchoverTempF: number;

      stage1MaxDurationMinutes: number;
      stage2TemperatureDeltaF: number;
    }
  ) {
    this.stage1MaxDurationMs =
      this.options.stage1MaxDurationMinutes * (60 * 1000);
  }

  getThermalResponse(options: {
    localTime: DateTime;
    insideAirTempF: number;
    outsideAirTempF: number;
  }): HVACApplianceResponse {
    // Don't engage equipment unless temperature has drifted by at least this amount
    const minTempDifferentialF = 0.8;

    if (this.mode === "heat") {
      // If we're already heating, keep heating until we hit the target temperature
      if (options.insideAirTempF > this.options.heatingSetPointF) {
        this.mode = "off";
      }
    } else if (this.mode === "cool") {
      // If we're already cooling, keep cooling until we hit the target temperature
      if (options.insideAirTempF < this.options.coolingSetPointF) {
        this.mode = "off";
      }
    } else if (this.mode === "off") {
      if (
        options.insideAirTempF <
        this.options.heatingSetPointF - minTempDifferentialF
      ) {
        this.mode = "heat";
        this.heatingModeStartTimestamp = options.localTime.toMillis();
      } else if (
        options.insideAirTempF >
        this.options.coolingSetPointF + minTempDifferentialF
      ) {
        this.mode = "cool";
      }
    }

    if (this.mode === "heat") {
      if (options.outsideAirTempF < this.options.auxSwitchoverTempF) {
        return this.options.auxHeatingAppliance.getThermalResponse({
          // TODO(jlfwong): Update this once the interface for appliances is updated
          btusPerHourNeeded: 999999,
          insideAirTempF: options.insideAirTempF,
          outsideAirTempF: options.outsideAirTempF,
        });
      } else {
        // Run at lower capacity
        const fullCapacity = 40000; // TODO(jlfwong): Update once interface for appliances is changed

        // In stage 1, run at lower capacity
        let capacityTarget = fullCapacity * 0.4;

        if (
          options.localTime.toMillis() - this.heatingModeStartTimestamp >
            this.stage1MaxDurationMs ||
          this.options.heatingSetPointF - options.insideAirTempF >
            this.options.stage2TemperatureDeltaF
        ) {
          // Stage 1 has been running for a while without reaching shutoff temperature. It might
          // need help maintainin temperature, or temperature has dropped too much.
          //
          // Run stage 2 (100% capacity)
          capacityTarget = fullCapacity;
        }

        return this.options.heatingAppliance.getThermalResponse({
          // TODO(jlfwong): Update this once the interface for appliances is updated
          btusPerHourNeeded: capacityTarget,
          insideAirTempF: options.insideAirTempF,
          outsideAirTempF: options.outsideAirTempF,
        });
      }
    } else if (this.mode === "cool") {
      // TODO(jlfwong): Update this once the interface for appliances is updated
      return this.options.coolingAppliance.getThermalResponse({
        btusPerHourNeeded: -999999,
        insideAirTempF: options.insideAirTempF,
        outsideAirTempF: options.outsideAirTempF,
      });
    }

    // Building is comfy -- nothing to do here
    return {
      btusPerHour: 0,
      fuelUsage: {},
    };
  }
}
