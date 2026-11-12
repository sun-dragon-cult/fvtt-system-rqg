import { describe, expect, it } from "vitest";
import {
  isOneTargetKind,
  isTokenTargetKind,
  resistedByChoices,
  SpellResistedByEnum,
  SpellTargetKindEnum,
} from "./spell";

describe("spell target kinds", () => {
  it("offers a token picker for a weapon spell, which may go on someone else's weapon", () => {
    expect(isTokenTargetKind(SpellTargetKindEnum.Weapon)).toBe(true);
  });

  it("offers no picker for a spell that stays on its caster", () => {
    expect(isTokenTargetKind(SpellTargetKindEnum.Self)).toBe(false);
  });

  it("still casts a weapon or object spell at one target", () => {
    expect(isOneTargetKind(SpellTargetKindEnum.Weapon)).toBe(true);
    expect(isOneTargetKind(SpellTargetKindEnum.Object)).toBe(true);
  });
});

describe("resistedByChoices", () => {
  it("offers only None for a spell on its caster", () => {
    expect(resistedByChoices(SpellTargetKindEnum.Self, SpellResistedByEnum.None)).toEqual(["none"]);
  });

  it("offers the whole-area roll but not a single-target roll for a radius spell", () => {
    expect(resistedByChoices(SpellTargetKindEnum.Radius, SpellResistedByEnum.None)).toEqual([
      "none",
      "resistanceRollArea",
    ]);
  });

  it("restricts nothing for an unset target kind", () => {
    expect(resistedByChoices(SpellTargetKindEnum.None, SpellResistedByEnum.None)).toEqual(
      Object.values(SpellResistedByEnum),
    );
  });

  it("keeps a stored value that doesn't fit the target kind", () => {
    expect(
      resistedByChoices(SpellTargetKindEnum.Weapon, SpellResistedByEnum.ResistanceRoll),
    ).toEqual(["none", "resistanceRoll"]);
  });
});
