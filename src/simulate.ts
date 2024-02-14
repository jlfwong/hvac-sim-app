import { DateTime, Duration } from "luxon";
import {
  WeatherSnapshot,
  FuelUsageRate,
  HVACAppliance,
  HVACApplianceResponse,
} from "./types";
import { WeatherSource } from "./weather";
import { Thermostat } from "./thermostat";
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

interface EquipmentSimulationResult {
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

  recordOneHourUsage(usage: FuelUsageRate, localTime: DateTime) {
    if (usage.electricityKw) {
      if (!this.electricalUtilityPlan) {
        throw new Error("No electrical utility configured");
      }
      this.electricalUtilityPlan.recordElectricityUsageKwh(
        usage.electricityKw,
        localTime
      );
    }

    if (usage.naturalGasCcfPerHour) {
      if (!this.naturalGasUtilityPlan) {
        throw new Error("No natural gas utility configured");
      }
      this.naturalGasUtilityPlan.recordNaturalGasUsageCcf(
        usage.naturalGasCcfPerHour,
        localTime
      );
    }

    if (usage.fuelOilGallonsPerHour) {
      if (!this.fuelOilUtilityPlan) {
        throw new Error("No fuel oil utility configured");
      }
      this.fuelOilUtilityPlan.recordFuelOilUsageGallons(
        usage.fuelOilGallonsPerHour,
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
}): EquipmentSimulationResult {
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

  let localTime: DateTime = options.localStartTime;
  let insideAirTempF = options.initialInsideAirTempF;

  while (localTime < options.localEndTime) {
    const weather = options.weatherSource.getWeather(localTime);

    // Most thermostats operate by directly actuating heating equipment rather
    // than externally communicating a target temperature. We could do the same
    // thing here, having the thermostat communicate "heat" or "cool" or "off",
    // but for that to be remotely realistic, we'd need to simulate at a much
    // more granular time step than once an hour.
    //
    // The ecobee default minimum cycle times are 5 minutes (there are separate
    // settings for minimum "on time" and minimum "off time")
    // https://downloads.ctfassets.net/a3qyhfznts9y/55gpc6jhRTJ7KjXDjxDRzu/ad17b04461596be3b00b9c65d6e3a895/ecobee_Premium_install-setup-user_manual_v1.pdf
    //
    // Simulating once every 20 minutes or so is probably reasoanble. This
    // corresponds to a cycle-count of 3 times per hour, which
    //
    // So, instead, we cheat by asking for the target temperature, then
    // calculate the number of BTUs that would be needed for the hour to reach
    // or maintain the target temperature.
    //
    // This is tricky to balance with the desire to have the system fully off
    // when the home is already in the desired temperature range.
    //
    // TODO(jlfwong): Experiment with increasing simulation frequency by
    // interpolating weather data

    // Determine the heating load on the building from non-HVAC sources (e.g.
    // heating moving through the walls, or sun shining on the building).
    let passiveBtus = 0;
    for (let loadSource of options.loadSources) {
      passiveBtus += loadSource.getBtusPerHour(
        localTime,
        insideAirTempF,
        weather
      );
    }

    const hvacSystemResponse = options.hvacSystem.getThermalResponse({
      localTime,
      insideAirTempF,
      outsideAirTempF: weather.outsideAirTempF,
    });

    // Apply the temperature change caused by HVAC equipment
    insideAirTempF +=
      hvacSystemResponse.btusPerHour / options.buildingGeometry.btusPerDegreeF;

    // Bill for fuel usage
    //
    // TODO(jlfwong): Update this once time step is variable
    billing.recordOneHourUsage(hvacSystemResponse.fuelUsage, localTime);

    // Apply the temperature change caused by passive loads
    insideAirTempF += passiveBtus / options.buildingGeometry.btusPerDegreeF;

    // Record the results for the hour
    results.push({
      localTime,
      insideAirTempF,
      weather,
      hvacSystemResponse,
    });

    // Step forward the simulation by 1 hour
    localTime = localTime.plus({ hours: 1 });
  }

  return {
    timeSteps: results,
    bills: billing.getBills(options.localStartTime, options.localEndTime),
  };
}
