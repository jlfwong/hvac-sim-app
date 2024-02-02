import {
  AirSourceHeatPump,
  PerformanceRating,
  interpolatePerformanceRatings,
  NEEPccASHPRatingInfo,
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

const panasonicRatings: NEEPccASHPRatingInfo[] = [
  {
    mode: "cooling",
    outdoorDryBulbFahrenheit: 95,
    indoorDryBulbFahrenheit: 80,
    minCapacity: {
      btusPerHour: 13000,
      coefficientOfPerformance: 3.7,
    },
    maxCapacity: {
      btusPerHour: 47400,
      coefficientOfPerformance: 2.42,
    },
  },
  {
    mode: "cooling",
    outdoorDryBulbFahrenheit: 82,
    indoorDryBulbFahrenheit: 80,
    minCapacity: {
      btusPerHour: 12000,
      coefficientOfPerformance: 5.58,
    },
    maxCapacity: {
      btusPerHour: 40000,
      coefficientOfPerformance: 3.78,
    },
  },
  {
    mode: "heating",
    outdoorDryBulbFahrenheit: 47,
    indoorDryBulbFahrenheit: 70,
    minCapacity: {
      btusPerHour: 11000,
      coefficientOfPerformance: 4.67,
    },
    maxCapacity: {
      btusPerHour: 57200,
      coefficientOfPerformance: 2.94,
    },
  },
  {
    mode: "heating",
    outdoorDryBulbFahrenheit: 17,
    indoorDryBulbFahrenheit: 70,
    minCapacity: {
      btusPerHour: 15000,
      coefficientOfPerformance: 3.57,
    },
    maxCapacity: {
      btusPerHour: 47000,
      coefficientOfPerformance: 1.9,
    },
  },
  {
    mode: "heating",
    outdoorDryBulbFahrenheit: 5,
    indoorDryBulbFahrenheit: 70,
    minCapacity: {
      btusPerHour: 12500,
      coefficientOfPerformance: 3.05,
    },
    maxCapacity: {
      btusPerHour: 36876,
      coefficientOfPerformance: 1.96,
    },
  },
  {
    mode: "heating",
    outdoorDryBulbFahrenheit: -22,
    indoorDryBulbFahrenheit: 70,
    minCapacity: {
      btusPerHour: 12300,
      coefficientOfPerformance: 3.05,
    },
    maxCapacity: {
      btusPerHour: 21500,
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
            btusPerHourNeeded: -47400,
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
            btusPerHourNeeded: -13000,
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
            btusPerHourNeeded: -(47400 + 13000) / 2,
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
            btusPerHourNeeded: -10000,
            insideAirTempF: 80,
            outsideAirTempF: 95,
          });

          // COP should match COP at min capacity, but btusPerHour should be as
          // requested
          expect(rating).toEqual({
            btusPerHour: -10000,
            coefficientOfPerformance: 3.7,
          });
        });

        test("above max capacity", () => {
          const rating = panasonicHeatPump.getEstimatedPerformanceRating({
            btusPerHourNeeded: -90000,
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
          btusPerHourNeeded: -90000,
          insideAirTempF: 80,
          outsideAirTempF: 90,
        });

        expect(rating.btusPerHour).toBeCloseTo(-44553.85);
        expect(rating.coefficientOfPerformance).toBeCloseTo(2.94);
      });

      test("deltaT under all measured rating values", () => {
        const rating = panasonicHeatPump.getEstimatedPerformanceRating({
          btusPerHourNeeded: -90000,
          insideAirTempF: 80,
          outsideAirTempF: 81,
        });

        expect(rating.btusPerHour).toBeCloseTo(-40000);
        expect(rating.coefficientOfPerformance).toBeCloseTo(3.88);
      });

      test("deltaT above all measured rating values", () => {
        const rating = panasonicHeatPump.getEstimatedPerformanceRating({
          btusPerHourNeeded: -90000,
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
          ratings: panasonicRatings,
        });

        const rating = deratedHeatPump.getEstimatedPerformanceRating({
          btusPerHourNeeded: -90000,
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
            btusPerHourNeeded: 36876,
            insideAirTempF: 70,
            outsideAirTempF: 5,
          });

          // Both capacity and COP de-rating for the defrost cycle
          expect(rating.btusPerHour).toBeCloseTo(36007, 0);
          expect(rating.coefficientOfPerformance).toBeCloseTo(1.68, 2);
        });

        test("min capacity", () => {
          const rating = panasonicHeatPump.getEstimatedPerformanceRating({
            btusPerHourNeeded: 12500,
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
          btusPerHourNeeded: 40000,
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
      const response = panasonicHeatPump.getThermalResponse({
        btusPerHourNeeded: 36876,
        insideAirTempF: 70,
        outsideAirTempF: 5,
      });

      expect(response.btusPerHour).toBeCloseTo(36007, 0);
      expect(Object.keys(response.fuelUsage)).toEqual(["electricityKw"]);
      expect(response.fuelUsage.electricityKw).toBeCloseTo(17.7, 1);
    });
  });
});
