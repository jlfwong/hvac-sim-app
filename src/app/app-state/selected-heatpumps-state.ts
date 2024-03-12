import { AirSourceHeatPump, NEEPccASHPRatingInfo } from "../../lib/heatpump";
import {
  HeatpumpSelectionResult,
  selectHeatpump,
} from "../../lib/select-heatpump";
import { ThermalLoadSource } from "../../lib/thermal-loads";
import { fetchJSON } from "../fetch";
import {
  WeatherInfo,
  elevationFeetAtom,
  weatherInfoAtom,
} from "./canadian-weather-state";
import { metersToFeet } from "../../lib/units";
import { atom } from "jotai";
import { asyncAtomOrNull } from "./utils";
import {
  auxSwitchoverTempFAtom,
  coolingSetPointFAtom,
  heatingSetPointFAtom,
} from "./config-state";
import { loadSourcesAtom } from "./loads-state";

const kelvinJsonAtom = asyncAtomOrNull<any>(async (get, { signal }) => {
  return await fetchJSON<any>(`./data/equipment/kelvin-all.json`);
});

const kelvinHeatPumpCandidatesAtom = atom<AirSourceHeatPump[] | null>((get) => {
  const heatPumpMetadata = get(kelvinJsonAtom);
  const elevationFeet = get(elevationFeetAtom);

  if (heatPumpMetadata == null || elevationFeet == null) {
    return null;
  }

  const pumps: AirSourceHeatPump[] = [];
  for (let type in heatPumpMetadata) {
    for (let metadata of heatPumpMetadata[type]) {
      const pump = new AirSourceHeatPump({
        elevationFeet,
        name: `${metadata.brand} ${metadata.outdoor_unit_number}`,
        ratings: (metadata.ratings as any[]).map<NEEPccASHPRatingInfo>((r) => ({
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
        })),
      });
      pumps.push(pump);
    }
  }
  return pumps;
});

const topRatedJsonAtom = asyncAtomOrNull<any>((get, { signal }) => {
  return fetchJSON<any>(`./data/equipment/top_rated.json`);
});

const topRatedHeatPumpCandidatesAtom = atom<AirSourceHeatPump[] | null>(
  (get) => {
    const elevationFeet = get(elevationFeetAtom);
    const json = get(topRatedJsonAtom);

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
  }
);

export const selectedHeatpumpsAtom = atom<HeatpumpSelectionResult[] | null>(
  (get) => {
    const weatherInfo = get(weatherInfoAtom);
    const auxSwitchoverTempF = get(auxSwitchoverTempFAtom);
    const loadSources = get(loadSourcesAtom);
    const candidates = get(topRatedHeatPumpCandidatesAtom);

    if (!weatherInfo || !candidates) {
      return null;
    }

    const designCoolingOutsideAirTempF =
      weatherInfo.binnedTemperatures.getTempAtPercentile(99);

    let designHeatingOutsideAirTempF =
      weatherInfo.binnedTemperatures.getTempAtPercentile(1);
    if (designHeatingOutsideAirTempF && auxSwitchoverTempF != null) {
      designHeatingOutsideAirTempF = Math.max(
        designHeatingOutsideAirTempF,
        auxSwitchoverTempF
      );
    }

    return selectHeatpump({
      heatpumps: candidates,

      designCoolingOutsideAirTempF,
      coolingSetPointInsideTempF: get(coolingSetPointFAtom),

      designHeatingOutsideAirTempF,
      heatingSetPointInsideTempF: get(heatingSetPointFAtom),

      loadSources,
      binnedTemperatures: weatherInfo.binnedTemperatures,
    });
  }
);
