import { useState, useEffect } from "react";

import {
  BinnedTemperatures,
  JSONBackedHourlyWeatherSource,
  WeatherSource,
} from "../lib/weather";
import { fetchJSON } from "./fetch";

interface LocationInfo {
  code: string;
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

export function useCanadianWeatherSource(initialPostalCode: string) {
  const [postalCode, setPostalCode] = useState(initialPostalCode);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [weatherInfo, setWeatherInfo] = useState<WeatherInfo | null>(null);

  const [caPostalCodesJson, setCaPostalCodesJson] =
    useState<PostalCodesJson | null>(null);

  useEffect(() => {
    // TODO(jlfwong): Bake this into the JS bundle instead. Strip the lat/lns
    // first.
    fetchJSON<PostalCodesJson>("./data/ca-postal-codes.json").then((data) =>
      setCaPostalCodesJson(data)
    );
  }, []);

  useEffect(() => {
    if (
      !caPostalCodesJson ||
      !/^[A-Za-z][0-9][A-Za-z] ?[0-9][A-Za-z][0-9]$/.exec(postalCode)
    ) {
      return;
    }

    const forwardSortationArea = postalCode.substring(0, 3).toUpperCase();

    const info = caPostalCodesJson[forwardSortationArea];

    // TODO(jlfwong): Consider using AbortController here
    let cancelled = false;

    if (info) {
      setLocationInfo(info);

      // TODO(jlfwong): Update this to use S3 buckets when ready
      fetchJSON<any>(
        `./data/weather/2023-era5-${forwardSortationArea}.json`
      ).then((json) => {
        if (!cancelled) {
          setWeatherInfo({
            elevationMeters: json.elevationMeters,
            timezoneName: json.timezoneName,
            weatherSource: new JSONBackedHourlyWeatherSource(json.weather),
            binnedTemperatures: new BinnedTemperatures(json.weather),
          });
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [postalCode, caPostalCodesJson]);

  return {
    postalCode,
    setPostalCode: (newPostalCode: string) => {
      if (newPostalCode === postalCode) {
        return;
      }

      // Whenever postal code changes, we clear the weather source and the
      // location info. We can't do this in the useEffect beacuse then views
      // will see a state where the new postal code is used, but the old weather
      // data and location info is used for a single render.
      setPostalCode(newPostalCode);
      setWeatherInfo(null);
      setLocationInfo(null);
    },
    locationInfo,
    weatherInfo,
  };
}
