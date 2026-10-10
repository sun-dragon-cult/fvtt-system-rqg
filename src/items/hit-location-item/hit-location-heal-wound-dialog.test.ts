import { describe, expect, it } from "vitest";
import { distributeHealing } from "./hit-location-heal-wound-dialog";

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
