import { describe, expect, it } from "vitest";
import { withNaturalArmorLayer } from "./hit-location-armor-layers";

const hauberk = { name: "Hauberk", absorbs: 7 };

describe("withNaturalArmorLayer", () => {
  it("lists natural armor on its own when nothing is worn", () => {
    expect(withNaturalArmorLayer(3, [], "Natural armor")).toEqual([
      { name: "Natural armor", absorbs: 3 },
    ]);
  });

  it("puts natural armor before the worn layers, which then add up to the total", () => {
    const layers = withNaturalArmorLayer(4, [hauberk], "Natural armor");
    expect(layers).toEqual([{ name: "Natural armor", absorbs: 4 }, hauberk]);
    expect(layers.reduce((sum, layer) => sum + layer.absorbs, 0)).toBe(11);
  });

  it("adds no layer without natural armor", () => {
    expect(withNaturalArmorLayer(0, [hauberk], "Natural armor")).toEqual([hauberk]);
    expect(withNaturalArmorLayer(0, [], "Natural armor")).toEqual([]);
  });
});
