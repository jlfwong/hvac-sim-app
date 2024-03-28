import {
  AirSourceHeatPump,
  PerformanceRating,
  interpolatePerformanceRatings,
  NEEPccASHPRatingInfo,
  panasonicHeatPumpRatings,
} from "./heatpump";

describe("interpolatePerformanceRatings", () => {
  let rating1: PerformanceRating = {
    btusPerHour: 10000,
    coefficientOfPerformance: 4.0,
  };

  let rating2: PerformanceRating = {
    btusPerHour: 20000,
    coefficientOfPerformance: 2.0,
  };

  test("endpoints", () => {
    expect(interpolatePerformanceRatings(10, rating1, 20, rating2, 10)).toEqual(
      rating1
    );
    expect(interpolatePerformanceRatings(10, rating1, 20, rating2, 20)).toEqual(
      rating2
    );
  });

  test("midpoints", () => {
    expect(interpolatePerformanceRatings(10, rating1, 20, rating2, 11)).toEqual(
      {
        btusPerHour: 11000,
        coefficientOfPerformance: 3.8,
      }
    );
    expect(interpolatePerformanceRatings(10, rating1, 20, rating2, 15)).toEqual(
      {
        btusPerHour: 15000,
        coefficientOfPerformance: 3.0,
      }
    );
    expect(interpolatePerformanceRatings(10, rating1, 20, rating2, 19)).toEqual(
      {
        btusPerHour: 19000,
        coefficientOfPerformance: 2.2,
      }
    );
  });
});

