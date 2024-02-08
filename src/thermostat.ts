import { DateTime } from "luxon";
import { BuildingGeometry } from "./building-geometry";

type ThermostatAction = "heat" | "cool" | "off";

interface Thermostat {
  getAction(options: {
    localTime: DateTime;
    insideAirTempF: number;
  }): ThermostatAction;
}

export class SimpleThermostat implements Thermostat {
  constructor(
    private options: {
      minimumTempF: number;
      maximumTempF: number;
    }
  ) {}

  getAction(options: {
    localTime: DateTime;
    insideAirTempF: number;
  }): ThermostatAction {
    if (options.insideAirTempF < this.options.minimumTempF) {
      return "heat";
    } else if (options.insideAirTempF > this.options.maximumTempF) {
      return "cool";
    } else {
      return "off";
    }
  }
}
