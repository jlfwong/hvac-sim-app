import { AirSourceHeatPump, NEEPccASHPRatingInfo } from "../lib/heatpump";
import {
  HeatpumpSelectionResult,
  selectHeatpump,
} from "../lib/select-heatpump";
import { ThermalLoadSource } from "../lib/thermal-loads";
import { fetchJSON } from "./fetch";
import { useState, useEffect, useMemo } from "react";
import { WeatherInfo } from "./use-canadian-weather-source";
import { metersToFeet } from "../lib/units";

function useKelvinJson() {
  const [heatPumpMetadata, setHeatPumpMetadata] = useState<any>(null);

  useEffect(() => {
    // TODO(jlfwong): Curate a different list of these for Canada This is just
    // here as a placeholder ot get the logic working.
    fetchJSON<any>(`./data/equipment/kelvin-all.json`).then((json) => {
      setHeatPumpMetadata(json);
    });
  }, []);

  return heatPumpMetadata;
}

const useHeatPumpCandidates = (elevationFeet: number | null) => {
  const heatPumpMetadata = useKelvinJson();

  const heatPumpCandidates = useMemo(() => {
    if (heatPumpMetadata == null || elevationFeet == null) {
      return null;
    }

    let pumps: AirSourceHeatPump[] = [];
    for (let type in heatPumpMetadata) {
      for (let metadata of heatPumpMetadata[type]) {
        const pump = new AirSourceHeatPump({
          elevationFeet,
          name: `${metadata.brand} ${metadata.outdoor_unit_number}`,
          ratings: (metadata.ratings as any[]).map<NEEPccASHPRatingInfo>(
            (r) => ({
              mode: r.heat_cool.toLowerCase(),
              insideDryBulbFahrenheit: r.indoor_dry_bulb,
              outsideDryBulbFahrenheit: r.outdoor_dry_bulb,
              minCapacity: {
                btusPerHour: r.capacity_min,
                coefficientOfPerformance: r.cop_min,
              },
              maxCapacity: {
                btusPerHour: r.capacity_max,
                coefficientOfPerformance: r.cop_max,
              },
            })
          ),
        });
        pumps.push(pump);
      }
    }
    return pumps;
  }, [heatPumpMetadata, elevationFeet]);

  return heatPumpCandidates;
};

export function useSelectHeatpump(
  options: {
    weatherInfo: WeatherInfo;

    // The temperature to cool the home to
    coolingSetPointInsideTempF: number;

    // The temperature to heat the home to
    heatingSetPointInsideTempF: number;

    // The thermal loads the heatpump will need to counteract
    loadSources: ThermalLoadSource[];
  } | null
): HeatpumpSelectionResult[] | null {
  const candidates = useHeatPumpCandidates(
    options ? metersToFeet(options.weatherInfo.elevationMeters) : null
  );

  const results =
    candidates &&
    options &&
    selectHeatpump({
      heatpumps: candidates,

      designCoolingOutsideAirTempF:
        options.weatherInfo.binnedTemperatures.getTempAtPercentile(99),
      coolingSetPointInsideTempF: options.coolingSetPointInsideTempF,

      designHeatingOutsideAirTempF:
        options.weatherInfo.binnedTemperatures.getTempAtPercentile(1),
      heatingSetPointInsideTempF: options.heatingSetPointInsideTempF,

      loadSources: options.loadSources,
      binnedTemperatures: options.weatherInfo.binnedTemperatures,
    });

  console.log("Candidates", candidates);
  console.log("Selection results", results);

  return results;
}
