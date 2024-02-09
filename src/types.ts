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

export interface HVACAppliance {
  getThermalResponse(options: {
    btusPerHourNeeded: number;
    insideAirTempF: number;
    outsideAirTempF: number;
  }): HVACApplianceResponse;
}
