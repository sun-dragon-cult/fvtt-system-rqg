import { describe, expect, it } from "vitest";
import {
  conditionHolds,
  findSpellTargetCandidates,
  resolvePathLeaves,
  type SpellTargetRule,
} from "./select-spell-effect-target";

const weapon = (id: string, equippedStatus: string, ...damageTypes: string[]) => ({
  id,
  type: "weapon",
  system: {
    equippedStatus,
    usage: {
      oneHand: { combatManeuvers: damageTypes.map((damageType) => ({ damageType })) },
      twoHand: { combatManeuvers: [] },
    },
  },
});

const bladesharp: SpellTargetRule = {
  documentType: "weapon",
  where: [
    { path: "equippedStatus", op: "eq", value: "equipped" },
    { path: "usage.*.combatManeuvers[].damageType", op: "in", value: "slash, impale" },
  ],
};

describe("resolvePathLeaves", () => {
  it("steps into every object value with * and every array element with []", () => {
    const data = { usage: { a: { m: [{ t: 1 }, { t: 2 }] }, b: { m: [{ t: 3 }] } } };
    expect(resolvePathLeaves(data, "usage.*.m[].t")).toEqual([1, 2, 3]);
  });

  it("reaches nothing through a missing path", () => {
    expect(resolvePathLeaves({ a: 1 }, "b.c")).toEqual([]);
  });
});

describe("conditionHolds", () => {
  it.each([
    ["eq", 5, "5", true],
    ["ne", 5, "5", false],
    ["gt", 5, "4", true],
    ["lte", 5, "4", false],
    ["in", "crush", "slash,crush", true],
    ["includes", ["a", "b"], "b", true],
    ["nonEmpty", [], "", false],
    ["nonEmpty", [1], "", true],
  ] as const)("%s on %j against %j is %s", (op, leaf, value, expected) => {
    expect(conditionHolds({ x: leaf }, { path: "x", op, value })).toBe(expected);
  });
});

describe("findSpellTargetCandidates", () => {
  it("keeps only equipped weapons with a qualifying maneuver", () => {
    const items = [
      weapon("sword", "equipped", "crush", "slash"),
      weapon("mace", "equipped", "crush"),
      weapon("spare", "carried", "slash"),
      { id: "skill", type: "skill", system: {} },
    ];

    expect(findSpellTargetCandidates(items, bladesharp).map((i) => i.id)).toEqual(["sword"]);
  });
});
