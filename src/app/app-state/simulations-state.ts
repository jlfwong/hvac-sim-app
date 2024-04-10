import { atom, type Getter } from "jotai";
import { buildingGeometryAtom, loadSourcesAtom } from "./loads-state";
import { locationInfoAtom, weatherInfoAtom } from "./canadian-weather-state";
import { DateTime } from "luxon";
import { HVACSimulationResult, simulateBuildingHVAC } from "../../lib/simulate";

import {
  SimpleElectricalUtilityPlan,
  SimpleNaturalGasUtilityPlan,
} from "../../lib/billing";
import { CUBIC_METER_PER_CCF } from "../../lib/units";
import {
  electricityPricePerKwhAtom,
  naturalGasPricePerCubicMetreAtom,
} from "./canadian-utilities-state";
import { emissionsForSimulationGramsCO2e } from "../../lib/emissions";
import { gramsCO2ePerKwhAtom } from "./canadian-grid-emissions-state";
import {
  heatPumpWithGasBackupSystemsAtom,
  electricFurnaceSystemAtom,
  gasFurnaceSystemAtom,
  heatPumpWithElectricBackupSystemsAtom,
} from "./hvac-systems-state";
import {
  heatpumpBackupFuelAtom,
  statusQuoFurnaceFuelAtom,
} from "./config-state";
import type { HVACSystem } from "../../lib/types";

export interface HVACSimulationResultWithEmissions
  extends HVACSimulationResult {
  emissionsGramsCO2e: number;
}

export interface HVACSimulationComparison {
  heatpump: HVACSimulationResultWithEmissions;
  statusQuo: HVACSimulationResultWithEmissions;
}

type HVACSimulator = (system: HVACSystem) => HVACSimulationResultWithEmissions;

const simulatorAtom = atom<HVACSimulator | null>((get) => {
  const loadSources = get(loadSourcesAtom);
  const locationInfo = get(locationInfoAtom);
  const weatherInfo = get(weatherInfoAtom);
  const buildingGeometry = get(buildingGeometryAtom);
  const naturalGasPricePerCubicMetre = get(naturalGasPricePerCubicMetreAtom);
  const electricityPricePerKwh = get(electricityPricePerKwhAtom);
  const gramsCO2ePerKwh = get(gramsCO2ePerKwhAtom);

  if (
    loadSources == null ||
    locationInfo == null ||
    weatherInfo == null ||
    buildingGeometry == null ||
    naturalGasPricePerCubicMetre == null ||
    electricityPricePerKwh == null ||
    gramsCO2ePerKwh == null
  ) {
    return null;
  }

  const dtOptions = { zone: weatherInfo.timezoneName };

  const localStartTime = DateTime.fromObject(
    {
      year: 2023,
      month: 1,
      day: 1,
    },
    dtOptions
  );
  const localEndTime = DateTime.fromObject(
    {
      year: 2023,
      month: 12,
      day: 31,
    },
    dtOptions
  ).endOf("day");

  const utilityPlans = {
    electrical: () =>
      new SimpleElectricalUtilityPlan({
        fixedCostPerMonth: 0,
        costPerKwh: electricityPricePerKwh,
      }),
    naturalGas: () =>
      new SimpleNaturalGasUtilityPlan({
        fixedCostPerMonth: 0,
        costPerCcf: naturalGasPricePerCubicMetre * CUBIC_METER_PER_CCF,
      }),
  };

  return function (hvacSystem: HVACSystem): HVACSimulationResultWithEmissions {
    const result = simulateBuildingHVAC({
      localStartTime,
      localEndTime,
      initialInsideAirTempF: 72.5,
      buildingGeometry,
      hvacSystem,
      loadSources,
      weatherSource: weatherInfo!.weatherSource,
      utilityPlans,
    });

    return {
      ...result,
      emissionsGramsCO2e: emissionsForSimulationGramsCO2e({
        simulationResult: result,
        gramsCO2ePerKwh: gramsCO2ePerKwh!,
      }),
    };
  };
});

export const heatPumpSimulationResultsAtom = atom<
  HVACSimulationResultWithEmissions[] | null
>((get) => {
  const heatPumpWithGasBackupSystems = get(heatPumpWithGasBackupSystemsAtom);
  const heatPumpWithElectricBackupSystems = get(
    heatPumpWithElectricBackupSystemsAtom
  );
  const heatpumpBackupFuel = get(heatpumpBackupFuelAtom);

  const simulator = get(simulatorAtom);

  if (
    !simulator ||
    !heatPumpWithGasBackupSystems ||
    !heatPumpWithElectricBackupSystems
  ) {
    return null;
  }

  let systems: HVACSystem[];
  switch (heatpumpBackupFuel) {
    case "electric": {
      systems = heatPumpWithElectricBackupSystems;
      break;
    }
    case "gas": {
      systems = heatPumpWithGasBackupSystems;
      break;
    }
    default: {
      assertNever(heatpumpBackupFuel);
    }
  }

  return systems.slice(0, 3).map(simulator);
});

export const statusQuoSimulationResultAtom =
  atom<HVACSimulationResultWithEmissions | null>((get) => {
    const statusQuoSystem =
      get(statusQuoFurnaceFuelAtom) == "gas"
        ? get(gasFurnaceSystemAtom)
        : get(electricFurnaceSystemAtom);

    const simulator = get(simulatorAtom);

    if (!simulator || !statusQuoSystem) return null;

    return simulator(statusQuoSystem);
  });

// TODO(jlfwong): If we want this to be user-controllable again,
// switch this back to an atom
let optimizeFor: "cost" | "emissions" = "cost";

export const bestHeatPumpSimulationResultAtom =
  atom<HVACSimulationResultWithEmissions | null>((get) => {
    const heatPumpResults = get(heatPumpSimulationResultsAtom);

    if (!heatPumpResults) return null;

    let bestResult: HVACSimulationResultWithEmissions | null = null;

    switch (optimizeFor) {
      case "cost": {
        for (let sim of heatPumpResults) {
          if (!bestResult || sim.billsTotalCost < bestResult.billsTotalCost) {
            bestResult = sim;
          }
        }
        break;
      }
      case "emissions": {
        for (let sim of heatPumpResults) {
          if (
            !bestResult ||
            sim.emissionsGramsCO2e < bestResult.emissionsGramsCO2e
          ) {
            bestResult = sim;
          }
        }
        break;
      }
      default: {
        assertNever(optimizeFor);
      }
    }

    return bestResult;
  });

export const simulationsAtom = atom<HVACSimulationResultWithEmissions[] | null>(
  (get) => {
    const bestHeatPump = get(bestHeatPumpSimulationResultAtom);
    const statusQuo = get(statusQuoSimulationResultAtom);
    if (!bestHeatPump || !statusQuo) return null;
    return [bestHeatPump, statusQuo];
  }
);
