import { DateTime } from "luxon";
import {
  CoolingAppliance,
  HeatingAppliance,
  HVACApplianceResponse,
} from "./types";
import { HVACSystem } from "./types";
import { AirSourceHeatPump } from "./heatpump";

// An HVAC system using a thermostat with...
// - No time dependent settings
// - Treats heating/cooling equipment as single-stage
export class SimpleHVACSystem implements HVACSystem {
  constructor(
    readonly name: string,
    private options: {
      coolingSetPointF: number;
      coolingAppliance: CoolingAppliance;

      heatingSetPointF: number;
      heatingAppliance: HeatingAppliance;
    }
  ) {}

  private mode: "heating" | "cooling" | "off" = "off";

  getThermalResponse(options: {
    localTime: DateTime;
    insideAirTempF: number;
    outsideAirTempF: number;
  }): HVACApplianceResponse {
    // Don't engage equipment unless temperature has drifted by at least this amount
    const minTempDifferentialF = 0.8;

    if (this.mode === "heating") {
      // If we're already heating, keep heating until we hit the target temperature
      if (options.insideAirTempF > this.options.heatingSetPointF) {
        this.mode = "off";
      }
    } else if (this.mode === "cooling") {
      // If we're already cooling, keep cooling until we hit the target temperature
      if (options.insideAirTempF < this.options.coolingSetPointF) {
        this.mode = "off";
      }
    } else if (this.mode === "off") {
      if (
        options.insideAirTempF <
        this.options.heatingSetPointF - minTempDifferentialF
      ) {
        this.mode = "heating";
      } else if (
        options.insideAirTempF >
        this.options.coolingSetPointF + minTempDifferentialF
      ) {
        this.mode = "cooling";
      }
    }

    if (this.mode === "heating") {
      return this.options.heatingAppliance.getHeatingPerformanceInfo({
        insideAirTempF: options.insideAirTempF,
        outsideAirTempF: options.outsideAirTempF,
      });
    } else if (this.mode === "cooling") {
      return this.options.coolingAppliance.getCoolingPerformanceInfo({
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

export class TwoStageHeatPumpWithAuxHeating implements HVACSystem {
  private stage1MaxDurationMs: number;
  private mode: "heating" | "cooling" | "off" = "off";
  private heatingModeStartTimestamp: number = 0;

  constructor(
    readonly name: string,
    private options: {
      coolingAppliance: AirSourceHeatPump;
      coolingSetPointF: number;

      heatingAppliance: AirSourceHeatPump;
      heatingSetPointF: number;

      auxHeatingAppliance: HeatingAppliance;
      shouldEngageAuxHeating: (options: {
        localTime: DateTime;
        insideAirTempF: number;
        outsideAirTempF: number;
      }) => boolean;

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

    if (this.mode === "heating") {
      // If we're already heating, keep heating until we hit the target temperature
      if (options.insideAirTempF > this.options.heatingSetPointF) {
        this.mode = "off";
      }
    } else if (this.mode === "cooling") {
      // If we're already cooling, keep cooling until we hit the target temperature
      if (options.insideAirTempF < this.options.coolingSetPointF) {
        this.mode = "off";
      }
    } else if (this.mode === "off") {
      if (
        options.insideAirTempF <
        this.options.heatingSetPointF - minTempDifferentialF
      ) {
        this.mode = "heating";
        this.heatingModeStartTimestamp = options.localTime.toMillis();
      } else if (
        options.insideAirTempF >
        this.options.coolingSetPointF + minTempDifferentialF
      ) {
        this.mode = "cooling";
      }
    }

    if (this.mode === "heating") {
      if (this.options.shouldEngageAuxHeating(options)) {
        return this.options.auxHeatingAppliance.getHeatingPerformanceInfo({
          insideAirTempF: options.insideAirTempF,
          outsideAirTempF: options.outsideAirTempF,
        });
      } else {
        // In stage 1, run at lower capacity
        let percentPower = 70;

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
          percentPower = 100;
        }

        return this.options.heatingAppliance.getHeatingPerformanceInfo({
          insideAirTempF: options.insideAirTempF,
          outsideAirTempF: options.outsideAirTempF,
          percentPower,
        });
      }
    } else if (this.mode === "cooling") {
      return this.options.coolingAppliance.getCoolingPerformanceInfo({
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