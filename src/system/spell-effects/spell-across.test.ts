import { describe, expect, it } from "vitest";
import { crossedAreas } from "./spell-across";

const area = (name: string) => ({ name, behaviors: [{ type: "spellArea", system: {} }] }) as any;
const plainRegion = { name: "door", behaviors: [{ type: "teleportToken", system: {} }] } as any;
const at = (name: string, ...regions: unknown[]) => ({ name, regions: new Set(regions) }) as any;

describe("crossedAreas", () => {
  const ward = area("ward");
  const sanctify = area("sanctify");

  it("collects each spell area holding a target but not the caster, with its targets", () => {
    const a = at("a", ward);
    const b = at("b", ward, sanctify);
    const crossed = crossedAreas(at("caster"), [a, b]);
    expect([...crossed.keys()]).toEqual([ward, sanctify]);
    expect(crossed.get(ward)).toEqual([a, b]);
    expect(crossed.get(sanctify)).toEqual([b]);
  });

  it("skips areas the caster is inside, and Regions that aren't spell areas", () => {
    const crossed = crossedAreas(at("caster", ward), [at("a", ward, plainRegion)]);
    expect(crossed.size).toBe(0);
  });

  it("counts a caster with no token on the scene as outside", () => {
    expect(crossedAreas(undefined, [at("a", ward)]).size).toBe(1);
  });
});
