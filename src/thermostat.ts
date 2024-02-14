import { DateTime } from "luxon";

// Real thermostats also control whether the fan is on or not, but we'll ignore
// tha for now.
type ThermostatCommand = "heat" | "cool" | "off";

export interface Thermostat {
  getHeatingSetPointTempF(localTime: DateTime): number;
  getCoolingSetPointTempF(localTime: DateTime): number;

  getCommand(options: {
    localTime: DateTime;
    insideAirTempF: number;
  }): ThermostatCommand;
}

export class SimpleThermostat implements Thermostat {
  constructor(
    private options: {
      heatingSetPointF: number;
      coolingSetPointF: number;
    }
  ) {}

  getHeatingSetPointTempF(localTime: DateTime<boolean>): number {
    return this.options.heatingSetPointF;
  }

  getCoolingSetPointTempF(localTime: DateTime<boolean>): number {
    return this.options.coolingSetPointF;
  }

  getCommand(options: {
    localTime: DateTime;
    insideAirTempF: number;
  }): ThermostatCommand {
    if (options.insideAirTempF < this.options.heatingSetPointF) {
      // Too cold!
      return "heat";
    } else if (options.insideAirTempF > this.options.coolingSetPointF) {
      // Too hot!
      return "cool";
    } else {
      // We're good! Don't change a thing
      return "off";
    }
  }
}
