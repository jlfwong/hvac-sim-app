export function interpolate(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number
): number {
  return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
}

export function interpolateClamped(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number
): number {
  const min = Math.min(y1, y2);
  const max = Math.max(y1, y2);
  const interpolated = interpolate(x1, y1, x2, y2, x);
  return clamp(interpolated, min, max);
}

export function clamp(a: number, min: number, max: number) {
  return Math.min(max, Math.max(a, min));
}
