const KWH_PER_BTU = 0.000293071;

export function btusToKwh(btu: number): number {
  return btu * KWH_PER_BTU;
}
