import { describe, expect, it } from "vitest";
import { distributeHealing, locationPresets } from "./hit-location-heal-wound-dialog";

describe("distributeHealing", () => {
  it("heals the worst wound first, then the next", () => {
    expect(distributeHealing([2, 5, 3], 7)).toEqual([0, 5, 2]);
  });

  it("never heals more than a wound's damage", () => {
    expect(distributeHealing([1, 2], 10)).toEqual([1, 2]);
  });

  it("heals nothing with no points", () => {
    expect(distributeHealing([4], 0)).toEqual([0]);
  });
});

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
