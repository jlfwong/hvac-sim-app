import { WeatherSnapshot } from "./types";
import {
  ConductionConvectionLoadSource,
  InfiltrationLoadSource,
  OccupantsLoadSource,
  SolarGainLoadSource,
} from "./thermal-loads";
import { BuildingGeometry } from "./building-geometry";
import { DateTime } from "luxon";

const indoorAirTempF = 68;

const env: WeatherSnapshot = {
  outsideAirTempF: 70, // Average comfortable outdoor temperature
  relativeHumidityPercent: 50, // Comfortable humidity level
  windSpeedMph: 5, // Light breeze
  cloudCoverPercent: 20, // Mostly clear skies
  solarIrradiance: {
    altitudeDegrees: 45, // Midday sun angle in moderate latitudes
    wattsPerSquareMeter: 200, // Typical irradiance on a partly cloudy day
  },
};

const geometry = new BuildingGeometry({
  floorSpaceSqFt: 3000,
  ceilingHeightFt: 9,
  numAboveGroundStories: 2,
  lengthToWidthRatio: 3,
  hasConditionedBasement: false,
});

describe("OccupantsLoad", () => {
  test("varies with number of occupants", () => {
    const date = DateTime.fromISO("2024-01-24T20:00:00");
    let load = new OccupantsLoadSource(1).getBtusPerHour(
      date,
      indoorAirTempF,
      env
    );
    expect(load).toEqual(430);

    load = new OccupantsLoadSource(2).getBtusPerHour(date, indoorAirTempF, env);
    expect(load).toEqual(2 * 430);
  });

  test("ignores occupants that are out of the house", () => {
    const date = DateTime.fromISO("2024-01-24T12:00:00");
    let load = new OccupantsLoadSource(1).getBtusPerHour(
      date,
      indoorAirTempF,
      env
    );
    expect(load).toEqual(0);
  });

  test("discounts occupants that are sleeping", () => {
    const dateAwake = DateTime.fromISO("2024-01-24T20:00:00");
    let load = new OccupantsLoadSource(1).getBtusPerHour(
      dateAwake,
      indoorAirTempF,
      env
    );
    expect(load).toEqual(430);

    const dateAsleep = DateTime.fromISO("2024-01-24T23:00:00");
    load = new OccupantsLoadSource(1).getBtusPerHour(
      dateAsleep,
      indoorAirTempF,
      env
    );
    expect(load).toBeCloseTo(365.5);
  });
});

describe("ConductionConvectionLoadSource", () => {
  test("heat transfer scales with temperature difference", () => {
    const date = DateTime.fromISO("2024-01-24T20:00:00");
    const envelopeMultiplier = 0.65;

    let load = new ConductionConvectionLoadSource({
      geometry,
      envelopeModifier: envelopeMultiplier,
    }).getBtusPerHour(date, 70, {
      ...env,
      outsideAirTempF: -22,
    });
    expect(load).toBeCloseTo(-58046, 0);

    load = new ConductionConvectionLoadSource({
      geometry,
      envelopeModifier: envelopeMultiplier,
    }).getBtusPerHour(date, 70, {
      ...env,
      outsideAirTempF: 31,
    });
    expect(load).toBeCloseTo(-24606, 0);

    load = new ConductionConvectionLoadSource({
      geometry,
      envelopeModifier: envelopeMultiplier,
    }).getBtusPerHour(date, 70, {
      ...env,
      outsideAirTempF: 60,
    });
    expect(load).toBeCloseTo(-6309, 0);

    load = new ConductionConvectionLoadSource({
      geometry,
      envelopeModifier: envelopeMultiplier,
    }).getBtusPerHour(date, 70, {
      ...env,
      outsideAirTempF: 70,
    });
    expect(load).toBe(0);

    load = new ConductionConvectionLoadSource({
      geometry,
      envelopeModifier: envelopeMultiplier,
    }).getBtusPerHour(date, 70, {
      ...env,
      outsideAirTempF: 90,
    });
    expect(load).toBeCloseTo(11990, 0);
  });
});

describe("InfiltrationLoadSource", () => {
  test("heat transfer scales with temperature difference", () => {
    const date = DateTime.fromISO("2024-01-24T20:00:00");
    const envelopeModifier = 0.65;

    let load = new InfiltrationLoadSource({
      geometry,
      envelopeModifier,
    }).getBtusPerHour(date, 70, {
      ...env,
      outsideAirTempF: 31,
    });
    expect(load).toBeCloseTo(-4137, 0);

    load = new InfiltrationLoadSource({
      geometry,
      envelopeModifier,
    }).getBtusPerHour(date, 70, {
      ...env,
      outsideAirTempF: 50,
    });
    expect(load).toBeCloseTo(-2122, 0);

    load = new InfiltrationLoadSource({
      geometry,
      envelopeModifier,
    }).getBtusPerHour(date, 70, {
      ...env,
      outsideAirTempF: 80,
    });
    expect(load).toBeCloseTo(1023, 0);

    load = new InfiltrationLoadSource({
      geometry,
      envelopeModifier,
    }).getBtusPerHour(date, 70, {
      ...env,
      outsideAirTempF: 90,
    });
    expect(load).toBeCloseTo(2046, 0);
  });
});

describe("SolarGainLoadSource", () => {
  test("heat transfer scales with irradiance", () => {
    const date = DateTime.fromISO("2024-01-24T20:00:00");
    const solarModifier = 1.0;

    let load = new SolarGainLoadSource({
      geometry,
      solarModifier,
    }).getBtusPerHour(date, indoorAirTempF, {
      ...env,
      solarIrradiance: {
        altitudeDegrees: 45,
        wattsPerSquareMeter: 200 * Math.sqrt(2),
      },
    });
    expect(load).toBeCloseTo(1317, 0);

    load = new SolarGainLoadSource({
      geometry,
      solarModifier,
    }).getBtusPerHour(date, indoorAirTempF, {
      ...env,
      solarIrradiance: {
        altitudeDegrees: 90,
        wattsPerSquareMeter: 200,
      },
    });
    expect(load).toBeCloseTo(652, 0);

    load = new SolarGainLoadSource({
      geometry,
      solarModifier,
    }).getBtusPerHour(date, indoorAirTempF, {
      ...env,
      solarIrradiance: {
        altitudeDegrees: 0.001,
        wattsPerSquareMeter: 200,
      },
    });
    expect(load).toBeCloseTo(666, 0);
  });
});
