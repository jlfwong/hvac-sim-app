import { DateTime } from "luxon";
import { EnvironmentalConditions, FuelUsageRate, HVACAppliance } from "./types";
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

interface HourlySimulationResult {
  localTime: DateTime;
  insideAirTempF: number;
  conditions: EnvironmentalConditions;
  fuelUsage: FuelUsageRate;
}

interface EquipmentSimulationResult {
  hourlyResults: HourlySimulationResult[];
  bills: EnergyBill[];
}

interface Utilities {
  electricalUtility?: ElectricalUtilityPlan | null;
  naturalGasUtility?: NaturalGasUtilityPlan | null;
  fuelOilUtility?: FuelOilUtilityPlan | null;
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

  getBills(from: DateTime, to: DateTime): EnergyBill[] {
    return (this.electricalUtilityPlan?.getBills(from, to) || [])
      .concat(this.naturalGasUtilityPlan?.getBills(from, to) || [])
      .concat(this.fuelOilUtilityPlan?.getBills(from, to) || []);
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
  hvacAppliances: HVACAppliance[];
  thermostat: Thermostat;
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

  let results: HourlySimulationResult[] = [];

  let localTime: DateTime = options.localStartTime;
  let insideAirTempF = options.initialInsideAirTempF;

  while (localTime < options.localEndTime) {
    const weather = options.weatherSource.getWeather(localTime);

    // TOOD(jlfwong): This is silly having these two very similar types. It
    // would be better to just pass inside air temp information separately, I
    // think.
    const conditions: EnvironmentalConditions = {
      insideAirTempF,
      ...weather,
    };

    // Most thermostats operate by directly actuating heating equipment rather
    // than externally communicating a target temperature. We could do the same
    // thing here, having the thermostat communicate "heat" or "cool" or "off",
    // but for that to be remotely realistic, we'd need to simulate at a much
    // more granular time step than once an hour.
    //
    // So, instead, we cheat by asking for the target temperature, then
    // calculate the number of BTUs that would be needed for the hour to reach
    // or maintain the target temperature.
    const targetInsideAirTempF = options.thermostat.getTargetInsideAirTempF({
      localTime,
      insideAirTempF,
    });

    let passiveBtus = 0;
    for (let loadSource of options.loadSources) {
      passiveBtus += loadSource.getBtusPerHour(localTime, conditions);
    }

    const targetDeltaTempF = targetInsideAirTempF - insideAirTempF;

    // We want enough heating/cooling from our HVAC equipment to counteract the
    // passive loads on the house and reach the target temperature.
    //
    // TODO(jlfwong): There's an edge case here where we don't want to use HVAC
    // at all if the current inside temperature is within the comfortable range.
    // At the moment the thermostat interface doesn't expose the information
    // about what that range is.
    const btusNeededFromHVAC =
      -passiveBtus + targetDeltaTempF * options.buildingGeometry.btusPerDegreeF;

    const hourlyFuelUsage: FuelUsageRate = {};
    let btusProvidedByHVAC = 0;
    for (let appliance of options.hvacAppliances) {
      const response = appliance.getThermalResponse({
        btusPerHourNeeded: btusNeededFromHVAC,
        insideAirTempF,
        outsideAirTempF: weather.outsideAirTempF,
      });

      btusProvidedByHVAC += response.btusPerHour;
      for (let key in response.fuelUsage) {
        // These any casts are currently safe because the type of
        // response.fuelUsage and hourlyFuelUsage are the same. If the types
        // diverged though, this wouldn't give a type error.
        (hourlyFuelUsage as any)[key] =
          ((hourlyFuelUsage as any)[key] || 0) +
          (response as any).fuelUsage[key];
      }
    }

    // Update the interior temperature based on all the relevant heating loads
    const netBtus = passiveBtus + btusNeededFromHVAC;
    const tempChangeF = netBtus / options.buildingGeometry.btusPerDegreeF;
    insideAirTempF += tempChangeF;

    // Bill for fuel usage
    billing.recordOneHourUsage(hourlyFuelUsage, localTime);

    // Record the results for the hour
    results.push({
      localTime,
      insideAirTempF,
      conditions,
      fuelUsage: hourlyFuelUsage,
    });

    // Step forward the simulation by 1 hour
    localTime = localTime.plus({ hours: 1 });
  }

  return {
    hourlyResults: results,
    bills: billing.getBills(options.localStartTime, options.localEndTime),
  };
}
