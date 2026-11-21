import { beforeEach, describe, expect, it, vi } from "vitest";
import { applySpellEffect, spellEffectCast, spellProvenance } from "./apply-spell-effect";
import { placeLight } from "./spell-light";
import { spellBehaviorOf } from "./spell-behavior";
import type { RqgItem } from "@items/rqg-item.ts";

vi.mock("./spell-light", () => ({ placeLight: vi.fn(async () => ({ outcome: "resolved" })) }));
vi.mock("./spell-behavior", async (original) => ({
  ...(await original<typeof import("./spell-behavior")>()),
  spellBehaviorOf: vi.fn(),
}));

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

  it("takes the rqid from the spell, not from what the caller passes", () => {
    const cast = spellEffectCast(
      spell("spiritMagic", "i.spirit-magic.bladesharp"),
      { levelUsed: 1 },
      {
        caster,
        castMessageId: "m",
        casterSuccessLevel: undefined,
        spellRqid: "i.spirit-magic.other",
      } as Parameters<typeof spellEffectCast>[2],
    );
    expect(cast.spellRqid).toBe("i.spirit-magic.bladesharp");
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

  it("carries untargeted on the cast but not into the effect's provenance", () => {
    const bladesharp = spell("spiritMagic", "i.spirit-magic.bladesharp");
    const cast = spellEffectCast(
      bladesharp,
      { levelUsed: 1 },
      { caster, castMessageId: "m", casterSuccessLevel: undefined, untargeted: true },
    );
    expect(cast.untargeted).toBe(true);
    expect(spellProvenance(bladesharp, cast)).not.toHaveProperty("untargeted");
  });
});

describe("applySpellEffect for a spell with a light", () => {
  const cast = (untargeted: boolean) => ({
    caster,
    castMessageId: "m",
    casterSuccessLevel: undefined,
    untargeted,
    spellRqid: "",
    level: 1,
    magicPointsSpent: 1,
    runePointsSpent: 0,
  });
  const apply = (untargeted: boolean) =>
    applySpellEffect(
      { ...spell("spiritMagic", "i.spirit-magic.light"), system: {} } as RqgItem,
      {} as any,
      "Target",
      cast(untargeted),
    );

  beforeEach(() => {
    vi.mocked(placeLight).mockClear();
    vi.mocked(spellBehaviorOf).mockReturnValue({ light: { radiusMeters: 10 } });
  });

  it("places the light when nothing was targeted", async () => {
    expect(await apply(true)).toEqual({ outcome: "resolved" });
    expect(placeLight).toHaveBeenCalledOnce();
  });

  it("does not place it for a cast at a target", async () => {
    await apply(false).catch(() => undefined);
    expect(placeLight).not.toHaveBeenCalled();
  });
});
