export const WATT_HOUR_PER_BTU = 0.293071;
export const KWH_PER_BTU = WATT_HOUR_PER_BTU / 1000.0;

export function btusToKwh(btu: number): number {
  return btu * KWH_PER_BTU;
}

export function kWToBtusPerHour(kW: number): number {
  return kW / KWH_PER_BTU;
}

export function fahrenheitToCelcius(fahrenheit: number): number {
  return (fahrenheit - 32) / 1.8;
}