import {
  SimpleElectricalUtilityPlan,
  SimpleNaturalGasUtilityPlan,
} from "../lib/billing";
import { CUBIC_METER_PER_CCF } from "../lib/units";

/*
Average residential natural gas prices by provinces, 2023

Source
- Download full dataset here: [Canadian monthly natural gas distribution, Canada and provinces](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=2510005901&pickMembers%5B0%5D=1.5&pickMembers%5B1%5D=3.1&cubeTimeFrame.startMonth=06&cubeTimeFrame.startYear=2023&cubeTimeFrame.endMonth=10&cubeTimeFrame.endYear=2023&referencePeriods=20230601%2C20231001)
- https://chat.openai.com/c/539d8294-e9c3-45fa-89d0-0600052175d7
*/
const naturalGasPricePerCubicMetreByProvince: { [key: string]: number } = {
  AB: 0.259,
  BC: 0.504,
  MB: 0.385,
  NB: 0.944,
  NT: 1.333,
  NS: 1.096,
  ON: 0.469,
  QC: 0.631,
  SK: 0.371,

  // TODO(jlfwong): There's no data for PEI, YK, NL, or NU
};
export function gasUtilityForProvince(provinceCode: string) {
  const pricePerM3: number =
    naturalGasPricePerCubicMetreByProvince[provinceCode];
  if (!pricePerM3) {
    throw new Error(`No gas pricing data for province ${provinceCode}`);
  }

  return new SimpleNaturalGasUtilityPlan({
    costPerCcf: pricePerM3 * CUBIC_METER_PER_CCF,
    // TODO(jlfwong): Choose a few specific utilities to spot check this
    fixedCostPerMonth: 0,
  });
}

/*
Sources
- [comparison-electricity-prices](https://www.hydroquebec.com/data/documents-donnees/pdf/comparison-electricity-prices.pdf)
- These rates are heavily skewed for Alberta. See e.g. [Regulated Rate Option \(RRO\)](https://www1.enmax.com/rro)

* Quebec (QC): 7.81 c/kWh
* Alberta (AB): (29.80 + 27.78) / 2 = 28.79 c/kWh
* Prince Edward Island (PE): 17.78 c/kWh
* Nova Scotia (NS): 18.27 c/kWh
* New Brunswick (NB): 14.61 c/kWh
* Ontario (ON): (13.48 + 13.88) / 2 = 13.68 c/kWh
* Saskatchewan (SK): 17.89 c/kWh
* Newfoundland and Labrador (NL): 13.73 c/kWh
* British Columbia (BC): 11.62 c/kWh
* Manitoba (MB): 10.24 c/kWh
*/
const electricityPricePerKwhByProvince: { [key: string]: number } = {
  QC: 0.0781,
  AB: 0.2879,
  PE: 0.1778,
  NS: 0.1827,
  NB: 0.1461,
  ON: 0.1368,
  SK: 0.1789,
  NL: 0.1368,
  BC: 0.1162,
  MB: 0.1024,
};

export function electricalUtilityForProvince(provinceCode: string) {
  const pricePerKwh = electricityPricePerKwhByProvince[provinceCode];
  if (!pricePerKwh) {
    throw new Error(`No gas pricing data for province ${provinceCode}`);
  }

  return new SimpleElectricalUtilityPlan({
    costPerKwh: pricePerKwh,

    // TODO(jlfwong): Choose a few specific utilities to spot check this
    fixedCostPerMonth: 0,
  });
}
