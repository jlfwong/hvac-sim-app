import { EnvironmentalConditions } from "./types";
import {
  ConductionConvectionLoadSource,
  HomeGeometry,
  InfiltrationLoadSource,
  OccupantsLoadSource,
  SolarGainLoadSource,
} from "./thermal-loads";

const env: EnvironmentalConditions = {
  outsideAirTempF: 70, // Average comfortable outdoor temperature
  insideAirTempF: 68, // Common indoor temperature setting
  relativeHumidityPercent: 50, // Comfortable humidity level
  windSpeedMph: 5, // Light breeze
  cloudCoverPercent: 20, // Mostly clear skies
  solarIrradiance: {
    altitudeDegrees: 45, // Midday sun angle in moderate latitudes
    wattsPerSquareMeter: 200, // Typical irradiance on a partly cloudy day
  },
};

const geometry = new HomeGeometry({
  floorSpaceSqFt: 3000,
  ceilingHeightFt: 9,
  numStories: 2,
  lengthToWidthRatio: 3,
});

describe("OccupantsLoad", () => {
  test("varies with number of occupants", () => {
    const date = new Date("2024-01-24T20:00:00");
    let load = new OccupantsLoadSource(1).getThermalLoad(date, env);
    expect(load.type).toEqual("heating");
    expect(load.btuPerHour).toEqual(430);

    load = new OccupantsLoadSource(2).getThermalLoad(date, env);
    expect(load.type).toEqual("heating");
    expect(load.btuPerHour).toEqual(2 * 430);
  });

  test("ignores occupants that are out of the house", () => {
    const date = new Date("2024-01-24T12:00:00");
    let load = new OccupantsLoadSource(1).getThermalLoad(date, env);
    expect(load.btuPerHour).toEqual(0);
  });

  test("discounts occupants that are sleeping", () => {
    const dateAwake = new Date("2024-01-24T20:00:00");
    let load = new OccupantsLoadSource(1).getThermalLoad(dateAwake, env);
    expect(load.btuPerHour).toEqual(430);

    const dateAsleep = new Date("2024-01-24T23:00:00");
    load = new OccupantsLoadSource(1).getThermalLoad(dateAsleep, env);
    expect(load.btuPerHour).toBeCloseTo(365.5);
  });
});

describe("ConductionConvectionLoadSource", () => {
  test("heat transfer scales with temperature difference", () => {
    const date = new Date("2024-01-24T20:00:00");
    const envelopeModifier = 0.65;

    let load = new ConductionConvectionLoadSource(
      geometry,
      envelopeModifier
    ).getThermalLoad(date, {
      ...env,
      outsideAirTempF: -22,
      insideAirTempF: 70,
    });
    expect(load.type).toBe("cooling");
    expect(load.btuPerHour).toBeCloseTo(58046, 0);

    load = new ConductionConvectionLoadSource(
      geometry,
      envelopeModifier
    ).getThermalLoad(date, {
      ...env,
      outsideAirTempF: 31,
      insideAirTempF: 70,
    });
    expect(load.type).toBe("cooling");
    expect(load.btuPerHour).toBeCloseTo(24606, 0);

    load = new ConductionConvectionLoadSource(
      geometry,
      envelopeModifier
    ).getThermalLoad(date, {
      ...env,
      outsideAirTempF: 60,
      insideAirTempF: 70,
    });
    expect(load.type).toBe("cooling");
    expect(load.btuPerHour).toBeCloseTo(6309, 0);

    load = new ConductionConvectionLoadSource(
      geometry,
      envelopeModifier
    ).getThermalLoad(date, {
      ...env,
      outsideAirTempF: 70,
      insideAirTempF: 70,
    });
    expect(load.type).toBe("cooling");
    expect(load.btuPerHour).toBe(0);

    load = new ConductionConvectionLoadSource(
      geometry,
      envelopeModifier
    ).getThermalLoad(date, {
      ...env,
      outsideAirTempF: 90,
      insideAirTempF: 70,
    });
    expect(load.type).toBe("heating");
    expect(load.btuPerHour).toBeCloseTo(11990, 0);
  });
});

describe("InfiltrationLoadSource", () => {
  test("heat transfer scales with temperature difference", () => {
    const date = new Date("2024-01-24T20:00:00");
    const envelopeModifier = 0.65;

    let load = new InfiltrationLoadSource(
      geometry,
      envelopeModifier
    ).getThermalLoad(date, {
      ...env,
      outsideAirTempF: 31,
      insideAirTempF: 70,
    });
    expect(load.type).toBe("cooling");
    expect(load.btuPerHour).toBeCloseTo(4137, 0);

    load = new InfiltrationLoadSource(
      geometry,
      envelopeModifier
    ).getThermalLoad(date, {
      ...env,
      outsideAirTempF: 50,
      insideAirTempF: 70,
    });
    expect(load.type).toBe("cooling");
    expect(load.btuPerHour).toBeCloseTo(2122, 0);

    load = new InfiltrationLoadSource(
      geometry,
      envelopeModifier
    ).getThermalLoad(date, {
      ...env,
      outsideAirTempF: 80,
      insideAirTempF: 70,
    });
    expect(load.type).toBe("heating");
    expect(load.btuPerHour).toBeCloseTo(1023, 0);

    load = new InfiltrationLoadSource(
      geometry,
      envelopeModifier
    ).getThermalLoad(date, {
      ...env,
      outsideAirTempF: 90,
      insideAirTempF: 70,
    });
    expect(load.type).toBe("heating");
    expect(load.btuPerHour).toBeCloseTo(2046, 0);
  });
});

describe("SolarGainLoadSource", () => {
  test("heat transfer scales with irradiance", () => {
    const date = new Date("2024-01-24T20:00:00");
    const solarMultiplier = 1.0;

    let load = new SolarGainLoadSource(
      geometry,
      solarMultiplier
    ).getThermalLoad(date, {
      ...env,
      solarIrradiance: {
        altitudeDegrees: 45,
        wattsPerSquareMeter: 200 * Math.sqrt(2),
      },
    });
    expect(load.type).toBe("heating");
    expect(load.btuPerHour).toBeCloseTo(1317, 0);

    load = new SolarGainLoadSource(geometry, solarMultiplier).getThermalLoad(
      date,
      {
        ...env,
        solarIrradiance: {
          altitudeDegrees: 90,
          wattsPerSquareMeter: 200,
        },
      }
    );
    expect(load.type).toBe("heating");
    expect(load.btuPerHour).toBeCloseTo(652, 0);

    load = new SolarGainLoadSource(geometry, solarMultiplier).getThermalLoad(
      date,
      {
        ...env,
        solarIrradiance: {
          altitudeDegrees: 0.001,
          wattsPerSquareMeter: 200,
        },
      }
    );
    expect(load.type).toBe("heating");

    expect(load.btuPerHour).toBeCloseTo(666, 0);
  });
});
