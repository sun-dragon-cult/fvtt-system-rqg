import { describe, expect, it } from "vitest";
import { metersPerSceneUnit, metersToPixels } from "./scene-distance";

describe("scene distance", () => {
  it("reads RQG's meter grid as it is, and converts feet and yards", () => {
    expect(metersPerSceneUnit("m")).toBe(1);
    expect(metersPerSceneUnit("ft")).toBe(0.3048);
    expect(metersPerSceneUnit("yards")).toBe(0.9144);
  });

  it("turns meters into pixels by the scene's grid scale", () => {
    // RQG default: 1.5 m per 100 px square
    expect(metersToPixels(3, { size: 100, distance: 1.5, units: "m" })).toBe(200);
    // a 5 ft grid: 3 m is about 2 squares too
    expect(metersToPixels(3, { size: 100, distance: 5, units: "ft" })).toBeCloseTo(196.85, 1);
  });
});
