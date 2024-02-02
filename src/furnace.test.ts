import { GasFurnace } from "./furnace";

describe("GasFurnace", () => {
  describe("getThermalResponse", () => {
    test("afue 96", () => {
      const furnace = new GasFurnace({
        afuePercent: 96,
        capacityBtusPerHour: 80000,
      });

      const response = furnace.getThermalResponse({
        btusPerHourNeeded: 40000,
        insideAirTempF: 70,
        outsideAirTempF: 5,
      });

      expect(response.btusPerHour).toBeCloseTo(40000, 0);
      expect(Object.keys(response.fuelUsage)).toEqual(["naturalGasCcfPerHour"]);
      expect(response.fuelUsage.naturalGasCcfPerHour).toBeCloseTo(0.4, 2);
    });

    test("afue 80", () => {
      const furnace = new GasFurnace({
        afuePercent: 80,
        capacityBtusPerHour: 80000,
      });

      const response = furnace.getThermalResponse({
        btusPerHourNeeded: 40000,
        insideAirTempF: 70,
        outsideAirTempF: 5,
      });

      expect(response.btusPerHour).toBeCloseTo(40000, 0);
      expect(Object.keys(response.fuelUsage)).toEqual(["naturalGasCcfPerHour"]);
      expect(response.fuelUsage.naturalGasCcfPerHour).toBeCloseTo(0.48, 2);
    });

    test("over max capacity", () => {
      const furnace = new GasFurnace({
        afuePercent: 80,
        capacityBtusPerHour: 80000,
      });

      const response = furnace.getThermalResponse({
        btusPerHourNeeded: 100000,
        insideAirTempF: 70,
        outsideAirTempF: 5,
      });

      expect(response.btusPerHour).toBeCloseTo(80000, 0);
      expect(Object.keys(response.fuelUsage)).toEqual(["naturalGasCcfPerHour"]);
      expect(response.fuelUsage.naturalGasCcfPerHour).toBeCloseTo(0.96, 2);
    });
  });
});