describe("AirSourceHeatPump", () => {
  const panasonicHeatPump = new AirSourceHeatPump({
    elevationFeet: 0,
    ratings: panasonicHeatPumpRatings,
  });

  describe("getPerformanceRating", () => {
    describe("cooling", () => {
      describe("exact match deltaT", () => {
        test("max capacity", () => {
          const rating = panasonicHeatPump.getEstimatedPerformanceRating({
            power: { type: "btus", btusPerHourNeeded: -47400 },
            mode: "cooling",
            insideAirTempF: 80,
            outsideAirTempF: 95,
          });
          expect(rating).toEqual({
            btusPerHour: -47400,
            coefficientOfPerformance: 2.42,
          });
        });

        test("min capacity", () => {
          const rating = panasonicHeatPump.getEstimatedPerformanceRating({
            power: { type: "btus", btusPerHourNeeded: -13000 },
            mode: "cooling",
            insideAirTempF: 80,
            outsideAirTempF: 95,
          });
          expect(rating).toEqual({
            btusPerHour: -13000,
            coefficientOfPerformance: 3.7,
          });
        });

        test("middle capacity", () => {
          const rating = panasonicHeatPump.getEstimatedPerformanceRating({
            power: { type: "btus", btusPerHourNeeded: -(47400 + 13000) / 2 },
            mode: "cooling",
            insideAirTempF: 80,
            outsideAirTempF: 95,
          });

          // COP should be average of COPs at min & max capacity
          expect(rating).toEqual({
            btusPerHour: -(47400 + 13000) / 2,
            coefficientOfPerformance: (2.42 + 3.7) / 2,
          });
        });

        test("below min capacity", () => {
          const rating = panasonicHeatPump.getEstimatedPerformanceRating({
            power: { type: "btus", btusPerHourNeeded: -10000 },
            mode: "cooling",
            insideAirTempF: 80,
            outsideAirTempF: 95,
          });

          // Can't run below minimum capacity. Run at that capcaity.
          expect(rating).toEqual({
            btusPerHour: -13000,
            coefficientOfPerformance: 3.7,
          });
        });

        test("above max capacity", () => {
          const rating = panasonicHeatPump.getEstimatedPerformanceRating({
            power: { type: "btus", btusPerHourNeeded: -90000 },
            mode: "cooling",
            insideAirTempF: 80,
            outsideAirTempF: 95,
          });

          // Should return exactly the same rating as max capacity
          expect(rating).toEqual({
            btusPerHour: -47400,
            coefficientOfPerformance: 2.42,
          });
        });
      });

      test("interpolated deltaT", () => {
        const rating = panasonicHeatPump.getEstimatedPerformanceRating({
          power: { type: "btus", btusPerHourNeeded: -90000 },
          mode: "cooling",
          insideAirTempF: 80,
          outsideAirTempF: 90,
        });

        expect(rating.btusPerHour).toBeCloseTo(-44553.85);
        expect(rating.coefficientOfPerformance).toBeCloseTo(2.94);
      });

      test("deltaT under all measured rating values", () => {
        const rating = panasonicHeatPump.getEstimatedPerformanceRating({
          power: { type: "btus", btusPerHourNeeded: -90000 },
          mode: "cooling",
          insideAirTempF: 80,
          outsideAirTempF: 81,
        });

        expect(rating.btusPerHour).toBeCloseTo(-40000);
        expect(rating.coefficientOfPerformance).toBeCloseTo(3.88);
      });

      test("deltaT above all measured rating values", () => {
        const rating = panasonicHeatPump.getEstimatedPerformanceRating({
          power: { type: "btus", btusPerHourNeeded: -90000 },
          mode: "cooling",
          insideAirTempF: 80,
          outsideAirTempF: 100,
        });

        expect(rating.coefficientOfPerformance).toBeCloseTo(1.9);

        // TODO(jlfwong): This seems suspicious -- the idea that maximum cooling
        // capacity stays unchanged as temperature differential rises seems wrong.
        expect(rating.btusPerHour).toBeCloseTo(-47400);
      });

      test("elevation de-rating", () => {
        let deratedHeatPump = new AirSourceHeatPump({
          elevationFeet: 5300,
          ratings: panasonicHeatPumpRatings,
        });

        const rating = deratedHeatPump.getEstimatedPerformanceRating({
          power: { type: "btus", btusPerHourNeeded: -90000 },
          mode: "cooling",
          insideAirTempF: 80,
          outsideAirTempF: 95,
        });

        expect(rating.btusPerHour).toBeCloseTo(-38915, 0);

        // Elevation de-rated, down from 2.42
        expect(rating.coefficientOfPerformance).toBeCloseTo(2.38);
      });
    });

    describe("heating", () => {
      describe("exact match deltaT", () => {
        test("max capacity", () => {
          const rating = panasonicHeatPump.getEstimatedPerformanceRating({
            power: { type: "btus", btusPerHourNeeded: 36876 },
            mode: "heating",
            insideAirTempF: 70,
            outsideAirTempF: 5,
          });

          // Both capacity and COP de-rating for the defrost cycle
          expect(rating.btusPerHour).toBeCloseTo(36007, 0);
          expect(rating.coefficientOfPerformance).toBeCloseTo(1.68, 2);
        });

        test("min capacity", () => {
          const rating = panasonicHeatPump.getEstimatedPerformanceRating({
            power: { type: "btus", btusPerHourNeeded: 12500 },
            mode: "heating",
            insideAirTempF: 70,
            outsideAirTempF: 5,
          });

          // Only COP has been de-rating for the defrost cycle. The capacity was
          // technically de-rated too, but the requested BTUs is below the maximum
          // btusPerHour, so this is no longer running at minimum capacity.
          expect(rating.btusPerHour).toBeCloseTo(12500);
          expect(rating.coefficientOfPerformance).toBeCloseTo(2.6);
        });
      });

      test("freezing cold", () => {
        // TODO(jlfwong): This is the result to match behavior with heat pumps
        // hooray, but this isn't intuitively correct to me.
        const rating = panasonicHeatPump.getEstimatedPerformanceRating({
          power: { type: "btus", btusPerHourNeeded: 40000 },
          mode: "heating",
          insideAirTempF: 70,
          outsideAirTempF: -30,
        });
        expect(rating.btusPerHour).toBeCloseTo(14046, 0);

        // This differs from the heat pumps hooray codebase, which
        // reports a COP of 1.0
        expect(rating.coefficientOfPerformance).toBeCloseTo(0.57, 2);
      });
    });
  });

  describe("getThermalResponse", () => {
    test("max capacity", () => {
      const response = panasonicHeatPump.getHeatingPerformanceInfo({
        insideAirTempF: 70,
        outsideAirTempF: 5,
      });

      // TODO(jlfwong): This is slightly different than the results from heat
      // pumps hooray. Figure out what's going on here.
      expect(response.btusPerHour).toBeCloseTo(36007, 0);
      expect(Object.keys(response.fuelUsage)).toEqual(["electricityKw"]);
      expect(response.fuelUsage.electricityKw).toBeCloseTo(6.3, 1);
    });

    test("cooling", () => {
      const response = panasonicHeatPump.getCoolingPerformanceInfo({
        insideAirTempF: 70,
        outsideAirTempF: 90,
      });

      expect(response.btusPerHour).toBeCloseTo(-47400, 0);
      expect(Object.keys(response.fuelUsage)).toEqual(["electricityKw"]);
      expect(response.fuelUsage.electricityKw).toBeCloseTo(7.3, 1);
    });
  });
});
