import { GasFurnace } from "./gas-furnace";

describe("GasFurnace", () => {
  describe("getThermalResponse", () => {
    test("afue 96", () => {
      const furnace = new GasFurnace({
        afuePercent: 96,
        capacityBtusPerHour: 80000,
        elevationFeet: 0,
      });

      const response = furnace.getHeatingPerformanceInfo({
        insideAirTempF: 70,
        outsideAirTempF: 5,
      });

      expect(response.btusPerHour).toBeCloseTo(80000, 0);
      expect(Object.keys(response.fuelUsage)).toEqual(["naturalGasCcfPerHour"]);
      expect(response.fuelUsage.naturalGasCcfPerHour).toBeCloseTo(0.8, 2);
    });

    test("afue 80", () => {
      const furnace = new GasFurnace({
        afuePercent: 80,
        capacityBtusPerHour: 80000,
        elevationFeet: 0,
      });

      const response = furnace.getHeatingPerformanceInfo({
        insideAirTempF: 70,
        outsideAirTempF: 5,
      });

      expect(response.btusPerHour).toBeCloseTo(80000, 0);
      expect(Object.keys(response.fuelUsage)).toEqual(["naturalGasCcfPerHour"]);
      expect(response.fuelUsage.naturalGasCcfPerHour).toBeCloseTo(0.96, 2);
    });

    test("over max capacity", () => {
      const furnace = new GasFurnace({
        afuePercent: 80,
        capacityBtusPerHour: 80000,
        elevationFeet: 0,
      });

      const response = furnace.getHeatingPerformanceInfo({
        insideAirTempF: 70,
        outsideAirTempF: 5,
      });

      expect(response.btusPerHour).toBeCloseTo(80000, 0);
      expect(Object.keys(response.fuelUsage)).toEqual(["naturalGasCcfPerHour"]);
      expect(response.fuelUsage.naturalGasCcfPerHour).toBeCloseTo(0.96, 2);
    });

    test("over max capacity, high elevation", () => {
      const furnace = new GasFurnace({
        afuePercent: 80,
        capacityBtusPerHour: 80000,
        elevationFeet: 5000,
      });

      const response = furnace.getHeatingPerformanceInfo({
        insideAirTempF: 70,
        outsideAirTempF: 5,
      });

      expect(response.btusPerHour).toBeCloseTo(80000 * (1 - 5 * 0.04), 0);
      expect(Object.keys(response.fuelUsage)).toEqual(["naturalGasCcfPerHour"]);
      expect(response.fuelUsage.naturalGasCcfPerHour).toBeCloseTo(0.77, 2);
    });
  });
});
