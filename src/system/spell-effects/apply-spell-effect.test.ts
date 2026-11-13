import { describe, expect, it } from "vitest";
import { spellEffectCast, spellProvenance } from "./apply-spell-effect";
import type { RqgItem } from "@items/rqg-item.ts";

const caster = { actorUuid: "Actor.c", tokenUuid: "Scene.s.Token.c" };
const spell = (type: string, rqid?: string) =>
  ({
    type,
    name: "Bladesharp",
    uuid: "Actor.c.Item.b",
    flags: rqid ? { rqg: { documentRqidFlags: { id: rqid } } } : {},
  }) as unknown as RqgItem;

describe("spellEffectCast", () => {
  it("records the spell's rqid with the cast", () => {
    const cast = spellEffectCast(
      spell("spiritMagic", "i.spirit-magic.bladesharp"),
      { levelUsed: 2, magicPointBoost: 1 },
      { caster, castMessageId: "m", casterSuccessLevel: 2 },
    );
    expect(cast).toEqual({
      spellRqid: "i.spirit-magic.bladesharp",
      caster,
      castMessageId: "m",
      casterSuccessLevel: 2,
      level: 2,
      magicPointsSpent: 3,
      runePointsSpent: 0,
    });
  });

  it("records an empty rqid for a spell without one", () => {
    const cast = spellEffectCast(
      spell("runeMagic"),
      { levelUsed: 1 },
      { caster, castMessageId: "m", casterSuccessLevel: undefined },
    );
    expect(cast.spellRqid).toBe("");
    expect(cast.runePointsSpent).toBe(1);
  });

  it("gives the provenance the spell's own rqid", () => {
    const cast = spellEffectCast(
      spell("spiritMagic", "i.spirit-magic.bladesharp"),
      { levelUsed: 1 },
      { caster, castMessageId: "m", casterSuccessLevel: undefined },
    );
    expect(spellProvenance(spell("spiritMagic", "i.spirit-magic.bladesharp"), cast)).toMatchObject({
      spellRqid: "i.spirit-magic.bladesharp",
      spellName: "Bladesharp",
      casterSuccessLevel: null,
    });
  });
});
