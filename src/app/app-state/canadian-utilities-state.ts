import { atom } from "jotai";
import { locationInfoAtom } from "./canadian-weather-state";
import { overridableDerivedAtom } from "./utils";

/*
Average residential natural gas prices by provinces, 2023

Source
- Download full dataset here: [Canadian monthly natural gas distribution, Canada and provinces](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=2510005901&pickMembers%5B0%5D=1.5&pickMembers%5B1%5D=3.1&cubeTimeFrame.startMonth=06&cubeTimeFrame.startYear=2023&cubeTimeFrame.endMonth=10&cubeTimeFrame.endYear=2023&referencePeriods=20230601%2C20231001)
- https://chat.openai.com/c/539d8294-e9c3-45fa-89d0-0600052175d7

*/
const naturalGasPricePerCubicMetreByProvince: { [key: string]: number } = {
  BC: 0.504,
  AB: 0.259,
  SK: 0.371,
  MB: 0.385,
  ON: 0.469,
  QC: 0.631,
  NB: 0.944,
  NS: 1.096,

  // Newfoundland and PEI seem to not have home natural gas
  // service at all! For these, we'll just match the price with Nova Scotia.
  PE: 1.096,
  NL: 1.096,

  // Northern territories are also unlikely to have access to natural gas.
  // We'll just assume it's expensive if it's available at all.
  YK: 1.0,
  NT: 1.0,
  NU: 1.0,
};

export const naturalGasPricePerCubicMetreAtom = overridableDerivedAtom<
  number | null
>((get) => {
  const locationInfo = get(locationInfoAtom);
  if (locationInfo == null) {
    return null;
  }

  const pricePerM3: number =
    naturalGasPricePerCubicMetreByProvince[locationInfo.provinceCode];
  if (!pricePerM3) {
    throw new Error(
      `No gas pricing data for province ${locationInfo.provinceCode}`
    );
  }
  return pricePerM3;
});

const naturalGasFixedPricePerMonthByProvince: { [key: string]: number } = {
  // https://www.fortisbc.com/accounts-billing/billing-rates/natural-gas-rates/residential-rates
  BC: 13.1,

  // https://gas.atco.com/en-ca/products-services-rates/rates-billing-energy-savings-tips/rates-billing/natural-gas-rates.html
  AB: 30.0,

  // https://www.saskenergy.com/manage-account/rates/residential-rates
  SK: 26.0,

  // https://www.hydro.mb.ca/accounts_and_services/rates/residential_rates/
  MB: 14.0,

  // https://www.enbridgegas.com/-/media/Extranet-Pages/residential/myaccount/rates/EGD---Rate-1---Marketer-Notice.pdf?la=en&rev=65b794ed234a4bae830a962f0415945d&hash=8EC67E58BEBEEE35B73EB8377196EF23
  ON: 23.0,

  // https://energir.com/files/energir_common/conditionsservicetarif_an.pdf
  QC: 19.0,

  // https://naturalgasnb.com/en/for-home/accounts-billing/customer-rate-classes/#current-natural-gas-distribution-rates-charges
  NB: 21.0,

  // https://eastwardenergy.com/wp-content/uploads/2023/12/EEI-Rate-Table-December-2023-FINAL.pdf
  NS: 22.0,

  // Newfoundland and PEI seem to not have home natural gas
  // service at all! For these, we'll just match the price with Nova Scotia.
  PE: 22.0,
  NL: 22.0,

  // Northern territories are also unlikely to have access to natural gas.
  // We'll just assume it's expensive if it's available at all.
  YK: 30.0,
  NT: 30.0,
  NU: 30.0,
};

// See "Heat Pumps Pay Off - Techncial Memo (2024)"
export const naturalGasFixedPricePerMonthAtom = atom<number | null>((get) => {
  const locationInfo = get(locationInfoAtom);
  if (locationInfo == null) {
    return null;
  }

  const fixedCost =
    naturalGasFixedPricePerMonthByProvince[locationInfo.provinceCode];
  if (!fixedCost) {
    throw new Error(
      `No electricity pricing data for province ${locationInfo.provinceCode}`
    );
  }

  return fixedCost;
});

/*
Sources
- [comparison-electricity-prices](https://www.hydroquebec.com/data/documents-donnees/pdf/comparison-electricity-prices.pdf)
- The rate for Alberta specifically is overidden because the data from Hydro Quebec represents a historic and temporary high.
  The rates for Alberta instead come from an average of 2023 rates on https://www1.enmax.com/rro

* Quebec (QC): 7.81 c/kWh
* Alberta (AB): 19 c/kWh
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
  BC: 0.1162,
  AB: 0.19,
  SK: 0.1789,
  MB: 0.1024,
  ON: 0.1368,
  QC: 0.0781,
  NS: 0.1827,
  NB: 0.1461,
  PE: 0.1778,
  NL: 0.1368,

  // https://www.ntpc.com/customer-service/residential-service/residential-electrical-rates
  NT: 0.31,

  // https://www.atcoelectricyukon.com/en-ca/customer-billing-rates/bill-calculator.html
  YK: 0.125,

  // https://www.qec.nu.ca/customer-care/accounts-and-billing/customer-rates
  NU: 0.61,
};

export const electricityPricePerKwhAtom = overridableDerivedAtom<number | null>(
  (get) => {
    const locationInfo = get(locationInfoAtom);
    if (locationInfo == null) {
      return null;
    }

    const pricePerKwh =
      electricityPricePerKwhByProvince[locationInfo.provinceCode];
    if (!pricePerKwh) {
      throw new Error(
        `No electricity pricing data for province ${locationInfo.provinceCode}`
      );
    }

    return pricePerKwh;
  }
);
