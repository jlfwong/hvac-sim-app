import { interpolate, clamp, interpolateClamped } from "./math";
import {
  CoolingAppliance,
  HeatingAppliance,
  HVACApplianceResponse,
} from "./types";
import { btusToKwh } from "./units";

export interface PerformanceRating {
  btusPerHour: number;
  coefficientOfPerformance: number;
}

// A line item from the NEEP cold-climate air-sourced heat pump database
export interface NEEPccASHPRatingInfo {
  mode: "heating" | "cooling";
  insideDryBulbFahrenheit: number;
  outsideDryBulbFahrenheit: number;
  minCapacity: PerformanceRating;
  maxCapacity: PerformanceRating;
}

function absDeltaT(r: NEEPccASHPRatingInfo): number {
  return Math.abs(r.insideDryBulbFahrenheit - r.outsideDryBulbFahrenheit);
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
  // Unsurprisingly, these create some weird non-monotonicity in the
  // efficiency curves
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

function estimatePerformanceRange(options: {
  insideAirTempF: number;
  outsideAirTempF: number;
  sortedRatings: NEEPccASHPRatingInfo[];
  elevationFeet?: number;
}): { minCapacity: PerformanceRating; maxCapacity: PerformanceRating } {
  const deltaTempF = Math.abs(options.insideAirTempF - options.outsideAirTempF);
  if (options.elevationFeet == null) {
    options.elevationFeet = 0;
  }

  let left: NEEPccASHPRatingInfo | null = null;
  let right: NEEPccASHPRatingInfo | null = null;
  for (let i = 1; i < options.sortedRatings.length; i++) {
    left = options.sortedRatings[i - 1];
    right = options.sortedRatings[i];
    if (absDeltaT(left!) <= deltaTempF && deltaTempF <= absDeltaT(right!)) {
      break;
    }
  }

  if (!left || !right) {
    throw new Error(
      `Not enough ratings. Expected a minimum of 2, got ${options.sortedRatings.length}`
    );
  }
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
    options.outsideAirTempF,
    options.elevationFeet,
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
    options.outsideAirTempF,
    options.elevationFeet,
    "max"
  );

  return {
    minCapacity,
    maxCapacity,
  };
}

export type PowerSetting =
  | { type: "btus"; btusPerHourNeeded: number }
  | { type: "percent"; percentPower: number };

