import { interpolate, clamp, interpolateClamped } from "./math";
import { HVACAppliance, HVACApplianceResponse } from "./types";
import { btusToKwh } from "./units";

export interface PerformanceRating {
  btusPerHour: number;
  coefficientOfPerformance: number;
}

// A line item from the NEEP cold-climate air-sourced heat pump database
export interface NEEPccASHPRatingInfo {
  mode: "heating" | "cooling";
  indoorDryBulbFahrenheit: number;
  outdoorDryBulbFahrenheit: number;
  minCapacity: PerformanceRating;
  maxCapacity: PerformanceRating;
}

function absDeltaT(r: NEEPccASHPRatingInfo): number {
  return Math.abs(r.indoorDryBulbFahrenheit - r.outdoorDryBulbFahrenheit);
}

function interpolateCOP(
  x1: number,
  cop1: number,
  x2: number,
  cop2: number,
  x: number
): number {
  // Don't allow COPs to be interpolated to beyond this range since it's unrealistic.
  //
  // TODO(jlfwong): Why are COPs below 1.0 unrealistic?
  return clamp(interpolate(x1, cop1, x2, cop2, x), 1.0, 8.5);
}

export function interpolatePerformanceRatings(
  aDeltaT: number,
  a: PerformanceRating,
  bDeltaT: number,
  b: PerformanceRating,
  deltaT: number
): PerformanceRating {
  return {
    // We don't allow compressor capacity to go outside the range from the
    // laboratory results.
    btusPerHour: interpolateClamped(
      aDeltaT,
      a.btusPerHour,
      bDeltaT,
      b.btusPerHour,
      deltaT
    ),
    coefficientOfPerformance: interpolateCOP(
      aDeltaT,
      a.coefficientOfPerformance,
      bDeltaT,
      b.coefficientOfPerformance,
      deltaT
    ),
  };
}

export function derateHeatPumpForElevation(
  rating: PerformanceRating,
  elevationInFeet: number,
  speedSettings: "single-speed" | "dual-speed" | "variable-speed"
): PerformanceRating {
  const elevationFactor = getAltitudeCorrectionFactor(elevationInFeet);

  // Single and two-phase compressors are more aggressively derated for
  // elevation.
  //
  // TODO(jlfwong): Ask Baker & Calvin for source for this
  let efficiencyDeratingMultiplier = 0.1;
  if (speedSettings === "single-speed") {
    efficiencyDeratingMultiplier = 0.5;
  } else if (speedSettings === "dual-speed") {
    efficiencyDeratingMultiplier = 0.25;
  } else if (speedSettings === "variable-speed") {
    efficiencyDeratingMultiplier = 0.1;
  }

  const efficiencyFactor =
    1 - (1 - elevationFactor) * efficiencyDeratingMultiplier;

  return {
    btusPerHour: rating.btusPerHour * elevationFactor,
    coefficientOfPerformance:
      rating.coefficientOfPerformance * efficiencyFactor,
  };
}

function derateCapacityPerformanceRating(
  rating: PerformanceRating,
  outsideAirTempF: number,
  elevationInFeet: number,
  minOrMaxCapacity: "min" | "max"
): PerformanceRating {
  // We'll assume all of the heat pumps coming from the NEEP ccAHSP database are variable speed.
  const elevationDerated = derateHeatPumpForElevation(
    rating,
    elevationInFeet,
    "variable-speed"
  );

  if (outsideAirTempF > 50) {
    // No defrost cycle needed
    return elevationDerated;
  }

  let defrostFactor: number;
  const t = outsideAirTempF;
  const t2 = t * t;

  // TODO(jlfwong): Ask Baker & Calvin where these numbers come from
  if (t < 25) {
    defrostFactor = -0.0002022 * t2 + 0.004177 * t + 0.9606;
  } else {
    // 25 < t < 50
    if (minOrMaxCapacity == "max") {
      defrostFactor = -0.0003917 * t2 + 0.03786 * t + 0.0849;
    } else {
      defrostFactor = -0.0001371 * t2 + 0.01273 * t + 0.7045;
    }
  }

  const defrostCopDerateFactor = 0.978 * defrostFactor - 0.0998;
  return {
    btusPerHour: elevationDerated.btusPerHour * defrostFactor,
    coefficientOfPerformance:
      elevationDerated.coefficientOfPerformance * defrostCopDerateFactor,
  };
}

