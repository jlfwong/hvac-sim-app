import { atom } from "jotai";
import {
  bestHeatPumpSimulationResultAtom,
  statusQuoSimulationResultAtom,
} from "./simulations-state";

export interface SystemComparison {
  annualOpexCostSavings: number;
  annualEmissionsSavingGramsCo2e: number;
}

export const systemComparisonAtom = atom<SystemComparison | null>((get) => {
  const statusQuo = get(statusQuoSimulationResultAtom);
  const bestHeatPump = get(bestHeatPumpSimulationResultAtom);

  if (!statusQuo || !bestHeatPump) return null;

  return {
    annualOpexCostSavings:
      statusQuo.billsTotalCost - bestHeatPump.billsTotalCost,
    annualEmissionsSavingGramsCo2e:
      statusQuo.emissionsGramsCO2e - bestHeatPump.emissionsGramsCO2e,
  };
});