function estimatePerformanceRating(options: {
  insideAirTempF: number;
  outsideAirTempF: number;
  power: PowerSetting;
  mode: "heating" | "cooling";
  sortedRatings: NEEPccASHPRatingInfo[];
  elevationFeet?: number;
}): PerformanceRating {
  // We interpolate on two axes. First, we interpolate on the temperature axis
  // (specifically on delta temperature) to generate a pair of performance
  // characteristics corresponding to the heat pump operating at minimum and
  // maximum capacity.
  //
  // After we have those, we interpolate on capacity to determine the
  // coefficient of performance when running at the target btus per hour needed.

  const { minCapacity, maxCapacity } = estimatePerformanceRange(options);

  let btusPerHourNeeded = 0;
  switch (options.power.type) {
    case "btus": {
      btusPerHourNeeded = options.power.btusPerHourNeeded;
      break;
    }

    case "percent": {
      btusPerHourNeeded =
        maxCapacity.btusPerHour * (options.power.percentPower / 100.0);
      if (options.mode === "cooling") {
        btusPerHourNeeded = -btusPerHourNeeded;
      }
      break;
    }

    default: {
      throw new Error(`Unexpected power type: ${options.power}`);
    }
  }

  if (Math.abs(btusPerHourNeeded) > Math.abs(maxCapacity.btusPerHour)) {
    // Can't supply more than max capacity
    return {
      btusPerHour:
        options.mode == "cooling"
          ? -maxCapacity.btusPerHour
          : maxCapacity.btusPerHour,
      coefficientOfPerformance: maxCapacity.coefficientOfPerformance,
    };
  } else if (Math.abs(btusPerHourNeeded) < Math.abs(minCapacity.btusPerHour)) {
    // Can't supply less than min capacity (without cycling).
    //
    // NOTE: Normally COP at minimum capacity is *higher* than COP at maximum
    // capacity.
    return {
      btusPerHour:
        options.mode == "cooling"
          ? -minCapacity.btusPerHour
          : minCapacity.btusPerHour,
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
  const factorByAltitude: { [key: number]: number } = {
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

export class AirSourceHeatPump implements HeatingAppliance, CoolingAppliance {
  private elevationFeet: number;
  private sortedHeatingRatings: NEEPccASHPRatingInfo[];
  private sortedCoolingRatings: NEEPccASHPRatingInfo[];

  readonly name: string = "Air Source Heat Pump";

  constructor(options: {
    elevationFeet: number;
    ratings: NEEPccASHPRatingInfo[];
    name?: string;
  }) {
    if (options.name) {
      this.name = options.name;
    }
    this.elevationFeet = options.elevationFeet;

    this.sortedHeatingRatings = options.ratings
      .filter((r) => r.mode === "heating")
      .sort((a, b) => absDeltaT(a) - absDeltaT(b));

    this.sortedCoolingRatings = options.ratings
      .filter((r) => r.mode === "cooling")
      .sort((a, b) => absDeltaT(a) - absDeltaT(b));
  }

  getEstimatedPerformanceRating(options: {
    power: PowerSetting;
    insideAirTempF: number;
    outsideAirTempF: number;
    mode: "heating" | "cooling";
  }): PerformanceRating {
    return estimatePerformanceRating({
      insideAirTempF: options.insideAirTempF,
      outsideAirTempF: options.outsideAirTempF,
      power: options.power,
      mode: options.mode,
      sortedRatings:
        options.mode == "heating"
          ? this.sortedHeatingRatings
          : this.sortedCoolingRatings,
      elevationFeet: this.elevationFeet,
    });
  }

  getCoolingPerformanceInfo(options: {
    insideAirTempF: number;
    outsideAirTempF: number;
    percentPower?: number;
  }): HVACApplianceResponse {
    const rating = this.getEstimatedPerformanceRating({
      mode: "cooling",
      power: {
        type: "percent",
        percentPower: options.percentPower != null ? options.percentPower : 100,
      },
      insideAirTempF: options.insideAirTempF,
      outsideAirTempF: options.outsideAirTempF,
    });

    // Convert from BTUs/hr to kW, incorporating coefficient of performance
    const kWNeeded =
      btusToKwh(Math.abs(rating.btusPerHour)) / rating.coefficientOfPerformance;

    return {
      btusPerHour: rating.btusPerHour,
      fuelUsage: {
        electricityKw: kWNeeded,
      },
    };
  }

  getHeatingPerformanceInfo(options: {
    insideAirTempF: number;
    outsideAirTempF: number;
    percentPower?: number;
  }): HVACApplianceResponse {
    const rating = this.getEstimatedPerformanceRating({
      mode: "heating",
      power: {
        type: "percent",
        percentPower: options.percentPower != null ? options.percentPower : 100,
      },
      insideAirTempF: options.insideAirTempF,
      outsideAirTempF: options.outsideAirTempF,
    });

    // Convert from BTUs/hr to kW, incorporating coefficient of performance
    const kWNeeded =
      btusToKwh(Math.abs(rating.btusPerHour)) / rating.coefficientOfPerformance;

    return {
      btusPerHour: rating.btusPerHour,
      fuelUsage: {
        electricityKw: kWNeeded,
      },
    };
  }
}

// Example ratings for use in simple tests
export const panasonicHeatPumpRatings: NEEPccASHPRatingInfo[] = [
  {
    mode: "cooling",
    outsideDryBulbFahrenheit: 95,
    insideDryBulbFahrenheit: 80,
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
    outsideDryBulbFahrenheit: 82,
    insideDryBulbFahrenheit: 80,
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
    outsideDryBulbFahrenheit: 47,
    insideDryBulbFahrenheit: 70,
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
    outsideDryBulbFahrenheit: 17,
    insideDryBulbFahrenheit: 70,
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
    outsideDryBulbFahrenheit: 5,
    insideDryBulbFahrenheit: 70,
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
    outsideDryBulbFahrenheit: -22,
    insideDryBulbFahrenheit: 70,
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
