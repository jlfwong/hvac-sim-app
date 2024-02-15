import { DateTime, Duration, Zone } from "luxon";
import { WeatherSnapshot, FuelUsageRate, HVACApplianceResponse } from "./types";
import { WeatherSource } from "./weather";
import {
  ElectricalUtilityPlan,
  EnergyBill,
  FuelOilUtilityPlan,
  NaturalGasUtilityPlan,
} from "./billing";
import { BuildingGeometry } from "./building-geometry";
import { ThermalLoadSource } from "./thermal-loads";
import { HVACSystem } from "./hvac-system";

interface SimulationStep {
  localTime: DateTime;
  insideAirTempF: number;
  weather: WeatherSnapshot;
  hvacSystemResponse: HVACApplianceResponse;
}

interface UtilityBills {
  electricity?: EnergyBill[];
  naturalGas?: EnergyBill[];
  fuelOil?: EnergyBill[];
}

export interface HVACSimulationResult {
  timeSteps: SimulationStep[];
  bills: UtilityBills;
}

// TODO(jlfwong): Move this to a utils file
function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

export class FuelBilling {
  private electricalUtilityPlan: ElectricalUtilityPlan | null = null;
  private naturalGasUtilityPlan: NaturalGasUtilityPlan | null = null;
  private fuelOilUtilityPlan: FuelOilUtilityPlan | null = null;

  setElectricalUtilityPlan(u: ElectricalUtilityPlan) {
    this.electricalUtilityPlan = u;
  }
  setNaturalGasUtility(u: NaturalGasUtilityPlan) {
    this.naturalGasUtilityPlan = u;
  }
  setFuelOilUtilityPlan(u: FuelOilUtilityPlan) {
    this.fuelOilUtilityPlan = u;
  }

  recordElectricityUsageKwh(kWh: number, localTime: DateTime): void {}

  recordNaturalGasUsageCcf(ccf: number, localTime: DateTime): void {}
  recordFuelOilUsageGallons(gallons: number, localTime: DateTime): void {}

  recordUsage(
    usageRate: FuelUsageRate,
    durationInHours: number,
    localTime: DateTime
  ) {
    if (usageRate.electricityKw) {
      if (!this.electricalUtilityPlan) {
        throw new Error("No electrical utility configured");
      }
      this.electricalUtilityPlan.recordElectricityUsageKwh(
        usageRate.electricityKw * durationInHours,
        localTime
      );
    }

    if (usageRate.naturalGasCcfPerHour) {
      if (!this.naturalGasUtilityPlan) {
        throw new Error("No natural gas utility configured");
      }
      this.naturalGasUtilityPlan.recordNaturalGasUsageCcf(
        usageRate.naturalGasCcfPerHour * durationInHours,
        localTime
      );
    }

    if (usageRate.fuelOilGallonsPerHour) {
      if (!this.fuelOilUtilityPlan) {
        throw new Error("No fuel oil utility configured");
      }
      this.fuelOilUtilityPlan.recordFuelOilUsageGallons(
        usageRate.fuelOilGallonsPerHour * durationInHours,
        localTime
      );
    }
  }
  getBills(from: DateTime, to: DateTime): UtilityBills {
    const bills: UtilityBills = {};
    if (this.electricalUtilityPlan) {
      bills.electricity = this.electricalUtilityPlan.getBills(from, to);
    }
    if (this.naturalGasUtilityPlan) {
      bills.naturalGas = this.naturalGasUtilityPlan.getBills(from, to);
    }
    if (this.fuelOilUtilityPlan) {
      bills.fuelOil = this.fuelOilUtilityPlan.getBills(from, to);
    }
    return bills;
  }
}

// Simulate the use of a building's HVAC system on an hour-by-hour basis.
//
// Every hour, this involves a few key steps:
// 1. Determine the passive heating load on the house due to e.g. sunlight
//    hitting the house, or temperature differentials causing heat to enter or
//    leave the house
// 2. Determine the target temperature as specified by the thermostat
// 3. Use heating/cooling equipment, recording the BTU output and fuel usage
// 4. Record the fuel usage on the relevant utility bills
export function simulateBuildingHVAC(options: {
  localStartTime: DateTime;
  localEndTime: DateTime;
  initialInsideAirTempF: number;
  buildingGeometry: BuildingGeometry;
  loadSources: ThermalLoadSource[];
  hvacSystem: HVACSystem;
  weatherSource: WeatherSource;
  utilityPlans: {
    electrical?: ElectricalUtilityPlan;
    naturalGas?: NaturalGasUtilityPlan;
    fuelOil?: FuelOilUtilityPlan;
  };
}): HVACSimulationResult {
  const billing = new FuelBilling();
  if (options.utilityPlans.electrical) {
    billing.setElectricalUtilityPlan(options.utilityPlans.electrical);
  }
  if (options.utilityPlans.naturalGas) {
    billing.setNaturalGasUtility(options.utilityPlans.naturalGas);
  }
  if (options.utilityPlans.fuelOil) {
    billing.setFuelOilUtilityPlan(options.utilityPlans.fuelOil);
  }

  let results: SimulationStep[] = [];

  const timezone: Zone = options.localStartTime.zone;

  if (options.localStartTime.zone !== options.localStartTime.zone) {
    throw new Error("Given a different timezone for start and end datetimes");
  }

  // We operate in UTC rather than local time because it makes the date math run
  // more efficiently since it avoids the need to reconcile timezones after each
  // operation, because e.g. DST might kick in across an addition boundary.
  let utcTime: DateTime = options.localStartTime.toUTC();
  let insideAirTempF = options.initialInsideAirTempF;

  const endTimeMillis: number = options.localEndTime.toMillis();

  const timeStepDuration = Duration.fromObject({ minutes: 10 });
  const timeStepInHours = timeStepDuration.as("hours");

  while (utcTime.toMillis() < endTimeMillis) {
    const weather = options.weatherSource.getWeather(utcTime);

    // Timezone reconciliation slows down this simulation a non-negligible
    // amount, but is unfortunately necessary for time of use billing and for
    // thermostat schedules that e.g. set different temperatures for sleeping.
    const localTime = utcTime.setZone(timezone);

    const hvacSystemResponse = options.hvacSystem.getThermalResponse({
      localTime,
      insideAirTempF,
      outsideAirTempF: weather.outsideAirTempF,
    });

    // Bill for fuel usage
    billing.recordUsage(
      hvacSystemResponse.fuelUsage,
      timeStepInHours,
      localTime
    );

    // Apply the temperature change caused by passive loads
    // Determine the heating load on the building from non-HVAC sources (e.g.
    // heating moving through the walls, or sun shining on the building).
    let passiveBtusPerHour = 0;
    for (let loadSource of options.loadSources) {
      passiveBtusPerHour += loadSource.getBtusPerHour(
        utcTime,
        insideAirTempF,
        weather
      );
    }

    // Record the results for the hour
    results.push({
      localTime: utcTime,
      insideAirTempF,
      weather,
      hvacSystemResponse,
    });

    // Step forward the simulation

    // Apply the temperature change caused by HVAC equipment and passive loads
    // We do this after we add the timestep results to ensure temporal
    // consistency. All of the entries in the reslts are for the beginning of
    // that time step.
    insideAirTempF +=
      ((passiveBtusPerHour + hvacSystemResponse.btusPerHour) *
        timeStepInHours) /
      options.buildingGeometry.btusPerDegreeF;

    utcTime = utcTime.plus(timeStepDuration);
  }

  return {
    timeSteps: results,
    bills: billing.getBills(options.localStartTime, options.localEndTime),
  };
}
