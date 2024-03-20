import { atom } from "jotai";
import { locationInfoAtom } from "./canadian-weather-state";

// Source: https://www.canada.ca/en/environment-climate-change/services/managing-pollution/fuel-life-cycle-assessment-model/updated-carbon-intensity-electricity.html
const gridGramsCO2ePerKwhByProvince: { [key: string]: number } = {
  AB: 627.8,
  BC: 39.8,
  MB: 26.3,
  NB: 332.6,
  NL: 46.0,
  NS: 745.8,
  NT: 208.0,
  NU: 1034.0,
  ON: 45.7,
  PE: 4.0,
  QC: 16.9,
  SK: 809.2,
  YT: 101.0,
};

export const gramsCO2ePerKwhAtom = atom<number | null>((get) => {
  const locationInfo = get(locationInfoAtom);
  if (locationInfo == null) {
    return null;
  }

  const gramsCo2ePerKwh =
    gridGramsCO2ePerKwhByProvince[locationInfo.provinceCode];
  if (!gramsCo2ePerKwh) {
    throw new Error(
      `No gas pricing data for province ${locationInfo.provinceCode}`
    );
  }
  return gramsCo2ePerKwh;
});
