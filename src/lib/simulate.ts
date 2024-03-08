import { DateTime } from "./datetime";
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
import { HVACSystem } from "./types";

interface PassiveLoad {
  name: string;
  btusPerHour: number;
}

interface SimulationStep {
  localTime: DateTime;
  insideAirTempF: number;
  weather: WeatherSnapshot;
  hvacSystemResponse: HVACApplianceResponse;
  passiveLoads: PassiveLoad[];
}

export interface HVACSimulationResult {
  name: string;
  timeSteps: SimulationStep[];
  bills: EnergyBill[];
}

// TODO(jlfwong): Move this to a utils file
function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

const timeStepInMinutes = 20;

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
  getBills(from: DateTime, to: DateTime): EnergyBill[] {
    let bills: EnergyBill[] = [];
    if (this.electricalUtilityPlan) {
      bills = bills.concat(this.electricalUtilityPlan.getBills(from, to));
    }
    if (this.naturalGasUtilityPlan) {
      bills = bills.concat(this.naturalGasUtilityPlan.getBills(from, to));
    }
    if (this.fuelOilUtilityPlan) {
      bills = bills.concat(this.fuelOilUtilityPlan.getBills(from, to));
    }
    return bills;
  }
}

interface TimeStepInput {
  localTime: DateTime;
  weather: WeatherSnapshot;
}

let cachedTimeSteps: {
  localStartTime: DateTime;
  localEndTime: DateTime;
  weatherSource: WeatherSource;
  steps: TimeStepInput[];
} | null = null;

function getTimeSteps(
  localStartTime: DateTime,
  localEndTime: DateTime,
  weatherSource: WeatherSource
): TimeStepInput[] {
  if (localStartTime.timeZoneName !== localEndTime.timeZoneName) {
    throw new Error("Given a different timezone for start and end datetimes");
  }

  if (
    cachedTimeSteps &&
    cachedTimeSteps.localStartTime.equals(localStartTime) &&
    cachedTimeSteps.localEndTime.equals(localEndTime) &&
    cachedTimeSteps.weatherSource == weatherSource
  ) {
    // It's common to run multiple simulations on the same time span for the
    // same location. Calculations involving repeated timezone lookup are quite
    // slow, but we need time-zone awareness to e.g. support correct recording
    // under time-of-use billing.
    //
    // To ease the performance pain, we cache the time step inputs so that
    // repeated runs are faster.
    return cachedTimeSteps.steps;
  }

  const steps: TimeStepInput[] = [];

  let localTime = localStartTime;

  while (localTime < localEndTime) {
    const weather = weatherSource.getWeather(localTime);

    // Timezone reconciliation slows down this simulation a non-negligible
    // amount, but is unfortunately necessary for time of use billing and for
    // thermostat schedules that e.g. set different temperatures for sleeping.

    steps.push({ localTime, weather });
    localTime = localTime.plusMinutes(timeStepInMinutes);
  }

  cachedTimeSteps = {
    localStartTime,
    localEndTime,
    weatherSource,
    steps,
  };
  return steps;
}

// Simulate the use of a building's HVAC system.
//
// Every time step, this involves a few key steps:
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
    electrical?: () => ElectricalUtilityPlan;
    naturalGas?: () => NaturalGasUtilityPlan;
    fuelOil?: () => FuelOilUtilityPlan;
  };
}): HVACSimulationResult {
  const billing = new FuelBilling();
  if (options.utilityPlans.electrical) {
    billing.setElectricalUtilityPlan(options.utilityPlans.electrical());
  }
  if (options.utilityPlans.naturalGas) {
    billing.setNaturalGasUtility(options.utilityPlans.naturalGas());
  }
  if (options.utilityPlans.fuelOil) {
    billing.setFuelOilUtilityPlan(options.utilityPlans.fuelOil());
  }

  let results: SimulationStep[] = [];

  // We operate in UTC rather than local time because it makes the date math run
  // more efficiently since it avoids the need to reconcile timezones after each
  // operation, because e.g. DST might kick in across an addition boundary.
  let utcTime: DateTime = options.localStartTime.toUTC();
  let insideAirTempF = options.initialInsideAirTempF;

  for (let { localTime, weather } of getTimeSteps(
    options.localStartTime,
    options.localEndTime,
    options.weatherSource
  )) {
    const hvacSystemResponse = options.hvacSystem.getThermalResponse({
      localTime,
      insideAirTempF,
      outsideAirTempF: weather.outsideAirTempF,
    });

    // Bill for fuel usage
    billing.recordUsage(
      hvacSystemResponse.fuelUsage,
      timeStepInMinutes / 60,
      localTime
    );

    // Determine the heating load on the building from non-HVAC sources (e.g.
    // heating moving through the walls, or sun shining on the building).
    let passiveBtusPerHour = 0;
    let passiveLoads: PassiveLoad[] = [];
    for (let loadSource of options.loadSources) {
      const btusPerHour = loadSource.getBtusPerHour(
        localTime,
        insideAirTempF,
        weather
      );
      passiveLoads.push({ name: loadSource.name, btusPerHour });
      passiveBtusPerHour += btusPerHour;
    }

    // Record the results for the hour
    results.push({
      localTime,
      insideAirTempF,
      weather,
      hvacSystemResponse,
      passiveLoads,
    });

    // Apply the temperature change caused by HVAC equipment and passive loads
    // We do this after we add the timestep results to ensure temporal
    // consistency. All of the entries in the reslts are for the beginning of
    // that time step.
    insideAirTempF +=
      ((passiveBtusPerHour + hvacSystemResponse.btusPerHour) *
        (timeStepInMinutes / 60)) /
      options.buildingGeometry.btusPerDegreeF;
  }

  return {
    name: options.hvacSystem.name,
    timeSteps: results,
    bills: billing.getBills(options.localStartTime, options.localEndTime),
  };
}
