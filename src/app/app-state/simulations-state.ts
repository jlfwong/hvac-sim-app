import { atom } from "jotai";
import { buildingGeometryAtom, loadSourcesAtom } from "./loads-state";
import { systemsToSimulateAtom } from "./hvac-systems-state";
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

export interface HVACSimulationResultWithEmissions
  extends HVACSimulationResult {
  emissionsGramsCO2e: number;
}

export const simulationsAtom = atom<HVACSimulationResultWithEmissions[] | null>(
  (get) => {
    const loadSources = get(loadSourcesAtom);
    const systems = get(systemsToSimulateAtom);
    const locationInfo = get(locationInfoAtom);
    const weatherInfo = get(weatherInfoAtom);
    const buildingGeometry = get(buildingGeometryAtom);
    const naturalGasPricePerCubicMetre = get(naturalGasPricePerCubicMetreAtom);
    const electricityPricePerKwh = get(electricityPricePerKwhAtom);
    const gramsCO2ePerKwh = get(gramsCO2ePerKwhAtom);

    if (
      !loadSources ||
      !systems ||
      !locationInfo ||
      !weatherInfo ||
      !buildingGeometry ||
      !naturalGasPricePerCubicMetre ||
      !electricityPricePerKwh ||
      !gramsCO2ePerKwh
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

    return systems.map((hvacSystem) => {
      const result = simulateBuildingHVAC({
        localStartTime,
        localEndTime,
        initialInsideAirTempF: 72.5,
        buildingGeometry,
        hvacSystem,
        loadSources,
        weatherSource: weatherInfo.weatherSource,
        utilityPlans,
      });

      return {
        ...result,
        emissionsGramsCO2e: emissionsForSimulationGramsCO2e({
          simulationResult: result,
          gramsCO2ePerKwh,
        }),
      };
    });
  }
);