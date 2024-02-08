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
      thermostat.getTargetInsideAirTempF({
        localTime,
        insideAirTempF: 85,
      })
    ).toEqual(80);

    expect(
      thermostat.getTargetInsideAirTempF({
        localTime,
        insideAirTempF: 80,
      })
    ).toEqual(80);

    expect(
      thermostat.getTargetInsideAirTempF({
        localTime,
        insideAirTempF: 70,
      })
    ).toEqual(70);

    expect(
      thermostat.getTargetInsideAirTempF({
        localTime,
        insideAirTempF: 60,
      })
    ).toEqual(70);
  });
});
