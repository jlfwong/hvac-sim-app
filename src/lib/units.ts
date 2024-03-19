export const WATT_HOUR_PER_BTU = 0.293071;
export const KWH_PER_BTU = WATT_HOUR_PER_BTU / 1000.0;
export const CUBIC_METER_PER_CCF = 2.83;
export const BTU_PER_CCF_NATURAL_GAS = 103700;

export function btusToKwh(btu: number): number {
  return btu * KWH_PER_BTU;
}

export function kWToBtusPerHour(kW: number): number {
  return kW / KWH_PER_BTU;
}

export function fahrenheitToCelcius(fahrenheit: number): number {
  return (fahrenheit - 32) / 1.8;
}

export function celciusToFahrenheit(celcius: number): number {
  return celcius * 1.8 + 32;
}

export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}