import {
  BinnedTemperatures,
  JSONBackedHourlyWeatherSource,
  WeatherSource,
} from "../../lib/weather";
import { postalCodeAtom } from "./config-state";
import { fetchJSON } from "../fetch";
import { atom } from "jotai";
import { metersToFeet } from "../../lib/units";
import { asyncAtomOrNull } from "./utils";

interface LocationInfo {
  forwardSortationArea: string;
  placeName: string;
  provinceCode: string;
}

export interface WeatherInfo {
  // It's a bit janky that this is here instead of in locationInfo, but I want
  // to keep the data downloaded for every forward sortation area to a minimum.
  timezoneName: string;
  elevationMeters: number;
  weatherSource: WeatherSource;
  binnedTemperatures: BinnedTemperatures;
}

type PostalCodesJson = { [forwardSortationArea: string]: LocationInfo };

const caPostalCodesJsonAtom = asyncAtomOrNull<PostalCodesJson>(
  async (get, { signal }) => {
    // TODO(jlfwong): Bake this into the JS bundle instead. Strip the lat/lns
    // first.
    return await fetchJSON<PostalCodesJson>("./data/ca-postal-codes.json", {
      signal,
    });
  }
);

export const locationInfoAtom = atom<LocationInfo | null>((get) => {
  const postalCode = get(postalCodeAtom);
  const caPostalCodesJson = get(caPostalCodesJsonAtom);

  if (
    postalCode == null ||
    !caPostalCodesJson ||
    !/^[A-Za-z][0-9][A-Za-z] ?[0-9][A-Za-z][0-9]$/.exec(postalCode)
  ) {
    return null;
  }

  const forwardSortationArea = postalCode.substring(0, 3).toUpperCase();

  if (!(forwardSortationArea in caPostalCodesJson)) {
    return null;
  }

  const info: LocationInfo = {
    ...caPostalCodesJson[forwardSortationArea],
    forwardSortationArea,
  };

  return info;
});

export const simplePlaceNameAtom = atom<string | null>((get) => {
  const locationInfo = get(locationInfoAtom);
  if (locationInfo == null) {
    return null;
  }

  // Replace parentheticals to present a simpler place name TOOD(jlfwong):
  // Consider doing this change in the postal codes JSON.
  return locationInfo.placeName.replace(/\([^)]*\)/g, "");
});

export const weatherInfoAtom = asyncAtomOrNull<WeatherInfo>(
  async (get, { signal }) => {
    const locationInfo = get(locationInfoAtom);

    if (!locationInfo) {
      return null;
    }

    const json = await fetchJSON<any>(
      `https://hvac-sim-public.s3.amazonaws.com/weather/ca/era/2023-era5-${locationInfo.forwardSortationArea}.json`,
      { signal }
    );

    return {
      timezoneName: json.timezoneName as string,
      elevationMeters: json.elevationMeters as number,
      weatherSource: new JSONBackedHourlyWeatherSource(json.weather),
      binnedTemperatures: new BinnedTemperatures(json.weather),
    };
  }
);

export const elevationFeetAtom = atom<number | null>((get) => {
  const weatherInfo = get(weatherInfoAtom);
  if (weatherInfo == null) return null;
  return metersToFeet(weatherInfo.elevationMeters);
});
