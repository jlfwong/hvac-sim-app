import { DateTime } from "luxon";

export interface WeatherSnapshot {
  outsideAirTempF: number;
  relativeHumidityPercent: number;
  windSpeedMph: number;
  cloudCoverPercent: number;
  solarIrradiance: {
    altitudeDegrees: number;
    wattsPerSquareMeter: number;
  };
}

export interface FuelUsageRate {
  electricityKw?: number;
  naturalGasCcfPerHour?: number;
  fuelOilGallonsPerHour?: number;
}

export interface HVACApplianceResponse {
  btusPerHour: number;
  fuelUsage: FuelUsageRate;
}

export interface HeatingAppliance {
  name: string;

  getHeatingPerformanceInfo(options: {
    insideAirTempF: number;
    outsideAirTempF: number;
  }): HVACApplianceResponse;
}

export interface CoolingAppliance {
  name: string;

  getCoolingPerformanceInfo(options: {
    insideAirTempF: number;
    outsideAirTempF: number;
  }): HVACApplianceResponse;
}

export interface HVACSystem {
  readonly name: string;

  getThermalResponse(options: {
    localTime: DateTime;
    insideAirTempF: number;
    outsideAirTempF: number;
  }): HVACApplianceResponse;
}
