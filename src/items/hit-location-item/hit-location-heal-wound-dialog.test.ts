import { describe, expect, it } from "vitest";
import { locationPresets } from "./hit-location-heal-wound-dialog";

describe("locationPresets", () => {
  const location = (wounds: number[]) => ({ system: { wounds } }) as any;

  it("puts every point on the location with the worst wound, worst first", () => {
    expect(locationPresets([location([2]), location([1, 4]), location([3])], 6)).toEqual([
      0, 1, 4, 0,
    ]);
  });

  it("caps at the location's damage", () => {
    expect(locationPresets([location([1, 1])], 6)).toEqual([1, 1]);
  });
});
