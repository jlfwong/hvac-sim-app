import { DateTime } from "luxon";
import ottawaData2023 from "../../static/data/weather/2023-ottawa-era5.json";
import { JSONBackedHourlyWeatherSource } from "./weather";

describe("JSONBackedHourlyWeather", () => {
  const source = new JSONBackedHourlyWeatherSource(ottawaData2023);

  it("returns data for the appropriate time", () => {
    // This is the corresponding entry in the JSON file
    // {
    //   "datetime": "2023-01-02T09:00:00+00:00",
    //   "outsideAirTempF": 32.6,
    //   "relativeHumidityPercent": 95.9,
    //   "windSpeedMph": 2.5,
    //   "cloudCoverPercent": 100.0,
    //   "solarIrradiance": { "altitudeDegrees": -38.1, "wattsPerSquareMeter": 0.0 }
    // }

    let weather = source.getWeather(DateTime.utc(2023, 1, 2, 9, 0, 0, 0));
    expect(weather.outsideAirTempF).toBe(32.6);
    expect(weather.relativeHumidityPercent).toBe(95.9);
    expect(weather.windSpeedMph).toBe(2.5);
    expect(weather.cloudCoverPercent).toBe(100.0);
    expect(weather.solarIrradiance).toEqual({
      altitudeDegrees: -38.1,
      wattsPerSquareMeter: 0.0,
    });

    // {
    //   "datetime": "2023-12-23T15:00:00+00:00",
    //   "outsideAirTempF": 21.1,
    //   "relativeHumidityPercent": 69.2,
    //   "windSpeedMph": 2.0,
    //   "cloudCoverPercent": 100.0,
    //   "solarIrradiance": { "altitudeDegrees": 15.8, "wattsPerSquareMeter": 737.8 }
    // },
    weather = source.getWeather(DateTime.utc(2023, 12, 23, 15, 0, 0, 0));
    expect(weather.outsideAirTempF).toBe(21.1);
    expect(weather.relativeHumidityPercent).toBe(69.2);
    expect(weather.windSpeedMph).toBe(2.0);
    expect(weather.cloudCoverPercent).toBe(100.0);
    expect(weather.solarIrradiance).toEqual({
      altitudeDegrees: 15.8,
      wattsPerSquareMeter: 737.8,
    });
  });

  it("interpolates adjacent hours", () => {
    /*
    {
      "datetime": "2023-01-12T17:00:00+00:00",
      "outsideAirTempF": 25.4,
      "relativeHumidityPercent": 93.3,
      "windSpeedMph": 5.6,
      "cloudCoverPercent": 100.0,
      "solarIrradiance": { "altitudeDegrees": 23.0, "wattsPerSquareMeter": 863.8 }
    },
    {
      "datetime": "2023-01-12T18:00:00+00:00",
      "outsideAirTempF": 26.0,
      "relativeHumidityPercent": 94.5,
      "windSpeedMph": 5.6,
      "cloudCoverPercent": 100.0,
      "solarIrradiance": { "altitudeDegrees": 22.1, "wattsPerSquareMeter": 852.4 }
    },
    */
    let weather = source.getWeather(DateTime.utc(2023, 1, 12, 17, 45, 0, 0));
    expect(weather.outsideAirTempF).toBeCloseTo(25.4 * 0.25 + 26.0 * 0.75);
    expect(weather.relativeHumidityPercent).toBeCloseTo(
      93.3 * 0.25 + 94.5 * 0.75
    );
    expect(weather.windSpeedMph).toBeCloseTo(5.6);
    expect(weather.cloudCoverPercent).toBeCloseTo(100.0);
    expect(weather.solarIrradiance.altitudeDegrees).toBeCloseTo(
      23 * 0.25 + 22.1 * 0.75
    );
    expect(weather.solarIrradiance.wattsPerSquareMeter).toBeCloseTo(
      863.8 * 0.25 + 852.4 * 0.75
    );
  });

  it("throws if there's no relevant data", () => {
    expect(() => {
      source.getWeather(DateTime.utc(1999, 1, 1, 1, 1, 1, 1));
    }).toThrow(/No entry/);
  });
});