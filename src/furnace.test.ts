import { GasFurnace } from "./furnace";

describe("GasFurnace", () => {
  const furnace = new GasFurnace({
    afuePercent: 96,
    capacityBtusPerHour: 80000,
  });

  describe("getThermalResponse", () => {
    test("max capacity", () => {
      const response = furnace.getThermalResponse({
        btusPerHourNeeded: 40000,
        insideAirTempF: 70,
        outsideAirTempF: 5,
      });

      expect(response.btusPerHour).toBeCloseTo(40000, 0);
      expect(Object.keys(response.fuelUsage)).toEqual(["naturalGasCcfPerHour"]);
      expect(response.fuelUsage.naturalGasCcfPerHour).toBeCloseTo(0.4, 2);
    });
  });
});
