import { describe, expect, it } from "vitest";
import { decideSpellEffectStacking, type ExistingSpellEffect } from "./spell-effect-stacking";

const bladesharp = "i.spirit-magic.bladesharp";
const fireblade = "i.spirit-magic.fireblade";
const dullblade = "i.spirit-magic.dullblade";
const fanaticism = "i.spirit-magic.fanaticism";
const demoralize = "i.spirit-magic.demoralize";
const berserker = "i.rune-magic.berserker";

const existing = (
  spellRqid: string,
  level: number,
  extra: Partial<ExistingSpellEffect> = {},
): ExistingSpellEffect => ({
  id: `${spellRqid}-${level}`,
  name: `${spellRqid} (${level})`,
  spellRqid,
  level,
  points: level,
  incompatibleSpellRqids: [],
  cancelsSpellRqids: [],
  supersedesSpellRqids: [],
  counteractsSpellRqids: [],
  expired: false,
  ...extra,
});

const cast = (
  spellRqid: string,
  level: number,
  incompatibleSpellRqids: string[] = [],
  cancelsSpellRqids: string[] = [],
  supersedesSpellRqids: string[] = [],
  extra: { points?: number; counteractsSpellRqids?: string[] } = {},
) => ({
  spellRqid,
  level,
  points: extra.points ?? level,
  incompatibleSpellRqids,
  cancelsSpellRqids,
  supersedesSpellRqids,
  counteractsSpellRqids: extra.counteractsSpellRqids ?? [],
});

describe("decideSpellEffectStacking - strongest takes effect", () => {
  const rule = "strongestTakesEffect" as const;

  it("applies with nothing to displace on a bare target", () => {
    expect(decideSpellEffectStacking(cast(bladesharp, 2), [], rule)).toEqual({
      outcome: "apply",
      displaced: [],
    });
  });

  it("replaces a weaker casting of the same spell", () => {
    const weaker = existing(bladesharp, 2);
    expect(decideSpellEffectStacking(cast(bladesharp, 4), [weaker], rule)).toEqual({
      outcome: "apply",
      displaced: [weaker],
    });
  });

  it("has no effect against an equal or stronger casting of the same spell", () => {
    const equal = existing(bladesharp, 4);
    const stronger = existing(bladesharp, 6);
    expect(decideSpellEffectStacking(cast(bladesharp, 4), [equal], rule)).toMatchObject({
      outcome: "blocked",
      reason: "strongerActive",
      by: equal,
    });
    expect(decideSpellEffectStacking(cast(bladesharp, 4), [stronger], rule)).toMatchObject({
      outcome: "blocked",
      reason: "strongerActive",
    });
  });

  it("has no effect against an incompatible spell, whichever side lists it", () => {
    const fromCast = decideSpellEffectStacking(
      cast(bladesharp, 4, [fireblade]),
      [existing(fireblade, 4)],
      rule,
    );
    const fromExisting = decideSpellEffectStacking(
      cast(bladesharp, 4),
      [existing(fireblade, 4, { incompatibleSpellRqids: [bladesharp] })],
      rule,
    );
    expect(fromCast).toMatchObject({ outcome: "blocked", reason: "incompatibleActive" });
    expect(fromExisting).toMatchObject({ outcome: "blocked", reason: "incompatibleActive" });
  });

  it("stacks with a different, compatible spell", () => {
    expect(decideSpellEffectStacking(cast(bladesharp, 4), [existing(dullblade, 3)], rule)).toEqual({
      outcome: "apply",
      displaced: [],
    });
  });

  it("ignores expired effects but clears them away", () => {
    const expiredSame = existing(bladesharp, 6, { expired: true });
    const expiredIncompatible = existing(fireblade, 4, { expired: true });
    expect(
      decideSpellEffectStacking(
        cast(bladesharp, 2, [fireblade]),
        [expiredSame, expiredIncompatible],
        rule,
      ),
    ).toEqual({ outcome: "apply", displaced: [expiredSame, expiredIncompatible] });
  });

  it("never matches spells without an rqid", () => {
    expect(decideSpellEffectStacking(cast("", 4), [existing("", 6)], rule)).toEqual({
      outcome: "apply",
      displaced: [],
    });
  });
});

describe("decideSpellEffectStacking - latest displaces", () => {
  const rule = "latestDisplaces" as const;

  it("replaces an equal or stronger casting of the same spell", () => {
    const stronger = existing(bladesharp, 6);
    expect(decideSpellEffectStacking(cast(bladesharp, 2), [stronger], rule)).toEqual({
      outcome: "apply",
      displaced: [stronger],
    });
  });

  it("replaces an incompatible spell and leaves compatible ones", () => {
    const incompatible = existing(fireblade, 4);
    expect(
      decideSpellEffectStacking(
        cast(bladesharp, 2, [fireblade]),
        [incompatible, existing(dullblade, 3)],
        rule,
      ),
    ).toEqual({ outcome: "apply", displaced: [incompatible] });
  });
});

