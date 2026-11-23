import { describe, expect, it } from "vitest";
import { metersPerSceneUnit, metersToPixels, tokenChangeInSceneUnits } from "./scene-distance";

function change(key: string, type: string, value: unknown) {
  return { key, type, value };
}

describe("scene distance", () => {
  it.each([
    ["m", 1],
    ["ft", 0.3048],
    ["yards", 0.9144],
    ["km", 1000],
    ["Kilometres", 1000],
    ["cm", 0.01],
    ["mi.", 1609.344],
    [" FT ", 0.3048],
    ["in", 0.0254],
    // an unknown or missing unit counts as meters
    ["squares", 1],
    ["", 1],
    [undefined, 1],
  ])("reads %j as %d meters", (units, meters) => {
    expect(metersPerSceneUnit(units)).toBe(meters);
  });

  it("turns meters into pixels by the scene's grid scale", () => {
    // RQG default: 1.5 m per 100 px square
    expect(metersToPixels(3, { size: 100, distance: 1.5, units: "m" })).toBe(200);
    // a 5 ft grid: 3 m is about 2 squares too
    expect(metersToPixels(3, { size: 100, distance: 5, units: "ft" })).toBeCloseTo(196.85, 1);
  });

  describe("tokenChangeInSceneUnits", () => {
    it.each([
      ["ft", 32.81],
      ["km", 0.01],
    ])("turns Light's 10 m into %s", (units, expected) => {
      const converted = tokenChangeInSceneUnits(change("light.dim", "upgrade", "10"), units);
      expect(converted.type).toBe("upgrade");
      expect(typeof converted.value).toBe("string");
      expect(Number(converted.value)).toBeCloseTo(expected, 2);
    });

    it.each(["light.bright", "sight.range", "detectionModes.seeAll.range"])(
      "converts %s",
      (key) => {
        expect(tokenChangeInSceneUnits(change(key, "override", 9.144), "yd").value).toBeCloseTo(10);
      },
    );

    it("divides a formula, which core rolls, by the meters in a scene unit", () => {
      const converted = tokenChangeInSceneUnits(
        change("sight.range", "upgrade", "@level * 2"),
        "yd",
      );
      expect(converted.value).toBe("(@level * 2) / 0.9144");
    });

    it.each([
      ["a scene in meters", "light.dim", "upgrade", "12", "m"],
      ["a key that isn't a distance", "light.angle", "override", "180", "ft"],
      ["a multiply, whose value is a factor", "light.dim", "multiply", "2", "ft"],
      ["an empty value", "sight.range", "upgrade", "  ", "ft"],
      ["a missing value", "sight.range", "upgrade", undefined, "ft"],
    ])("leaves %s as it is", (_case, key, type, value, units) => {
      const original = change(key, type, value);
      expect(tokenChangeInSceneUnits(original, units)).toBe(original);
    });
  });
});
