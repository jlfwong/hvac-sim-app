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

const useKelvinHeatPumpCandidates = (
  elevationFeet: number | null
): AirSourceHeatPump[] | null => {
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

function useTopRatedJson() {
  const [heatPumpMetadata, setHeatPumpMetadata] = useState<any>(null);

  useEffect(() => {
    fetchJSON<any>(`./data/equipment/top_rated.json`).then((json) => {
      setHeatPumpMetadata(json);
    });
  }, []);

  return heatPumpMetadata;
}

const useTopRatedHeatPumpCandidates = (
  elevationFeet: number | null
): AirSourceHeatPump[] | null => {
  const json = useTopRatedJson();

  // This json file is an array represented as an object of arrays instead of
  // array of objects for some reason, and each of the arrays in the object are
  // objects with numeric keys instead of actual arrays.
  const candidates = useMemo(() => {
    if (json == null || elevationFeet == null) return null;

    const maxKey = Math.max(...Object.keys(json.brand).map((n) => parseInt(n)));

    const pumpInfo: {
      [ahriCertificateNumber: string]: {
        name: string;
        ducted: boolean;
        ratings: NEEPccASHPRatingInfo[];
      };
    } = {};

    for (let i = 0; i <= maxKey; i++) {
      const key = json.ahri_certificate_number[i];
      if (!(key in pumpInfo)) {
        pumpInfo[key] = {
          name: `${json.brand[i]} ${json.outdoor_unit_number[i]}`,
          ducted: json.ducted[i],
          ratings: [],
        };
      }
      pumpInfo[key].ratings.push({
        mode: json.heat_cool[i].toLowerCase(),
        insideDryBulbFahrenheit: json.indoor_dry_bulb[i],
        outsideDryBulbFahrenheit: json.outdoor_dry_bulb[i],
        minCapacity: {
          btusPerHour: json.capacity_min[i],
          coefficientOfPerformance: json.cop_min[i],
        },
        maxCapacity: {
          btusPerHour: json.capacity_max[i],
          coefficientOfPerformance: json.cop_max[i],
        },
      });
    }

    const pumps: AirSourceHeatPump[] = [];
    for (let key of Object.keys(pumpInfo)) {
      const { name, ducted, ratings } = pumpInfo[key];
      if (!ducted) {
        // TODO(jlfwong): Deal with ducting configurations,
        // all-electric v.s. dual-fuel, etc.
        continue;
      }
      pumps.push(
        new AirSourceHeatPump({
          name,
          ratings,
          elevationFeet,
        })
      );
    }
    return pumps;
  }, [json, elevationFeet]);

  return candidates;
};

export function useSelectHeatpump(
  options: {
    weatherInfo: WeatherInfo;

    // The temperature to cool the home to
    coolingSetPointInsideTempF: number;

    // The temperature to heat the home to
    heatingSetPointInsideTempF: number;

    // The temperature at which auxiliary heat will be used
    auxSwitchoverTempF: number | null;

    // The thermal loads the heatpump will need to counteract
    loadSources: ThermalLoadSource[];
  } | null
): HeatpumpSelectionResult[] | null {
  const candidates = useTopRatedHeatPumpCandidates(
    options ? metersToFeet(options.weatherInfo.elevationMeters) : null
  );

  if (!candidates || !options) {
    return null;
  }

  const designCoolingOutsideAirTempF =
    options?.weatherInfo.binnedTemperatures.getTempAtPercentile(99);

  let designHeatingOutsideAirTempF =
    options?.weatherInfo.binnedTemperatures.getTempAtPercentile(1);
  if (designHeatingOutsideAirTempF && options?.auxSwitchoverTempF != null) {
    designHeatingOutsideAirTempF = Math.max(
      designHeatingOutsideAirTempF,
      options.auxSwitchoverTempF
    );
  }

  const results = selectHeatpump({
    heatpumps: candidates,

    designCoolingOutsideAirTempF,
    coolingSetPointInsideTempF: options.coolingSetPointInsideTempF,

    designHeatingOutsideAirTempF,
    heatingSetPointInsideTempF: options.heatingSetPointInsideTempF,

    loadSources: options.loadSources,
    binnedTemperatures: options.weatherInfo.binnedTemperatures,
  });

  return results;
}