export function estimatePerformanceRating({
  insideAirTempF,
  outsideAirTempF,
  btusPerHourNeeded,
  sortedRatings,
  elevationFeet,
}: {
  insideAirTempF: number;
  outsideAirTempF: number;
  btusPerHourNeeded: number;
  sortedRatings: NEEPccASHPRatingInfo[];
  elevationFeet?: number;
}): PerformanceRating {
  const deltaTempF = Math.abs(insideAirTempF - outsideAirTempF);
  if (elevationFeet == null) {
    elevationFeet = 0;
  }

  // We interpolate on two axes. First, we interpolate on the temperature axis
  // (specifically on delta temperature) to generate a pair of performance
  // characteristics corresponding to the heat pump operating at minimum and
  // maximum capacity.
  //
  // After we have those, we interpolate on capacity to determine the
  // coefficient of performance when running at the target btus per hour needed.

  let left: NEEPccASHPRatingInfo | null = null;
  let right: NEEPccASHPRatingInfo | null = null;

  for (let i = 1; i < sortedRatings.length; i++) {
    left = sortedRatings[i - 1];
    right = sortedRatings[i];
    if (absDeltaT(left!) <= deltaTempF && deltaTempF <= absDeltaT(right!)) {
      break;
    }
  }

  if (left && right) {
    const deltaTempLeft = absDeltaT(left);
    const deltaTempRight = absDeltaT(right);

    let minCapacity = interpolatePerformanceRatings(
      deltaTempLeft,
      left.minCapacity,
      deltaTempRight,
      right.minCapacity,
      deltaTempF
    );
    minCapacity = derateCapacityPerformanceRating(
      minCapacity,
      outsideAirTempF,
      elevationFeet,
      "min"
    );
    let maxCapacity = interpolatePerformanceRatings(
      deltaTempLeft,
      left.maxCapacity,
      deltaTempRight,
      right.maxCapacity,
      deltaTempF
    );
    maxCapacity = derateCapacityPerformanceRating(
      maxCapacity,
      outsideAirTempF,
      elevationFeet,
      "max"
    );

    if (Math.abs(btusPerHourNeeded) > Math.abs(maxCapacity.btusPerHour)) {
      // Can't supply more than max capacity
      return {
        btusPerHour:
          btusPerHourNeeded < 0
            ? -maxCapacity.btusPerHour
            : maxCapacity.btusPerHour,
        coefficientOfPerformance: maxCapacity.coefficientOfPerformance,
      };
    } else if (
      Math.abs(btusPerHourNeeded) < Math.abs(minCapacity.btusPerHour)
    ) {
      // Can supply less than min capacity by cycling, but coefficient of
      // performance won't improve.
      //
      // NOTE: Normally COP at minimum capacity is *higher* than COP at maximum
      // capacity.
      return {
        btusPerHour: btusPerHourNeeded,
        coefficientOfPerformance: minCapacity.coefficientOfPerformance,
      };
    } else {
      // Thermal demand is within bounds of variable compressor operation,
      // so interpolate to find the coefficient of performance here.
      //
      // TODO(jlfwong): Is this actually a linear function?
      const coefficientOfPerformance = interpolateCOP(
        minCapacity.btusPerHour,
        minCapacity.coefficientOfPerformance,
        maxCapacity.btusPerHour,
        maxCapacity.coefficientOfPerformance,
        Math.abs(btusPerHourNeeded)
      );
      return {
        btusPerHour: btusPerHourNeeded,
        coefficientOfPerformance,
      };
    }
  } else {
    throw new Error(
      `Not enough ratings. Expected a minimum of 2, got ${sortedRatings.length}`
    );
  }
}

function getAltitudeCorrectionFactor(elevationInFeet: number): number {
  // Heat pumps are less efficient at high elevations due to lower air density
  //
  // See:
  // - https://s3.amazonaws.com/greenbuildingadvisor.s3.tauntoncloud.com/app/uploads/2016/09/25014433/001%20Altitude%20Capacity%20Correction.pdf
  // - https://s3.amazonaws.com/greenbuildingadvisor.s3.tauntoncloud.com/app/uploads/2016/09/25014434/Mitsubishi%20M%20and%20P%20series%20Altitude%20correction.pdf
  if (elevationInFeet < 0) {
    // Are heat pumps more efficient below sea level? Let's assume not for now.
    return 1.0;
  }
  // TODO(jlfwong): Ask Calvin & Baker why they stopped at 13,000 here

  // This table is annoying close to being linear, but we'll do a lookup
  // instead of simple math anyway.
  const factorByAltitude = {
    0: 1.0,
    1: 0.96,
    2: 0.93,
    3: 0.9,
    4: 0.86,
    5: 0.83,
    6: 0.8,
    7: 0.77,
    8: 0.74,
    9: 0.71,
    10: 0.69,
    11: 0.67, // guess
    12: 0.65, // guess
    13: 0.63, // guess
  };
  const thousandsOfFeet = Math.floor(elevationInFeet / 1000);

  const a = factorByAltitude[thousandsOfFeet];
  const b = factorByAltitude[thousandsOfFeet + 1];
  return interpolate(
    thousandsOfFeet,
    a,
    thousandsOfFeet + 1,
    b,
    elevationInFeet / 1000.0
  );
}

export class AirSourceHeatPump implements HVACAppliance {
  private elevationFeet: number;
  private sortedHeatingRatings: NEEPccASHPRatingInfo[];
  private sortedCoolingRatings: NEEPccASHPRatingInfo[];

  constructor(options: {
    elevationFeet: number;
    ratings: NEEPccASHPRatingInfo[];
  }) {
    this.elevationFeet = options.elevationFeet;

    this.sortedHeatingRatings = options.ratings
      .filter((r) => r.mode === "heating")
      .sort((a, b) => absDeltaT(a) - absDeltaT(b));

    this.sortedCoolingRatings = options.ratings
      .filter((r) => r.mode === "cooling")
      .sort((a, b) => absDeltaT(a) - absDeltaT(b));
  }

  getEstimatedPerformanceRating(options: {
    btusPerHourNeeded: number;
    insideAirTempF: number;
    outsideAirTempF: number;
  }): PerformanceRating {
    return estimatePerformanceRating({
      insideAirTempF: options.insideAirTempF,
      outsideAirTempF: options.outsideAirTempF,
      btusPerHourNeeded: options.btusPerHourNeeded,
      sortedRatings:
        options.btusPerHourNeeded > 0
          ? this.sortedHeatingRatings
          : this.sortedCoolingRatings,
      elevationFeet: this.elevationFeet,
    });
  }

  getThermalResponse(options: {
    btusPerHourNeeded: number;
    insideAirTempF: number;
    outsideAirTempF: number;
  }): HVACApplianceResponse {
    const rating = this.getEstimatedPerformanceRating(options);

    // Convert from BTUs/hr to kW, incorporating coefficient of performance
    const kWNeeded =
      btusToKwh(rating.btusPerHour) / rating.coefficientOfPerformance;

    return {
      btusPerHour: rating.btusPerHour,
      fuelUsage: {
        electricityKw: kWNeeded,
      },
    };
  }
}
