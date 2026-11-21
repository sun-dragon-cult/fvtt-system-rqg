import { describe, expect, it } from "vitest";
import { ambientLightData, normalizedRotation } from "./spell-light";
import { guardedLight } from "./spell-behavior";

describe("ambientLightData", () => {
  const point = { x: 300, y: 200 };

  it("lights the spell's radius in the scene's own units", () => {
    const data = ambientLightData(
      { radiusMeters: 10 },
      point,
      0,
      { units: "m" },
      "Light (Harmast)",
    );
    expect(data["config"]).toMatchObject({ dim: 10, bright: 0 });
    const feet = ambientLightData({ radiusMeters: 3.048 }, point, 0, { units: "ft" }, "Light");
    expect((feet["config"] as any).dim).toBeCloseTo(10);
  });

  it("aims a cone and keeps the color and what holds it", () => {
    const data = ambientLightData(
      { radiusMeters: 12, angle: 180, color: "#ffeecc" },
      point,
      90,
      { units: "m" },
      "Lantern (Harmast)",
      "Actor.a.ActiveEffect.e",
    );
    expect(data).toMatchObject({
      name: "Lantern (Harmast)",
      x: 300,
      y: 200,
      rotation: 90,
      config: { dim: 12, angle: 180, color: "#ffeecc" },
      flags: { rqg: { heldBy: "Actor.a.ActiveEffect.e" } },
    });
  });
});

describe("normalizedRotation", () => {
  it("wraps into 0 to 360 and ignores what isn't a number", () => {
    expect(normalizedRotation(-90)).toBe(270);
    expect(normalizedRotation(450)).toBe(90);
    expect(normalizedRotation("up")).toBe(0);
    expect(normalizedRotation(undefined)).toBe(0);
  });
});

describe("guardedLight", () => {
  it("gives a full circle unless the angle is usable", () => {
    expect(guardedLight({ radiusMeters: 10 })).toEqual({ radiusMeters: 10, angle: 360 });
    expect(guardedLight({ radiusMeters: 12, angle: 180, color: "#fff" })).toEqual({
      radiusMeters: 12,
      angle: 180,
      color: "#fff",
    });
    expect(guardedLight({ radiusMeters: 10, angle: 500 })?.angle).toBe(360);
  });

  it("has no light without a usable radius", () => {
    expect(guardedLight(undefined)).toBeUndefined();
    expect(guardedLight({ radiusMeters: 0 })).toBeUndefined();
    expect(guardedLight({ radiusMeters: Number.NaN })).toBeUndefined();
  });
});
