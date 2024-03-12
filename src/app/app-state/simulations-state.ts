import { atom } from "jotai";
import { buildingGeometryAtom, loadSourcesAtom } from "./loads-state";
import { systemsToSimulateAtom } from "./hvac-systems-state";
import { locationInfoAtom, weatherInfoAtom } from "./canadian-weather-state";
import { DateTime } from "luxon";
import { simulateBuildingHVAC } from "../../lib/simulate";
import {
  electricalUtilityForProvince,
  gasUtilityForProvince,
} from "../canadian-utility-plans";

export const simulationsAtom = atom((get) => {
  const loadSources = get(loadSourcesAtom);
  const systems = get(systemsToSimulateAtom);
  const locationInfo = get(locationInfoAtom);
  const weatherInfo = get(weatherInfoAtom);
  const buildingGeometry = get(buildingGeometryAtom);

  if (
    !loadSources ||
    !systems ||
    !locationInfo ||
    !weatherInfo ||
    !buildingGeometry
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
    electrical: () => electricalUtilityForProvince(locationInfo.provinceCode),
    naturalGas: () => gasUtilityForProvince(locationInfo.provinceCode),
  };

  return systems.map((hvacSystem) =>
    simulateBuildingHVAC({
      localStartTime,
      localEndTime,
      initialInsideAirTempF: 72.5,
      buildingGeometry,
      hvacSystem,
      loadSources,
      weatherSource: weatherInfo.weatherSource,
      utilityPlans,
    })
  );
});
