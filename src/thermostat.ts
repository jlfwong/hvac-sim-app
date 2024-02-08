import { DateTime } from "luxon";

export interface Thermostat {
  getTargetInsideAirTempF(options: {
    localTime: DateTime;
    insideAirTempF: number;
  }): number;
}

export class SimpleThermostat implements Thermostat {
  constructor(
    private options: {
      minimumTempF: number;
      maximumTempF: number;
    }
  ) {}

  getTargetInsideAirTempF(options: {
    localTime: DateTime;
    insideAirTempF: number;
  }): number {
    if (options.insideAirTempF < this.options.minimumTempF) {
      // Too cold!
      return this.options.minimumTempF;
    } else if (options.insideAirTempF > this.options.maximumTempF) {
      // Too hot!
      return this.options.maximumTempF;
    } else {
      // We're good! Don't change a thing
      return options.insideAirTempF;
    }
  }
}
