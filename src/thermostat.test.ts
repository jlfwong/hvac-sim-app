import { DateTime } from "luxon";
import { SimpleThermostat } from "./thermostat";

describe("SimpleThermostat", () => {
  test("basic operation", () => {
    const thermostat = new SimpleThermostat({
      minimumTempF: 70,
      maximumTempF: 80,
    });

    const localTime = DateTime.local(2024, 1, 1, 1, 1, 1, 1);

    expect(
      thermostat.getAction({
        localTime,
        insideAirTempF: 85,
      })
    ).toEqual("cool");

    expect(
      thermostat.getAction({
        localTime,
        insideAirTempF: 80,
      })
    ).toEqual("off");

    expect(
      thermostat.getAction({
        localTime,
        insideAirTempF: 70,
      })
    ).toEqual("off");

    expect(
      thermostat.getAction({
        localTime,
        insideAirTempF: 60,
      })
    ).toEqual("heat");
  });
});
