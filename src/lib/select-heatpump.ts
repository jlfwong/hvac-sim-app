import { DateTime } from "./datetime";
import { BuildingGeometry } from "./building-geometry";
import { AirSourceHeatPump } from "./heatpump";
import { ThermalLoadSource } from "./thermal-loads";
import { BinnedTemperatures } from "./weather";

// TODO: The python codebase looks like it uses the 99%-ile and 1%-ile for
// pre-selection, but then still requires 100% coverage, which will include
// temperatures outisde the [1%-ile, 99%-ile] range. Does this make sense?

export interface HeatpumpSelectionResult {
  heatpump: AirSourceHeatPump;
  averageCoefficientOfPerformance: number;
  underCapacityHeatingHours: number;
  underCapacityCoolingHours: number;
}

export function selectHeatpump(options: {
  // The list of heat pumps to select from
  heatpumps: AirSourceHeatPump[];

  // The temperature to cool the home to
  coolingSetPointInsideTempF: number;

  // The temperature to use for evaluating cooling capacity
  // Typically 99%-ile temperature
  designCoolingOutsideAirTempF: number;

  // The temperature to heat the home to
  heatingSetPointInsideTempF: number;

  // The temperature to use for evaluating heating capacity
  // Typically 1%-ile temperature
  designHeatingOutsideAirTempF: number;

  // The thermal loads the heatpump will need to counteract
  loadSources: ThermalLoadSource[];

  // Bucketed temperatures to use for evaluating a heat pump.  We do binned
  // temperatures as an optimization.
  binnedTemperatures: BinnedTemperatures;
}): HeatpumpSelectionResult[] {
  function getBtusPerHourLoad(insideAirTempF: number, outsideAirTempF: number) {
    // We're looking for worst case scenarios, so we'll make assumptions for
    // weather based on that.
    let colderOutside = insideAirTempF < outsideAirTempF;

    const dateTime = DateTime.fromObject({
      timeZoneName: "UTC",
      year: 2023,
      month: 1,
      day: 1,
      hour: colderOutside ? 2 : 14,
    });

    return options.loadSources
      .map<number>((source) => {
        return source.getBtusPerHour(dateTime, insideAirTempF, {
          outsideAirTempF,
          windSpeedMph: 0,

          // TODO(jlfwong): Choose sane values for humidity.
          relativeHumidityPercent: 90,

          cloudCoverPercent: colderOutside ? 100 : 0,

          solarIrradiance: colderOutside
            ? {
                wattsPerSquareMeter: 0,
                altitudeDegrees: -90,
              }
            : {
                // TODO(jlfwong): Ideally this would be based on the maximum
                // solar irradiance experienced at the given latitude.
                wattsPerSquareMeter: 850,
                altitudeDegrees: 58,
              },
        });
      })
      .reduce((acc, x) => acc + x, 0);
  }

  const btusPerHourNeededHeating = Math.max(
    0,
    -getBtusPerHourLoad(
      options.heatingSetPointInsideTempF,
      options.designHeatingOutsideAirTempF
    )
  );

  const btusPerHourNeededCooling = Math.min(
    0,
    -getBtusPerHourLoad(
      options.coolingSetPointInsideTempF,
      options.designCoolingOutsideAirTempF
    )
  );

  // Step 1: Filter out heat pumps which lack the capacity for the design
  // heating and cooling temperatures
  const candidateHeatpumps = options.heatpumps.filter((pump) => {
    const heatingRating = pump.getEstimatedPerformanceRating({
      mode: "heating",
      power: { type: "btus", btusPerHourNeeded: btusPerHourNeededHeating },
      insideAirTempF: options.heatingSetPointInsideTempF,
      outsideAirTempF: options.designHeatingOutsideAirTempF,
    });

    const coolingRating = pump.getEstimatedPerformanceRating({
      mode: "cooling",
      power: { type: "btus", btusPerHourNeeded: btusPerHourNeededCooling },
      insideAirTempF: options.coolingSetPointInsideTempF,
      outsideAirTempF: options.designCoolingOutsideAirTempF,
    });

    // Cooling values are negated for comparison because they're negative
    return (
      heatingRating.btusPerHour >= btusPerHourNeededHeating &&
      -coolingRating.btusPerHour >= -btusPerHourNeededCooling
    );
  });

  // Step 2: For the remaining heat pumps, estimated their average COP
  // using the binned temperatures provided
  const results = candidateHeatpumps.map<HeatpumpSelectionResult>((pump) => {
    let totalSum = 0;
    let totalWeight = 0;
    let underCapacityCoolingHours = 0;
    let underCapacityHeatingHours = 0;

    options.binnedTemperatures.forEachBin((bin) => {
      const { outsideAirTempF, hourCount } = bin;

      // TODO(jlfwong): Consider ignoring weights on temperatures below the
      // auxiliary switchover temperature
      /*
      if (outsideAirTempF < options.auxiliarySwitchoverTempF) {
        // Handled by auxiliary heating
        return;
      }
      */

      let mode: "heating" | "cooling" | null = null;
      if (outsideAirTempF < options.heatingSetPointInsideTempF) {
        mode = "heating";
      } else if (outsideAirTempF > options.coolingSetPointInsideTempF) {
        mode = "cooling";
      }

      if (mode == null) {
        return;
      }

      const insideAirTempF =
        outsideAirTempF < options.designHeatingOutsideAirTempF
          ? options.designHeatingOutsideAirTempF
          : options.designCoolingOutsideAirTempF;
      const btusPerHourNeeded = getBtusPerHourLoad(
        insideAirTempF,
        outsideAirTempF
      );
      const rating = pump.getEstimatedPerformanceRating({
        power: { type: "btus", btusPerHourNeeded },
        mode,
        insideAirTempF,
        outsideAirTempF,
      });

      if (Math.abs(rating.btusPerHour) < Math.abs(btusPerHourNeeded)) {
        if (insideAirTempF > outsideAirTempF) {
          underCapacityCoolingHours += 1;
        } else {
          underCapacityHeatingHours += 1;
        }
      }

      // We weight based on # of btus, instead of # of hours
      const weight = hourCount * btusPerHourNeeded;

      totalSum += rating.coefficientOfPerformance * weight;
      totalWeight += weight;
    });

    return {
      heatpump: pump,
      averageCoefficientOfPerformance: totalSum / totalWeight,
      underCapacityCoolingHours,
      underCapacityHeatingHours,
    };
  });

  results.sort(
    (a, b) =>
      b.averageCoefficientOfPerformance - a.averageCoefficientOfPerformance
  );

  return results;
}
