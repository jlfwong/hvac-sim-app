export interface EnvironmentalConditions {
  outsideAirTempF: number;
  insideAirTempF: number;
  relativeHumidityPercent: number;
  windSpeedMph: number;
  cloudCoverPercent: number;
  solarIrradiance: {
    altitudeDegrees: number;
    wattsPerSquareMeter: number;
  };
}

export type ThermalLoad = { type: "heating" | "cooling"; btusPerHour: number };
