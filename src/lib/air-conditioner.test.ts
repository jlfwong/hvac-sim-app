import { AirConditioner } from "./air-conditioner";

describe("AirConditioner", () => {
  describe("getEstimatedPerformanceRating", () => {
    test("cop falls with temperature differential", () => {
      const ac = new AirConditioner({
        seer: 11,
        capacityBtusPerHour: 40000,
        elevationFeet: 0,
        speedSettings: "single-speed",
      });

      const rating82 = ac.getEstimatedPerformanceRating({
        insideAirTempF: 80,
        outsideAirTempF: 82,
      });

      const rating95 = ac.getEstimatedPerformanceRating({
        insideAirTempF: 80,
        outsideAirTempF: 95,
      });

      expect(rating82.btusPerHour).toEqual(-40000);
      expect(rating95.btusPerHour).toEqual(-40000);

      expect(rating82.coefficientOfPerformance).toBeCloseTo(3.78, 2);
      expect(rating95.coefficientOfPerformance).toBeCloseTo(2.81, 2);
    });

    test("cop rises with seer", () => {
      const ratingSeer11 = new AirConditioner({
        seer: 11,
        capacityBtusPerHour: 40000,
        elevationFeet: 0,
        speedSettings: "single-speed",
      }).getEstimatedPerformanceRating({
        insideAirTempF: 80,
        outsideAirTempF: 95,
      });

      const ratingSeer17 = new AirConditioner({
        seer: 17,
        capacityBtusPerHour: 40000,
        elevationFeet: 0,
        speedSettings: "single-speed",
      }).getEstimatedPerformanceRating({
        insideAirTempF: 80,
        outsideAirTempF: 95,
      });

      expect(ratingSeer11.btusPerHour).toEqual(-40000);
      expect(ratingSeer17.btusPerHour).toEqual(-40000);

      expect(ratingSeer11.coefficientOfPerformance).toBeCloseTo(2.81, 2);
      expect(ratingSeer17.coefficientOfPerformance).toBeCloseTo(4.57, 2);
    });

    test("cop and capacity fall with elevation", () => {
      const rating2000 = new AirConditioner({
        seer: 11,
        capacityBtusPerHour: 40000,
        elevationFeet: 2000,
        speedSettings: "variable-speed",
      }).getEstimatedPerformanceRating({
        insideAirTempF: 80,
        outsideAirTempF: 95,
      });

      const rating3000 = new AirConditioner({
        seer: 11,
        capacityBtusPerHour: 40000,
        elevationFeet: 3000,
        speedSettings: "variable-speed",
      }).getEstimatedPerformanceRating({
        insideAirTempF: 80,
        outsideAirTempF: 95,
      });

      expect(rating2000.btusPerHour).toBeCloseTo(-37200);
      expect(rating3000.btusPerHour).toBeCloseTo(-36000);

      expect(rating2000.coefficientOfPerformance).toBeCloseTo(2.79, 2);
      expect(rating3000.coefficientOfPerformance).toBeCloseTo(2.78, 2);
    });

    test("variable-speed is de-rated less than single-speed for elevation", () => {
      const variableSpeedDerated = new AirConditioner({
        seer: 11,
        capacityBtusPerHour: 40000,
        elevationFeet: 3000,
        speedSettings: "variable-speed",
      }).getEstimatedPerformanceRating({
        insideAirTempF: 80,
        outsideAirTempF: 95,
      });

      const dualSpeedDerated = new AirConditioner({
        seer: 11,
        capacityBtusPerHour: 40000,
        elevationFeet: 3000,
        speedSettings: "dual-speed",
      }).getEstimatedPerformanceRating({
        insideAirTempF: 80,
        outsideAirTempF: 95,
      });

      const singleSpeedDerated = new AirConditioner({
        seer: 11,
        capacityBtusPerHour: 40000,
        elevationFeet: 3000,
        speedSettings: "single-speed",
      }).getEstimatedPerformanceRating({
        insideAirTempF: 80,
        outsideAirTempF: 95,
      });

      // Capacity is derated the same amount for each
      expect(variableSpeedDerated.btusPerHour).toBeCloseTo(-36000);
      expect(dualSpeedDerated.btusPerHour).toBeCloseTo(-36000);
      expect(singleSpeedDerated.btusPerHour).toBeCloseTo(-36000);

      // COP-derating is more aggressive for single speed than variable
      expect(variableSpeedDerated.coefficientOfPerformance).toBeCloseTo(
        2.78,
        2
      );
      expect(dualSpeedDerated.coefficientOfPerformance).toBeCloseTo(2.74, 2);
      expect(singleSpeedDerated.coefficientOfPerformance).toBeCloseTo(2.67, 2);
    });
  });
});
