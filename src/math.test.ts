import { interpolate } from "./math";

describe("interpolate", () => {
  test("endpoints", () => {
    // Endpoints
    expect(interpolate(0, 10, 1, 20, 0)).toBe(10);
    expect(interpolate(0, 10, 1, 20, 1)).toBe(20);
  });

  test("midpoints", () => {
    // Midpoint
    expect(interpolate(0, 10, 1, 20, 0.1)).toBe(11);
    expect(interpolate(0, 10, 1, 20, 0.5)).toBe(15);
    expect(interpolate(0, 10, 1, 20, 0.9)).toBe(19);
  });

  test("extrapolation", () => {
    // Outside points
    expect(interpolate(0, 10, 1, 20, -1)).toBe(0);
    expect(interpolate(0, 10, 1, 20, -2)).toBe(-10);
    expect(interpolate(0, 10, 1, 20, 2)).toBe(30);
    expect(interpolate(0, 10, 1, 20, 3)).toBe(40);
  });
});