describe("decideSpellEffectStacking - cancellation", () => {
  it("cancels an opposing spell, whichever side lists it", () => {
    const demoralized = existing(demoralize, 2);
    expect(
      decideSpellEffectStacking(
        cast(fanaticism, 2, [], [demoralize]),
        [demoralized],
        "strongestTakesEffect",
      ),
    ).toEqual({ outcome: "cancel", cancelled: [demoralized] });
    const fanatic = existing(fanaticism, 2, { cancelsSpellRqids: [demoralize] });
    expect(
      decideSpellEffectStacking(cast(demoralize, 2), [fanatic], "strongestTakesEffect"),
    ).toEqual({ outcome: "cancel", cancelled: [fanatic] });
  });

  it("cancels under either stacking rule, before incompatibility", () => {
    const demoralized = existing(demoralize, 2, { incompatibleSpellRqids: [fanaticism] });
    expect(
      decideSpellEffectStacking(
        cast(fanaticism, 2, [], [demoralize]),
        [demoralized],
        "latestDisplaces",
      ),
    ).toEqual({ outcome: "cancel", cancelled: [demoralized] });
    expect(
      decideSpellEffectStacking(
        cast(fanaticism, 2, [], [demoralize]),
        [demoralized],
        "strongestTakesEffect",
      ),
    ).toMatchObject({ outcome: "cancel" });
  });

  it("doesn't cancel an expired effect, which is cleared away instead", () => {
    const expired = existing(demoralize, 2, {
      expired: true,
      incompatibleSpellRqids: [fanaticism],
    });
    expect(
      decideSpellEffectStacking(
        cast(fanaticism, 2, [], [demoralize]),
        [expired],
        "strongestTakesEffect",
      ),
    ).toEqual({ outcome: "apply", displaced: [expired] });
  });

  it("doesn't cancel another casting of the same spell", () => {
    const same = existing(fanaticism, 2);
    expect(
      decideSpellEffectStacking(
        cast(fanaticism, 2, [], [fanaticism]),
        [same],
        "strongestTakesEffect",
      ),
    ).toMatchObject({ outcome: "blocked", reason: "strongerActive" });
  });
});

describe("decideSpellEffectStacking - precedence", () => {
  it("removes the spells a cast takes precedence over, whatever the stacking rule", () => {
    const fanatic = existing(fanaticism, 1);
    for (const rule of ["strongestTakesEffect", "latestDisplaces"] as const) {
      expect(
        decideSpellEffectStacking(cast(berserker, 2, [], [], [fanaticism]), [fanatic], rule),
      ).toEqual({ outcome: "apply", displaced: [fanatic] });
    }
  });

  it("blocks a spell while one that takes precedence over it is active", () => {
    const berserk = existing(berserker, 2, { supersedesSpellRqids: [fanaticism] });
    expect(decideSpellEffectStacking(cast(fanaticism, 1), [berserk], "latestDisplaces")).toEqual({
      outcome: "blocked",
      reason: "incompatibleActive",
      by: berserk,
    });
  });

  it("lets the spell in once the one taking precedence has expired", () => {
    const berserk = existing(berserker, 2, { supersedesSpellRqids: [fanaticism], expired: true });
    expect(
      decideSpellEffectStacking(cast(fanaticism, 1), [berserk], "strongestTakesEffect"),
    ).toEqual({ outcome: "apply", displaced: [] });
  });
});

describe("decideSpellEffectStacking - counteracting (Harmony, RBM p.62)", () => {
  const harmony = "i.rune-magic.harmony";
  const rule = "strongestTakesEffect" as const;
  const harmonyCast = (points: number) =>
    cast(harmony, 1, [], [], [], { points, counteractsSpellRqids: [fanaticism, demoralize] });

  it("removes weaker emotion spells on the target, and leaves equal or stronger ones", () => {
    const fanatic = existing(fanaticism, 1);
    const demoralized = existing(demoralize, 2);
    expect(decideSpellEffectStacking(harmonyCast(2), [fanatic, demoralized], rule)).toEqual({
      outcome: "apply",
      displaced: [fanatic],
    });
  });

  it("stops a weaker emotion spell cast while it is active, but not an equal one", () => {
    const calm = existing(harmony, 1, { points: 3, counteractsSpellRqids: [demoralize] });
    expect(decideSpellEffectStacking(cast(demoralize, 2), [calm], rule)).toEqual({
      outcome: "blocked",
      reason: "counteractedActive",
      by: calm,
    });
    expect(decideSpellEffectStacking(cast(demoralize, 3), [calm], rule).outcome).toBe("apply");
  });

  it("displaces an effect that is both incompatible and counteracted once", () => {
    const fanatic = existing(fanaticism, 1);
    const calming = cast(harmony, 1, [fanaticism], [], [], {
      points: 2,
      counteractsSpellRqids: [fanaticism],
    });
    expect(decideSpellEffectStacking(calming, [fanatic], "latestDisplaces")).toEqual({
      outcome: "apply",
      displaced: [fanatic],
    });
  });
});
