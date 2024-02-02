import {
  AirSourceHeatPump,
  PerformanceRating,
  interpolatePerformanceRatings,
  NEEPccASHPRatingInfo,
} from "./heatpump";

describe("interpolatePerformanceRatings", () => {
  let rating1: PerformanceRating = {
    btuPerHour: 10000,
    coefficientOfPerformance: 4.0,
  };

  let rating2: PerformanceRating = {
    btuPerHour: 20000,
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
        btuPerHour: 11000,
        coefficientOfPerformance: 3.8,
      }
    );
    expect(interpolatePerformanceRatings(10, rating1, 20, rating2, 15)).toEqual(
      {
        btuPerHour: 15000,
        coefficientOfPerformance: 3.0,
      }
    );
    expect(interpolatePerformanceRatings(10, rating1, 20, rating2, 19)).toEqual(
      {
        btuPerHour: 19000,
        coefficientOfPerformance: 2.2,
      }
    );
  });
});

const panasonicRatings: NEEPccASHPRatingInfo[] = [
  {
    mode: "cooling",
    outdoorDryBulbFahrenheit: 95,
    indoorDryBulbFahrenheit: 80,
    minCapacity: {
      btuPerHour: 13000,
      coefficientOfPerformance: 3.7,
    },
    maxCapacity: {
      btuPerHour: 47400,
      coefficientOfPerformance: 2.42,
    },
  },
  {
    mode: "cooling",
    outdoorDryBulbFahrenheit: 82,
    indoorDryBulbFahrenheit: 80,
    minCapacity: {
      btuPerHour: 12000,
      coefficientOfPerformance: 5.58,
    },
    maxCapacity: {
      btuPerHour: 40000,
      coefficientOfPerformance: 3.78,
    },
  },
  {
    mode: "heating",
    outdoorDryBulbFahrenheit: 47,
    indoorDryBulbFahrenheit: 70,
    minCapacity: {
      btuPerHour: 11000,
      coefficientOfPerformance: 4.67,
    },
    maxCapacity: {
      btuPerHour: 57200,
      coefficientOfPerformance: 2.94,
    },
  },
  {
    mode: "heating",
    outdoorDryBulbFahrenheit: 17,
    indoorDryBulbFahrenheit: 70,
    minCapacity: {
      btuPerHour: 15000,
      coefficientOfPerformance: 3.57,
    },
    maxCapacity: {
      btuPerHour: 47000,
      coefficientOfPerformance: 1.9,
    },
  },
  {
    mode: "heating",
    outdoorDryBulbFahrenheit: 5,
    indoorDryBulbFahrenheit: 70,
    minCapacity: {
      btuPerHour: 12500,
      coefficientOfPerformance: 3.05,
    },
    maxCapacity: {
      btuPerHour: 36876,
      coefficientOfPerformance: 1.96,
    },
  },
  {
    mode: "heating",
    outdoorDryBulbFahrenheit: -22,
    indoorDryBulbFahrenheit: 70,
    minCapacity: {
      btuPerHour: 12300,
      coefficientOfPerformance: 3.05,
    },
    maxCapacity: {
      btuPerHour: 21500,
      coefficientOfPerformance: 1.26,
    },
  },
];

