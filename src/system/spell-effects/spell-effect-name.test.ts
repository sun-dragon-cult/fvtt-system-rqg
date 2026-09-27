import { describe, expect, it } from "vitest";
import { renameForSpellLevel, spellEffectName } from "./spell-effect-name";

describe("spellEffectName", () => {
  it("puts the level after the spell name", () => {
    expect(spellEffectName("Bladesharp", 4)).toBe("Bladesharp (4)");
  });
});

describe("renameForSpellLevel", () => {
  const spell = { spellName: "Bladesharp", level: 4 };

  it("follows a level change while the name is the one the cast gave", () => {
    expect(renameForSpellLevel("Bladesharp (4)", spell, 2)).toBe("Bladesharp (2)");
  });

  it("keeps a name the GM changed", () => {
    expect(renameForSpellLevel("Rurik's sharp sword", spell, 2)).toBeUndefined();
  });
});
