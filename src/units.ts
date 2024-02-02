const BTUS_PER_KWH = 0.000293071;

export function btuToKwh(btu: number): number {
  return btu * BTUS_PER_KWH;
}
