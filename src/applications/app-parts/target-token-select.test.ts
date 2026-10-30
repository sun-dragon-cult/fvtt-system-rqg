import { describe, expect, it } from "vitest";
import { SEVERAL_TARGETS, selectedTargetValue, targetTokenOptions } from "./target-token-select";

const token = (id: string, name: string, x: number) => ({ id, name, x, y: 0 });

describe("targetTokenOptions", () => {
  it("offers none, the caster, then the others nearest first with their distance", () => {
    const caster = token("c", "Vasana", 0);
    const options = targetTokenOptions(
      [token("far", "Broo", 300), caster, token("near", "Zombie", 100)],
      caster,
      0.5,
    );
    expect(options.map((o) => o.value)).toEqual(["", "c", "near", "far"]);
    expect(options[2]!.label).toContain("meters,50");
  });

  it("lists the others by name, without distances, when there is no caster token", () => {
    const options = targetTokenOptions(
      [token("b", "Broo", 300), token("a", "Ash", 100)],
      undefined,
      1,
    );
    expect(options.map((o) => o.label)).toEqual(["RQG.Dialog.Common.NoTarget + ", "Ash", "Broo"]);
  });
});

describe("selectedTargetValue", () => {
  it("is the one target, none, or the several-targets option", () => {
    expect(selectedTargetValue(["a"])).toBe("a");
    expect(selectedTargetValue([])).toBe("");
    expect(selectedTargetValue(["a", "b"])).toBe(SEVERAL_TARGETS);
  });
});