describe("AirSourceHeatPump", () => {
  const panasonicHeatPump = new AirSourceHeatPump({
    elevationFeet: 0,
    ratings: panasonicRatings,
  });

  describe("getPerformanceRating", () => {
    describe("cooling", () => {
      describe("exact match deltaT", () => {
        test("max capacity", () => {
          const rating = panasonicHeatPump.getEstimatedPerformanceRating({
            responseNeeded: { type: "cooling", btuPerHour: 47400 },
            insideAirTempF: 80,
            outsideAirTempF: 95,
          });
          expect(rating).toEqual({
            btuPerHour: 47400,
            coefficientOfPerformance: 2.42,
          });
        });

        test("min capacity", () => {
          const rating = panasonicHeatPump.getEstimatedPerformanceRating({
            responseNeeded: { type: "cooling", btuPerHour: 13000 },
            insideAirTempF: 80,
            outsideAirTempF: 95,
          });
          expect(rating).toEqual({
            btuPerHour: 13000,
            coefficientOfPerformance: 3.7,
          });
        });

        test("middle capacity", () => {
          const rating = panasonicHeatPump.getEstimatedPerformanceRating({
            responseNeeded: {
              type: "cooling",
              btuPerHour: (47400 + 13000) / 2,
            },
            insideAirTempF: 80,
            outsideAirTempF: 95,
          });

          // COP should be average of COPs at min & max capacity
          expect(rating).toEqual({
            btuPerHour: (47400 + 13000) / 2,
            coefficientOfPerformance: (2.42 + 3.7) / 2,
          });
        });

        test("below min capacity", () => {
          const rating = panasonicHeatPump.getEstimatedPerformanceRating({
            responseNeeded: { type: "cooling", btuPerHour: 10000 },
            insideAirTempF: 80,
            outsideAirTempF: 95,
          });

          // COP should match COP at min capacity, but btuPerHour should be as
          // requested
          expect(rating).toEqual({
            btuPerHour: 10000,
            coefficientOfPerformance: 3.7,
          });
        });

        test("above max capacity", () => {
          const rating = panasonicHeatPump.getEstimatedPerformanceRating({
            responseNeeded: { type: "cooling", btuPerHour: 90000 },
            insideAirTempF: 80,
            outsideAirTempF: 95,
          });

          // Should return exactly the same rating as max capacity
          expect(rating).toEqual({
            btuPerHour: 47400,
            coefficientOfPerformance: 2.42,
          });
        });
      });

      test("interpolated deltaT", () => {
        const rating = panasonicHeatPump.getEstimatedPerformanceRating({
          responseNeeded: { type: "cooling", btuPerHour: 90000 },
          insideAirTempF: 80,
          outsideAirTempF: 90,
        });

        expect(rating.btuPerHour).toBeCloseTo(44553.85);
        expect(rating.coefficientOfPerformance).toBeCloseTo(2.94);
      });

      test("deltaT under all measured rating values", () => {
        const rating = panasonicHeatPump.getEstimatedPerformanceRating({
          responseNeeded: { type: "cooling", btuPerHour: 90000 },
          insideAirTempF: 80,
          outsideAirTempF: 81,
        });

        expect(rating.btuPerHour).toBeCloseTo(40000);
        expect(rating.coefficientOfPerformance).toBeCloseTo(3.88);
      });

      test("deltaT above all measured rating values", () => {
        const rating = panasonicHeatPump.getEstimatedPerformanceRating({
          responseNeeded: { type: "cooling", btuPerHour: 90000 },
          insideAirTempF: 80,
          outsideAirTempF: 100,
        });

        expect(rating.coefficientOfPerformance).toBeCloseTo(1.9);

        // TODO(jlfwong): This seems suspicious -- the idea that maximum cooling
        // capacity stays unchanged as temperature differential rises seems wrong.
        expect(rating.btuPerHour).toBeCloseTo(47400);
      });

      test("elevation de-rating", () => {
        let deratedHeatPump = new AirSourceHeatPump({
          elevationFeet: 5300,
          ratings: panasonicRatings,
        });

        const rating = deratedHeatPump.getEstimatedPerformanceRating({
          responseNeeded: { type: "cooling", btuPerHour: 90000 },
          insideAirTempF: 80,
          outsideAirTempF: 95,
        });

        expect(rating.btuPerHour).toBeCloseTo(38915, 0);

        // Elevation de-rated, down from 2.42
        expect(rating.coefficientOfPerformance).toBeCloseTo(2.38);
      });
    });

    describe("heating", () => {
      describe("exact match deltaT", () => {
        test("max capacity", () => {
          const rating = panasonicHeatPump.getEstimatedPerformanceRating({
            responseNeeded: { type: "heating", btuPerHour: 36876 },
            insideAirTempF: 70,
            outsideAirTempF: 5,
          });

          // Both capacity and COP de-rating for the defrost cycle
          expect(rating.btuPerHour).toBeCloseTo(36007, 0);
          expect(rating.coefficientOfPerformance).toBeCloseTo(1.68, 2);
        });

        test("min capacity", () => {
          const rating = panasonicHeatPump.getEstimatedPerformanceRating({
            responseNeeded: { type: "heating", btuPerHour: 12500 },
            insideAirTempF: 70,
            outsideAirTempF: 5,
          });

          // Only COP has been de-rating for the defrost cycle. The capacity was
          // technically de-rated too, but the requested BTUs is below the maximum
          // btuPerHour, so this is no longer running at minimum capacity.
          expect(rating.btuPerHour).toBeCloseTo(12500);
          expect(rating.coefficientOfPerformance).toBeCloseTo(2.6);
        });
      });

      test("freezing cold", () => {
        // TODO(jlfwong): This is the result to match behavior with heat pumps
        // hooray, but this isn't intuitively correct to me.
        const rating = panasonicHeatPump.getEstimatedPerformanceRating({
          responseNeeded: { type: "heating", btuPerHour: 40000 },
          insideAirTempF: 70,
          outsideAirTempF: -30,
        });
        expect(rating.btuPerHour).toBeCloseTo(14046, 0);

        // This differs from the heat pumps hooray codebase, which
        // reports a COP of 1.0
        expect(rating.coefficientOfPerformance).toBeCloseTo(0.57, 2);
      });
    });
  });

  describe("getThermalResponse", () => {
    test("max capacity", () => {
      const response = panasonicHeatPump.getThermalResponse({
        responseNeeded: { type: "heating", btuPerHour: 36876 },
        insideAirTempF: 70,
        outsideAirTempF: 5,
      });

      expect(response.type).toBe("heating");
      expect(response.btuPerHour).toBeCloseTo(36007, 0);
      expect(Object.keys(response.fuelUsage)).toEqual(["electricityKw"]);
      expect(response.fuelUsage.electricityKw).toBeCloseTo(17.7, 1);
    });
  });
});
