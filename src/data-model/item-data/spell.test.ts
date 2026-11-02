import { describe, expect, it } from "vitest";
import { isOneTargetKind, isTokenTargetKind, SpellTargetKindEnum } from "./spell";

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
