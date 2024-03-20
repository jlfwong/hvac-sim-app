import { type HVACSimulationResult } from "./simulate";

// 0.054717 metric tons CO2/Mcf
// From https://19january2017snapshot.epa.gov/energy/greenhouse-gases-equivalencies-calculator-calculations-and-references_.html
//
// 0.0574717 metric tons CO2/Mcf x 10^6 grams/metric ton x 0.1 Mcf / ccf
const gramsCo2ePerCcfNaturalGas = 0.054717 * 1e6 * 0.1;

export function emissionsForSimulationGramsCO2e(options: {
  simulationResult: HVACSimulationResult;

  // The real grams per kWh is going to be heavily time dependent (e.g. more
  // emissions at night when solar is unavailable).  But that time-dependent
  // data isn't easily available, so we'll use a very simplified model for now.
  gramsCO2ePerKwh: number;
}): number {
  let totalElectricalUsageKwh = 0;
  let totalNaturalGasUsageCcf = 0;

  for (let bill of options.simulationResult.bills) {
    switch (bill.getFuelType()) {
      case "electricity": {
        if (bill.getFuelUnit() != "kWh") {
          throw new Error(
            `Unexpected unit on an electricity bill: ${bill.getFuelUnit()}`
          );
        }
        totalElectricalUsageKwh += bill.getFuelUsage();
        break;
      }

      case "natural gas": {
        if (bill.getFuelUnit() != "ccf") {
          throw new Error(
            `Unexpected unit on a natural gas bill: ${bill.getFuelUnit()}`
          );
        }
        totalNaturalGasUsageCcf += bill.getFuelUsage();
        break;
      }

      default: {
        throw new Error(`Unimplemented fuel type: ${bill.getFuelType()}`);
      }
    }
  }

  const electricalEmissions = totalElectricalUsageKwh * options.gramsCO2ePerKwh;
  const naturalGasEmissions =
    totalNaturalGasUsageCcf * gramsCo2ePerCcfNaturalGas;

  return electricalEmissions + naturalGasEmissions;
}
