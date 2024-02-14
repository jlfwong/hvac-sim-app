import { DateTime } from "luxon";
import { SimpleThermostat } from "./thermostat";

describe("SimpleThermostat", () => {
  test("basic operation", () => {
    const thermostat = new SimpleThermostat({
      heatingSetPointF: 70,
      coolingSetPointF: 80,
    });

    const localTime = DateTime.local(2024, 1, 1, 1, 1, 1, 1);

    expect(
      thermostat.getCommand({
        localTime,
        insideAirTempF: 85,
      })
    ).toEqual("cool");

    expect(
      thermostat.getCommand({
        localTime,
        insideAirTempF: 80,
      })
    ).toEqual("off");

    expect(
      thermostat.getCommand({
        localTime,
        insideAirTempF: 70,
      })
    ).toEqual("off");

    expect(
      thermostat.getCommand({
        localTime,
        insideAirTempF: 60,
      })
    ).toEqual("heat");
  });
});
