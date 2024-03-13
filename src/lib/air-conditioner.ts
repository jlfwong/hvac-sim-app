/*
We want a way of determining the temperature & demand-dependent COP and BTUs/hour based
purely on the SEER and nameplace capacity/tonnage.

f(SEER, nameplate capacity) -> f(btusNeeded, deltaTempF) -> {cop, btusPerHour}

Having the following would satisfy that:

f(SEER, nameplate capacity) -> f(deltaTempF) -> {minCapacity: {cop, btusPerHour}, maxCapacity: {cop, btusPerHour}}
f(SEER, nameplate capacity) -> f(deltaTempF) -> PerformanceRatingRange

Because we already have a function that does:

f(btusNeeded, PerformanceRatingRange) -> {cop, btusPerHour}

SEER ratings are based on testing with a 2 degree differential at maximum
capacity (?). It also sounds like labratory testing is done at maximum capacity,
which would prevent variable compressor AC units from revealing their
significant advantages.

Reference on SEER calculation here: https://www.adams-air.com/houston/what-is-SEER.php

Canonical source: https://web.archive.org/web/20220330073208/https://www.ahrinet.org/App_Content/ahri/files/standards%20pdfs/ANSI%20standards%20pdfs/ANSI.AHRI%20Standard%20210.240%20with%20Addenda%201%20and%202.pdf
- ANSI/ANSI/AHRI STANDARD 210/240-2008, section 4.1

For now, we'll use a much simpler model: we'll assume that AC units' capacities
aren't that highly dependent upon temperature differential, and assume they all
have single speed compressors. This reduces the problem down to...

f(SEER) -> f(deltaTempF) -> {cop}
f(nameplate capacity) = btusPerHour

If we assume the resulting f(deltaTempF) -> m * deltaTempF + b, then can we do a
simple linear regression to find the slope and y-intercept.

The results here are based on doing such an analysis on the NEEP ASHP database.

TOOD(jlfwong): Make this work more accurately for variable speed air
conditioner, and consider the fact that the dCOPdTempF is probably dependent on
SEER.
*/

import { PerformanceRating, derateHeatPumpForElevation } from "./heatpump";
import {
  CoolingAppliance,
  HeatingAppliance,
  HVACApplianceResponse,
} from "./types";
import { WATT_HOUR_PER_BTU, btusToKwh } from "./units";

export class AirConditioner implements CoolingAppliance {
  readonly name = "Air Conditioner";

  constructor(
    private options: {
      seer: number;
      capacityBtusPerHour: number;
      elevationFeet: number;

      // TODO(jlfwong): This parameter is currently only used for elevation
      // de-rating. The COP calculation below assumes this is single-speed,
      // which is silly.
      speedSettings: "single-speed" | "dual-speed" | "variable-speed";
    }
  ) {
    if (this.options.capacityBtusPerHour <= 0) {
      throw new Error(
        "Capacity values for air conditioners should be positive"
      );
    }
  }

  getEstimatedPerformanceRating(options: {
    insideAirTempF: number;
    outsideAirTempF: number;
  }): PerformanceRating {
    // The units of SEER are BTU/Watt-hour. COP is unit-less (e.g. kWh/kWh).
    // To convert from SEER to COP, we therefore multiple by Watt-hour/BTU
    const nameplaceCOP = this.options.seer * WATT_HOUR_PER_BTU;

    const deltaTempF = options.outsideAirTempF - options.insideAirTempF;

    // These two values were experimentally determined by analysis of the NEEP
    // ccAHSP database.
    //
    // The slope (dCOPdTempF) was determined by selecting the median slope of
    // COPs (while running at maximum capacity) plotted v.s. temperature
    // differential.
    //
    // The y-intercept was then adjusted until reported SEER equals calculated
    // SEER.
    const baselineCOPAdjustment = 0.7034;
    const dCOPdTempF = -0.0746;

    let coefficientOfPerformance =
      nameplaceCOP + baselineCOPAdjustment + deltaTempF * dCOPdTempF;

    if (coefficientOfPerformance < 0) {
      // This can happen if given temperature inputs that are outrageous
      // or non-sensical.
      coefficientOfPerformance = 0.01;
    }

    return derateHeatPumpForElevation(
      {
        coefficientOfPerformance,
        btusPerHour: -this.options.capacityBtusPerHour,
      },
      this.options.elevationFeet,
      this.options.speedSettings
    );
  }

  getCoolingPerformanceInfo(options: {
    insideAirTempF: number;
    outsideAirTempF: number;
  }): HVACApplianceResponse {
    const rating = this.getEstimatedPerformanceRating(options);

    // Convert from BTUs/hr to kW, incorporating coefficient of performance
    const kWNeeded =
      btusToKwh(Math.abs(rating.btusPerHour)) / rating.coefficientOfPerformance;

    if (kWNeeded < 0) {
      throw new Error(
        `Reported a negative power demand from an air conditioner. Arguments: ${JSON.stringify(
          options
        )}, rating; ${JSON.stringify(rating)}`
      );
    }

    return {
      btusPerHour: rating.btusPerHour,
      fuelUsage: {
        electricityKw: kWNeeded,
      },
    };
  }
}
