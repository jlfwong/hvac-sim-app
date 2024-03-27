import { atom } from "jotai";
import {
  bestHeatPumpSimulationResultAtom,
  heatPumpSimulationResultsAtom,
  statusQuoSimulationResultAtom,
} from "./simulations-state";
import {
  airConditionerInstallCostAtom,
  electricFurnaceInstallCostAtom,
  gasFurnaceInstallCostAtom,
  heatpumpInstallCostAtom,
  statusQuoFurnaceFuelAtom,
} from "./config-state";
import { locationInfoAtom } from "./canadian-weather-state";

type PaybackPeriod = number | "immediately" | "never";

export interface SystemComparison {
  annualOpexCostSavings: number;
  annualEmissionsSavingGramsCo2e: number;
  lifetimeCostSavings: number;
  excessCapexCost: number;
  paybackPeriod: PaybackPeriod;
}

export const systemComparisonAtom = atom<SystemComparison | null>((get) => {
  const statusQuoFurnaceInstallCost = get(statusQuoFurnaceInstallCostAtom);
  const airConditionerInstallCost = get(airConditionerInstallCostAtom);
  const heatpumpInstallCost = get(heatpumpInstallCostAtom);

  const statusQuoSimulationResult = get(statusQuoSimulationResultAtom);
  const bestHeatPumpSimulationResult = get(bestHeatPumpSimulationResultAtom);

  if (!statusQuoSimulationResult || !bestHeatPumpSimulationResult) return null;

  const heatpumpExcessInstallCost =
    heatpumpInstallCost -
    (statusQuoFurnaceInstallCost + airConditionerInstallCost);

  const annualOpexCostSavings =
    statusQuoSimulationResult.billsTotalCost -
    bestHeatPumpSimulationResult.billsTotalCost;

  const lifetimeCostSavings =
    annualOpexCostSavings * equipmentLifetimeYears - heatpumpExcessInstallCost;

  let paybackPeriod: PaybackPeriod;

  if (heatpumpExcessInstallCost > 0) {
    if (annualOpexCostSavings > 0) {
      paybackPeriod = heatpumpExcessInstallCost / annualOpexCostSavings;
      if (paybackPeriod > equipmentLifetimeYears) {
        paybackPeriod = "never";
      }
    } else {
      paybackPeriod = "never";
    }
  } else {
    if (annualOpexCostSavings > 0) {
      paybackPeriod = "immediately";
    } else {
      // Weird case: install cost is cheaper, but opex is higher. Will just say
      // "never" for now.
      paybackPeriod = "never";
    }
  }

  return {
    annualOpexCostSavings,
    annualEmissionsSavingGramsCo2e:
      statusQuoSimulationResult.emissionsGramsCO2e -
      bestHeatPumpSimulationResult.emissionsGramsCO2e,
    excessCapexCost: heatpumpExcessInstallCost,
    lifetimeCostSavings,
    paybackPeriod,
  };
});

export const statusQuoFurnaceInstallCostAtom = atom<number>((get) => {
  const statusQuoFurnaceFuel = get(statusQuoFurnaceFuelAtom);
  switch (statusQuoFurnaceFuel) {
    case "electric":
      return get(electricFurnaceInstallCostAtom);
    case "gas":
      return get(gasFurnaceInstallCostAtom);
  }
});

export const equipmentLifetimeYears = 15;

// TODO(jlfwong): Clean this up by creating itemized expenses
export const heatpumpLifetimeCostAtom = atom<number | null>((get) => {
  const heatpumpInstallCost = get(heatpumpInstallCostAtom);
  const bestHeatPumpSimulationResult = get(bestHeatPumpSimulationResultAtom);

  const locationInfo = get(locationInfoAtom);

  if (!bestHeatPumpSimulationResult || !locationInfo) return null;

  return (
    heatpumpInstallCost +
    bestHeatPumpSimulationResult.billsTotalCost * equipmentLifetimeYears
  );
});

export const statusQuoLifetimeCostAtom = atom<number | null>((get) => {
  const statusQuoFurnaceInstallCost = get(statusQuoFurnaceInstallCostAtom);
  const airConditionerInstallCost = get(airConditionerInstallCostAtom);

  const statusQuoSimulationResult = get(statusQuoSimulationResultAtom);

  if (!statusQuoSimulationResult) return null;

  return (
    statusQuoFurnaceInstallCost +
    airConditionerInstallCost +
    statusQuoSimulationResult.billsTotalCost * equipmentLifetimeYears
  );
});